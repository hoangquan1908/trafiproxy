const crypto = require("crypto");
const { getDb } = require("./connection");

let rulesCache = [];

function reloadRulesCache() {
    const db = getDb();

    rulesCache = db
        .prepare(`SELECT id, pattern, target, enabled FROM rules WHERE enabled = 1`)
        .all();
    console.log(`[Rules] Cache reload: ${rulesCache.length} rule(s)`);
    return rulesCache;
}

function getRulesCache() {
    return rulesCache;
}

function listRules() {
    const db = getDb();

    return db
        .prepare(`SELECT * FROM rules ORDER BY createdAt DESC`)
        .all();
}

/**
 * Thêm rule mới
 * @param {{ pattern: string, target: string }} data
 */

function insertRule(data) {
    const db = getDb();
    const id = crypto.randomUUID();
    const pattern = String(data.pattern || "").trim();
    const target = String(data.target || "").trim();
    const createAt = new Date().toISOString();
    if (!pattern || !target) {
        throw new Error("pattern và target không được để trống");
    }
    db.prepare(
        `INSERT INTO rules (id, pattern, target, enabled, createdAt)
         VALUES (@id, @pattern, @target, 1, @createdAt)`
    ).run({ id, pattern, target, createdAt });

    reloadRulesCache();
    return { id, pattern, target, enabled: 1, createdAt };
}

function deleteRule(id) {
    const db = getDb();
    const info = db.prepare(`DELETE FROM rules WHERE id = ?`).run(id);
    reloadRulesCache();
    return info.changes > 0;
}


function setRuleEnabled(id, enabled) {
    const db = getDb();
    const info = db
        .prepare(`UPDATE rules SET enabled = ? WHERE id = ?`)
        .run(enabled ? 1 : 0, id);
    reloadRulesCache();
    return info.changes > 0;
}

/**
 * Tìm rule khớp với host (hoặc full URL)
 * Pattern dùng như regex (không phân biệt hoa thường)
 * @returns {{ pattern, target } | null}
 */

function matchRule(hostOrUrl) {
    if (!hostOrUrl) return null;

    const text = String(hostOrUrl);

    for (const rule of rulesCache) {
        try {
            const re = new RegExp(rule.pattern, "i");
            if (re.test(text)) {
                return rule;
            }
        } catch (err) {
            console.warn("[Rules] Pattern không hợp lệ:", rule.pattern, err.message);
        }
    }
    return null;
}

module.exports = {
    reloadRulesCache,
    getRulesCache,
    listRules,
    insertRule,
    deleteRule,
    setRuleEnabled,
    matchRule,
};