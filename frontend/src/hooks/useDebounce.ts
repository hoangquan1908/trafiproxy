// useDebounce.ts — trì hoãn cập nhật giá trị 300ms (thay lodash debounce)

import { useEffect, useState } from "react";

/**
 * Trả về bản sao của `value` nhưng chỉ đổi sau `delay` ms không gõ tiếp.
 * Dùng cho ô Filter — tránh filter lại bảng mỗi lần gõ 1 ký tự.
 */
export function useDebounce<T>(value: T, delay = 300): T {
  // State giữ giá trị đã “trì hoãn”
  const [debounced, setDebounced] = useState<T>(value);

  useEffect(() => {
    // Đặt timer — sau `delay` ms mới gán value mới vào state
    const timer = setTimeout(() => {
      setDebounced(value);
    }, delay);

    // Cleanup: nếu user gõ tiếp trước khi hết delay → hủy timer cũ
    return () => clearTimeout(timer);
  }, [value, delay]); // Chạy lại mỗi khi value hoặc delay đổi

  return debounced;
}