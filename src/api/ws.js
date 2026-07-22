const { WebSocketServer } = require("ws");

const WS_PORT = 3001;

const wss = new WebSocketServer({ port: WS_PORT});

wss.on("listening", () => {
    console.log(`WebSocket đang chạy tại ws://127.0.0.1:${WS_PORT}`);
});


wss.on("connection", (socket) => {
    console.log("[WS] Client đã kết nối");
    socket.on("close", () => console.log("[WS] Client ngắt kết nối"));
});

function broadcast(message) {
    const payload = JSON.stringify(message);

    for (const client of wss.clients ) {
        if (client.readyState === 1) {
            client.send(payload);
        }
    }
}

module.exports = {broadcast, wss, WS_PORT};