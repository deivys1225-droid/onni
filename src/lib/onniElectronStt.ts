import { supabasePublicUrl, supabasePublishableKey } from "@/integrations/supabase/client";

function normalizeSttMimeType(raw: string): string {
  const base = raw.split(";")[0]?.trim().toLowerCase() || "audio/webm";
  if (base === "video/webm") return "audio/webm";
  if (base.startsWith("audio/")) return base;
  return "audio/webm";
}

function friendlySttError(status: number, backendError: string): string {
  const detail = backendError.trim();
  if (detail && !/non-2xx status code/i.test(detail)) return detail;
  if (status === 401 || status === 403) {
    return "No pude conectar el servicio de voz. Cierra OnniVers, espera un minuto y ábrelo otra vez.";
  }
  if (status === 429 || status === 502) {
    return "El servicio de voz no tiene cuota ahora mismo. Espera un minuto e inténtalo otra vez.";
  }
  return detail || "No se pudo transcribir el audio.";
}

export async function transcribeOnniElectronAudio(blob: Blob): Promise<string> {
  if (!blob.size) return "";

  const mimeType = normalizeSttMimeType(blob.type || "audio/webm");
  const base64 = await blobToBase64(blob);

  const response = await fetch(`${supabasePublicUrl}/functions/v1/onni-stt`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      apikey: supabasePublishableKey,
      Authorization: `Bearer ${supabasePublishableKey}`,
    },
    body: JSON.stringify({ audioBase64: base64, mimeType }),
  });

  let payload: { text?: string; error?: string } = {};
  try {
    payload = (await response.json()) as { text?: string; error?: string };
  } catch {
    payload = {};
  }

  const text = String(payload.text ?? "").trim();
  if (response.ok && text) return text;

  throw new Error(friendlySttError(response.status, String(payload.error ?? "")));
}

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
