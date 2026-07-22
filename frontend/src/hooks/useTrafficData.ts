// useTrafficData.ts — hook fetch API và đồng bộ vào zustand store

import { useEffect } from "react";
import { useTrafficStore } from "../store/trafficStore";

export function useTrafficData() {
  // Lấy action + state từ store — không cần useState local nữa
  const setTraffics = useTrafficStore((s) => s.setTraffics);
  const setLoading = useTrafficStore((s) => s.setLoading);
  const setError = useTrafficStore((s) => s.setError);

  useEffect(() => {
    async function loadFromApi() {
      try {
        setLoading(true);
        setError(null);

        const res = await fetch("/api/requests?limit=100&offset=0");

        if (!res.ok) {
          throw new Error(`API lỗi: ${res.status}`);
        }

        const rows = await res.json();

        // Đẩy dữ liệu vào global store thay vì setState local
        setTraffics(Array.isArray(rows) ? rows : []);
      } catch (err) {
        const msg = err instanceof Error ? err.message : "Không tải được traffic";
        setError(msg);
        console.error("[useTrafficData]", err);
      } finally {
        setLoading(false);
      }
    }

    loadFromApi();
  }, [setTraffics, setLoading, setError]);

  // Trả về slice state — component subscribe qua useTrafficStore hoặc hook này
  return {
    items: useTrafficStore((s) => s.traffics),
    loading: useTrafficStore((s) => s.loading),
    error: useTrafficStore((s) => s.error),
  };
}