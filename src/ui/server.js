// server.js
const express = require("express");
const path = require("path");
require("../logger/traffic");
const fs = require('fs');

const { getCaCertPath } = require("../ca");

const app = express();

app.use(express.json()); // Để đọc được body JSON từ UI gửi lên
app.use(express.static(path.join(__dirname, "public")));

app.get("/download-ca", (req, res) => {
    const certPath = getCaCertPath();

    console.log("Đang tìm cert tại:", certPath);
    
    if (fs.existsSync(certPath)) {
        res.setHeader('Content-Type', 'application/x-x509-ca-cert');
        res.download(certPath, 'trafexia-ca.crt'); 
    } else {
        res.status(404).send(`Không tìm thấy file tại: ${certPath}`);
    }
});

let proxyPaused = true;

global.isProxyPaused = () => proxyPaused;
global.setProxyPaused = (v) => proxyPaused = v;
global.lastSelectedPort = 8888; // Lưu lại port cuối cùng user nhập

app.post("/proxy/pause", (req, res) => {
    proxyPaused = true;
    res.json({ pause: true });
});

/**
 * CHỨC NĂNG MỚI: Resume kèm theo việc thay đổi Port
 */
app.post("/proxy/resume", (req, res) => {
    proxyPaused = false;
    const newPort = req.body.port ? parseInt(req.body.port) : global.lastSelectedPort;
    
    global.lastSelectedPort = newPort;

    // Gọi hàm khởi động lại ở index.js
    if (typeof global.startProxyEngine === "function") {
        global.startProxyEngine(newPort);
    }

    res.json({ pause: false, port: newPort });
});

app.post("/proxy/status", (req, res) => {
    res.json({ pause: proxyPaused, port: global.lastSelectedPort });
});

/**
 * Cho proxy push data vào UI
 */
global.addTraffic = (item) => {
    if (!global.traffic) global.traffic = []; // Đảm bảo mảng tồn tại
    global.traffic.push(item);
    if (global.traffic.length > 500) global.traffic.shift(); 
};

app.get("/traffic", (req, res) => {
    res.json(global.traffic || []); 
});

app.post("/traffic/clear", (req, res) => {
    if (global.traffic) global.traffic.length = 0; 
    res.json({ ok: true });
});

//Xu li intercept
// Thêm vào server.js
global.interceptEnabled = false;
global.interceptionQueue = new Map(); // Lưu trữ các resolve function

app.post("/proxy/intercept/toggle", (req, res) => {
    global.interceptEnabled = req.body.enabled === true;
    console.log("Intercept status changed to:", global.interceptEnabled);

    // NẾU TẮT INTERCEPT: Tự động Forward toàn bộ các request đang bị treo
    if (!global.interceptEnabled) {
        global.interceptionQueue.forEach((promiseRef, id) => {
            promiseRef.resolve({ action: "forward" }); // Giải phóng request
            
            // Cập nhật lại trong mảng traffic để UI mất màu cam ở lần load tới
            const reqItem = global.traffic.find(t => t.id === id);
            if (reqItem) reqItem.isIntercepted = false;
        });
        global.interceptionQueue.clear(); // Xóa sạch hàng chờ
    }

    res.json({ enabled: global.interceptEnabled });
});
app.post("/proxy/intercept/action", (req, res) => {
    const { id, action, modifiedData } = req.body;
    const promiseRef = global.interceptionQueue.get(id);

    if (promiseRef) {
        if (action === "drop") {
            promiseRef.resolve({ action: "drop" });
        } else {
            // Forward với dữ liệu có thể đã bị sửa
            promiseRef.resolve({ action: "forward", modifiedData });
        }
        global.interceptionQueue.delete(id);
    }
    res.json({ success: true });
});

/**
 * Serve UI
 */
module.exports = app;