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

export async function transcribeOnniElectronWhisper(blob: Blob): Promise<string> {
  if (!blob.size) return "";

  const whisper = window.onniversDesktop?.whisper;
  if (!whisper?.transcribe) {
    throw new Error("Whisper no está disponible en este OnniVers. Cierra y abre el instalador nuevo.");
  }

  const audioBase64 = await blobToBase64(blob);
  try {
    const result = await whisper.transcribe({
      audioBase64,
      mimeType: blob.type || "audio/webm",
    });
    return String(result?.text ?? "").trim();
  } catch (error) {
    const raw = error instanceof Error ? error.message : String(error);
    if (/EBML|Invalid data|Error opening input|ffmpeg version/i.test(raw)) {
      throw new Error("No pude leer el audio grabado. Habla cuando veas el micrófono activo e inténtalo otra vez.");
    }
    throw error instanceof Error ? error : new Error(raw);
  }
}

export function isOnniElectronWhisperAvailable(): boolean {
  return typeof window.onniversDesktop?.whisper?.transcribe === "function";
}
