const { app, BrowserWindow } = require("electron");
const path = require("path");

const DEFAULT_REMOTE_URL = "https://onni-eight.vercel.app/";

function resolveRendererEntry() {
  const customUrl = String(process.env.ELECTRON_START_URL || "").trim();
  if (customUrl) return customUrl;
  return DEFAULT_REMOTE_URL;
}

function createMainWindow() {
  const preloadPath = path.join(__dirname, "preload.cjs");
  const win = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 1100,
    minHeight: 700,
    backgroundColor: "#020617",
    autoHideMenuBar: true,
    webPreferences: {
      preload: preloadPath,
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
    },
  });

  const entry = resolveRendererEntry();
  win.loadURL(entry).catch(() => {
    const offlineHtml = `
      <html>
        <body style="margin:0;background:#0b1220;color:#e5e7eb;font-family:Arial, sans-serif;display:flex;min-height:100vh;align-items:center;justify-content:center;">
          <div style="max-width:580px;padding:24px;text-align:center;">
            <h2 style="margin:0 0 12px 0;">No se pudo abrir OnniVers</h2>
            <p style="opacity:.9;line-height:1.5;margin:0 0 12px 0;">
              Verifica internet o que el sitio esté disponible:
              <br />
              <a href="${DEFAULT_REMOTE_URL}" style="color:#22d3ee;">${DEFAULT_REMOTE_URL}</a>
            </p>
          </div>
        </body>
      </html>
    `;
    return win.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(offlineHtml)}`);
  });
}

app.whenReady().then(() => {
  createMainWindow();
  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) createMainWindow();
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});
