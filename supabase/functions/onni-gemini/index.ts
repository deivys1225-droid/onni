type GeminiRequest = {
  message?: string;
  contextPath?: string;
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

function buildSystemPrompt(contextPath: string): string {
  return [
    "Eres Onni, la asistente de OnniVerso. Estás impulsada por Google Gemini y SÍ estás conectada a esa IA.",
    "Si preguntan si usas Gemini o si estás conectada, responde afirmativamente (sí, uso Google Gemini).",
    "NUNCA digas que no estás conectada a Gemini ni que solo usas reglas.",
    `El usuario está en la ruta: ${contextPath || "/"}.`,
    "OnniVerso es una plataforma de experiencias inmersivas; no enumeres secciones salvo que pregunten explícitamente qué hay o dónde ir.",
    "No tienes resultados en vivo de partidos deportivos ni noticias del día.",
    "Tono: cercano, claro, español, 1–2 frases. No inventes URLs.",
    "NUNCA listes lobby, conciertos, tienda, Coliseo, aulas ni opciones de menú en saludos o respuestas genéricas.",
    "NO cierres invitando a elegir una sección ni con «dime cuál te interesa». Responde solo lo preguntado.",
  ].join("\n");
}

function extractGeminiText(payload: unknown): string {
  if (!payload || typeof payload !== "object") return "";
  const candidates = (payload as { candidates?: unknown[] }).candidates;
  if (!Array.isArray(candidates) || candidates.length === 0) return "";
  const parts = (candidates[0] as { content?: { parts?: unknown[] } })?.content?.parts;
  if (!Array.isArray(parts)) return "";
  return parts
    .map((part) => (part && typeof part === "object" && typeof (part as { text?: string }).text === "string"
      ? (part as { text: string }).text
      : ""))
    .join("")
    .trim();
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
      return json({ error: "Missing GEMINI_API_KEY in Supabase Edge secrets" }, 500);
    }

    const body = (await req.json()) as GeminiRequest;
    const message = body.message?.trim() ?? "";
    if (!message) {
      return json({ error: "Missing message" }, 400);
    }

    const contextPath = body.contextPath?.trim() || "/";
    const model = Deno.env.get("GEMINI_MODEL")?.trim() || DEFAULT_MODEL;
    const systemPrompt = buildSystemPrompt(contextPath);

    const geminiRes = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${encodeURIComponent(apiKey)}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          systemInstruction: {
            parts: [{ text: systemPrompt }],
          },
          contents: [
            {
              role: "user",
              parts: [{ text: message }],
            },
          ],
          generationConfig: {
            maxOutputTokens: 512,
            temperature: 0.65,
          },
        }),
      },
    );

    const geminiJson = await geminiRes.json();
    if (!geminiRes.ok) {
      const errMsg =
        (geminiJson as { error?: { message?: string } })?.error?.message ??
        `Gemini API error (${geminiRes.status})`;
      return json({ error: errMsg }, geminiRes.status >= 500 ? 502 : geminiRes.status);
    }

    const rawAnswer = extractGeminiText(geminiJson);
    if (!rawAnswer) {
      return json({ error: "Gemini returned an empty response" }, 502);
    }

    let answer = rawAnswer
      .replace(/\n\s*si necesitas explorar[\s\S]*$/i, "")
      .replace(/\n\s*recuerda que tambi[eé]n puedes[\s\S]*$/i, "")
      .replace(/\n\s*(para navegar|comandos como|tambien puedes usar)[\s\S]*$/i, "")
      .replace(/\ben onniverso (tenemos|ofrece|cuenta con)[\s\S]*$/i, "")
      .replace(/[\s\S]*\bdime cu[aá]l te interesa\b[\s\S]*$/i, "")
      .trim();
    if (!answer || /\b(lobby 3d|conciertos en vivo|coliseo 360|aulas virtuales)\b/i.test(answer)) {
      answer = "¡Hola! Soy Onni, tu copiloto en OnniVerso.";
    }

    return json({ answer, model });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unexpected error";
    return json({ error: message }, 500);
  }
});
