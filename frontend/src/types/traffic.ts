// kiểu dữ liệu 1 dòng traffic — khớp shape API /api/requests
export interface TrafficRow {
  id: string;
  url: string;
  method: string;
  statusCode: number;
  timestamp: string;
  host: string;
  protocol: string;
  path: string;
  reqBody?: string;
  resBody?: string;
}
