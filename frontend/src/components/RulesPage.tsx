// RulesPage.tsx — trang cấu hình Map/Redirect Rules (Tháng 3 Tuần 1)

import { useCallback, useEffect, useState } from "react";

// Shape 1 dòng rule từ API /api/rules
interface RuleRow {
  id: string;
  pattern: string; // VD: api.facebook.com
  target: string; // VD: 127.0.0.1:8080
  enabled: number; // 1 | 0 từ SQLite
  createdAt: string;
}

export default function RulesPage() {
  // Danh sách rule hiện có
  const [rules, setRules] = useState<RuleRow[]>([]);

  // true khi đang tải danh sách
  const [loading, setLoading] = useState(true);

  // true = hiện modal thêm rule
  const [showModal, setShowModal] = useState(false);

  // Form modal
  const [pattern, setPattern] = useState("");
  const [target, setTarget] = useState("");

  // Message lỗi form / API
  const [error, setError] = useState<string | null>(null);

  // true khi đang submit
  const [saving, setSaving] = useState(false);

  // Tải danh sách rule từ backend
  const loadRules = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/rules");
      if (!res.ok) throw new Error(`API lỗi: ${res.status}`);
      const rows = await res.json();
      setRules(Array.isArray(rows) ? rows : []);
    } catch (err) {
      console.error("[RulesPage] load:", err);
      setError(err instanceof Error ? err.message : "Không tải được rules");
    } finally {
      setLoading(false);
    }
  }, []);

  // Load lần đầu khi mount
  useEffect(() => {
    loadRules();
  }, [loadRules]);

  // Mở modal — reset form
  function openModal() {
    setPattern("");
    setTarget("");
    setError(null);
    setShowModal(true);
  }

  // Đóng modal
  function closeModal() {
    setShowModal(false);
    setError(null);
  }

  // Submit form → POST /api/rules
  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault(); // Chặn reload trang

    const p = pattern.trim();
    const t = target.trim();
    if (!p || !t) {
      setError("Pattern và Target không được để trống");
      return;
    }

    try {
      setSaving(true);
      setError(null);

      const res = await fetch("/api/rules", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pattern: p, target: t }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || `API lỗi: ${res.status}`);

      closeModal();
      await loadRules(); // Refresh bảng
    } catch (err) {
      setError(err instanceof Error ? err.message : "Lưu thất bại");
    } finally {
      setSaving(false);
    }
  }

  // Xóa rule
  async function handleDelete(id: string) {
    if (!confirm("Xóa rule này?")) return;
    try {
      const res = await fetch(`/api/rules/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Xóa thất bại");
      await loadRules();
    } catch (err) {
      console.error(err);
      alert(err instanceof Error ? err.message : "Xóa thất bại");
    }
  }

  // Bật/tắt rule
  async function handleToggle(rule: RuleRow) {
    try {
      const res = await fetch(`/api/rules/${rule.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ enabled: !rule.enabled }),
      });
      if (!res.ok) throw new Error("Cập nhật thất bại");
      await loadRules();
    } catch (err) {
      console.error(err);
    }
  }

  return (
    <div className="flex-1 min-h-0 flex flex-col">
      {/* Header trang Rules */}
      <div className="px-4 py-3 border-b border-slate-800 flex items-center justify-between shrink-0">
        <div>
          <h2 className="text-sky-400 text-sm font-bold tracking-wider uppercase">
            Map / Redirect Rules
          </h2>
          <p className="text-slate-600 text-[11px] mt-0.5">
            Pattern khớp host → chuyển request sang Target
          </p>
        </div>
        <button
          type="button"
          onClick={openModal}
          className="px-3 py-1.5 text-xs rounded bg-sky-600 hover:bg-sky-500 text-white font-medium"
        >
          + Add Rule
        </button>
      </div>

      {/* Bảng danh sách */}
      <div className="flex-1 overflow-auto p-4">
        {loading && (
          <p className="text-slate-500 text-xs">Đang tải...</p>
        )}

        {!loading && rules.length === 0 && (
          <p className="text-slate-600 text-xs text-center py-16">
            Chưa có rule. Bấm &quot;+ Add Rule&quot; để tạo.
          </p>
        )}

        {!loading && rules.length > 0 && (
          <table className="w-full text-xs border-collapse">
            <thead>
              <tr className="text-left text-slate-500 uppercase border-b border-slate-700">
                <th className="px-2 py-2">Pattern</th>
                <th className="px-2 py-2">Target</th>
                <th className="px-2 py-2 w-20">Status</th>
                <th className="px-2 py-2 w-28">Actions</th>
              </tr>
            </thead>
            <tbody>
              {rules.map((rule) => (
                <tr
                  key={rule.id}
                  className="border-b border-slate-800/60 hover:bg-slate-800/40"
                >
                  <td className="px-2 py-2 font-mono text-slate-300">
                    {rule.pattern}
                  </td>
                  <td className="px-2 py-2 font-mono text-emerald-400/90">
                    {rule.target}
                  </td>
                  <td className="px-2 py-2">
                    <button
                      type="button"
                      onClick={() => handleToggle(rule)}
                      className={
                        rule.enabled
                          ? "text-green-400"
                          : "text-slate-600"
                      }
                    >
                      {rule.enabled ? "ON" : "OFF"}
                    </button>
                  </td>
                  <td className="px-2 py-2">
                    <button
                      type="button"
                      onClick={() => handleDelete(rule.id)}
                      className="text-red-400/80 hover:text-red-300"
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Modal thêm rule */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          {/* Overlay tối — click để đóng */}
          <div
            className="absolute inset-0 bg-black/60"
            onClick={closeModal}
          />

          {/* Hộp form */}
          <form
            onSubmit={handleSubmit}
            className="relative z-10 w-full max-w-md bg-slate-900 border border-slate-700 rounded-lg p-5 shadow-xl"
          >
            <h3 className="text-sky-400 text-sm font-bold mb-4">
              Thêm Redirect Rule
            </h3>

            <label className="block text-[11px] text-slate-500 mb-1">
              Pattern (regex / host)
            </label>
            <input
              type="text"
              value={pattern}
              onChange={(e) => setPattern(e.target.value)}
              placeholder="VD: api\.facebook\.com"
              className="w-full mb-3 bg-slate-950 border border-slate-700 rounded px-3 py-2 text-xs text-slate-200 outline-none focus:border-sky-500/50"
            />

            <label className="block text-[11px] text-slate-500 mb-1">
              Target (host:port)
            </label>
            <input
              type="text"
              value={target}
              onChange={(e) => setTarget(e.target.value)}
              placeholder="VD: 127.0.0.1:8080"
              className="w-full mb-3 bg-slate-950 border border-slate-700 rounded px-3 py-2 text-xs text-slate-200 outline-none focus:border-sky-500/50"
            />

            {error && (
              <p className="text-red-400 text-xs mb-3">{error}</p>
            )}

            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={closeModal}
                className="px-3 py-1.5 text-xs rounded border border-slate-700 text-slate-400 hover:bg-slate-800"
              >
                Hủy
              </button>
              <button
                type="submit"
                disabled={saving}
                className="px-3 py-1.5 text-xs rounded bg-sky-600 hover:bg-sky-500 text-white font-medium disabled:opacity-50"
              >
                {saving ? "Đang lưu..." : "Lưu"}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}