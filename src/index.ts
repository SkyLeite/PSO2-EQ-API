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

const interval = setInterval(function ping() {
    server.clients.forEach(client => {
        if ((client as CustomWebsocket).isAlive === false) return client.terminate();

        (client as CustomWebsocket).isAlive = false;
        client.ping();
    });
}, 3000);

server.on("connection", client => {
    (client as CustomWebsocket).isAlive = true;

    client.on('pong', function () {
        (this as CustomWebsocket).isAlive = true;
    });
})

server.on("close", () => {
    clearInterval(interval);
});

interface CustomWebsocket extends WebSocket {
    isAlive: boolean;
}
