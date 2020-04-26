import * as WebSocket from "ws";
import Scraper from "./twitter";
import config from "./config";

const server = new WebSocket.Server({
    port: config.port,
});

const scraper = new Scraper();
scraper.startPolling();

scraper.eventEmitter.on("alert", response => {
    server.clients.forEach(client => {
        if (client.readyState === WebSocket.OPEN) {
            client.send(JSON.stringify(response));
        }
    })
});