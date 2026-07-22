// DetailPane.tsx — panel bên phải: lazy-load chi tiết request theo id

import { useEffect, useState } from "react";
import type { TrafficRow } from "../types/traffic";
import JsonViewer from "./JsonViewer";

// 3 tab theo roadmap: Headers / Payload / Response
type DetailTab = "headers" | "payload" | "response";

interface DetailPaneProps {
  selectedId: string | null; // ActiveID — null = chưa chọn dòng nào
  onClose: () => void; // Đóng panel (nút ✕)
}

export default function DetailPane({ selectedId, onClose }: DetailPaneProps) {
  // Chi tiết đầy đủ sau khi fetch /api/requests/:id
  const [detail, setDetail] = useState<TrafficRow | null>(null);

  // true khi đang gọi API lazy-load
  const [loading, setLoading] = useState(false);

  // Message lỗi nếu fetch fail / 404
  const [error, setError] = useState<string | null>(null);

  // Tab đang active trong panel
  const [tab, setTab] = useState<DetailTab>("headers");

  // Mỗi lần selectedId đổi → fetch lại body/headers đầy đủ
  useEffect(() => {
    // Chưa chọn dòng → xóa detail cũ
    if (!selectedId) {
      setDetail(null);
      setError(null);
      return;
    }

    // Biến cờ tránh setState sau khi unmount / đổi id nhanh
    let cancelled = false;

    async function loadDetail() {
      try {
        setLoading(true);
        setError(null);
        setTab("headers"); // Reset về tab Headers khi chọn request mới

        // Lazy-load: chỉ tải 1 gói theo id — tránh nhồi body nặng vào list
        const res = await fetch(`/api/requests/${selectedId}`);

        if (!res.ok) {
          throw new Error(res.status === 404 ? "Không tìm thấy request" : `API lỗi: ${res.status}`);
        }

        const row: TrafficRow = await res.json();
        if (!cancelled) setDetail(row);
      } catch (err) {
        if (!cancelled) {
          const msg = err instanceof Error ? err.message : "Không tải được chi tiết";
          setError(msg);
          setDetail(null);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    loadDetail();

    // Cleanup khi selectedId đổi hoặc component unmount
    return () => {
      cancelled = true;
    };
  }, [selectedId]);

  // Chưa chọn dòng nào → panel trống hướng dẫn
  if (!selectedId) {
    return (
      <aside className="w-[380px] shrink-0 border-l border-slate-700 bg-slate-900 flex items-center justify-center text-slate-600 text-xs p-4 text-center">
        Click 1 dòng trong bảng để xem Request Detail
      </aside>
    );
  }

  // Class chung cho nút tab
  function tabClass(name: DetailTab): string {
    const active = tab === name;
    return [
      "px-3 py-1.5 text-xs rounded-md transition-colors",
      active
        ? "bg-sky-500/20 text-sky-400 border border-sky-500/40"
        : "text-slate-500 hover:text-slate-300 hover:bg-slate-800",
    ].join(" ");
  }

  return (
    <aside className="w-[420px] shrink-0 border-l border-slate-700 bg-slate-900 flex flex-col min-h-0">
      {/* Header panel: tiêu đề + nút đóng */}
      <div className="px-3 py-2 border-b border-slate-700 flex items-center justify-between shrink-0">
        <div className="min-w-0">
          <h3 className="text-sky-400 text-xs font-bold uppercase tracking-wider">
            Request Detail
          </h3>
          {detail && (
            <p className="text-slate-500 text-[10px] truncate mt-0.5" title={detail.url}>
              {detail.method} {detail.host}
              {detail.path}
            </p>
          )}
        </div>
        <button
          type="button"
          onClick={onClose}
          className="text-slate-500 hover:text-slate-200 text-sm px-2"
          title="Đóng panel"
        >
          ✕
        </button>
      </div>

      {/* Tab menu: Headers | Payload | Response */}
      <div className="px-3 py-2 border-b border-slate-800 flex gap-1 shrink-0">
        <button type="button" className={tabClass("headers")} onClick={() => setTab("headers")}>
          Headers
        </button>
        <button type="button" className={tabClass("payload")} onClick={() => setTab("payload")}>
          Payload
        </button>
        <button type="button" className={tabClass("response")} onClick={() => setTab("response")}>
          Response
        </button>
      </div>

      {/* Nội dung tab */}
      <div className="flex-1 min-h-0 overflow-auto">
        {loading && (
          <p className="text-slate-500 text-xs p-4">Đang tải chi tiết...</p>
        )}

        {error && (
          <p className="text-red-400 text-xs p-4">{error}</p>
        )}

        {!loading && !error && detail && tab === "headers" && (
          <div className="p-2 space-y-3">
            <section>
              <h4 className="text-[10px] uppercase text-slate-500 px-1 mb-1">
                Request Headers
              </h4>
              {/* reqHeaders là chuỗi JSON trong SQLite → JsonViewer parse giúp */}
              <JsonViewer raw={detail.reqHeaders ?? "{}"} />
            </section>
            <section>
              <h4 className="text-[10px] uppercase text-slate-500 px-1 mb-1">
                Response Headers — status {detail.statusCode || "-"}
              </h4>
              <JsonViewer raw={detail.resHeaders ?? "{}"} />
            </section>
          </div>
        )}

        {!loading && !error && detail && tab === "payload" && (
          <div className="p-2">
            <h4 className="text-[10px] uppercase text-slate-500 px-1 mb-1">
              Request Body (Payload)
            </h4>
            <JsonViewer raw={detail.reqBody} />
          </div>
        )}

        {!loading && !error && detail && tab === "response" && (
          <div className="p-2">
            <h4 className="text-[10px] uppercase text-slate-500 px-1 mb-1">
              Response Body
            </h4>
            <JsonViewer raw={detail.resBody} />
          </div>
        )}
      </div>
    </aside>
  );
}