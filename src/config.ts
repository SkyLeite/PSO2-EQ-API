export default {
    port: process.env.API_PORT ? parseInt(process.env.API_PORT, 10) : 8080,
    twitter: {
        consumer_key: process.env.CONSUMER_KEY || "",
        consumer_secret: process.env.CONSUMER_SECRET || "",
        access_token: process.env.TOKEN || "",
        access_token_secret: process.env.TOKEN_SECRET || "" 
    }
}
