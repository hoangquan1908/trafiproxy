const fs = require('fs');
const { getCaCertPath } = require('../ca');
const { matchRule } = require("../db/rules");

// Xu li request vao
async function onRequestHandler(ctx, callback) {
    if (global.isProxyPaused && global.isProxyPaused()) {
        ctx.proxyToClientResponse.writeHead(503, { "Content-Type": "text/plain" });
        ctx.proxyToClientResponse.end("Proxy is currently stopped.");
        return; 
    }

    const url = ctx.clientToProxyRequest.url;

    if (url === '/get-ca' || url === '/cert') {
        const caPath = getCaCertPath();
        if (fs.existsSync(caPath)) {
            const certFile = fs.readFileSync(caPath);
            ctx.proxyToClientResponse.writeHead(200, {
                'Content-Type': 'application/x-x509-ca-cert',
                'Content-Disposition': 'attachment; filename=trafexia-ca.crt'
            });
            ctx.proxyToClientResponse.end(certFile);
            return; 
        }
    }

    const isStatic = /\.(png|jpg|jpeg|gif|css|js|woff|woff2|svg|ico)$/i.test(url);
    if (isStatic) {
        ctx._ignoreTraffic = true; 
        return callback();          
    }

    const req = ctx.clientToProxyRequest;
    const protocol = ctx.isSSL ? 'https' : 'http';

    ctx._fullData = {
        request: {
            method: req.method,
            protocol: protocol,
            url: req.url,
            headers: req.headers,
            body: ""
        }
    };
    //MAP / REDIRECT RULES
    const originalHost = req.headers.host || "";
    
    const matched = matchRule(originalHost) || matchRule(url);

    if (matched) {
        const [targetHost, targetPortRaw] = matched.target.split(":");
        const targetPort = targetPortRaw ? parseInt(targetPortRaw, 10) : ctx.isSSL ?443 : 80;

        if (ctx.proxyToServerRequestOptions) {
            ctx.proxyToServerRequestOptions.host = targetHost;
            ctx.proxyToServerRequestOptions.port = targetPort;
        }

        req.headers.host = matched.target;

        console.log(
            `[Rules] Redirect: ${originalHost} → ${matched.target} (pattern: ${matched.pattern})`
          );
    }

    if (global.interceptEnabled !== true) {
        ctx.onRequestData((ctx, chunk, cb) => {
            if (ctx._fullData) ctx._fullData.request.body += chunk.toString();
            return cb(null, chunk); 
        });
        return callback();
    }

    console.log("[INTERCEPT] Đang chặn request:", url);
    const requestId = "req_" + Date.now();

    const interceptLog = {
        id: requestId,
        time: new Date().toLocaleTimeString(),
        isIntercepted: true, 
        host: ctx.clientToProxyRequest.headers.host,
        path: url,
        request: {
            method: ctx.clientToProxyRequest.method,
            headers: ctx.clientToProxyRequest.headers,
            body: ""
        },
        response: { status: 0, headers: {}, body: "" }
    };
    global.addTraffic(interceptLog); 
    ctx._fullData = interceptLog;

    const decision = await new Promise((resolve) => {
        global.interceptionQueue.set(requestId, { resolve });
        setTimeout(() => resolve({ action: "forward" }), 60000);
    });

    const currentLog = global.traffic.find(t => t.id === requestId);
    if (currentLog) currentLog.isIntercepted = false;

    if (decision.action === "drop") {
        ctx.proxyToClientResponse.writeHead(403);
        return ctx.proxyToClientResponse.end("Dropped");
    }

    if (decision.action === "forward") {
        const mod = decision.modifiedData;

        if (mod && mod.body !== undefined && mod.body !== "(empty)") {
            ctx.onRequestData((ctx, chunk, cb) => cb(null, null));

            ctx.onRequestEnd((ctx, cb) => {
                ctx.proxyToServerRequest.write(mod.body);
                return cb();
            });

            ctx.clientToProxyRequest.headers['content-length'] = Buffer.byteLength(mod.body);
            console.log(`[INTERCEPT] Forwarding modified body for: ${requestId}`);
            return callback();
        }
    }

    ctx.onRequestData((ctx, chunk, callback) => {
        ctx._fullData.request.body += chunk.toString();
        return callback(null, chunk);
    });

    return callback();
}

module.exports = { onRequestHandler };