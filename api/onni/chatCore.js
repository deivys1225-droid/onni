const DEFAULT_OPENROUTER_MODEL = "openrouter/free";
const OPENROUTER_API_URL = "https://openrouter.ai/api/v1/chat/completions";

export function buildOnniChatSystemPrompt(contextPath) {
  return [
    "Eres Onni, la asistente de OnniVerso. Respondes con modelos de IA a través de OpenRouter.",
    "Si preguntan qué IA usas, responde: «Uso modelos de IA a través de OpenRouter».",
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

async function askOpenRouter(message, contextPath, apiKey, model, siteUrl, siteTitle) {
  const headers = {
    "Content-Type": "application/json",
    Authorization: `Bearer ${apiKey}`,
  };
  if (siteUrl) headers["HTTP-Referer"] = siteUrl;
  if (siteTitle) headers["X-Title"] = siteTitle;

  const response = await fetch(OPENROUTER_API_URL, {
    method: "POST",
    headers,
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
      json?.error?.message || json?.error?.code || `OpenRouter error (${response.status})`;
    throw new Error(String(errMsg));
  }

  const text = json?.choices?.[0]?.message?.content?.trim() ?? "";
  if (!text) throw new Error("OpenRouter devolvió una respuesta vacía.");
  const resolvedModel = String(json?.model || model).trim() || model;
  return { answer: cleanAnswer(text), model: resolvedModel, provider: "openrouter" };
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
  const apiKey = env.OPENROUTER_API_KEY?.trim() || env.VITE_OPENROUTER_API_KEY?.trim();
  const model =
    env.OPENROUTER_MODEL?.trim() || env.VITE_OPENROUTER_MODEL?.trim() || DEFAULT_OPENROUTER_MODEL;
  const siteUrl =
    env.OPENROUTER_SITE_URL?.trim() || env.VITE_SITE_URL?.trim() || "https://onnivers.com";
  const siteTitle = env.OPENROUTER_SITE_TITLE?.trim() || "OnniVerso";

  if (!apiKey) {
    const error = new Error("Falta OPENROUTER_API_KEY.");
    error.statusCode = 500;
    throw error;
  }

  return {
    ok: true,
    ...(await askOpenRouter(message, contextPath, apiKey, model, siteUrl, siteTitle)),
  };
}
