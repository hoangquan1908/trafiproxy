# Báo cáo Thiết Kế Kiến Trúc & Lộ Trình Đồ Án Tốt Nghiệp: Hệ Thống MITM Proxy (Bản Web App Tối Ưu)

Tài liệu là hệ quả cô đọng từ các phân tích lựa chọn Công Nghệ trước đó. Xác định rõ ràng phạm vi đề tài (Scope), đảm bảo tiêu chí **Plug-and-play (Cắm là chạy)** nhằm đem lại trải nghiệm tinh gọn tối đa cho hội đồng đánh giá và các chuyên viên Pentest. Không dùng Supabase, tự vận hành bằng NodeJS và SQLite nội tuyến.

---

## 🎯 Tháng 1: Nền tảng Backend và Quản lý Dữ liệu

### Tuần 1-2: Refactor lõi Proxy và Kiến trúc xử lý Streams
**Bước 1: Phân tách `src/index.js` thành kiến trúc sạch**
- **1.1:** Tạo cấu trúc thư mục mới: `src/proxy/`, `src/ca/`, `src/handlers/`, `src/db/`.
- **1.2:** Cô lập logic tạo CA (`ensureCA()`) sang `src/ca/index.js`.
- **1.3:** Đưa config khởi chạy Proxy core (port 8888) sang `src/proxy/index.js`.
- **1.4:** Tạo file `src/handlers/request.js` và `src/handlers/response.js` để gắn vào các hook độc lập của `http-mitm-proxy`. 

**Bước 2: Hệ thống Web phân phát CA**
- **2.1:** Tại đầu file `src/index.js`, tạo một route Express tĩnh nhỏ chạy trên url `http://localhost:8888/cert`.
- **2.2:** Cài đặt hàm `res.download()` trả về file chứng chỉ gốc `trafexia-ca.crt` xuống điện thoại khi truy cập.

**Bước 3: Giải nén luồng Stream (Decompression Pipeline)**
- **3.1:** Ở sự kiện `onResponse`, kiểm tra giá trị của Header HTTP: `content-encoding`.
- **3.2:** Nếu giá trị là `gzip`, sử dụng Node Core `zlib.createGunzip()` để pipe (khớp nối) stream nén thành data thuần.
- **3.3:** Nếu giá trị là `brotli`, sử dụng `zlib.createBrotliDecompress()`.

### Tuần 3: Lưu trữ Dữ liệu Proxy (Persistence SQLite)
**Bước 1: Khởi tạo kết nối CSDL (SQLite)**
- **1.1:** Mở terminal chạy lệnh `npm install better-sqlite3`.
- **1.2:** Viết file `src/db/connection.js`, cài đặt pragma `journal_mode=WAL` để db đọc/ghi mượt mà tốc độ cao.
- **1.3:** Tự động tạo thư mục `./data` và file `traffic.sqlite` nếu chưa khởi tạo.

**Bước 2: Xây dựng File cấu trúc Table (Schema Migration)**
- **2.1:** Dùng script tự động chạy: `CREATE TABLE IF NOT EXISTS requests` (Chứa các cột: `id`, `url`, `method`, `statusCode`, `reqHeaders`, `resHeaders`, `reqBody`, `resBody`, `timestamp`).
- **2.2:** Đặt UUID làm Primary Key, chỉ mục Index cho cột `url` và `method`.

**Bước 3: Hooking lưu trữ gói tin (Insert Data Hook)**
- **3.1:** Tại `src/handlers/response.js`, đóng gói tất cả Buffer Data (Sau giải nén ở B3 Tuần 1) vào trong 1 JSON Object cuối cùng.
- **3.2:** Tạo hàm `insertRequest(data)` trong file `src/db/queries.js`.
- **3.3:** Gắn hàm `insertRequest()` vào sau hook. Sử dụng `try/catch` vô danh nhằm giữ Proxy không Crash khi chèn Database gặp trục trặc.

### Tuần 4: Giao tiếp API & WebSocket nội bộ
**Bước 1: Dựng server API ẩn**
- **1.1:** Khởi tạo thư viện `Express.js` vào file `src/api/server.js`.
- **1.2:** Thêm middleware `cors()` để tránh lỗi bảo mật Frontend, `body-parser` parse JSON.
- **1.3:** `app.listen(3000)` tách rời ra khỏi port `8888` của Proxy.

**Bước 2: Viết REST API Routes cung cấp dữ liệu**
- **2.1:** Viết Route `GET /api/requests?limit=100&offset=0` cấp số liệu mồi cho Frontend khi vừa mở Web.
- **2.2:** Truy vấn Backend `SELECT * FROM requests ORDER BY timestamp DESC`. Trả `res.json()`.

**Bước 3: Setup Broadcast WebSocket Pub/Sub**
- **3.1:** Dùng package `ws` gọi lệnh setup `new WebSocketServer({ port: 3001 })`.
- **3.2:** Viết vòng lặp `broadcast(message)` gửi đến tất cả client có trạng thái `ws.OPEN`.
- **3.3:** Bố trí lệnh `broadcast(goi_tin_moi_nhat)` vào ngay dòng dưới cùng khi hàm `insertRequest` thực thi thành công ở DB.

---

## 🎨 Tháng 2: Trực quan hóa Dữ liệu (Frontend Web UI)

### Tuần 1-2: Khởi tạo App Client
**Bước 1: Bootstrap UI Project**
- **1.1:** Dùng dòng lệnh `npm create vite@latest frontend --template react-ts`.
- **1.2:** Cài đặt TailwindCSS: Chỉnh sửa `tailwind.config.js` để nhúng CSS Utility.

**Bước 2: Xây dựng Layout Thành phần**
- **2.1:** Code Component `<Sidebar />` kẹp trái chứa các Icon menu Navbar.
- **2.2:** Code Component `<NetworkTable />` vùng trung tâm chia cột (ID, Status, Type, Method, URL, Host, Size, Time).

**Bước 3: Tích hợp Fetch API và Client WebSockets**
- **3.1:** Code React Hook `useTrafficData()` có chức năng gọi Fetch lên `http://localhost:3000/api/requests` khi component vừa Mount.
- **3.2:** Code React Hook `useWSListener()` mở cổng `new WebSocket("ws://localhost:3001")`, nhận data và ném lên mảng List Table.

**Bước 4: Quản lý Global Data State**
- **4.1:** Sử dụng zustand tạo `store.js` chứa biến `const traffics = []`.
- **4.2:** Viết logic giới hạn độ dài `traffics.length < 10000`, tự thả trôi phần tử cũ nhất qua cấu trúc queue (FIFO) để bảo vệ RAM Chrome.

### Tuần 3-4: Lọc và Bộ xem chi tiết (Detail Pane Components)
**Bước 1: Cấu trúc Layout Box bên phải**
- **1.1:** Click vào Row (URL Packet) ở `<NetworkTable />` -> Set State `ActiveID`.
- **1.2:** Gọi Fetch `/api/requests/:id` tải gói Body (tránh tải sẵn Body quá nặng). Build Tab Menu (Headers, Payload, Response).

**Bước 2: Component Parser Response JSON**
- **2.1:** `JSON.parse(string)`. Bọc try/catch dự phòng text lỗi.
- **2.2:** Render sử dụng `<ReactJson src={data} collapsed={2} />` hoặc Monaco Editor để có thanh cuộn mượt mà.

**Bước 3: Local Full-Text Search**
- **3.1:** Xây dựng Component `<FilterBar/>`. Sử dụng debounce 300ms do Lodash.
- **3.2:** Lọc trực tiếp trên mảng UI Array State, loại bớt Request rác (như file `.png/.jpg`, `.css`) khỏi danh sách.

---

## 🛠️ Tháng 3: Interception & Manipulation (Thao túng mạng)

### Tuần 1: Map/Redirect Rules
**Bước 1: Tạo View "Cấu Hình Rules" (Phần UI)**
- **1.1:** Tạo Page mới `/rules`. Modal Input có 2 trường: Pattern (VD: `api.facebook.com`) và Target (VD: `127.0.0.1:8080`). POST API lưu xuống bảng `rules` SQLite.

**Bước 2: Thiết lập cơ chế kiểm tra đè luồng mạng**
- **2.1:** Cache danh sách Mapped Rule ra biến RAM Nodejs Proxy.
- **2.2:** Ở Hook `onRequest`, vòng lặp Match Regex. Nếu URL Khớp -> đổi biến Request Option `req.url` & `req.headers.host`. Đánh lừa App kết nối sai server đích.

### Tuần 2: Mock Local Responses (Fake luồng về)
**Bước 1: Button Chức năng Mock**
- **1.1:** Lập nút `Mock This Response` trong Detail Pane. Nhập Status, nhập Data JSON tùy ý. API save bảng `mocks`.

**Bước 2: Chèn Mock chặn Stream**
- **2.1:** Vòng lặp `onRequest`. Check Match Mock URL. Gọi `socket.destroy()` ngầm ngắt nhánh internet bên ngoài.
- **2.2:** Set Header bằng lệnh `res.writeHead(status, headersMock)`. Xả Stream trả trực tiếp Mobile Browser bằng `res.end(fakeJSON)`.

### Tuần 3-4: Network Throttling & Composer Replay
**Bước 1: Cài đặt Delay Mechanism**
- **1.1:** Dùng `stream.Transform` của NodeJS.
- **1.2:** Ở hàm `_transform(chunk)`, đóng băng Callback bằng `setTimeout(..., Ms)`. Nhả Buffer nhỏ giọt. Giả lập app ngân hàng khi đứt cáp quang.

**Bước 2: Composer Request**
- **2.1:** Form `Re-send`: Đổ 4 trường URL, Header, Body ra GUI tĩnh.
- **2.2:** Bấm Gửi, Backend Proxy chạy Axios Post/Get thay Frontend. Báo kết quả phản hồi lại UI. Hoạt động giống hệt Thunder Client / Postman.

---

## 🛡️ Tháng 4: Security Bypass (Frida) & Hoàn thành Đồ Án

### Tuần 1-2: Security - Ám sát lớp khiên "SSL Pinning"
**Bước 1: Tích hợp Frida Environment**
- **1.1:** Backend NodeJS kết nối module Script tự chạy CLI qua hàm `child_process.exec("frida -U ...")`.
- **1.2:** Biên soạn file Javascript `ssl-bypass.js`. Mã trói module `X509TrustManager.checkServerTrusted` của Android. Yêu cầu Always Return `True`. 

**Bước 2: Cơ chế đẩy Payload 1 Click**
- **2.1:** Nút UI "Inject Bypass" gửi Web API. Kích hoạt Script Frida tiêm Data tràn bộ nhớ điện thoại (Yêu cầu USB Debugging). Gói bị mã hóa sẽ bung lụa.

### Tuần 3-4: Tự động phát hiện lỗi và Test chịu tải
**Bước 1: Regex Security Scanner**
- **1.1:** Thuật toán duyệt Regex định kỳ: Lên danh sách chuỗi JWT (`eyJ...`), API Keys. Nếu chuỗi bị "Clear Text" chưa băm Hash -> Đánh dâu cột DB `has_issue: true`.
- **1.2:** Đô màu Đỏ Row UI đó để báo động An toàn thông tin.

**Bước 2: Viết Báo cáo Đóng gói**
- **2.1:** `autocannon` test tải HTTP 8888. Lấy File Log RAM Usage (Chắc chắn thành quả sẽ đẹp mĩ mãn nhờ xử lý SQLite + Stream tốt).
- **2.2:** Vẽ lại sơ đồ Sequence & Class Diagram rồi nộp Luận văn thạc sĩ/đại học. Đóng gói app hoàn thiện!
