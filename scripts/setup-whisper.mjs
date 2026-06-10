import { spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import ffmpegStatic from "ffmpeg-static";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const publishDir = path.join(root, "electron", "whisper", "publish");
const zipPath = path.join(publishDir, "whisper-bin-x64.zip");
const WHISPER_ZIP_URL =
  "https://github.com/ggml-org/whisper.cpp/releases/download/v1.8.3/whisper-bin-x64.zip";
const MODEL_URL =
  "https://huggingface.co/ggerganov/whisper.cpp/resolve/main/ggml-small.bin";
const MODEL_NAME = "ggml-small.bin";

function log(message) {
  console.log(`[onni-whisper] ${message}`);
}

async function download(url, dest) {
  if (fs.existsSync(dest) && fs.statSync(dest).size > 1024) {
    log(`Usando ${path.basename(dest)} existente.`);
    return;
  }
  log(`Descargando ${url} ...`);
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Download failed (${response.status}): ${url}`);
  }
  const buffer = Buffer.from(await response.arrayBuffer());
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  fs.writeFileSync(dest, buffer);
  log(`Guardado ${dest} (${Math.round(buffer.length / 1024 / 1024)} MB)`);
}

function isWhisperRuntimeReady(dir) {
  const cli = path.join(dir, "whisper-cli.exe");
  const dll = path.join(dir, "ggml.dll");
  if (!fs.existsSync(cli) || !fs.existsSync(dll)) return false;
  return fs.statSync(cli).size > 100_000;
}

function findWhisperCli(dir) {
  /** @type {string | null} */
  let best = null;
  let bestSize = 0;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isFile() && /^whisper-cli\.exe$|^main\.exe$/i.test(entry.name)) {
      const size = fs.statSync(full).size;
      if (size > bestSize) {
        best = full;
        bestSize = size;
      }
      continue;
    }
    if (entry.isDirectory()) {
      const nested = findWhisperCli(full);
      if (nested) {
        const size = fs.statSync(nested).size;
        if (size > bestSize) {
          best = nested;
          bestSize = size;
        }
      }
    }
  }
  return best;
}

/** Copia whisper-cli.exe y todas las DLL necesarias a publish/. */
function installWhisperRuntime(sourceRoot, targetDir) {
  const cli = findWhisperCli(sourceRoot);
  if (!cli) {
    throw new Error("No se encontró whisper-cli.exe tras extraer el zip.");
  }
  const sourceDir = path.dirname(cli);
  fs.mkdirSync(targetDir, { recursive: true });

  for (const entry of fs.readdirSync(sourceDir)) {
    if (!/\.dll$/i.test(entry)) continue;
    fs.copyFileSync(path.join(sourceDir, entry), path.join(targetDir, entry));
  }

  fs.copyFileSync(cli, path.join(targetDir, "whisper-cli.exe"));
  log(`Whisper CLI + DLLs: ${targetDir}`);
}

function extractZip(zipFile, targetDir) {
  if (isWhisperRuntimeReady(targetDir)) {
    log("Runtime Whisper listo (CLI + DLLs).");
    return;
  }

  log("Extrayendo whisper-bin-x64.zip (faltaban DLLs o CLI válido)...");
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "onni-whisper-extract-"));
  try {
    if (process.platform !== "win32") {
      throw new Error("setup-whisper solo está automatizado en Windows.");
    }
    const result = spawnSync(
      "powershell",
      [
        "-NoProfile",
        "-ExecutionPolicy",
        "Bypass",
        "-Command",
        `Expand-Archive -Path '${zipFile.replace(/'/g, "''")}' -DestinationPath '${tempDir.replace(/'/g, "''")}' -Force`,
      ],
      { stdio: "inherit" },
    );
    if (result.status !== 0) {
      throw new Error("No se pudo extraer whisper-bin-x64.zip");
    }
    installWhisperRuntime(tempDir, targetDir);
  } finally {
    try {
      fs.rmSync(tempDir, { recursive: true, force: true });
    } catch {
      /* ignore */
    }
  }

  if (!isWhisperRuntimeReady(targetDir)) {
    throw new Error("Whisper incompleto tras la extracción. Revisa ggml.dll y whisper-cli.exe.");
  }
}

function copyFfmpeg() {
  if (!ffmpegStatic || !fs.existsSync(ffmpegStatic)) {
    throw new Error("ffmpeg-static no disponible. Ejecuta npm install.");
  }
  const target = path.join(publishDir, "ffmpeg.exe");
  fs.copyFileSync(ffmpegStatic, target);
  log(`ffmpeg: ${target}`);
}

async function main() {
  fs.mkdirSync(publishDir, { recursive: true });
  await download(WHISPER_ZIP_URL, zipPath);
  extractZip(zipPath, publishDir);
  await download(MODEL_URL, path.join(publishDir, MODEL_NAME));
  copyFfmpeg();
  log("Listo.");
}

main().catch((error) => {
  console.error(`[onni-whisper] ${error instanceof Error ? error.message : error}`);
  process.exit(1);
});
