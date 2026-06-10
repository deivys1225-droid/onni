type SttRequest = {
  audioBase64?: string;
  mimeType?: string;
};

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const DEFAULT_MODEL = "gemini-2.5-flash";

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function normalizeMimeType(raw: string): string {
  const base = raw.split(";")[0]?.trim().toLowerCase() || "audio/webm";
  if (base === "video/webm") return "audio/webm";
  if (base.startsWith("audio/")) return base;
  return "audio/webm";
}

function extractGeminiText(payload: unknown): string {
  if (!payload || typeof payload !== "object") return "";
  const candidates = (payload as { candidates?: unknown[] }).candidates;
  if (!Array.isArray(candidates) || candidates.length === 0) return "";
  const parts = (candidates[0] as { content?: { parts?: unknown[] } })?.content?.parts;
  if (!Array.isArray(parts)) return "";
  return parts
    .map((part) =>
      part && typeof part === "object" && typeof (part as { text?: string }).text === "string"
        ? (part as { text: string }).text
        : "",
    )
    .join("")
    .trim();
}

function geminiErrorMessage(payload: unknown, status: number): string {
  const raw =
    typeof payload === "object" && payload && "error" in payload
      ? String((payload as { error?: { message?: string } }).error?.message ?? "")
      : "";
  if (status === 429 || /quota|rate limit|resource exhausted/i.test(raw)) {
    return "El servicio de voz no tiene cuota ahora mismo. Espera un minuto e inténtalo otra vez.";
  }
  if (/invalid argument|unsupported|mime/i.test(raw)) {
    return "Formato de audio no válido. Pulsa el micrófono otra vez e inténtalo.";
  }
  return raw.trim() || `Gemini STT error (${status})`;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }
  if (req.method !== "POST") {
    return json({ error: "Method not allowed" }, 405);
  }

  try {
    const apiKey = Deno.env.get("GEMINI_API_KEY")?.trim() ?? "";
    if (!apiKey) {
      return json({ error: "Falta GEMINI_API_KEY en Supabase (secrets)." }, 500);
    }

    const body = (await req.json()) as SttRequest;
    const audioBase64 = body.audioBase64?.trim() ?? "";
    if (!audioBase64) {
      return json({ error: "Missing audioBase64" }, 400);
    }

    const mimeType = normalizeMimeType(body.mimeType?.trim() || "audio/webm");
    const model = Deno.env.get("GEMINI_MODEL")?.trim() || DEFAULT_MODEL;

    const geminiRes = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${encodeURIComponent(apiKey)}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [
            {
              parts: [
                {
                  text:
                    "Transcribe exactly what the person says in this audio. Language: Spanish (Colombia). Return only the spoken words, without quotes or commentary.",
                },
                {
                  inlineData: {
                    mimeType,
                    data: audioBase64,
                  },
                },
              ],
            },
          ],
          generationConfig: {
            temperature: 0.1,
            maxOutputTokens: 256,
          },
        }),
      },
    );

    const payload = await geminiRes.json();
    if (!geminiRes.ok) {
      return json({ error: geminiErrorMessage(payload, geminiRes.status) }, 502);
    }

    const text = extractGeminiText(payload);
    return json({ text, model });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unexpected STT error";
    return json({ error: message }, 500);
  }
});
