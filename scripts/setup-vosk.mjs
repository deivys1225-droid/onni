import { spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const modelDir = path.join(root, "electron", "vosk", "model");
const modelName = "vosk-model-small-es-0.42";
const modelPath = path.join(modelDir, modelName);
const zipPath = path.join(modelDir, `${modelName}.zip`);
const MODEL_URLS = [
  `https://alphacephei.com/vosk/models/${modelName}.zip`,
  `https://huggingface.co/csukuangfj/vosk-models/resolve/main/${modelName}.zip`,
];

function log(message) {
  console.log(`[onni-vosk] ${message}`);
}

function isModelReady(dir) {
  return fs.existsSync(path.join(dir, "am", "final.mdl")) || fs.existsSync(path.join(dir, "graph", "Gr.fst"));
}

async function download(url, dest) {
  log(`Descargando ${url} ...`);
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 600_000);
  try {
    const response = await fetch(url, { signal: controller.signal });
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }
    const buffer = Buffer.from(await response.arrayBuffer());
    fs.mkdirSync(path.dirname(dest), { recursive: true });
    fs.writeFileSync(dest, buffer);
    log(`Guardado ${dest} (${Math.round(buffer.length / 1024 / 1024)} MB)`);
  } finally {
    clearTimeout(timeout);
  }
}

async function downloadFirstAvailable(urls, dest) {
  let lastError = null;
  for (const url of urls) {
    try {
      await download(url, dest);
      return;
    } catch (error) {
      lastError = error;
      if (fs.existsSync(dest)) fs.unlinkSync(dest);
      log(`Falló ${url}: ${error instanceof Error ? error.message : error}`);
    }
  }
  throw lastError ?? new Error("No pude descargar el modelo Vosk.");
}

function copyDirRecursive(from, to) {
  fs.mkdirSync(to, { recursive: true });
  for (const entry of fs.readdirSync(from, { withFileTypes: true })) {
    const src = path.join(from, entry.name);
    const dest = path.join(to, entry.name);
    if (entry.isDirectory()) {
      copyDirRecursive(src, dest);
    } else {
      fs.copyFileSync(src, dest);
    }
  }
}

function moveDirCrossDevice(from, to) {
  if (fs.existsSync(to)) {
    fs.rmSync(to, { recursive: true, force: true });
  }
  try {
    fs.renameSync(from, to);
  } catch (error) {
    if (error && typeof error === "object" && "code" in error && error.code !== "EXDEV") {
      throw error;
    }
    copyDirRecursive(from, to);
    fs.rmSync(from, { recursive: true, force: true });
  }
}

function extractZip(zipFile, targetDir) {
  if (process.platform === "win32") {
    fs.mkdirSync(targetDir, { recursive: true });
    const result = spawnSync(
      "powershell",
      [
        "-NoProfile",
        "-Command",
        `Expand-Archive -LiteralPath '${zipFile.replace(/'/g, "''")}' -DestinationPath '${targetDir.replace(/'/g, "''")}' -Force`,
      ],
      { stdio: "inherit" },
    );
    if (result.status !== 0) {
      throw new Error("No pude extraer el zip del modelo Vosk.");
    }
    return;
  }

  const result = spawnSync("unzip", ["-o", zipFile, "-d", targetDir], { stdio: "inherit" });
  if (result.status !== 0) {
    throw new Error("No pude extraer el zip del modelo Vosk (instala unzip).");
  }
}

try {
  if (isModelReady(modelPath)) {
    log(`Modelo listo en ${modelPath}`);
    process.exit(0);
  }

  fs.mkdirSync(modelDir, { recursive: true });

  if (!fs.existsSync(zipPath) || fs.statSync(zipPath).size < 1_000_000) {
    await downloadFirstAvailable(MODEL_URLS, zipPath);
  }

  const tempDir = fs.mkdtempSync(path.join(modelDir, ".extract-"));
  extractZip(zipPath, tempDir);

  const extracted = fs
    .readdirSync(tempDir, { withFileTypes: true })
    .find((entry) => entry.isDirectory() && entry.name.includes("vosk-model"));

  if (!extracted) {
    throw new Error("Zip del modelo Vosk sin carpeta esperada.");
  }

  const from = path.join(tempDir, extracted.name);
  moveDirCrossDevice(from, modelPath);
  fs.rmSync(tempDir, { recursive: true, force: true });

  if (!isModelReady(modelPath)) {
    throw new Error("Modelo Vosk incompleto tras la extracción.");
  }

  log(`Modelo español listo: ${modelPath}`);
} catch (error) {
  console.error(`[onni-vosk] ${error instanceof Error ? error.message : error}`);
  process.exit(1);
}
