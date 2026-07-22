// useWSListener.ts — hook lắng nghe WebSocket realtime từ backend :3001

import { useEffect } from "react";
import type { TrafficRow } from "../types/traffic";

// Structure dữ liệu JSON mà backend gửi qua WebSocket (queries.js → broadcast)
interface WsMessage {
  type: string; // Loại sự kiện (ví dụ: "new_request")
  data?: TrafficRow; // Dữ liệu gói tin traffic đi kèm (nếu có)
}

// Định nghĩa các Tham số / Tùy chọn đầu vào cho Custom Hook
interface UseWSListenerOptions {
  onNewRequest: (row: TrafficRow) => void; // Hàm callback kích hoạt khi có gói traffic mới
  enabled?: boolean; // Cờ cho phép bật/tắt kết nối WS (mặc định là true)
}

export function useWSListener({ onNewRequest, enabled = true }: UseWSListenerOptions) {
  useEffect(() => {
    // Nếu enabled = false (đang tắt lắng nghe) thì không thực hiện kết nối
    if (!enabled) return;

    // Tự động lấy hostname hiện tại (localhost hoặc IP LAN) — kết nối trực tiếp cổng 3001
    const wsUrl = `ws://${window.location.hostname}:3001`;

    // Biến lưu trữ đối tượng WebSocket
    let ws: WebSocket | null = null;

    // Biến lưu ID của bộ đếm thời gian tự động kết nối lại (reconnect)
    let reconnectTimer: ReturnType<typeof setTimeout> | null = null;

    // Cờ đánh dấu đóng do React unmount — phân biệt với mất mạng tự reconnect
    let closedByCleanup = false;

    // Hàm nội bộ tạo kết nối WebSocket
    function connect() {
      ws = new WebSocket(wsUrl); // Mở socket tới server WS

      ws.onopen = () => {
        console.log("[WS] Đã kết nối", wsUrl); // Log khi kết nối thành công
      };

      ws.onmessage = (event) => {
        try {
          // event.data là chuỗi JSON — parse thành object
          const msg: WsMessage = JSON.parse(event.data);

          // Chỉ xử lý event traffic mới — bỏ qua message khác loại
          if (msg.type !== "new_request" || !msg.data) return;

          // Gọi callback do App truyền vào — thêm dòng mới vào bảng
          onNewRequest(msg.data);
        } catch (err) {
          console.error("[WS] Parse message lỗi:", err);
        }
      };

      ws.onerror = () => {
        console.warn("[WS] Lỗi kết nối"); // Lỗi mạng / server chưa chạy
      };

      ws.onclose = () => {
        // Nếu không phải do unmount → thử kết nối lại sau 2 giây
        if (!closedByCleanup) {
          reconnectTimer = setTimeout(connect, 2000);
        }
      };
    }

    connect(); // Bắt đầu kết nối lần đầu

    // Cleanup function — React gọi khi component unmount hoặc dependency đổi
    return () => {
      closedByCleanup = true; // Đánh dấu đóng chủ động — không reconnect
      if (reconnectTimer) clearTimeout(reconnectTimer); // Hủy timer reconnect nếu còn
      ws?.close(); // Đóng socket — giải phóng tài nguyên
    };
  }, [enabled, onNewRequest]); // Chạy lại khi enabled hoặc callback đổi
}