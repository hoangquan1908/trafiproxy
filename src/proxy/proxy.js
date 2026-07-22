const Proxy = require("http-mitm-proxy").Proxy;
const { onRequestHandler } = require("../handlers/request");
const { onResponseHandler } = require("../handlers/response");


const proxy = new Proxy();

proxy.onConnect((req, socket, head, callback) => {
    const host = req.url.split(':')[0];
    console.log("[HTTPS HANDSHAKE] Chặn và giải mã kết nối tới:", host);
    return callback();
})

proxy.onError((ctx, err) => {
    if (err.code !== 'ECONNRESET') {
        console.error("[ERROR]", err);
    }
});

proxy.onRequest(onRequestHandler);
proxy.onResponse(onResponseHandler);


module.exports = proxy;