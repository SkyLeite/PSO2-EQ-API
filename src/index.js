import Express from 'express';
import Twitter from 'twit';
import config from './settings.json';
import _ from 'underscore';
import moment from 'moment';
import fs from 'mz/fs';
const app = Express();

const twitter = new Twitter({
    consumer_key: config.CONSUMER_KEY,
    consumer_secret: config.CONSUMER_SECRET,
    access_token: config.TOKEN,
    access_token_secret: config.TOKEN_SECRET
});

const translate = async (string) => {
    let file = JSON.parse(await fs.readFile('./eqs.json', 'utf-8'));
    return file[string] || string;
}

RegExp.prototype.getMatches = function *(string) {
    let match = null;
    while (match = this.exec(string)) {
        yield match;
    }
}

app.get('/eq', async (req, res) => {
    let result  = [];
    const ships = req.params.ships ? req.params.ships.split(',').filter((ship) => { return 1 <= ship <= 11 }) : _.range(1, 11);
    const tweets = (await twitter.get('statuses/user_timeline', { screen_name: 'pso2_emg_hour', count: 10 })).data;

    // Regexes
    const hour = /＜(\d*)時 緊急クエスト予告＞/;
    const inPreparation = /【準備中】(\d*):\d*\s(.*)/g;
    const shipEQ = /(\d*):([^0-9-―(\[]+)/g;

    // EQs
    // const idk = [...shipEQ.getMatches(tweets[5].text)].map((item) => { return {name: item[1], ship: item[2]} })

    // Iterates over tweets and builds the result
    for (let tweet of tweets) {
        let dict = {
            time: moment(tweet.created_at.substring(4), 'MMM DD HH:mm:ss ZZ YYYY').utcOffset('+0900').add(9, 'hours'),
            when: moment(tweet.created_at.substring(4), 'MMM DD HH:mm:ss ZZ YYYY').add({ hours: 9 , minutes: 55}).subtract(2, 'seconds')
        };

        // Checks if the Tweet contains unscheduled EQs
        if (tweet.text.match(shipEQ)) {
            let promises = [...shipEQ.getMatches(tweet.text)]
                .map(async item => {
                    return {
                        name: await translate(item[2].replace('\n', '').replace('　#PSO', '')),
                        ship: parseInt(item[1])
                    }
                });
            
            dict.eqs = await Promise.all(promises);
        }

        // Checks if the Tweet contains scheduled EQ info
        else if (tweet.text.match(inPreparation)) {
            let match = [...inPreparation.getMatches(tweet.text)][0];
            let hour = match[1];
            let eq = await translate(match[2].replace('　#PSO', ''));

            dict.eqs = [];
            for (let ship of ships) {
                dict.eqs.push({
                    name: eq,
                    ship: ship
                });
            }
        }

        if (dict.eqs) result.push(dict);
    }

    res.send(result);
});

app.get('/eq/scheduled', async (req, res) => {

});

app.listen(5000, () => {
    console.log("Listening on port 5000.");
});