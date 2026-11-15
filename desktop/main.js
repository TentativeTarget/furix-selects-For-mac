// FURIX SELECTS · 选片台 —— macOS 桌面版（Electron）
// 页面通过进程内的通道加载（只监听 127.0.0.1），窗口关掉通道就跟着结束，
// 不会在外面留下任何后台进程。照片读写仍走 Chromium 的文件夹接口，
// 「打开照片文件夹」时弹的是 macOS 自己的选择面板。

const { app, BrowserWindow, Menu, dialog, session, shell } = require("electron");
const http = require("http");
const fs = require("fs");
const path = require("path");

const PRODUCT = "FURIX 选片台";
app.setName(PRODUCT);

// 开发时直接用项目根目录，打包后读 Resources/app/web
const WEB_DIR = fs.existsSync(path.join(__dirname, "web", "index.html"))
  ? path.join(__dirname, "web")
  : path.resolve(__dirname, "..");

const MIME = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".md": "text/markdown; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
  ".avif": "image/avif",
  ".gif": "image/gif",
  ".bmp": "image/bmp",
  ".ico": "image/x-icon",
  ".woff2": "font/woff2",
};

function createStaticServer(root) {
  return http.createServer((req, res) => {
    let pathname = "/";
    try {
      pathname = decodeURIComponent(new URL(req.url, "http://127.0.0.1").pathname);
    } catch (_) {
      pathname = "/";
    }

    let filePath = path.join(root, pathname);
    const rootPrefix = root.endsWith(path.sep) ? root : root + path.sep;
    if (filePath !== root && !filePath.startsWith(rootPrefix)) {
      res.writeHead(403).end("forbidden");
      return;
    }

    try {
      let stat = fs.statSync(filePath);
      if (stat.isDirectory()) {
        filePath = path.join(filePath, "index.html");
        stat = fs.statSync(filePath);
      }
      const ext = path.extname(filePath).toLowerCase();
      res.writeHead(200, {
        "content-type": MIME[ext] || "application/octet-stream",
        "content-length": stat.size,
        "cache-control": "no-cache",
      });
      fs.createReadStream(filePath).pipe(res);
    } catch (_) {
      res.writeHead(404, { "content-type": "text/plain; charset=utf-8" });
      res.end("not found");
    }
  });
}

function listen(server, port) {
  return new Promise((resolve, reject) => {
    const onError = (err) => reject(err);
    server.once("error", onError);
    server.listen(port, "127.0.0.1", () => {
      server.removeListener("error", onError);
      resolve(server.address().port);
    });
  });
}

function portFile() {
  return path.join(app.getPath("userData"), "port.json");
}

function preferredPorts() {
  const list = [];
  try {
    const saved = JSON.parse(fs.readFileSync(portFile(), "utf8"));
    if (saved && Number.isInteger(saved.port)) list.push(saved.port);
  } catch (_) {
    /* 第一次启动没有记录 */
  }
  for (let p = 8731; p <= 8799; p += 1) {
    if (!list.includes(p)) list.push(p);
  }
  return list;
}

function rememberPort(port) {
  try {
    fs.mkdirSync(path.dirname(portFile()), { recursive: true });
    fs.writeFileSync(portFile(), JSON.stringify({ port }), "utf8");
  } catch (_) {
    /* 记不住就算了 */
  }
}

async function startServer() {
  const server = createStaticServer(WEB_DIR);
  for (const candidate of preferredPorts()) {
    try {
      const port = await listen(server, candidate);
      rememberPort(port);
      return { server, port };
    } catch (err) {
      if (err && err.code !== "EADDRINUSE") throw err;
    }
  }
  const port = await listen(server, 0);
  rememberPort(port);
  return { server, port };
}

// 桌面版是「自己人」，系统字体、剪贴板这类权限直接放行，
// 免得水印字体列表因为拿不到权限变空。
function grantPermissions() {
  const ALLOWED = new Set([
    "local-fonts",
    "clipboard-read",
    "clipboard-sanitized-write",
    "fileSystem",
    "storage-access",
  ]);
  session.defaultSession.setPermissionRequestHandler((_wc, permission, callback) => {
    callback(ALLOWED.has(permission));
  });
  session.defaultSession.setPermissionCheckHandler((_wc, permission) =>
    ALLOWED.has(permission)
  );
}

function buildMenu() {
  const template = [
    {
      label: PRODUCT,
      submenu: [
        { role: "about", label: `关于 ${PRODUCT}` },
        { type: "separator" },
        { role: "hide", label: `隐藏 ${PRODUCT}` },
        { role: "hideOthers", label: "隐藏其他" },
        { role: "unhide", label: "全部显示" },
        { type: "separator" },
        { role: "quit", label: `退出 ${PRODUCT}` },
      ],
    },
    {
      label: "编辑",
      submenu: [
        { role: "undo", label: "撤销" },
        { role: "redo", label: "重做" },
        { type: "separator" },
        { role: "cut", label: "剪切" },
        { role: "copy", label: "复制" },
        { role: "paste", label: "粘贴" },
        // 故意不放「全选」：⌘A 要留给选片台去做「全选当前筛选」
      ],
    },
    {
      label: "视图",
      submenu: [
        { role: "resetZoom", label: "实际大小" },
        { role: "zoomIn", label: "放大" },
        { role: "zoomOut", label: "缩小" },
        { type: "separator" },
        { role: "togglefullscreen", label: "进入全屏幕" },
      ],
    },
    {
      label: "窗口",
      submenu: [
        { role: "minimize", label: "最小化" },
        { role: "zoom", label: "缩放" },
        { type: "separator" },
        { role: "close", label: "关闭窗口" },
      ],
    },
    {
      label: "帮助",
      submenu: [
        {
          label: "使用说明（快捷键 ?）",
          accelerator: "?",
          click: (_item, win) =>
            win &&
            win.webContents.executeJavaScript(
              'document.dispatchEvent(new KeyboardEvent("keydown", { key: "?", shiftKey: true, bubbles: true }))'
            ),
        },
        {
          label: "在 Finder 中显示",
          click: () => shell.showItemInFolder(path.join(WEB_DIR, "index.html")),
        },
      ],
    },
  ];
  Menu.setApplicationMenu(Menu.buildFromTemplate(template));
}

let mainWindow = null;
let httpServer = null;

async function createWindow() {
  const { server, port } = await startServer();
  httpServer = server;

  mainWindow = new BrowserWindow({
    width: 1600,
    height: 1000,
    minWidth: 1100,
    minHeight: 700,
    show: false,
    backgroundColor: "#0b0c0e",
    title: "FURIX SELECTS · 选片台",
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      spellcheck: false,
      backgroundThrottling: false,
    },
  });

  mainWindow.once("ready-to-show", () => mainWindow.show());

  // 只在壳内逛，不让页面把窗口导航到外面去
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (/^https?:/i.test(url)) shell.openExternal(url);
    return { action: "deny" };
  });
  mainWindow.webContents.on("will-navigate", (event, url) => {
    if (!url.startsWith(`http://127.0.0.1:${port}/`)) {
      event.preventDefault();
      if (/^https?:/i.test(url)) shell.openExternal(url);
    }
  });

  mainWindow.on("closed", () => {
    mainWindow = null;
    app.quit();
  });

  // 网页里没做右键菜单，桌面版补上文本框的剪切/复制/粘贴
  mainWindow.webContents.on("context-menu", (_event, params) => {
    if (!params.isEditable) return;
    Menu.buildFromTemplate([
      { role: "undo", label: "撤销" },
      { role: "redo", label: "重做" },
      { type: "separator" },
      { role: "cut", label: "剪切" },
      { role: "copy", label: "复制" },
      { role: "paste", label: "粘贴" },
      { type: "separator" },
      { role: "selectAll", label: "全选" },
    ]).popup({ window: mainWindow });
  });

  await mainWindow.loadURL(`http://127.0.0.1:${port}/index.html`);

  if (process.env.FURIX_PROBE === "1") {
    mainWindow.webContents.on("console-message", (_e, level, message) =>
      console.log("PAGE", level, message)
    );
    const info = await mainWindow.webContents.executeJavaScript(`({
      title: document.title,
      fsa: typeof window.showDirectoryPicker,
      fonts: typeof window.queryLocalFonts,
      mac: document.documentElement.classList.contains("is-mac"),
      kbd: Array.from(document.querySelectorAll("kbd")).map(n => n.textContent).filter(t => t.includes("⌘")).length,
      note: document.querySelector(".hub-note")?.textContent
    })`);
    console.log("PROBE", JSON.stringify(info));
    setTimeout(() => app.quit(), 400);
  }
}

const gotLock = app.requestSingleInstanceLock();
if (!gotLock) {
  app.quit();
} else {
  app.on("second-instance", () => {
    if (!mainWindow) return;
    if (mainWindow.isMinimized()) mainWindow.restore();
    mainWindow.show();
    mainWindow.focus();
  });

  app.whenReady().then(async () => {
    grantPermissions();
    buildMenu();
    try {
      await createWindow();
    } catch (err) {
      dialog.showErrorBox(
        "选片台没能打开",
        String((err && err.message) || err) + "\n\n可以直接打开 index.html 顶一下。"
      );
      app.quit();
    }
  });

  app.on("activate", () => {
    if (!mainWindow) return;
    if (mainWindow.isMinimized()) mainWindow.restore();
    mainWindow.show();
    mainWindow.focus();
  });

  app.on("window-all-closed", () => {
    app.quit();
  });

  app.on("before-quit", () => {
    if (httpServer) {
      try {
        httpServer.close();
      } catch (_) {
        /* 已经关了 */
      }
      httpServer = null;
    }
  });
}
