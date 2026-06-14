type OnniChatRequest = {
  message?: string;
  contextPath?: string;
};

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const DEFAULT_OPENROUTER_MODEL = "openrouter/free";
const OPENROUTER_API_URL = "https://openrouter.ai/api/v1/chat/completions";

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function buildSystemPrompt(contextPath: string): string {
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

function cleanAnswer(raw: string): string {
  let answer = raw.trim();
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

async function askOpenRouter(message: string, contextPath: string, apiKey: string) {
  const model = Deno.env.get("OPENROUTER_MODEL")?.trim() || DEFAULT_OPENROUTER_MODEL;
  const siteUrl = Deno.env.get("OPENROUTER_SITE_URL")?.trim() || "https://onnivers.com";
  const siteTitle = Deno.env.get("OPENROUTER_SITE_TITLE")?.trim() || "OnniVerso";

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    Authorization: `Bearer ${apiKey}`,
  };
  if (siteUrl) headers["HTTP-Referer"] = siteUrl;
  if (siteTitle) headers["X-Title"] = siteTitle;

  const openRouterRes = await fetch(OPENROUTER_API_URL, {
    method: "POST",
    headers,
    body: JSON.stringify({
      model,
      temperature: 0.65,
      max_tokens: 512,
      messages: [
        { role: "system", content: buildSystemPrompt(contextPath) },
        { role: "user", content: message },
      ],
    }),
  });

  const openRouterJson = await openRouterRes.json();
  if (!openRouterRes.ok) {
    const errMsg =
      (openRouterJson as { error?: { message?: string } })?.error?.message ??
      `OpenRouter API error (${openRouterRes.status})`;
    throw new Error(errMsg);
  }

  const rawAnswer = (openRouterJson as { choices?: { message?: { content?: string } }[] })
    ?.choices?.[0]?.message?.content?.trim() ?? "";
  if (!rawAnswer) throw new Error("OpenRouter returned an empty response");

  const resolvedModel =
    String((openRouterJson as { model?: string }).model ?? model).trim() || model;
  return { answer: cleanAnswer(rawAnswer), model: resolvedModel, provider: "openrouter" };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }
  if (req.method !== "POST") {
    return json({ error: "Method not allowed" }, 405);
  }

  try {
    const body = (await req.json()) as OnniChatRequest;
    const message = body.message?.trim() ?? "";
    if (!message) {
      return json({ error: "Missing message" }, 400);
    }

    const contextPath = body.contextPath?.trim() || "/";
    const openRouterKey = Deno.env.get("OPENROUTER_API_KEY")?.trim() ?? "";

    if (!openRouterKey) {
      return json({ error: "Missing OPENROUTER_API_KEY in Supabase Edge secrets" }, 500);
    }

    try {
      const result = await askOpenRouter(message, contextPath, openRouterKey);
      return json(result);
    } catch (openRouterError) {
      const messageText =
        openRouterError instanceof Error ? openRouterError.message : "OpenRouter error";
      return json({ error: messageText }, 502);
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unexpected error";
    return json({ error: message }, 500);
  }
});
