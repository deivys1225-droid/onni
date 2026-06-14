const DEFAULT_OPENROUTER_MODEL = "openrouter/free";
const OPENROUTER_API_URL = "https://openrouter.ai/api/v1/chat/completions";
const DEFAULT_OLLAMA_HOST = "http://127.0.0.1:11434";
const DEFAULT_OLLAMA_MODEL = "gemma3:1b";

export function buildOnniChatSystemPrompt(contextPath, provider = "openrouter") {
  const aiLine =
    provider === "ollama"
      ? "Si preguntan qué IA usas, responde: «Uso Gemma 3 local con Ollama en tu equipo»."
      : "Si preguntan qué IA usas, responde: «Uso modelos de IA a través de OpenRouter».";

  return [
    provider === "ollama"
      ? "Eres Onni, la asistente de OnniVerso. Respondes con Ollama (Gemma 3) en el PC del usuario."
      : "Eres Onni, la asistente de OnniVerso. Respondes con modelos de IA a través de OpenRouter.",
    aiLine,
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

function isTruthyEnv(value) {
  return String(value ?? "")
    .trim()
    .toLowerCase() === "true";
}

async function askOllama(message, contextPath, host, model = DEFAULT_OLLAMA_MODEL) {
  const baseUrl = String(host || DEFAULT_OLLAMA_HOST).replace(/\/$/, "");
  const response = await fetch(`${baseUrl}/api/chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model,
      stream: false,
      messages: [
        { role: "system", content: buildOnniChatSystemPrompt(contextPath, "ollama") },
        { role: "user", content: message },
      ],
      options: { temperature: 0.65, num_predict: 512 },
    }),
  });

  const json = await response.json();
  if (!response.ok) {
    const errMsg = json?.error || `Ollama error (${response.status})`;
    throw new Error(String(errMsg));
  }

  const text = json?.message?.content?.trim() ?? "";
  if (!text) throw new Error("Ollama devolvió una respuesta vacía. ¿Está corriendo ollama serve?");
  return { answer: cleanAnswer(text), model, provider: "ollama" };
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
        { role: "system", content: buildOnniChatSystemPrompt(contextPath, "openrouter") },
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
  const ollamaEnabled = isTruthyEnv(env.OLLAMA_ENABLED) || isTruthyEnv(env.VITE_OLLAMA_ENABLED);
  const ollamaOnly = isTruthyEnv(env.OLLAMA_ONLY) || isTruthyEnv(env.VITE_OLLAMA_ONLY);
  const ollamaHost =
    env.OLLAMA_HOST?.trim() || env.VITE_OLLAMA_HOST?.trim() || DEFAULT_OLLAMA_HOST;
  const ollamaModel =
    env.OLLAMA_MODEL?.trim() || env.VITE_OLLAMA_MODEL?.trim() || DEFAULT_OLLAMA_MODEL;
  const apiKey = env.OPENROUTER_API_KEY?.trim() || env.VITE_OPENROUTER_API_KEY?.trim();
  const openRouterModel =
    env.OPENROUTER_MODEL?.trim() || env.VITE_OPENROUTER_MODEL?.trim() || DEFAULT_OPENROUTER_MODEL;
  const siteUrl =
    env.OPENROUTER_SITE_URL?.trim() || env.VITE_SITE_URL?.trim() || "https://onnivers.com";
  const siteTitle = env.OPENROUTER_SITE_TITLE?.trim() || "OnniVerso";

  if (ollamaEnabled) {
    try {
      return { ok: true, ...(await askOllama(message, contextPath, ollamaHost, ollamaModel)) };
    } catch (ollamaError) {
      if (ollamaOnly && !apiKey) throw ollamaError;
      if (ollamaOnly && apiKey) {
        console.warn("[Onni AI] Ollama no respondió; usando OpenRouter como respaldo.");
      } else if (!apiKey) {
        throw ollamaError;
      }
    }
  }

  if (!apiKey) {
    const error = new Error(
      ollamaEnabled
        ? "Ollama no respondió y falta OPENROUTER_API_KEY de respaldo."
        : "Falta OPENROUTER_API_KEY.",
    );
    error.statusCode = 500;
    throw error;
  }

  return {
    ok: true,
    ...(await askOpenRouter(message, contextPath, apiKey, openRouterModel, siteUrl, siteTitle)),
  };
}
