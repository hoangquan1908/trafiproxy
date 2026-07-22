// FilterBar.tsx — ô tìm kiếm + checkbox ẩn asset rác (.png/.css...)

interface FilterBarProps {
    query: string; // Giá trị ô search (controlled từ App)
    onQueryChange: (value: string) => void; // Callback khi user gõ
    hideAssets: boolean; // true = ẩn .png/.jpg/.css...
    onHideAssetsChange: (value: boolean) => void; // Callback khi tick checkbox
    visibleCount: number; // Số dòng đang hiện sau filter
    totalCount: number; // Tổng số request trong store
  }
  
  export default function FilterBar({
    query,
    onQueryChange,
    hideAssets,
    onHideAssetsChange,
    visibleCount,
    totalCount,
  }: FilterBarProps) {
    return (
      <div className="px-3 py-2 border-b border-slate-800 flex items-center gap-3 shrink-0 bg-slate-900/60">
        {/* Ô full-text search — filter host / path / method / url */}
        <input
          type="text"
          value={query}
          onChange={(e) => onQueryChange(e.target.value)}
          placeholder="Filter host, path, method, url..."
          className="flex-1 min-w-0 bg-slate-950 border border-slate-700 rounded px-3 py-1.5 text-xs text-slate-200 placeholder:text-slate-600 outline-none focus:border-sky-500/50"
        />
  
        {/* Checkbox loại request rác (static assets) */}
        <label className="flex items-center gap-1.5 text-[11px] text-slate-500 whitespace-nowrap cursor-pointer select-none">
          <input
            type="checkbox"
            checked={hideAssets}
            onChange={(e) => onHideAssetsChange(e.target.checked)}
            className="accent-sky-500"
          />
          Hide assets
        </label>
  
        {/* Đếm kết quả sau filter */}
        <span className="text-[11px] text-slate-600 whitespace-nowrap">
          {visibleCount}/{totalCount}
        </span>
      </div>
    );
  }