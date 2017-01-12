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


@app.route('/eq/', methods=['GET'])
def get_eq():
    args = request.args.get('ship')
    output = []
    i = 0

    if args is None:
        ships = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]
    else:
        args = args.split(',')
        whitelist = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '10']
        ships = list(set(int(s) for s in args if s in whitelist))

    shipEQ = re.compile(r'(\d*):([^0-9-―(\[]+)')
    preparation = re.compile(r'【開催中】\d*:\d*(.*)')
    jst = re.compile(r'＜(\d*)時 緊急クエスト予告＞')

    statuses = api.GetUserTimeline(screen_name='pso2_emg_hour')

    for status in statuses:
        i += 1
        eqs = []

        for line in status.text.splitlines():
            if jst.match(line):
                jsTime = jst.match(line).group(1)

            elif shipEQ.match(line):
                if int(shipEQ.match(line).group(1)) in ships:
                    eqname = translate(shipEQ.match(line).group(2).replace("　#PSO", ""))

                    if eqname.startswith(" "):
                        eqs.append({"ship" : shipEQ.match(line).group(1), "name" : eqname[1:]})
                    else:
                        eqs.append({"ship": shipEQ.match(line).group(1), "name": eqname})

            elif preparation.match(line):
                for x in ships:
                    eqname = translate(preparation.match(line).group(1).replace("　#PSO", ""))

                    if eqname.startswith(" "):
                        eqs.append({"ship" : "{:02d}".format(int(x)), "name" : eqname[1:]})
                    else:
                        eqs.append({"ship": "{:02d}".format(int(x)), "name": eqname})

        jsTime = datetime.strptime(status.created_at, "%a %b %d %H:%M:%S %z %Y")
        output.append({"time": jsTime.strftime("%m-%d-%Y %H:%M:%S %z"), "eqs": eqs})

    return json.dumps(output, indent=4), {'Content-Type': 'application/json; charset=utf-8'}

if __name__ == '__main__':
    app.run('localhost', debug=True)