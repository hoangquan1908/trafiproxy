// NetworkTable.tsx — bảng traffic 

import type { TrafficRow } from "../types/traffic";

interface NetworkTableProps {
  items: TrafficRow[]; // danh sách request hiển thị
  selectedId?: string | null; // id dòng đang chọn (cho detail pane sau)
  onSelect?: (row: TrafficRow) => void; // callback khi click 1 dòng
}

// format thời gian từ ISO string → HH:MM:SS
function formatTime(timestamp: string): string {
  if (!timestamp) return "-";
  try {
    return new Date(timestamp).toLocaleTimeString();
  } catch {
    return "-";
  }
}

// tính size tổng request + response body (bytes)
function formatSize(row: TrafficRow): string {
  const reqLen = row.reqBody?.length ?? 0;
  const resLen = row.resBody?.length ?? 0;
  const total = reqLen + resLen;
  if (total === 0) return "-";
  if (total < 1024) return `${total} B`;
  return `${(total / 1024).toFixed(1)} KB`;
}

// màu status theo nhóm 2xx / 4xx / 5xx
function statusClass(code: number): string {
  if (!code) return "text-slate-500";
  if (code >= 200 && code < 300) return "text-green-400";
  if (code >= 300 && code < 400) return "text-yellow-400";
  if (code >= 400 && code < 500) return "text-orange-400";
  if (code >= 500) return "text-red-400";
  return "text-slate-400";
}

// màu method GET / POST / DELETE...
function methodClass(method: string): string {
  const m = method.toUpperCase();
  if (m === "GET") return "text-sky-400";
  if (m === "POST") return "text-green-400";
  if (m === "PUT") return "text-amber-400";
  if (m === "DELETE") return "text-red-400";
  if (m === "OPTIONS") return "text-purple-400";
  return "text-slate-400";
}

export default function NetworkTable({
  items,
  selectedId,
  onSelect,
}: NetworkTableProps) {
  return (
    <div className="flex-1 min-w-0 flex flex-col overflow-hidden">
      {/* header bảng — sticky khi scroll */}
      <div className="overflow-auto flex-1">
        <table className="w-full text-xs border-collapse">
          <thead className="sticky top-0 z-10 bg-slate-900">
            <tr className="text-left text-slate-500 uppercase tracking-wider border-b border-slate-700">
              <th className="px-2 py-2 w-10 text-center">#</th>
              <th className="px-2 py-2 w-16">Status</th>
              <th className="px-2 py-2 w-14">Type</th>
              <th className="px-2 py-2 w-16">Method</th>
              <th className="px-2 py-2 min-w-[200px]">URL</th>
              <th className="px-2 py-2 w-40">Host</th>
              <th className="px-2 py-2 w-16 text-right">Size</th>
              <th className="px-2 py-2 w-20">Time</th>
            </tr>
          </thead>
          <tbody>
            {items.length === 0 ? (
              <tr>
                <td
                  colSpan={8}
                  className="px-4 py-16 text-center text-slate-600"
                >
                  Chưa có traffic. Bật proxy và gửi request để thấy dữ liệu.
                </td>
              </tr>
            ) : (
              items.map((row, index) => {
                const isSelected = selectedId === row.id;
                return (
                  <tr
                    key={row.id}
                    onClick={() => onSelect?.(row)}
                    className={[
                      "border-b border-slate-800/60 cursor-pointer transition-colors",
                      isSelected
                        ? "bg-sky-500/10"
                        : "hover:bg-slate-800/50",
                    ].join(" ")}
                  >
                    {/* # = thứ tự hiển thị (mới nhất = 1) */}
                    <td className="px-2 py-1.5 text-center text-slate-600">
                      {index + 1}
                    </td>
                    <td
                      className={`px-2 py-1.5 font-medium ${statusClass(row.statusCode)}`}
                    >
                      {row.statusCode || "-"}
                    </td>
                    <td className="px-2 py-1.5 text-slate-400 uppercase">
                      {row.protocol || "http"}
                    </td>
                    <td
                      className={`px-2 py-1.5 font-semibold ${methodClass(row.method)}`}
                    >
                      {row.method || "-"}
                    </td>
                    <td
                      className="px-2 py-1.5 text-slate-300 truncate max-w-[320px]"
                      title={row.url}
                    >
                      {row.path || row.url || "-"}
                    </td>
                    <td
                      className="px-2 py-1.5 text-slate-400 truncate max-w-[160px]"
                      title={row.host}
                    >
                      {row.host || "-"}
                    </td>
                    <td className="px-2 py-1.5 text-right text-slate-500">
                      {formatSize(row)}
                    </td>
                    <td className="px-2 py-1.5 text-slate-500 whitespace-nowrap">
                      {formatTime(row.timestamp)}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
