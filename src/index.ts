import io from "socket.io";
import Scraper from "./twitter";
import config from "./config";

const server = io();

const scraper = new Scraper();
scraper.startPolling();

scraper.eventEmitter.on("alert", response => {
    server.emit("quest", response);
});

server.listen(8080)
