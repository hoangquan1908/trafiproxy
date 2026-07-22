// Sidebar.tsx — thanh menu icon bên trái (giống Charles / Burp)

export type SidebarView = "network" | "rules" | "settings";

interface SidebarProps {
  activeView: SidebarView; // view đang chọn
  onViewChange: (view: SidebarView) => void; // callback khi bấm icon
}

// danh sách menu — sau này mở rộng thêm trang
const MENU_ITEMS: { id: SidebarView; label: string; icon: string }[] = [
  { id: "network", label: "Network", icon: "⎔" },
  { id: "rules", label: "Rules", icon: "⇄" },
  { id: "settings", label: "Settings", icon: "⚙" },
];

export default function Sidebar({ activeView, onViewChange }: SidebarProps) {
  return (
    <aside className="w-12 shrink-0 flex flex-col items-center py-3 gap-1 border-r border-slate-700 bg-slate-900">
      {MENU_ITEMS.map((item) => {
        const isActive = activeView === item.id; // highlight icon đang chọn
        return (
          <button
            key={item.id}
            type="button"
            title={item.label}
            onClick={() => onViewChange(item.id)}
            className={[
              "w-9 h-9 flex items-center justify-center rounded-md text-lg transition-colors",
              isActive
                ? "bg-sky-500/20 text-sky-400 border border-sky-500/40"
                : "text-slate-500 hover:text-slate-300 hover:bg-slate-800",
            ].join(" ")}
          >
            {item.icon}
          </button>
        );
      })}
    </aside>
  );
}
