import twit from "twit";
import moment from "moment-timezone";
import config from "./config";
import { EventEmitter } from "tsee";
import { promises as fs } from "fs";
import fetch from "node-fetch";

class Scraper {

    private twitter = new twit(config.twitter);
    public eventEmitter = new EventEmitter<{
        alert: (data: Response) => void,
    }>();
    private patterns = {
        upcoming: /^(\d+)時\s(.+)/gm,
        inProgress: /【開催中】\d+(.+)/gm,
    };

    private cache?: string;
    private translationData?: TranslationData;
    
    private async getLatestTweet(): Promise<Tweet> {
        const tweets = await this.twitter.get("statuses/user_timeline", { screen_name: "pso2_emg_hour", count: 1 });
        const data = tweets.data as Tweet[];
        const tweet = data[0];

        return tweet;
    }

    private async getQuests(tweet: Tweet): Promise<Response> {
        const creation_date = this.parseTwitterDate(tweet.created_at);

        const inProgress = this.getInProgressQuest(tweet.created_at, tweet.text);
        const upcoming = this.getUpcomingQuests(tweet.created_at, tweet.text);

        return {
            id: tweet.id_str,
            date: {
                JP: creation_date.tz("Asia/Tokyo").toString(),
                UTC: creation_date.utc().toString(),
            },
            inProgress,
            upcoming,
        }
    }

    private getInProgressQuest(tweetDate: string, text: string): Quest {
        const match = [ ...text.matchAll(this.patterns.upcoming) ][0];

        const date = parseInt(match[1], 10);
        const name = match[2];

        return {
            name: this.translateQuest(name),
            date: this.getDate(tweetDate, date),
        }
    }

    private async getTranslationData(): Promise<TranslationData> {
        // Here we get translation data from the Github API. We don't use the eqs.json
        // file directly as to not have to rebuild the container when the translation file
        // is updated, thus guaranteeing maximum uptime.

        const response = await fetch("https://raw.githubusercontent.com/RodrigoLeiteF/PSO2-EQ-API/v2/src/eqs.json");
        const data = await response.json();

        return data;
    }

    private translateQuest(jp: string): string {
        jp = jp.replace(/\[予告\]/g, ""); // Remove [Notice]
        jp = jp.replace(/【開催中】/g, ""); // Remove [In Progress]
        jp = jp.replace(/#PSO2/g, "");

        if (this.translationData) {
            return this.translationData[jp] || jp;
        } else {
            return jp;
        }
    }

    private getUpcomingQuests(tweetDate: string, text: string): Quest[] {
        const matches = text.matchAll(this.patterns.upcoming);
        const quests: Quest[] = [];

        for (let match of matches) {
            let date = parseInt(match[1], 10);
            let name = match[2];

            quests.push({
                name: this.translateQuest(name),
                date: this.getDate(tweetDate, date),
            });
        }

        return quests;
    }

    private parseTwitterDate(text: string): moment.Moment {
        return moment(text, "ddd MMM DD HH:mm:ss ZZ YYYY").utc();
    }

    private getDate(tweetDate: string, hour: number): Date {
        const tweetMoment = this.parseTwitterDate(tweetDate);
        let jpDate = tweetMoment.tz("Asia/Tokyo");

        if (hour > tweetMoment.get("hour")) {
            jpDate = jpDate.add(1, "day");
        }

        return {
            JP: jpDate.toString(),
            UTC: jpDate.utc().toString(),
        }
    }

    private async getCache(): Promise<string | undefined> {
        try {
            if (!this.cache) {
                this.cache = await fs.readFile("cache", "utf8");
            }
        } catch (err) {
            if (err.code === "ENOENT") {
                this.cache = undefined;
            } else {
                throw err;
            }
        }

        return this.cache;
    }

    private async updateCache(data: string) {
        console.log(`Updating cache with ID ${data}`);

        this.cache = data;
        await fs.writeFile("cache", data);
    }

    private async poll() {
        const tweet = await this.getLatestTweet();

        if (tweet.id_str !== await this.getCache()) {
            console.log("New EQ! Let's tell everyone...");

            this.translationData = await this.getTranslationData();
            const quests = await this.getQuests(tweet);

            this.eventEmitter.emit("alert", quests);
            await this.updateCache(quests.id);
        }
    }

    public startPolling(interval = 10000) {
        console.log("Starting poll loop");
        setInterval(this.poll.bind(this), interval);
    }

}

type Date = {
    JP: string;
    UTC: string;
}

type Tweet = {
    created_at: string;
    id: number;
    id_str: string;
    text: string;
    truncated: boolean;
}

type Response = {
    id: string,
    date: Date,
    inProgress?: Quest,
    upcoming: Quest[]
}

type Quest = {
    name: string;
    date: Date;
}

type TranslationData = { [key: string]: string };

export default Scraper;
