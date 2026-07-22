const cors = require("cors");
const app = require("../ui/server");
const { listRequests, getRequestById } = require("../db/queries");

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
// listen port 3000 — điểm vào duy nhất cho HTTP API + UI tĩnh
app.listen(API_PORT, () => {
    console.log(`API + UI đang chạy tại http://127.0.0.1:${API_PORT}`);
});
module.exports = app; // export nếu test/module khác cần