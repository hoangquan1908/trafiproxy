const crypto = require('crypto');
const { getDb } = require('./connection');

/**
 * @returns {string|null} 
 */

function insertRequest(data) {
    try {
        const db = getDb();
        const id = crypto.randomUUID();
        const method = (data.request && data.request.method) || "";
        const protocol = data.protocol || (data.request && data.request.protocol) || "http";
        const host = data.host || "";
        const pathName = data.path || (data.request && data.request.url) || "";

        const url = `${protocol}://${host}${pathName}`;

        const statusCode = (data.response && data.response.status) || 0;
        const reqHeaders = JSON.stringify((data.request && data.request.headers) || {});
        const resHeaders = JSON.stringify((data.response && data.response.headers) || {});
        const reqBody = (data.request && data.request.body) || "";
        const resBody = (data.response && data.response.body) || "";
        const timestamp = new Date().toISOString();

        const stmt = db.prepare(`
            INSERT INTO requests (
                id, url, method, statusCode,
                reqHeaders, resHeaders, reqBody, resBody,
                timestamp, host, protocol, path
            ) VALUES (
                @id, @url, @method, @statusCode,
                @reqHeaders, @resHeaders, @reqBody, @resBody,
                @timestamp, @host, @protocol, @path
            )
        `);
        // insert
        stmt.run({
            id,
            url,
            method,
            statusCode,
            reqHeaders,
            resHeaders,
            reqBody,
            resBody,
            timestamp,
            host,
            protocol,
            path: pathName
        });

        const row = {
            id, url, method, statusCode, reqHeaders, resHeaders,
            reqBody, resBody, timestamp, host, protocol, path: pathName
        };

        try {
            const { broadcast } = require ("../api/ws");
            broadcast({ type: "new_request", data: row});
        } catch (e) {

        }

        return row;
    }   
    catch (err) {
        console.error("[DB insertRequest]", err.message);
            return null;
    } 
}

function listRequests(limit = 100, offset = 0) {
    const db = getDb();

    const safeLimit = Math.min(Math.max(Number(limit) || 100 , 1), 500);
    const safeOffset = Math.max(Number(offset) || 0,0)

    const rows = db.prepare(`
        SELECT id, url, method, statusCode, reqHeaders, resHeaders,
               reqBody, resBody, timestamp, host, protocol, path
        FROM requests
        ORDER BY timestamp DESC
        LIMIT ? OFFSET ?
    `).all(safeLimit, safeOffset);
    return rows;
}

function getRequestById(id) { // tạo hàm getRequestById để lazy-load body theo id
    const db = getDb();
    // get() = lấy 1 dòng hoặc undefined
    return db.prepare(`SELECT * FROM requests WHERE id = ?`).get(id) || null;
}

module.exports = {insertRequest , listRequests, getRequestById};