import json
import re
from datetime import datetime

import twitter
from flask import Flask, make_response, jsonify, request

from settings import *

api = twitter.Api(consumer_key=consumer_key,
                      consumer_secret=consumer_secret,
                      access_token_key=access_token_key,
                      access_token_secret=access_token_secret)

app = Flask(__name__)


def translate(string):
    with open('eqs.json', encoding='utf8') as file:
        file = json.load(file)
        for key in file:
            string = string.replace(key, file[key])

        return string


@app.errorhandler(404)
def not_found(error):
    return make_response(jsonify({'error': 'Not found'}), 404), {'Content-Type': 'application/json; charset=utf-8'}


@app.route('/enpatch/', methods=['GET'])
def get_patch():
    r = requests.get("http://psumods.co.uk/viewtopic.php?f=4&t=206")

    pattern_en_patch = "<a href=\"([0-9a-zA-Z_\.\:\/]*)\" class=\"postlink\">This file</a>"
    pattern_large_files = "<a href=\"([0-9a-zA-Z_\.\:\/]*)\" class=\"postlink\">Large files</a>"

    return jsonify({"en_patch" : re.search(pattern_en_patch, r.text).groups(), "large_files" : re.search(pattern_large_files, r.text).groups()})


@app.route('/eq/', methods=['GET'])
def eq():
    args = request.args.get('ship')
    output = []

    if args is None:
        ships = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]
    else:
        args = args.split(',')
        ships = list(set(int(s) for s in args if s in [str(i) for i in range(1, 11)]))

    future = re.compile(r'＜(\d\d)時 緊急クエスト予告＞\n(\d\d):\d\d\s(.*)　#PSO2')
    future2 = re.compile(r'(\d*):\d*\s(.*)')
    shipEQ = re.compile(r'(\d*):([^0-9-―(\[]+)')
    preparation = re.compile(r'【準備中】\d*:\d*\s(.*)')
    jst = re.compile(r'＜(\d*)時 緊急クエスト予告＞')

    statuses = api.GetUserTimeline(screen_name='pso2_emg_hour')

    for status in statuses:
        eqs = []

        for line in status.text.splitlines():
            line = line.replace("　#PSO2", "")

            if jst.match(line):
                jsTime = jst.match(line).group(1)
            
            elif shipEQ.match(line):
                if int(shipEQ.match(line).group(1)) in ships:
                    eqname = translate(shipEQ.match(line).group(2))

                    eqs.append({"ship" : int(shipEQ.match(line).group(1)), "name" : eqname})
            
            elif preparation.match(line):
                for x in ships:
                    eqname = translate(preparation.match(line).group(1))

                    eqs.append({"ship": int(x), "name": eqname})
            
            elif future2.match(line):
                now = int(re.search(r'＜(\d\d)時 緊急クエスト予告＞', status.text).group(1))
                futureTime = int(future2.match(line).group(1))
                eqname = future2.match(line).group(2)

                if futureTime - now == 1:
                    eqs.append({"in_one_hour" : eqname})
                elif futureTime - now == 2:
                    eqs.append({"in_two_hours" : eqname})
        
        jsTime = datetime.strptime(status.created_at, "%a %b %d %H:%M:%S %z %Y")
        output.append({"time": jsTime.strftime("%m-%d-%Y %H:%M:%S %z"), "eqs": eqs})

    return json.dumps(output, indent=4), {'Content-Type': 'application/json; charset=utf-8'}

if __name__ == '__main__':
    app.run('localhost', debug=True)