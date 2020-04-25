import * as WebSocket from "ws";
import Scraper from "./twitter";

const server = new WebSocket.Server({
    port: 8080
});

const scraper = new Scraper();

scraper.startPolling();

server.on("connection", () => {
    server.clients.forEach(client => {
        if (client.readyState === WebSocket.OPEN) {
            client.send("New EQ! =O");
        }
    })
});
