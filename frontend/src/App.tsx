// App.tsx — layout chính: Topbar + Sidebar + NetworkTable
import { useCallback, useState } from "react";
import Sidebar, { type SidebarView } from "./components/Sidebar";
import NetworkTable from "./components/NetworkTable";
import { useTrafficData } from "./hooks/useTrafficData";
import { useWSListener } from "./hooks/useWSListener";
import type { TrafficRow } from "./types/traffic";
// dữ liệu mẫu tạm — Bước 3 sẽ thay bằng useTrafficData + useWSListener
const DEMO_ITEMS: TrafficRow[] = [
  {
    id: "demo-1",
    url: "https://api.example.com/v1/users",
    method: "GET",
    statusCode: 200,
    timestamp: new Date().toISOString(),
    host: "api.example.com",
    protocol: "https",
    path: "/v1/users",
    reqBody: "",
    resBody: '{"users":[]}',
  },
  {
    id: "demo-2",
    url: "https://api.example.com/v1/login",
    method: "POST",
    statusCode: 401,
    timestamp: new Date(Date.now() - 5000).toISOString(),
    host: "api.example.com",
    protocol: "https",
    path: "/v1/login",
    reqBody: '{"email":"test@test.com"}',
    resBody: '{"error":"unauthorized"}',
  },
];

export default function App() {
  const [activeView, setActiveView] = useState<SidebarView>("network");
  const [selectedId, setSelectedId] = useState<string | null>(null);

  return (
    <div className="min-h-screen flex flex-col">
      {/* topbar — sau này tách component riêng */}
      <header className="px-4 py-2 border-b border-slate-700 flex items-center justify-between bg-slate-900 shrink-0">
        <div className="flex items-center gap-3">
          <span className="text-sky-400 font-bold tracking-wider">TRAFEXIA</span>
          <span className="text-slate-600 text-xs">|</span>
          <span className="text-slate-500 text-sm capitalize">{activeView}</span>
        </div>
        <span className="text-slate-600 text-xs">{DEMO_ITEMS.length} requests (demo)</span>
      </header>

      {/* body: sidebar trái + nội dung chính */}
      <div className="flex flex-1 min-h-0">
        <Sidebar activeView={activeView} onViewChange={setActiveView} />

        <main className="flex-1 min-w-0 flex flex-col bg-slate-950">
          {activeView === "network" && (
            <NetworkTable
              items={DEMO_ITEMS}
              selectedId={selectedId}
              onSelect={(row) => setSelectedId(row.id)}
            />
          )}
          {activeView === "rules" && (
            <div className="flex-1 flex items-center justify-center text-slate-600 text-sm">
              Rules — Tháng 3
            </div>
          )}
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
