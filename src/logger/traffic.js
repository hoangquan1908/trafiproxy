// Khởi tạo mảng traffic nếu chưa tồn tại
global.traffic = global.traffic || [];

/**
 * Hàm logRequest: Lưu trữ toàn bộ dữ liệu gói tin
 * @param {Object} fullLog - Object chứa đầy đủ thông tin từ proxy.js
 */
function logRequest(fullLog) {
    // Kiểm tra dữ liệu đầu vào để tránh lỗi
    if (!fullLog || !fullLog.request) return;

    // Thêm log vào mảng global
    // giữ nguyên object fullLog để bảo toàn Header và Body
    global.traffic.push(fullLog);

    // Giới hạn bộ nhớ: Giữ lại tối đa 1000 request gần nhất
    // Việc sử dụng .shift() giúp giải phóng RAM khi mảng quá lớn
    if (global.traffic.length > 1000) {
        global.traffic.shift();
    }
}

// Gán vào global để các module khác (như proxy.js) có thể gọi trực tiếp
global.addTraffic = logRequest;

module.exports = { logRequest };