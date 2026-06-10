/**
 * POST /api/onni/chat
 * Body: { message: string, contextPath?: string }
 * Orden: OpenAI (ChatGPT) → Gemini.
 * Secrets en Vercel: OPENAI_API_KEY, opcional GEMINI_API_KEY.
 */

const OPENAI_MODEL = process.env.OPENAI_MODEL?.trim() || "gpt-4o-mini";
const GEMINI_MODEL = process.env.GEMINI_MODEL?.trim() || "gemini-2.5-flash";

function cors(res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
}

function buildSystemPrompt(contextPath) {
  return [
    "Eres Onni, la asistente de OnniVerso. Respondes con ChatGPT (OpenAI); Gemini solo es respaldo si falla OpenAI.",
    "Si preguntan qué IA usas, di que usas ChatGPT (OpenAI) y, si hace falta, Gemini como respaldo.",
    "NUNCA digas que solo usas reglas fijas sin IA.",
    `El usuario está en la ruta: ${contextPath || "/"}.`,
    "OnniVerso es una plataforma de experiencias inmersivas; no enumeres secciones salvo que pregunten explícitamente qué hay o dónde ir.",
    "No tienes resultados en vivo de partidos deportivos ni noticias del día.",
    "Tono: cercano, claro, español, 1–2 frases. No inventes URLs.",
    "NUNCA listes lobby, conciertos, tienda, Coliseo, aulas ni opciones de menú en saludos o respuestas genéricas.",
    "NO cierres invitando a elegir una sección ni con «dime cuál te interesa». Responde solo lo preguntado.",
  ].join("\n");
}

function cleanAnswer(raw) {
  let answer = String(raw ?? "").trim();
  answer = answer
    .replace(/\n\s*si necesitas explorar[\s\S]*$/i, "")
    .replace(/\n\s*recuerda que tambi[eé]n puedes[\s\S]*$/i, "")
    .replace(/\n\s*(para navegar|comandos como|tambien puedes usar)[\s\S]*$/i, "")
    .replace(/\ben onniverso (tenemos|ofrece|cuenta con)[\s\S]*$/i, "")
    .replace(/[\s\S]*\bdime cu[aá]l te interesa\b[\s\S]*$/i, "")
    .trim();
  if (!answer || /\b(lobby 3d|conciertos en vivo|coliseo 360|aulas virtuales)\b/i.test(answer)) {
    return "¡Hola! Soy Onni, tu copiloto en OnniVerso.";
  }
  return answer;
}

async function askOpenAI(message, contextPath, apiKey) {
  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: OPENAI_MODEL,
      temperature: 0.65,
      max_tokens: 512,
      messages: [
        { role: "system", content: buildSystemPrompt(contextPath) },
        { role: "user", content: message },
      ],
    }),
  });

  const json = await response.json();
  if (!response.ok) {
    const errMsg =
      json?.error?.message || json?.error?.code || `OpenAI error (${response.status})`;
    throw new Error(String(errMsg));
  }

  const text = json?.choices?.[0]?.message?.content?.trim() ?? "";
  if (!text) throw new Error("OpenAI devolvió una respuesta vacía.");
  return { answer: cleanAnswer(text), model: OPENAI_MODEL, provider: "openai" };
}

async function askGemini(message, contextPath, apiKey) {
  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${encodeURIComponent(apiKey)}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: buildSystemPrompt(contextPath) }] },
        contents: [{ role: "user", parts: [{ text: message }] }],
        generationConfig: { maxOutputTokens: 512, temperature: 0.65 },
      }),
    },
  );

  const json = await response.json();
  if (!response.ok) {
    const errMsg = json?.error?.message || `Gemini error (${response.status})`;
    throw new Error(String(errMsg));
  }

  const parts = json?.candidates?.[0]?.content?.parts;
  const text = Array.isArray(parts)
    ? parts.map((p) => (typeof p?.text === "string" ? p.text : "")).join("").trim()
    : "";
  if (!text) throw new Error("Gemini devolvió una respuesta vacía.");
  return { answer: cleanAnswer(text), model: GEMINI_MODEL, provider: "gemini" };
}

export default async function handler(req, res) {
  cors(res);
  if (req.method === "OPTIONS") {
    return res.status(204).end();
  }
  if (req.method !== "POST") {
    return res.status(405).json({ ok: false, error: "Método no permitido" });
  }

  try {
    const body = req.body ?? {};
    const message = String(body.message ?? "").trim();
    if (!message) {
      return res.status(400).json({ ok: false, error: "Falta message" });
    }
    const contextPath = String(body.contextPath ?? "/").trim() || "/";

    const openaiKey = process.env.OPENAI_API_KEY?.trim();
    const geminiKey = process.env.GEMINI_API_KEY?.trim();

    if (openaiKey) {
      try {
        const result = await askOpenAI(message, contextPath, openaiKey);
        return res.status(200).json({ ok: true, ...result });
      } catch (openaiError) {
        if (!geminiKey) {
          throw openaiError;
        }
      }
    }

    if (geminiKey) {
      const result = await askGemini(message, contextPath, geminiKey);
      return res.status(200).json({ ok: true, ...result });
    }

    return res.status(500).json({
      ok: false,
      error: "Falta OPENAI_API_KEY (o GEMINI_API_KEY) en Vercel → Environment Variables.",
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Error inesperado";
    return res.status(502).json({ ok: false, error: message });
  }
}
