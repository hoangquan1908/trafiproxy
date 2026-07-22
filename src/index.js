// index.js
const trafficMod = require("./logger/traffic"); 
const {ensureCA, getCertDir} = require('./ca');
const {startProxy, stopProxy} = require('./proxy');
const { migrate } = require("./db/connection");
const apiServer = require("./api/server");
require("./api/ws");

// Port mặc định ban đầu
let PORT = 8888;
let activeProxyInstance = null; // Biến để quản lý server proxy

// 1. Đảm bảo CA đã được khởi tạo

ensureCA();
migrate();

global.startProxyEngine = (targetPort) => {
    if (activeProxyInstance) {
        try {
            stopProxy(activeProxyInstance);
            activeProxyInstance = null;
            console.log(`--- CLOSED OLD PROXY ON PORT ${PORT} ---`);
        } catch (e) {
            console.error("Lỗi khi đóng proxy cũ:", e);
        }
    }
    PORT = targetPort;
    
    activeProxyInstance = startProxy(PORT, (err) => {
        if (err) {
            console.error("Error when opening port", err);
        } else {
            console.log(`--- PROXY ENGINE READY ---`);
            console.log(`Proxy listening on: http://127.0.0.1:${PORT}`);
            console.log(`SSL CA Directory: ${getCertDir()}`);        
        }
    });
};

// Mặc định khởi động lần đầu với port 8888 (giữ nguyên logic cũ)
global.startProxyEngine(PORT);

/**
 * Theo dõi trạng thái pause/resume để đóng/mở server
 */
setInterval(() => {
    const isPaused = global.isProxyPaused();
    if (isPaused && activeProxyInstance) {
        stopProxy(activeProxyInstance);
        activeProxyInstance = null;
        console.log("--- PROXY ENGINE STOPPED ---");
    }
}, 1000);