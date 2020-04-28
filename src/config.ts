const strToNumber = (str: string | undefined, def: number): number => {
    return str ? parseInt(str, 10) : def;
}

export default {
    port: strToNumber(process.env.API_PORT, 8080),
    redis: {
        host: process.env.REDIS_HOST || "localhost",
        port: strToNumber(process.env.REDIS_PORT, 6379),
    },
    twitter: {
        consumer_key: process.env.CONSUMER_KEY || "",
        consumer_secret: process.env.CONSUMER_SECRET || "",
        access_token: process.env.TOKEN || "",
        access_token_secret: process.env.TOKEN_SECRET || "" 
    }
}
