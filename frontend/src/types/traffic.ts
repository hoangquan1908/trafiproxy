export interface TrafficRow {
  id: string; // UUID trong SQLite
  url: string; // URL đầy đủ protocol://host/path
  method: string; // GET / POST / PUT / DELETE...
  statusCode: number; // Mã HTTP response (200, 404, ...)
  timestamp: string; // ISO string thời điểm lưu DB
  host: string; // Hostname đích
  protocol: string; // http | https
  path: string; // Đường dẫn URL (không gồm host)

  // Headers lưu dạng chuỗi JSON trong SQLite — Detail Pane sẽ parse
  reqHeaders?: string;
  resHeaders?: string;

  // Body request / response — lazy-load từ GET /api/requests/:id
  reqBody?: string;
  resBody?: string;
}