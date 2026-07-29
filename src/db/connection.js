const fs = require('fs');
const path = require('path');
const Database = require('better-sqlite3');

const dataDir = path.resolve(__dirname, "../../data");
const dbFile = path.join(dataDir, "traffic.sqlite");

if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
}

const db = new Database(dbFile);

db.pragma('journal_mode = WAL');

db.pragma('synchronous = NORMAL');

function migrate() {
    // CREATE TABLE 
    db.exec(`
        CREATE TABLE IF NOT EXISTS requests (
            id TEXT PRIMARY KEY,          -- UUID làm khóa chính (roadmap)
            url TEXT,                     -- full URL hoặc path+host tùy mình map
            method TEXT,                  -- GET, POST, ...
            statusCode INTEGER,           -- mã HTTP response (200, 404, ...)
            reqHeaders TEXT,              -- JSON.stringify(headers request)
            resHeaders TEXT,              -- JSON.stringify(headers response)
            reqBody TEXT,                 -- body request (chuỗi)
            resBody TEXT,                 -- body response đã giải nén
            timestamp TEXT,               -- thời điểm lưu (ISO string)
            host TEXT,                    -- host để lọc sau này (cột thêm, hữu ích)
            protocol TEXT,                -- http | https
            path TEXT                     -- path riêng (tiện UI)
        );
        -- tạo index để tìm theo url / method nhanh hơn (roadmap 2.2)
        CREATE INDEX IF NOT EXISTS idx_requests_url ON requests(url);
        CREATE INDEX IF NOT EXISTS idx_requests_method ON requests(method);
        CREATE INDEX IF NOT EXISTS idx_requests_timestamp ON requests(timestamp);

         CREATE TABLE IF NOT EXISTS rules (
            id TEXT PRIMARY KEY,           -- UUID khóa chính
            pattern TEXT NOT NULL,         -- Chuỗi match (VD: api.facebook.com) — dùng như regex
            target TEXT NOT NULL,          -- Đích redirect (VD: 127.0.0.1:8080)
            enabled INTEGER DEFAULT 1,     -- 1 = bật, 0 = tắt
            createdAt TEXT                 -- Thời điểm tạo (ISO string)
        );
        CREATE INDEX IF NOT EXISTS idx_rules_pattern ON rules(pattern);
    `);
}

function getDb() {
    return db;
}

module.exports = {
    getDb,
    migrate,
    dbFile
};