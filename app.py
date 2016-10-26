from flask import Flask, abort, make_response, jsonify
from datetime import datetime
import twitter
import json
import re

api = twitter.Api(consumer_key='KvfFTxjV015r0ptwqad7Qw21u',
                      consumer_secret='Ju6F5wNkC7sOpeuBEoBy6Y9yLINpsWbTeTUb8tV4VysWib52A1',
                      access_token_key='323253859-8XSNSi4odO796qnA0PnTKhNzH71coAt0GYzhzp1t',
                      access_token_secret='pN7KMmzd9QUrzMtuZEOlbQdVDEnVogmJjhIx17Xx5WGVZ')

app = Flask(__name__)

tasks = [
    {
        'id': 1,
        'title': u'Buy groceries',
        'description': u'Milk, Cheese, Pizza, Fruit, Tylenol',
        'done': False
    },
    {
        'id': 2,
        'title': u'Learn Python',
        'description': u'Need to find a good Python tutorial on the web',
        'done': False
    }
]

@app.errorhandler(404)
def not_found(error):
    return make_response(jsonify({'error': 'Not found'}), 404)

@app.route('/eq/api', methods=['GET'])
def test():
    output = {}

    shipEQ = re.compile(r'(\d*):([^0-9-―(\[]+)')
    preparation = re.compile(r'【開催中】\d*:\d*(.*)')
    jst = re.compile(r'＜(\d*)時 緊急クエスト予告＞')

    def translate(string):
        with open('eqs.json', encoding='utf8') as file:
            file = json.load(file)
            for key in file:
                string = string.replace(key, file[key])

            return string

    statuses = api.GetUserTimeline(screen_name='pso2_emg_hour')

    i = 0
    for status in statuses:
        i += 1
        eq = {}

        for line in status.text.splitlines():
            if jst.match(line):
                jsTime = jst.match(line).group(1)

            elif shipEQ.match(line):
                eq.update({shipEQ.match(line).group(1) : translate(shipEQ.match(line).group(2).replace("　#PSO", ""))})

            elif preparation.match(line):
                for x in range(1, 11):
                    eq.update({"{:02d}".format(x) : translate(preparation.match(line).group(1).replace("　#PSO", ""))})

        jsTime = datetime.strptime(status.created_at, "%a %b %d %H:%M:%S %z %Y")
        output.update({jsTime.strftime("%Y-%m-%d %H:%M:%S") : eq})


    return json.dumps(output, indent=4, sort_keys=True)


@app.route('/todo/api/v1.0/tasks/<int:task_id>', methods=['GET'])
def get_task(task_id):
    task = [task for task in tasks if task['id'] == task_id]
    if len(task) == 0:
        abort(404)
    return jsonify({'task': task[0]})

if __name__ == '__main__':
    app.run(debug=True)