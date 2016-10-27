import json
import re
from datetime import datetime

import twitter
from flask import Flask, abort, make_response, jsonify

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
    return make_response(jsonify({'error': 'Not found'}), 404)

@app.route('/eq/api', methods=['GET'])
def test():
    output = []

    shipEQ = re.compile(r'(\d*):([^0-9-―(\[]+)')
    preparation = re.compile(r'【開催中】\d*:\d*(.*)')
    jst = re.compile(r'＜(\d*)時 緊急クエスト予告＞')

    statuses = api.GetUserTimeline(screen_name='pso2_emg_hour')

    i = 0
    for status in statuses:
        i += 1
        eqs = []

        for line in status.text.splitlines():
            if jst.match(line):
                jsTime = jst.match(line).group(1)

            elif shipEQ.match(line):
                eqs.append({"ship" : shipEQ.match(line).group(1), "name" : translate(shipEQ.match(line).group(2).replace("　#PSO", ""))})

            elif preparation.match(line):
                for x in range(1, 11):
                    eqs.append({"ship" : "{:02d}".format(x), "name" : translate(preparation.match(line).group(1).replace("　#PSO", ""))})

        jsTime = datetime.strptime(status.created_at, "%a %b %d %H:%M:%S %z %Y")
        output.append({"time" : jsTime.strftime("%Y-%m-%d %H:%M:%S"), "eqs" : eqs})


    return json.dumps(output, indent=4)

@app.route('/eq/api/ship/<int:ship_number>', methods=['GET'])
def get_ship(ship_number):
    output = []
    statuses = api.GetUserTimeline(screen_name='pso2_emg_hour')

    shipEQ = re.compile(r'({:02d}):([^0-9-―(\[]+)'.format(ship_number))
    preparation = re.compile(r'【開催中】\d*:\d*(.*)')
    jst = re.compile(r'＜(\d*)時 緊急クエスト予告＞')

    i = 0
    for status in statuses:
        i += 1
        eqs = []

        for line in status.text.splitlines():
            if jst.match(line):
                jsTime = jst.match(line).group(1)

            elif shipEQ.match(line):
                eqs.append({"ship" : shipEQ.match(line).group(1), "name" : translate(shipEQ.match(line).group(2).replace("　#PSO", ""))})

            elif preparation.match(line):
                eqs.append({"ship" : "{:02d}".format(ship_number), "name" : translate(preparation.match(line).group(1).replace("　#PSO", ""))})

        jsTime = datetime.strptime(status.created_at, "%a %b %d %H:%M:%S %z %Y")
        output.append({"time": jsTime.strftime("%Y-%m-%d %H:%M:%S"), "eqs": eqs})

    return json.dumps(output, indent=4)

if __name__ == '__main__':
    app.run('localhost')