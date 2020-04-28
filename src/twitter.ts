import twit from "twit";
import config from "./config";
import { EventEmitter } from "tsee";
import { promises as fs } from "fs";
import fetch from "node-fetch";
import { parse, addHours, subHours, formatDistance, getHours, addDays, isAfter } from "date-fns";
import { utcToZonedTime, format } from "date-fns-tz";
import { promisify } from "util";
import redis from "redis";

class Scraper {

    private twitter = new twit(config.twitter);
    public eventEmitter = new EventEmitter<{
        alert: (data: Response) => void,
    }>();
    private patterns = {
        upcoming: /^(\d+)時\s(.+)/gm,
        inProgress: /【開催中】(\d+)時\s(.+)/gm,
    };

    private redisClient = redis.createClient({
        host: config.redis.host,
        port: config.redis.port,
    });

    private getAsync = promisify(this.redisClient.get).bind(this.redisClient);
    private setAsync = promisify(this.redisClient.set).bind(this.redisClient);
    private translationData?: TranslationData;

    private async getLatestTweet(): Promise<Tweet> {
        const tweets = await this.twitter.get("statuses/user_timeline", { screen_name: "pso2_emg_hour", count: 1 });
        const data = tweets.data as Tweet[];
        const tweet = data[0];

        return tweet;
    }

    private async getQuests(tweet: Tweet): Promise<Response> {
        const inProgress = this.getInProgressQuest(tweet.created_at, tweet.text);
        const upcoming = this.getUpcomingQuests(tweet.created_at, tweet.text);

        const result: Response = {
            id: tweet.id_str,
            date: this.getDate(tweet.created_at, 0),
            upcoming,
        }

        if (inProgress) {
            result.inProgress = inProgress;
        }

        return result;
    }

    private getInProgressQuest(tweetDate: string, text: string): Quest | undefined {
        const match = [...text.matchAll(this.patterns.inProgress)][0];

        if (!match || match.length < 3) {
            return;
        }

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

            const result = {
                name: this.translateQuest(name),
                date: this.getDate(tweetDate, date),
            };

            quests.push(result);
        }

        return quests;
    }

    private parseTwitterDate(text: string): Date {
        return parse(text, "EEE MMM dd HH:mm:ss xxxx yyyy", new Date());
    }

    private dateToISO(date: Date, timeZone: string): string {
        return format(date, "yyyy-MM-dd'T'HH:mm:ssxx", { timeZone });
    }

    private getDate(tweetDate: string, hour: number): ApiDate {
        const timeZone = "Asia/Tokyo"; 
        const tweetMoment = this.parseTwitterDate(tweetDate);
        let jpDate = utcToZonedTime(tweetMoment, timeZone, { timeZone });

        const hoursToAdd = hour - jpDate.getHours();
        let jpResult = addHours(jpDate, hoursToAdd);
        let utcResult = subHours(jpResult, 9); // Offset to UTC
        let difference;

        const isAhead = isAfter(jpResult, jpDate);

        if (isAhead) {
            jpResult = addDays(jpResult, 1);
            difference = formatDistance(jpResult, jpDate, {
                addSuffix: true
            });
        } else {
            difference = formatDistance(jpDate, jpResult, {
                addSuffix: true
            });
        }

        difference = difference.charAt(0).toUpperCase() + difference.slice(1); // capitalize first letter

        return {
            JP: this.dateToISO(jpResult, timeZone),
            UTC: this.dateToISO(utcResult, "Etc/UTC"),
            difference, 
        }
    }

    private async getCache(): Promise<string | undefined> {
        return this.getAsync("eq");
    }

    private async updateCache(data: string) {
        console.log(`Updating cache with ID ${data}`);

        return this.setAsync("eq", data);
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

type ApiDate = {
    JP: string;
    UTC: string;
    difference: string;
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
    date: ApiDate,
    inProgress?: Quest,
    upcoming: Quest[]
}

type Quest = {
    name: string;
    date: ApiDate;
}

type TranslationData = { [key: string]: string };

export default Scraper;
