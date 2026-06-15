import { exec } from "child_process";
import fs from "fs/promises";
import os from "os";
import path from "path";
import { promisify } from "util";

const execAsync = promisify(exec);

const SITE_URLS = {
  google: "https://www.google.com/",
  youtube: "https://www.youtube.com/",
  whatsapp: "https://web.whatsapp.com/",
  facebook: "https://www.facebook.com/",
  instagram: "https://www.instagram.com/",
  twitter: "https://x.com/",
  x: "https://x.com/",
  gmail: "https://mail.google.com/",
  outlook: "https://outlook.live.com/",
  word: "https://www.office.com/launch/word",
  excel: "https://www.office.com/launch/excel",
  spotify: "https://open.spotify.com/",
  netflix: "https://www.netflix.com/",
  github: "https://github.com/",
  maps: "https://maps.google.com/",
  "google maps": "https://maps.google.com/",
};

async function runCommand(cmd) {
  try {
    await execAsync(cmd, { windowsHide: true });
    return true;
  } catch {
    return false;
  }
}

async function openApp(appNameRaw) {
  const appName = String(appNameRaw || "").toLowerCase().trim();
  if (!appName) return false;

  if (appName.includes("whatsapp")) {
    if (await runCommand('start "" "whatsapp:"')) return true;
    return runCommand('start "" "https://web.whatsapp.com/"');
  }

  if (appName.includes("word")) {
    return runCommand('start "" winword');
  }

  if (appName.includes("reproductor")) {
    if (await runCommand('start "" mswindowsmusic:')) return true;
    return runCommand('start "" wmplayer');
  }

  const directUrl = SITE_URLS[appName];
  if (directUrl) {
    return runCommand(`start "" "${directUrl}"`);
  }

  for (const [name, url] of Object.entries(SITE_URLS)) {
    if (appName.includes(name)) {
      return runCommand(`start "" "${url}"`);
    }
  }

  return runCommand(`start "" "${appName}"`);
}

const CLOSE_TARGETS = {
  google: { titleContains: ["Google"] },
  youtube: { titleContains: ["YouTube"] },
  maps: { titleContains: ["Google Maps", "Maps", "Mapas"] },
  whatsapp: { titleContains: ["WhatsApp"], processNames: ["WhatsApp"] },
  word: { processNames: ["WINWORD"] },
  excel: { processNames: ["EXCEL"] },
  chrome: { processNames: ["chrome"] },
  edge: { processNames: ["msedge"] },
  firefox: { processNames: ["firefox"] },
  spotify: { titleContains: ["Spotify"], processNames: ["Spotify"] },
  netflix: { titleContains: ["Netflix"] },
  reproductor: {
    titleContains: ["Groove", "Reproductor", "Media Player"],
    processNames: ["ApplicationFrameHost", "wmplayer"],
  },
  navegador: { processNames: ["chrome", "msedge", "firefox", "brave", "opera"] },
};

function psEncoded(script) {
  return Buffer.from(script, "utf16le").toString("base64");
}

async function runPowerShell(script) {
  try {
    const { stdout, stderr } = await execAsync(
      `powershell -NoProfile -NonInteractive -EncodedCommand ${psEncoded(script)}`,
      { windowsHide: true },
    );
    const code = String(stdout || stderr || "").trim();
    return code === "0";
  } catch (error) {
    const stdout = error?.stdout ? String(error.stdout).trim() : "";
    return stdout === "0";
  }
}

function resolveCloseTarget(appNameRaw) {
  const key = String(appNameRaw || "").toLowerCase().trim();
  if (CLOSE_TARGETS[key]) return CLOSE_TARGETS[key];

  for (const [name, config] of Object.entries(CLOSE_TARGETS)) {
    if (key.includes(name)) return config;
  }

  return {
    titleContains: [String(appNameRaw || "").trim()],
    processNames: [],
  };
}

async function closeApp(appNameRaw) {
  const config = resolveCloseTarget(appNameRaw);
  const processNames = (config.processNames || []).map((p) => `'${p.replace(/'/g, "''")}'`).join(", ");
  const titleContains = (config.titleContains || []).map((t) => `'${t.replace(/'/g, "''")}'`).join(", ");

  const script = `
$processNames = @(${processNames})
$titleContains = @(${titleContains})
$closed = $false
Get-Process | Where-Object { $_.MainWindowHandle -ne 0 } | ForEach-Object {
  $proc = $_
  $match = $false
  if ($processNames.Count -gt 0 -and ($processNames -contains $proc.ProcessName)) { $match = $true }
  foreach ($word in $titleContains) {
    if ($word -and ($proc.MainWindowTitle -like "*$word*")) { $match = $true }
  }
  if ($match) {
    if ($proc.CloseMainWindow()) { $closed = $true }
  }
}
if ($closed) { Write-Output '0' } else { Write-Output '1' }
`;

  return runPowerShell(script);
}

async function closeActiveWindow() {
  const script = `
$exclude = '^(explorer|ApplicationFrameHost|SystemSettings|SearchHost|ShellExperienceHost|TextInputHost|node|Cursor|Code|WindowsTerminal|powershell|pwsh|cmd|conhost|Telegram)$'
$proc = Get-Process | Where-Object {
  $_.MainWindowHandle -ne 0 -and $_.MainWindowTitle -and $_.ProcessName -notmatch $exclude
} | Sort-Object StartTime -Descending | Select-Object -First 1
if ($null -eq $proc) { Write-Output '1'; exit }
if ($proc.CloseMainWindow()) { Write-Output '0' } else { Write-Output '1' }
`;

  return runPowerShell(script);
}

function resolveFolderBase(locationRaw) {
  const location = String(locationRaw || "").toLowerCase().trim();
  if (!location) return path.join(os.homedir(), "Desktop");
  if (location.includes("escritorio") || location.includes("desktop")) {
    return path.join(os.homedir(), "Desktop");
  }
  if (location.includes("documentos") || location.includes("documents")) {
    return path.join(os.homedir(), "Documents");
  }
  if (location.includes("descargas") || location.includes("downloads")) {
    return path.join(os.homedir(), "Downloads");
  }
  if (path.isAbsolute(locationRaw)) return locationRaw;
  return path.join(os.homedir(), "Desktop");
}

export function isPcActionExecutionEnabled(env) {
  return String(env?.TELEGRAM_EXECUTE_PC_ACTIONS || "").toLowerCase() === "true";
}

/** Ejecuta acciones de escritorio en Windows (bot Telegram local en el PC). */
export async function executePcAction(action) {
  if (!action) {
    return { ok: false, message: "Sin acción." };
  }

  if (process.platform !== "win32") {
    return {
      ok: false,
      message: "Las órdenes al PC solo funcionan en Windows con npm run telegram:bot.",
    };
  }

  const type = String(action.type || "");

  if (type === "open_url") {
    const url = String(action.url || "").trim();
    if (!url) return { ok: false, message: "URL vacía." };
    const ok = await runCommand(`start "" "${url}"`);
    return ok
      ? { ok: true, message: "Listo, abierto en tu PC." }
      : { ok: false, message: "No pude abrirlo en tu PC." };
  }

  if (type === "search_google") {
    const q = String(action.query || "").trim();
    const url = `https://www.google.com/search?q=${encodeURIComponent(q)}`;
    const ok = await runCommand(`start "" "${url}"`);
    return ok
      ? { ok: true, message: "Listo, búsqueda abierta en tu PC." }
      : { ok: false, message: "No pude abrir Google en tu PC." };
  }

  if (type === "open_app") {
    const ok = await openApp(action.app);
    return ok
      ? { ok: true, message: "Listo, aplicación abierta en tu PC." }
      : { ok: false, message: "No pude abrir la aplicación en tu PC." };
  }

  if (type === "create_folder") {
    const name = String(action.name || "").trim() || "Nueva carpeta";
    const base = resolveFolderBase(action.location);
    const fullPath = path.join(base, name);
    try {
      await fs.mkdir(fullPath, { recursive: true });
      return { ok: true, message: `Carpeta creada en ${fullPath}` };
    } catch (error) {
      const message = error instanceof Error ? error.message : "Error al crear carpeta";
      return { ok: false, message };
    }
  }

  if (type === "print_pdf_current_page") {
    return {
      ok: false,
      message: "Para PDF abre OnniVers (.exe) con la página visible y pídeselo ahí o por voz.",
    };
  }

  if (type === "close_active_window") {
    const ok = await closeActiveWindow();
    return ok
      ? { ok: true, message: "Listo, ventana cerrada en tu PC." }
      : { ok: false, message: "No encontré una ventana para cerrar." };
  }

  if (type === "close_app") {
    const ok = await closeApp(action.app);
    return ok
      ? { ok: true, message: "Listo, cerrado en tu PC." }
      : { ok: false, message: "No encontré esa ventana o app abierta." };
  }

  return { ok: false, message: "Acción no soportada." };
}
