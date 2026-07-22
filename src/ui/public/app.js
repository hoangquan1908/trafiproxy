let traffic = [];

// ===================== SETTINGS =====================
const settings = {
    autoScroll: true,
    maxRequests: 500,
    bypassList: ["mtalk.google.com", "googleapis.com"]
};

function loadSettings() {
    try {
        const saved = sessionStorage.getItem("trafexia_settings");
        if (saved) Object.assign(settings, JSON.parse(saved));
    } catch(e) {}
}

function saveSettings() {
    try { sessionStorage.setItem("trafexia_settings", JSON.stringify(settings)); } catch(e) {}
}

function openSettings() {
    const existing = document.getElementById("settings-modal");
    if (existing) { existing.remove(); return; }

    const modal = document.createElement("div");
    modal.id = "settings-modal";
    modal.innerHTML = `
        <div id="settings-overlay"></div>
        <div id="settings-panel">
            <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px;">
                <span style="color:#38bdf8;font-weight:bold;font-size:13px;text-transform:uppercase;">⚙ Settings</span>
                <button onclick="closeSettings()" style="background:none;border:none;color:#64748b;cursor:pointer;font-size:18px;line-height:1;">✕</button>
            </div>

            <div class="setting-group">
                <label class="setting-label">Auto-scroll to new requests</label>
                <label class="toggle-switch">
                    <input type="checkbox" id="s-autoscroll" ${settings.autoScroll ? "checked" : ""}>
                    <span class="toggle-slider"></span>
                </label>
            </div>

            <div class="setting-group">
                <label class="setting-label">Max requests in memory</label>
                <input type="number" id="s-maxreq" value="${settings.maxRequests}" min="50" max="2000"
                    style="background:#0f172a;border:1px solid #334155;color:#38bdf8;padding:4px 8px;border-radius:4px;width:80px;font-family:monospace;">
            </div>

            <div class="setting-group" style="flex-direction:column;align-items:flex-start;gap:6px;">
                <label class="setting-label">Bypass list
                    <span style="color:#475569;font-weight:normal;font-size:10px;"> — không intercept các host này</span>
                </label>
                <textarea id="s-bypass" rows="4"
                    style="width:100%;box-sizing:border-box;background:#0f172a;border:1px solid #334155;color:#94a3b8;padding:8px;border-radius:4px;font-family:monospace;font-size:11px;resize:vertical;"
                >${settings.bypassList.join("\n")}</textarea>
                <span style="color:#475569;font-size:10px;">Mỗi host một dòng. Tránh lỗi HPE_INVALID_METHOD.</span>
            </div>

            <div style="display:flex;gap:8px;margin-top:16px;justify-content:flex-end;">
                <button onclick="closeSettings()"
                    style="background:#1e293b;border:1px solid #334155;color:#94a3b8;padding:6px 16px;border-radius:4px;cursor:pointer;font-size:12px;">
                    Hủy
                </button>
                <button onclick="applySettings()"
                    style="background:#0369a1;border:none;color:white;padding:6px 16px;border-radius:4px;cursor:pointer;font-size:12px;font-weight:bold;">
                     Lưu
                </button>
            </div>
        </div>
    `;
    document.body.appendChild(modal);
    document.getElementById("settings-overlay").addEventListener("click", closeSettings);
}

function closeSettings() {
    const modal = document.getElementById("settings-modal");
    if (modal) modal.remove();
}

function applySettings() {
    settings.autoScroll = document.getElementById("s-autoscroll").checked;
    settings.maxRequests = parseInt(document.getElementById("s-maxreq").value) || 500;
    settings.bypassList = document.getElementById("s-bypass").value
        .split("\n").map(s => s.trim()).filter(Boolean);
    saveSettings();
    fetch("/proxy/settings", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ bypassList: settings.bypassList, maxRequests: settings.maxRequests })
    }).catch(() => {});
    closeSettings();
    showToast("Đã lưu settings!");
}

loadSettings();

// ===================== DETAIL PANEL TOGGLE =====================
let detailVisible = true;

function toggleDetail(forceShow) {
    const panel = document.getElementById("detail-panel");
    const resizerEl = document.getElementById("dragMe");
    const sidebar = document.getElementById("sidebar");
    if (forceShow !== undefined) detailVisible = forceShow;
    else detailVisible = !detailVisible;

    if (detailVisible) {
        panel.style.display = "flex";
        resizerEl.style.display = "block";
        // Khôi phục lại flex-basis cũ nếu có, không thì dùng 60%
        sidebar.style.flex = sidebar._savedFlex || "0 0 60%";
    } else {
        // Lưu lại flex-basis hiện tại để khôi phục sau
        sidebar._savedFlex = sidebar.style.flex || "0 0 60%";
        panel.style.display = "none";
        resizerEl.style.display = "none";
        // Cho sidebar chiếm toàn bộ chiều rộng
        sidebar.style.flex = "1 1 100%";
    }
}

// ===================== LOAD TRAFFIC =====================
async function loadTraffic() {
    try {
        const res = await fetch("/traffic");
        const data = await res.json();
        traffic = Array.isArray(data) ? data : [];
        document.getElementById("reqCount").innerText = `${traffic.length} requests`;
        renderTable();
    } catch (e) {
        console.error("Lỗi khi tải traffic:", e);
    }
}

// ===================== SYNTAX HIGHLIGHT =====================
function syntaxHighlight(json) {
    if (typeof json !== "string") json = JSON.stringify(json, null, 2);
    return json.replace(
        /("(\\u[a-zA-Z0-9]{4}|\\[^u]|[^\\"])*"(\s*:)?|\b(true|false|null)\b|-?\d+(?:\.\d*)?(?:[eE][+\-]?\d+)?)/g,
        (match) => {
            let cls = "number";
            if (/^"/.test(match)) cls = /:$/.test(match) ? "key" : "string";
            else if (/true|false/.test(match)) cls = "boolean";
            else if (/null/.test(match)) cls = "null";
            return `<span class="${cls}">${match}</span>`;
        }
    );
}

function formatBody(body) {
    if (!body) return "(empty)";
    try { return syntaxHighlight(JSON.stringify(JSON.parse(body), null, 2)); }
    catch (e) { return escapeHtml(body); }
}

function escapeHtml(str) {
    return String(str).replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;");
}

// ===================== PATTERN DETECTION =====================
function detectPatterns(text) {
    if (!text) return [];
    const p = [];
    if (/eyJ[A-Za-z0-9\-_]+\.eyJ[A-Za-z0-9\-_]+\.[A-Za-z0-9\-_]+/.test(text)) p.push({ type:"JWT Token", icon:"🔑" });
    if (/Bearer\s+[A-Za-z0-9\-_.~+/]+=*/i.test(text)) p.push({ type:"Bearer Token", icon:"🛡️" });
    if (/(?:[A-Za-z0-9+/]{4}){4,}(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?/.test(text)) p.push({ type:"Base64", icon:"📦" });
    if (/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/.test(text)) p.push({ type:"Email", icon:"📧" });
    if (/(\+84|0)[0-9]{9,10}/.test(text)) p.push({ type:"Phone", icon:"📱" });
    return p;
}

function renderPatterns(item) {
    const patterns = detectPatterns(JSON.stringify(item));
    if (!patterns.length) return "";
    const badges = patterns.map(p =>
        `<span style="display:inline-block;background:#1e293b;border:1px solid #334155;border-radius:4px;padding:2px 8px;font-size:10px;margin:2px;color:#94a3b8;">${p.icon} ${p.type}</span>`
    ).join("");
    return `<div style="margin:8px 0;padding:8px;background:#0f172a;border-radius:4px;border:1px solid #1e293b;">
        <div style="font-size:10px;color:#64748b;margin-bottom:4px;text-transform:uppercase;">🔍 Patterns Detected</div>${badges}</div>`;
}

// ===================== COPY CURL =====================
function copyCurl(item) {
    const url = `${item.protocol || "http"}://${item.host}${item.path}`;
    let curl = `curl -X ${item.request.method} '${url}'`;
    for (const [k, v] of Object.entries(item.request.headers || {})) {
        if (!["host","content-length","connection"].includes(k.toLowerCase()))
            curl += ` \\\n  -H '${k}: ${v}'`;
    }
    if (item.request.body && item.request.body !== "(empty)")
        curl += ` \\\n  -d '${item.request.body.replace(/'/g,"'\\''")}'`;
    navigator.clipboard.writeText(curl).then(() => showToast("✅ Đã copy cURL!"));
}

// ===================== EXPORT =====================
function downloadFile(filename, content, mimeType) {
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([content], { type: mimeType }));
    a.download = filename;
    a.click();
    URL.revokeObjectURL(a.href);
}

function exportHAR() {
    const har = { log: { version:"1.2", creator:{ name:"Trafexia-lite", version:"1.0" },
        entries: traffic.map(item => ({
            startedDateTime: new Date().toISOString(), time: 0,
            request: { method:item.request?.method||"GET", url:`${item.protocol||"http"}://${item.host}${item.path}`,
                httpVersion:"HTTP/1.1", headers:Object.entries(item.request?.headers||{}).map(([name,value])=>({name,value})),
                queryString:[], headersSize:-1, bodySize:item.request?.body?.length||0,
                postData: item.request?.body ? { mimeType:"application/json", text:item.request.body } : undefined },
            response: { status:item.response?.status||0, statusText:"", httpVersion:"HTTP/1.1",
                headers:Object.entries(item.response?.headers||{}).map(([name,value])=>({name,value})),
                content:{ size:item.response?.body?.length||0, mimeType:"application/json", text:item.response?.body||"" },
                redirectURL:"", headersSize:-1, bodySize:item.response?.body?.length||0 },
            cache:{}, timings:{send:0,wait:0,receive:0}
        }))
    }};
    downloadFile("trafexia-export.har", JSON.stringify(har,null,2), "application/json");
    showToast("✅ Đã export HAR!");
}

function exportPostman() {
    const col = buildPostmanCollection(traffic);
    downloadFile("trafexia-postman.json", JSON.stringify(col,null,2), "application/json");
    showToast("✅ Đã export Postman!");
}

function exportSinglePostman() {
    if (!window.currentDetailItem) return;
    const col = buildPostmanCollection([window.currentDetailItem]);
    downloadFile("request-postman.json", JSON.stringify(col,null,2), "application/json");
    showToast("✅ Đã export Postman!");
}

function buildPostmanCollection(items) {
    return { info:{ name:"Trafexia Export", schema:"https://schema.getpostman.com/json/collection/v2.1.0/collection.json" },
        item: items.map(item => ({
            name:`${item.request?.method||"GET"} ${item.path}`,
            request:{ method:item.request?.method||"GET",
                header:Object.entries(item.request?.headers||{}).filter(([k])=>!["host","content-length","connection"].includes(k.toLowerCase())).map(([key,value])=>({key,value})),
                url:{ raw:`${item.protocol||"http"}://${item.host}${item.path}`, host:[item.host], path:item.path?.split("/").filter(Boolean) },
                body: item.request?.body ? { mode:"raw", raw:item.request.body, options:{raw:{language:"json"}} } : undefined
            }
        }))
    };
}

function exportPython() {
    let code = "import requests\n\n";
    traffic.forEach((item, i) => {
        const method = (item.request?.method||"GET").toLowerCase();
        const url = `${item.protocol||"http"}://${item.host}${item.path}`;
        const headers = Object.fromEntries(Object.entries(item.request?.headers||{}).filter(([k])=>!["host","content-length","connection"].includes(k.toLowerCase())));
        code += `# Request ${i+1}\nurl_${i+1} = "${url}"\nheaders_${i+1} = ${JSON.stringify(headers,null,2)}\n`;
        if (item.request?.body && item.request.body !== "(empty)") {
            try { code += `data_${i+1} = ${JSON.stringify(JSON.parse(item.request.body),null,2)}\nresponse_${i+1} = requests.${method}(url_${i+1}, headers=headers_${i+1}, json=data_${i+1})\n`; }
            catch { code += `data_${i+1} = """${item.request.body}"""\nresponse_${i+1} = requests.${method}(url_${i+1}, headers=headers_${i+1}, data=data_${i+1})\n`; }
        } else { code += `response_${i+1} = requests.${method}(url_${i+1}, headers=headers_${i+1})\n`; }
        code += `print(response_${i+1}.status_code, response_${i+1}.text)\n\n`;
    });
    downloadFile("trafexia-requests.py", code, "text/plain");
    showToast("✅ Đã export Python!");
}

function exportSinglePython() {
    if (!window.currentDetailItem) return;
    const item = window.currentDetailItem;
    const method = (item.request?.method||"GET").toLowerCase();
    const url = `${item.protocol||"http"}://${item.host}${item.path}`;
    const headers = Object.fromEntries(Object.entries(item.request?.headers||{}).filter(([k])=>!["host","content-length","connection"].includes(k.toLowerCase())));
    let code = `import requests\n\nurl = "${url}"\nheaders = ${JSON.stringify(headers,null,2)}\n`;
    if (item.request?.body && item.request.body !== "(empty)") {
        try { code += `data = ${JSON.stringify(JSON.parse(item.request.body),null,2)}\nresponse = requests.${method}(url, headers=headers, json=data)\n`; }
        catch { code += `data = """${item.request.body}"""\nresponse = requests.${method}(url, headers=headers, data=data)\n`; }
    } else { code += `response = requests.${method}(url, headers=headers)\n`; }
    code += `print(response.status_code)\nprint(response.text)\n`;
    downloadFile("request.py", code, "text/plain");
    showToast("✅ Đã export Python!");
}

// ===================== TOAST =====================
function showToast(message) {
    let t = document.getElementById("toast");
    if (!t) {
        t = document.createElement("div"); t.id = "toast";
        t.style.cssText = "position:fixed;bottom:20px;right:20px;background:#1e293b;color:#e5e7eb;padding:10px 18px;border-radius:6px;font-size:12px;z-index:9999;border:1px solid #334155;box-shadow:0 4px 12px rgba(0,0,0,0.4);transition:opacity 0.3s;pointer-events:none;";
        document.body.appendChild(t);
    }
    t.textContent = message; t.style.opacity = "1";
    clearTimeout(t._t);
    t._t = setTimeout(() => { t.style.opacity = "0"; }, 2500);
}

// ===================== RENDER TABLE =====================
function renderRow(item, id) {
    const tr = document.createElement("tr");
    const method = item.request?.method || "GET";
    const status = item.response?.status || 0;
    const statusClass = status ? `status-${Math.floor(status/100)}xx` : "";
    tr.innerHTML = `
        <td style="color:#64748b;text-align:center;">${id}</td>
        <td>${item.time||"-"}</td>
        <td class="method-${method}">${method}</td>
        <td>${item.host||"-"}</td>
        <td title="${item.path||""}">${item.path||"-"}</td>
        <td class="${statusClass}" style="text-align:center;">${status||"-"}</td>
    `;
    tr.addEventListener("click", () => {
        document.querySelectorAll("tbody tr").forEach(r => r.classList.remove("selected"));
        tr.classList.add("selected");
        toggleDetail(true);
        showDetail(item);
    });
    return tr;
}

function renderTable() {
    const tbody = document.getElementById("traffic-body");
    if (!tbody) return;
    const filterText = document.getElementById("filterInput").value.toLowerCase();
    const methodFilter = document.getElementById("methodFilter")?.value || "ALL";
    const statusFilter = document.getElementById("statusFilter")?.value || "ALL";
    tbody.innerHTML = "";

    const filtered = traffic.filter(item => {
        const host = (item.host||"").toLowerCase();
        const path = (item.path||"").toLowerCase();
        const method = (item.request?.method||"").toUpperCase();
        const status = item.response?.status || 0;
        return (host.includes(filterText) || path.includes(filterText)) &&
               (methodFilter==="ALL" || method===methodFilter) &&
               (statusFilter==="ALL" || `${Math.floor(status/100)}xx`===statusFilter);
    });

    filtered.sort((a,b)=>(b.isIntercepted?1:0)-(a.isIntercepted?1:0))
        .forEach((item, i) => {
            const tr = renderRow(item, item.id||(i+1));
            if (item.isIntercepted) {
                tr.style.backgroundColor = "rgba(234, 88, 12, 0.25)";
                tr.classList.add("intercepted-row");
            }
            tbody.appendChild(tr);
        });

    if (settings.autoScroll) {
        const tc = document.querySelector(".table-container");
        if (tc) tc.scrollTop = tc.scrollHeight;
    }
}

// ===================== SHOW DETAIL =====================
function showDetail(item) {
    const contentEl = document.getElementById("detail-content");
    const fullUrl = `${item.protocol||"http"}://${item.host}${item.path}`;

    contentEl.innerHTML = `
        ${renderPatterns(item)}
        <div class="detail-section">
            <h4 class="method-${item.request?.method}">▲ ${item.request?.method}</h4>
            <p><strong>URL:</strong> &nbsp;
                <a href="${fullUrl}" target="_blank" style="color:#38bdf8;text-decoration:none;">${fullUrl}</a>
            </p>
            <div style="display:flex;gap:6px;margin-bottom:10px;flex-wrap:wrap;">
                <button onclick="copyCurl(currentDetailItem)" class="action-btn btn-curl">cURL</button>
                <button onclick="exportSinglePostman()" class="action-btn btn-postman">Postman</button>
                <button onclick="exportSinglePython()" class="action-btn btn-python">Python</button>
            </div>
            <details>
                <summary>Headers</summary>
                <pre class="code-block" id="dt-req-headers">${syntaxHighlight(JSON.stringify(item.request?.headers||{},null,2))}</pre>
            </details>
            <details open>
                <summary>Body</summary>
                <pre class="body-content code-block" id="dt-req-body">${formatBody(item.request?.body)}</pre>
            </details>
        </div>
        <hr>
        <div class="detail-section">
            <h4 class="status-${Math.floor((item.response?.status||0)/100)}xx">▼ RESPONSE (${item.response?.status||"-"})</h4>
            <details>
                <summary>Headers</summary>
                <pre class="code-block" id="dt-res-headers">${syntaxHighlight(JSON.stringify(item.response?.headers||{},null,2))}</pre>
            </details>
            <details open>
                <summary>Body</summary>
                <pre class="body-content code-block" id="dt-res-body">${formatBody(item.response?.body)}</pre>
            </details>
        </div>
    `;

    window.currentDetailItem = item;

    if (item.isIntercepted) {
        contentEl.insertAdjacentHTML("afterbegin", `
            <div class="intercept-actions">
                <button onclick="sendAction('${item.id}','forward')" class="intercept-btn btn-forward">
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z"/></svg>
                    Forward
                </button>
                <button onclick="sendAction('${item.id}','drop')" class="intercept-btn btn-drop-action">
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/></svg>
                    Drop
                </button>
            </div>
        `);
        document.getElementById("dt-req-body").contentEditable = true;
    }
}

// ===================== INTERCEPT =====================
async function sendAction(id, action) {
    if (!id||id==="-") { alert("Không tìm thấy ID!"); return; }
    const modifiedBody = document.getElementById("dt-req-body")?.textContent || "";
    try {
        await fetch("/proxy/intercept/action", {
            method:"POST", headers:{"Content-Type":"application/json"},
            body: JSON.stringify({ id, action, modifiedData:{ body: modifiedBody } })
        });
        const req = traffic.find(t => t.id === id);
        if (req) req.isIntercepted = false;
        renderTable();
        showToast(action === "forward" ? "▶ Forwarded" : "✕ Dropped");
    } catch(e) { console.error(e); }
}

const interceptBtn = document.getElementById("interceptBtn");
let intercepting = false;
interceptBtn.addEventListener("click", async () => {
    intercepting = !intercepting;
    interceptBtn.classList.toggle("active", intercepting);
    interceptBtn.textContent = intercepting ? "Intercept ON" : "Intercept OFF";
    await fetch("/proxy/intercept/toggle", {
        method:"POST", headers:{"Content-Type":"application/json"},
        body: JSON.stringify({ enabled: intercepting })
    });
});

// ===================== PROXY UI =====================
let paused = true;
const portInput = document.getElementById("portInput");
const stopBtn = document.getElementById("stopBtn");
const statusEl = document.getElementById("status");
const addressEl = document.querySelector(".address");

function updateUI(isPaused) {
    paused = isPaused;
    portInput.disabled = !paused;
    if (paused) {
        statusEl.textContent = "● Stopped"; statusEl.className = "status stopped";
        stopBtn.textContent = "▶ Start Proxy"; stopBtn.style.backgroundColor = "#166534";
        addressEl.textContent = "127.0.0.1:----";
    } else {
        statusEl.textContent = "● Running"; statusEl.className = "status running";
        stopBtn.textContent = "■ Stop Proxy"; stopBtn.style.backgroundColor = "#7f1d1d";
        addressEl.textContent = `127.0.0.1:${portInput.value}`;
    }
}

stopBtn.addEventListener("click", async () => {
    const action = paused ? "resume" : "pause";
    const port = parseInt(portInput.value);
    if (isNaN(port)||port<1024||port>65535) { alert("Port hợp lệ: 1024-65535"); return; }
    try {
        const data = await (await fetch(`/proxy/${action}`, {
            method:"POST", headers:{"Content-Type":"application/json"}, body:JSON.stringify({ port })
        })).json();
        if (data.error) alert("Lỗi: "+data.error);
        else updateUI(data.pause);
    } catch(e) { console.error(e); }
});

updateUI(true);
window.addEventListener("DOMContentLoaded", async () => {
    try { const d = await (await fetch("/proxy/status",{method:"POST"})).json(); updateUI(d.pause); } catch(e) {}
});

// ===================== EVENTS =====================
document.getElementById("filterInput").addEventListener("input", renderTable);
document.getElementById("clearBtn").addEventListener("click", async () => {
    await fetch("/traffic/clear", { method: "POST" });
    loadTraffic();
});

// ===================== RESIZER =====================
const resizerEl = document.getElementById("dragMe");
const leftSide = document.getElementById("sidebar");
const container = document.querySelector(".container");
let rx = 0, rW = 0;

resizerEl?.addEventListener("mousedown", (e) => {
    rx = e.clientX; rW = leftSide.getBoundingClientRect().width;
    resizerEl.classList.add("resizing");
    document.body.style.cursor = "col-resize";
    const onMove = (e) => {
        let pct = ((rW + e.clientX - rx) * 100) / container.getBoundingClientRect().width;
        leftSide.style.flex = `0 0 ${Math.min(90, Math.max(10, pct))}%`;
    };
    const onUp = () => {
        resizerEl.classList.remove("resizing");
        document.body.style.removeProperty("cursor");
        document.removeEventListener("mousemove", onMove);
        document.removeEventListener("mouseup", onUp);
    };
    document.addEventListener("mousemove", onMove);
    document.addEventListener("mouseup", onUp);
});

async function loadTrafficFromApi() { 
    try {
        const res = await fetch("/api/requests?limit=100&offset=0");
        const rows = await res.json();
        // map row SQLite → shape UI cũ (host/path/request/response)
        traffic = (Array.isArray(rows) ? rows : []).map((row) => ({
            id: row.id,
            time: row.timestamp ? new Date(row.timestamp).toLocaleTimeString() : "-",
            host: row.host,
            path: row.path,
            protocol: row.protocol,
            request: {
                method: row.method,
                headers: JSON.parse(row.reqHeaders || "{}"),
                body: row.reqBody || ""
            },
            response: {
                status: row.statusCode,
                headers: JSON.parse(row.resHeaders || "{}"),
                body: row.resBody || ""
            }
        }));
        const el = document.getElementById("reqCount");
        if (el) el.innerText = `${traffic.length} requests`;
        renderTable();
    } catch (e) {
        console.error("Lỗi load API:", e);
    }
}

function connectWs() { // tạo hàm mở WebSocket tới port 3001
    // location.hostname = cùng máy với dashboard (localhost hoặc IP LAN)
    const ws = new WebSocket(`ws://${location.hostname}:3001`);
    ws.onmessage = (event) => { // mỗi lần server broadcast
        try {
            const msg = JSON.parse(event.data); // parse chuỗi JSON → object
            if (msg.type !== "new_request" || !msg.data) return; // chỉ nhận traffic mới
            const row = msg.data;
            const item = {
                id: row.id,
                time: row.timestamp ? new Date(row.timestamp).toLocaleTimeString() : "-",
                host: row.host,
                path: row.path,
                protocol: row.protocol,
                request: {
                    method: row.method,
                    headers: JSON.parse(row.reqHeaders || "{}"),
                    body: row.reqBody || ""
                },
                response: {
                    status: row.statusCode,
                    headers: JSON.parse(row.resHeaders || "{}"),
                    body: row.resBody || ""
                }
            };
            traffic.unshift(item); // thêm đầu mảng (mới nhất trước)
            if (traffic.length > (settings.maxRequests || 500)) traffic.pop();
            renderTable();
        } catch (e) {
            console.error("WS message lỗi:", e);
        }
    };
    ws.onclose = () => {
        // tự nối lại sau 2s nếu mất kết nối
        setTimeout(connectWs, 2000);
    };
}
loadTrafficFromApi(); // tải dữ liệu cũ từ SQLite khi mở trang
connectWs(); // lắng nghe gói tin mới realtime
