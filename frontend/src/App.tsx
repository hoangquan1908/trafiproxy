// App.tsx — layout + Detail Pane + FilterBar (Tuần 3-4)

import { useCallback, useMemo, useState } from "react";
import Sidebar, { type SidebarView } from "./components/Sidebar";
import NetworkTable from "./components/NetworkTable";
import DetailPane from "./components/DetailPane";
import FilterBar from "./components/FilterBar";
import { useTrafficData } from "./hooks/useTrafficData";
import { useWSListener } from "./hooks/useWSListener";
import { useDebounce } from "./hooks/useDebounce";
import { useTrafficStore } from "./store/trafficStore";
import type { TrafficRow } from "./types/traffic";
import RulesPage from "./components/RulesPage";

// Hide assets
const ASSET_EXT = [".png", ".jpg", ".jpeg", ".gif", ".webp", ".svg", ".css", ".ico", ".woff", ".woff2"];

export default function App() {
  const [activeView, setActiveView] = useState<SidebarView>("network");

  // ActiveID 
  const [selectedId, setSelectedId] = useState<string | null>(null);

  // Search value
  const [filterQuery, setFilterQuery] = useState("");

  const debouncedQuery = useDebounce(filterQuery, 300);

  const [hideAssets, setHideAssets] = useState(true);

  // Fetch API → ghi vào zustand
  const { items, loading, error } = useTrafficData();

  const prependTraffic = useTrafficStore((s) => s.prependTraffic);

  const handleNewRequest = useCallback(
    (row: TrafficRow) => {
      prependTraffic(row);
    },
    [prependTraffic]
  );

  useWSListener({
    onNewRequest: handleNewRequest,
    enabled: activeView === "network",
  });

  // Lọc local trên mảng UI — không gọi lại API
  const filteredItems = useMemo(() => {
    const q = debouncedQuery.trim().toLowerCase();

    return items.filter((row) => {
      const pathOrUrl = (row.path || row.url || "").toLowerCase();

      // Ẩn file tĩnh nếu checkbox bật
      if (hideAssets) {
        const isAsset = ASSET_EXT.some((ext) => pathOrUrl.includes(ext));
        if (isAsset) return false;
      }

      // Không có query → giữ lại (sau bước ẩn asset)
      if (!q) return true;

      // Full-text: method / host / path / url / status
      const haystack = [
        row.method,
        row.host,
        row.path,
        row.url,
        String(row.statusCode),
      ]
        .join(" ")
        .toLowerCase();

      return haystack.includes(q);
    });
  }, [items, debouncedQuery, hideAssets]);

  return (
    <div className="min-h-screen flex flex-col">
      <header className="px-4 py-2 border-b border-slate-700 flex items-center justify-between bg-slate-900 shrink-0">
        <div className="flex items-center gap-3">
          <span className="text-sky-400 font-bold tracking-wider">TRAFEXIA</span>
          <span className="text-slate-600 text-xs">|</span>
          <span className="text-slate-500 text-sm capitalize">{activeView}</span>
        </div>
        <span className="text-slate-600 text-xs">
          {loading ? "Đang tải..." : `${items.length} requests`}
        </span>
      </header>

      {error && (
        <div className="px-4 py-2 text-xs text-red-400 bg-red-950/40 border-b border-red-900">
          {error}
        </div>
      )}

      <div className="flex flex-1 min-h-0">
        <Sidebar activeView={activeView} onViewChange={setActiveView} />

        <main className="flex-1 min-w-0 flex flex-col bg-slate-950">
          {activeView === "network" && (
            <>
              {/* Thanh filter phía trên bảng */}
              <FilterBar
                query={filterQuery}
                onQueryChange={setFilterQuery}
                hideAssets={hideAssets}
                onHideAssetsChange={setHideAssets}
                visibleCount={filteredItems.length}
                totalCount={items.length}
              />

              {/* Bảng + Detail Pane nằm ngang */}
              <div className="flex flex-1 min-h-0">
                <NetworkTable
                  items={filteredItems}
                  selectedId={selectedId}
                  onSelect={(row) => setSelectedId(row.id)}
                />

                <DetailPane
                  selectedId={selectedId}
                  onClose={() => setSelectedId(null)}
                />
              </div>
            </>
          )}

          {activeView === "rules" && <RulesPage />}
          {activeView === "settings" && (
            <div className="flex-1 flex items-center justify-center text-slate-600 text-sm">
              Settings — sắp có
            </div>
          )}
        </main>
      </div>
    </div>
  );
}