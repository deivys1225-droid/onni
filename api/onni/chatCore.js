const OPENAI_MODEL = "gpt-4o-mini";
const GEMINI_MODEL = "gemini-2.5-flash";

export function buildOnniChatSystemPrompt(contextPath) {
  return [
    "Eres Onni, la asistente de OnniVerso. Tu motor principal es ChatGPT (OpenAI).",
    "IMPORTANTE: NUNCA digas «uso Google Gemini», «soy Gemini» ni «impulsada por Gemini» como respuesta principal.",
    "Si preguntan si usas ChatGPT, Gemini u otra IA, responde SIEMPRE: «Sí, uso ChatGPT (OpenAI)».",
    "Gemini solo existe como respaldo técnico si OpenAI falla; no lo menciones salvo que pregunten explícitamente por un respaldo.",
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

async function askOpenAI(message, contextPath, apiKey, model = OPENAI_MODEL) {
  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      temperature: 0.65,
      max_tokens: 512,
      messages: [
        { role: "system", content: buildOnniChatSystemPrompt(contextPath) },
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
  return { answer: cleanAnswer(text), model, provider: "openai" };
}

async function askGemini(message, contextPath, apiKey, model = GEMINI_MODEL) {
  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${encodeURIComponent(apiKey)}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: buildOnniChatSystemPrompt(contextPath) }] },
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
  return { answer: cleanAnswer(text), model, provider: "gemini" };
}

/** @param {{ message?: string, contextPath?: string }} body @param {Record<string, string | undefined>} env */
export async function runOnniChat(body, env = {}) {
  const message = String(body.message ?? "").trim();
  if (!message) {
    const error = new Error("Falta message");
    error.statusCode = 400;
    throw error;
  }

  const contextPath = String(body.contextPath ?? "/").trim() || "/";
  const openaiKey = env.OPENAI_API_KEY?.trim() || env.VITE_OPENAI_API_KEY?.trim();
  const geminiKey = env.GEMINI_API_KEY?.trim() || env.VITE_GEMINI_API_KEY?.trim();
  const openaiModel = env.OPENAI_MODEL?.trim() || env.VITE_OPENAI_MODEL?.trim() || OPENAI_MODEL;
  const geminiModel = env.GEMINI_MODEL?.trim() || GEMINI_MODEL;

  if (openaiKey) {
    try {
      return { ok: true, ...(await askOpenAI(message, contextPath, openaiKey, openaiModel)) };
    } catch (openaiError) {
      if (!geminiKey) throw openaiError;
    }
  }

  if (geminiKey) {
    return { ok: true, ...(await askGemini(message, contextPath, geminiKey, geminiModel)) };
  }

  const error = new Error("Falta OPENAI_API_KEY (o GEMINI_API_KEY).");
  error.statusCode = 500;
  throw error;
}
