import Express from 'express';
import Twitter from 'twit';
import config from './settings.json';
import _ from 'underscore';
const app = Express();

const twitter = new Twitter({
    consumer_key: config.CONSUMER_KEY,
    consumer_secret: config.CONSUMER_SECRET,
    access_token: config.TOKEN,
    access_token_secret: config.TOKEN_SECRET
});

RegExp.prototype.getMatches = function *(string) {
    let match = null;
    while (match = this.exec(string)) {
        yield match;
    }
}

app.get('/eq', async (req, res) => {
    const ships = req.params.ships ? req.params.ships.split(',').filter((ship) => { return 1 <= ship <= 11 }) : _.range(1, 11);
    const tweets = (await twitter.get('statuses/user_timeline', { screen_name: 'pso2_emg_hour', count: 10 })).data;

    // Regexes
    const hour = /＜(\d*)時 緊急クエスト予告＞/;
    const inPreparation = /【準備中】\d*:\d*\s(.*)/;
    const shipEQ = /(\d*):([^0-9-―(\[]+)/g;

    const idk = [...shipEQ.getMatches(tweets[8].text)].map((item) => { return {test: item} })

    res.send(tweets);
});

app.listen(3000, () => {
    console.log("Listening on port 3000.");
})