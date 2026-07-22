const zlib = require("zlib");
const { insertRequest } = require("../db/queries");
/**
 *
 * @param {Buffer} rawBuffer - body response dạng binary gốc 
 * @param {string|undefined} encoding - giá trị header content-encoding 
 * @returns {string} body đã giải nén 
 */

function decompressBody(rawBuffer, encoding) { 
    const enc = String(encoding || "") 
        .split(",")[0]
        .trim()
        .toLowerCase()
    try {
        if (enc === "gzip" || enc === "x-gzip") { 
            return zlib.gunzipSync(rawBuffer).toString("utf8");
        }
        if (enc === "br" || enc === "brotli") {
            return zlib.brotliDecompressSync(rawBuffer).toString("utf8");
        }

        if (enc === "deflate") {
            return zlib.inflateSync(rawBuffer).toString("utf8");
        }

        return rawBuffer.toString("utf8");

    } catch (err ) {
        console.error("[DECOMPRESS]", enc, err.message);

        return rawBuffer.toString("utf8");
    }
}

function onResponseHandler(ctx, callback) {
    if (ctx._ignoreTraffic || !ctx._fullData) return callback();

    const res = ctx.serverToProxyResponse;

    const contentEncoding = res.headers["content-encoding"];

    ctx._fullData.response = {
        status: res.statusCode,
        headers: res.headers,
        body: ""
    };

    const chunks = [];

    ctx.onResponseData((ctx, chunk, callback) => {
        chunks.push(Buffer.from(chunk));

        return callback(null, chunk);
    });

    ctx.onResponseEnd((ctx, callback) => {
        if (!ctx._fullData || !ctx._fullData.response) return callback();

        const rawBuffer = Buffer.concat(chunks);

        ctx._fullData.response.body = decompressBody(rawBuffer, contentEncoding);

        const fulllog = {
            time: new Date().toLocaleTimeString(),
            protocol: ctx._fullData.request.protocol,
            host: ctx.clientToProxyRequest.headers.host,
            path: ctx.clientToProxyRequest.url,
            request: ctx._fullData.request,
            response: ctx._fullData.response
        };

        if (global.addTraffic) global.addTraffic(fulllog);

        insertRequest(fulllog);

        return callback();
    });

    return callback();
}

module.exports = {onResponseHandler};