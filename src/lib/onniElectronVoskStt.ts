function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const result = reader.result;
      if (typeof result !== "string") {
        reject(new Error("No se pudo leer el audio."));
        return;
      }
      const comma = result.indexOf(",");
      resolve(comma >= 0 ? result.slice(comma + 1) : result);
    };
    reader.onerror = () => reject(new Error("No se pudo leer el audio."));
    reader.readAsDataURL(blob);
  });
}

export async function transcribeOnniElectronVosk(wavBlob: Blob): Promise<string> {
  if (!wavBlob.size) return "";

  const vosk = window.onniversDesktop?.vosk;
  if (!vosk?.transcribe) {
    throw new Error("Vosk no está disponible en este OnniVers. Ejecuta npm run desktop:vosk y reinstala.");
  }

  const audioBase64 = await blobToBase64(wavBlob);
  const result = await vosk.transcribe({ audioBase64, mimeType: "audio/wav" });
  return String(result?.text ?? "").trim();
}

export async function isOnniElectronVoskAvailable(): Promise<boolean> {
  const vosk = window.onniversDesktop?.vosk;
  if (!vosk?.isAvailable) return false;
  try {
    return await vosk.isAvailable();
  } catch {
    return false;
  }
}
