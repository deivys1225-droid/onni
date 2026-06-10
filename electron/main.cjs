const { app, BrowserWindow, shell, ipcMain, dialog } = require("electron");
const path = require("path");
const fs = require("fs/promises");
const os = require("os");
const { exec } = require("child_process");

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

function runCommand(command) {
  return new Promise((resolve) => {
    exec(command, { windowsHide: true }, (error) => {
      resolve(!error);
    });
  });
}

async function openApp(appNameRaw) {
  const appName = String(appNameRaw || "").toLowerCase().trim();
  if (!appName) return false;

  if (appName.includes("whatsapp")) {
    const ok = await runCommand('start "" "whatsapp:"');
    if (ok) return true;
    await shell.openExternal("https://web.whatsapp.com/");
    return true;
  }

  if (appName.includes("word")) {
    const ok = await runCommand('start "" winword');
    return ok;
  }

  if (appName.includes("reproductor")) {
    const ok = await runCommand('start "" mswindowsmusic:');
    if (ok) return true;
    return runCommand('start "" wmplayer');
  }

  return runCommand(`start "" "${appName}"`);
}

function resolveFolderBase(locationRaw) {
  const location = String(locationRaw || "").toLowerCase().trim();
  if (!location) return path.join(os.homedir(), "Desktop");
  if (location.includes("escritorio") || location.includes("desktop")) return path.join(os.homedir(), "Desktop");
  if (location.includes("documentos") || location.includes("documents")) return path.join(os.homedir(), "Documents");
  if (location.includes("descargas") || location.includes("downloads")) return path.join(os.homedir(), "Downloads");
  if (path.isAbsolute(locationRaw)) return locationRaw;
  return path.join(os.homedir(), "Desktop");
}

ipcMain.handle("onni:desktopAction", async (_event, action) => {
  try {
    const type = String(action?.type || "");
    if (type === "open_url") {
      await shell.openExternal(String(action.url || ""));
      return { ok: true, message: "URL abierta." };
    }

    if (type === "search_google") {
      const q = String(action.query || "").trim();
      await shell.openExternal(`https://www.google.com/search?q=${encodeURIComponent(q)}`);
      return { ok: true, message: "Busqueda abierta en Google." };
    }

    if (type === "open_app") {
      const ok = await openApp(String(action.app || ""));
      return ok ? { ok: true, message: "Aplicacion abierta." } : { ok: false, message: "No pude abrir la aplicacion." };
    }

    if (type === "create_folder") {
      const name = String(action.name || "").trim() || "Nueva carpeta";
      const base = resolveFolderBase(action.location);
      const fullPath = path.join(base, name);
      await fs.mkdir(fullPath, { recursive: true });
      return { ok: true, message: `Carpeta creada en ${fullPath}` };
    }

    if (type === "print_pdf_current_page") {
      const win = BrowserWindow.getFocusedWindow();
      if (!win) return { ok: false, message: "No hay ventana activa para exportar PDF." };
      const { canceled, filePath } = await dialog.showSaveDialog(win, {
        title: "Guardar PDF de la pagina",
        defaultPath: path.join(os.homedir(), "Documents", "pagina.pdf"),
        filters: [{ name: "PDF", extensions: ["pdf"] }],
      });
      if (canceled || !filePath) return { ok: false, message: "Exportacion cancelada." };
      const pdfBuffer = await win.webContents.printToPDF({ printBackground: true });
      await fs.writeFile(filePath, pdfBuffer);
      return { ok: true, message: `PDF guardado en ${filePath}` };
    }

    return { ok: false, message: "Accion no soportada." };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Error inesperado";
    return { ok: false, message };
  }
});

app.whenReady().then(() => {
  createMainWindow();
  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) createMainWindow();
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});
