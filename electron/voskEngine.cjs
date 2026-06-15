const fs = require("fs");
const path = require("path");

let voskModule = null;
let model = null;

function getModelPath() {
  const { app } = require("electron");
  if (app.isPackaged) {
    return path.join(process.resourcesPath, "vosk-model");
  }
  return path.join(__dirname, "vosk", "model", "vosk-model-small-es-0.42");
}

function isModelReady(dir) {
  return (
    fs.existsSync(path.join(dir, "am", "final.mdl")) ||
    fs.existsSync(path.join(dir, "graph", "Gr.fst"))
  );
}

function loadVosk() {
  if (!voskModule) {
    voskModule = require("vosk");
    if (typeof voskModule.setLogLevel === "function") {
      voskModule.setLogLevel(-1);
    }
  }
  return voskModule;
}

function getModel() {
  if (!model) {
    const vosk = loadVosk();
    const modelPath = getModelPath();
    if (!isModelReady(modelPath)) {
      throw new Error(
        "Modelo Vosk no encontrado. En desarrollo ejecuta: npm run desktop:vosk",
      );
    }
    model = new vosk.Model(modelPath);
  }
  return model;
}

function wavPcmSlice(wavBuffer) {
  if (wavBuffer.length < 44) return wavBuffer;
  if (wavBuffer.toString("ascii", 0, 4) !== "RIFF") return wavBuffer;
  return wavBuffer.subarray(44);
}

function transcribeWavBuffer(wavBuffer) {
  const vosk = loadVosk();
  const sampleRate = 16000;
  const recognizer = new vosk.Recognizer({ model: getModel(), sampleRate });
  const pcm = wavPcmSlice(wavBuffer);

  try {
    const chunkSize = 8000;
    for (let offset = 0; offset < pcm.length; offset += chunkSize) {
      recognizer.acceptWaveform(pcm.subarray(offset, offset + chunkSize));
    }
    const final = JSON.parse(recognizer.finalResult());
    return String(final.text || "").trim();
  } finally {
    if (typeof recognizer.free === "function") {
      recognizer.free();
    }
  }
}

function isVoskAvailable() {
  try {
    loadVosk();
    return isModelReady(getModelPath());
  } catch {
    return false;
  }
}

module.exports = {
  getModelPath,
  isModelReady,
  isVoskAvailable,
  transcribeWavBuffer,
};
