interface JsonViewerProps {
    raw: string | undefined | null; // Chuỗi body / headers từ API
    emptyLabel?: string; // Text hiện khi không có nội dung
  }
  
  export default function JsonViewer({
    raw,
    emptyLabel = "(empty)",
  }: JsonViewerProps) {
    // Không có data → hiện placeholder
    if (!raw || raw.trim() === "" || raw === "(empty)") {
      return <pre className="text-slate-600 text-xs p-3">{emptyLabel}</pre>;
    }
  
    try {
      //parse JSON 
      const parsed = JSON.parse(raw);
      const pretty = JSON.stringify(parsed, null, 2);
  
      return (
        <pre className="text-xs p-3 overflow-auto max-h-[50vh] whitespace-pre-wrap break-all text-emerald-300/90 font-mono leading-relaxed">
          {pretty}
        </pre>
      );
    } catch {
      
      return (
        <pre className="text-xs p-3 overflow-auto max-h-[50vh] whitespace-pre-wrap break-all text-slate-300 font-mono leading-relaxed">
          {raw}
        </pre>
      );
    }
  }