const cors = require("cors");
const app = require("../ui/server");
const { listRequests, getRequestById } = require("../db/queries");
const {
    listRules,
    insertRule,
    deleteRule,
    setRuleEnabled,
} = require("../db/rules");

const API_PORT = 3000;

app.use(cors());

app.get("/api/requests", (req, res) => {
    try {
        const limit = req.query.limit;
        const offset = req.query.offset;
        const rows = listRequests(limit, offset);
        res.json(rows);
    } catch (err) {
        console.error("[API GET /api/requests]", err.message);
        res.status(500).json({ error: "Không đọc được dữ liệu" });
    }
});

app.get("/api/requests/:id", (req, res) => { // tạo route lấy chi tiết theo UUID
    try {
        const row = getRequestById(req.params.id); // params.id = đoạn :id trên URL
        if (!row) return res.status(404).json({ error: "Không tìm thấy" });
        res.json(row);
    } catch (err) {
        console.error("[API GET /api/requests/:id]", err.message);
        res.status(500).json({ error: "Lỗi server" });
    }
});

// GET /api/rules — danh sách toàn bộ rule cho UI
app.get("/api/rules", (req, res) => {
    try {
      res.json(listRules());
    } catch (err) {
      console.error("[API GET /api/rules]", err.message);
      res.status(500).json({ error: "Không đọc được rules" });
    }
  });
  
  // POST /api/rules — tạo rule mới { pattern, target }
  app.post("/api/rules", (req, res) => {
    try {
      const rule = insertRule(req.body || {});
      res.status(201).json(rule);
    } catch (err) {
      console.error("[API POST /api/rules]", err.message);
      res.status(400).json({ error: err.message });
    }
  });
  
  // DELETE /api/rules/:id — xóa rule
  app.delete("/api/rules/:id", (req, res) => {
    try {
      const ok = deleteRule(req.params.id);
      if (!ok) return res.status(404).json({ error: "Không tìm thấy rule" });
      res.json({ ok: true });
    } catch (err) {
      console.error("[API DELETE /api/rules/:id]", err.message);
      res.status(500).json({ error: "Xóa thất bại" });
    }
  });
  
  // PATCH /api/rules/:id — bật/tắt { enabled: true|false }
  app.patch("/api/rules/:id", (req, res) => {
    try {
      const enabled = !!(req.body && req.body.enabled);
      const ok = setRuleEnabled(req.params.id, enabled);
      if (!ok) return res.status(404).json({ error: "Không tìm thấy rule" });
      res.json({ ok: true, enabled });
    } catch (err) {
      console.error("[API PATCH /api/rules/:id]", err.message);
      res.status(500).json({ error: "Cập nhật thất bại" });
    }
  });

// listen port 3000 — điểm vào duy nhất cho HTTP API + UI tĩnh
app.listen(API_PORT, () => {
    console.log(`API + UI đang chạy tại http://127.0.0.1:${API_PORT}`);
});
module.exports = app; // export nếu test/module khác cần