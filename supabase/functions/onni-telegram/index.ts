type TelegramUpdate = {
  message?: { chat?: { id?: number }; text?: string };
  edited_message?: { chat?: { id?: number }; text?: string };
};

const DEFAULT_OPENROUTER_MODEL = "openrouter/free";
const OPENROUTER_API_URL = "https://openrouter.ai/api/v1/chat/completions";
const TELEGRAM_CONTEXT = "/telegram";

const START_TEXT = [
  "Hola, soy Onni, tu asistente de OnniVerso.",
  "",
  "Escríbeme en español o prueba:",
  "• busca en google inteligencia artificial",
  "• abre youtube",
  "• cualquier pregunta general",
  "",
  "Comandos: /help · /start",
].join("\n");

const HELP_TEXT = [
  "Puedo responder preguntas (OpenRouter) y abrir enlaces:",
  "• busca en google …",
  "• abre youtube / abre google",
  "• abre youtube con …",
  "",
  "Crear carpetas o PDF de página solo funciona en OnniVers PC.",
].join("\n");

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

function buildSystemPrompt(contextPath: string): string {
  return [
    "Eres Onni, la asistente de OnniVerso. Respondes con modelos de IA a través de OpenRouter.",
    "Si preguntan qué IA usas, responde: «Uso modelos de IA a través de OpenRouter».",
    "NUNCA digas que solo usas reglas fijas sin IA.",
    `El usuario está en la ruta: ${contextPath || "/"}.`,
    "Tono: cercano, claro, español, 1–2 frases. No inventes URLs.",
  ].join("\n");
}

function cleanAnswer(raw: string): string {
  let answer = raw.trim();
  if (!answer) return "¡Hola! Soy Onni, tu copiloto en OnniVerso.";
  return answer;
}

function normalizeUserText(text: string): string {
  return text
    .trim()
    .replace(/^onni[,:]?\s+/i, "")
    .replace(/^hola\s+onni[,:]?\s+/i, "")
    .trim();
}

function resolveLocalCommand(raw: string): { answer: string; handled: boolean; link?: string } {
  const text = raw.trim();
  if (!text) return { answer: START_TEXT, handled: true };

  const ytWithQuery = text.match(/abre\s+youtube\s+con\s+(.+)/i);
  if (ytWithQuery?.[1]) {
    const q = ytWithQuery[1].trim();
    return {
      answer: `Abriendo YouTube con: ${q}`,
      handled: true,
      link: `https://www.youtube.com/results?search_query=${encodeURIComponent(q)}`,
    };
  }
  if (/\babre\s+youtube\b/i.test(text)) {
    return { answer: "Abriendo YouTube.", handled: true, link: "https://www.youtube.com/" };
  }
  const googleSearch = text.match(/busca\s+en\s+google\s+(.+)/i);
  if (googleSearch?.[1]) {
    const q = googleSearch[1].trim();
    return {
      answer: `Buscando en Google: ${q}`,
      handled: true,
      link: `https://www.google.com/search?q=${encodeURIComponent(q)}`,
    };
  }
  if (/\babre\s+google\b/i.test(text)) {
    return { answer: "Abriendo Google.", handled: true, link: "https://www.google.com/" };
  }
  return { answer: "Te escucho.", handled: false };
}

async function askOpenRouter(message: string, apiKey: string): Promise<string> {
  const model = Deno.env.get("OPENROUTER_MODEL")?.trim() || DEFAULT_OPENROUTER_MODEL;
  const siteUrl = Deno.env.get("OPENROUTER_SITE_URL")?.trim() || "https://onnivers.com";
  const siteTitle = Deno.env.get("OPENROUTER_SITE_TITLE")?.trim() || "OnniVerso";

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    Authorization: `Bearer ${apiKey}`,
    "HTTP-Referer": siteUrl,
    "X-Title": siteTitle,
  };

  const response = await fetch(OPENROUTER_API_URL, {
    method: "POST",
    headers,
    body: JSON.stringify({
      model,
      temperature: 0.65,
      max_tokens: 512,
      messages: [
        { role: "system", content: buildSystemPrompt(TELEGRAM_CONTEXT) },
        { role: "user", content: message },
      ],
    }),
  });

  const payload = await response.json();
  if (!response.ok) {
    const errMsg =
      (payload as { error?: { message?: string } })?.error?.message ??
      `OpenRouter error (${response.status})`;
    throw new Error(errMsg);
  }

  const rawAnswer = (payload as { choices?: { message?: { content?: string } }[] })
    ?.choices?.[0]?.message?.content?.trim() ?? "";
  if (!rawAnswer) throw new Error("OpenRouter returned an empty response");
  return cleanAnswer(rawAnswer);
}

async function telegramApi(token: string, method: string, body: Record<string, unknown>) {
  const response = await fetch(`https://api.telegram.org/bot${token}/${method}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const payload = await response.json();
  if (!response.ok || payload.ok === false) {
    throw new Error(String(payload.description || `Telegram ${method} failed`));
  }
}

async function processText(rawText: string): Promise<string> {
  const text = normalizeUserText(rawText);
  if (!text) return START_TEXT;
  if (/^\/start(?:@\w+)?$/i.test(text)) return START_TEXT;
  if (/^\/help(?:@\w+)?$/i.test(text)) return HELP_TEXT;

  const local = resolveLocalCommand(text);
  if (local.handled) {
    return local.link ? `${local.answer}\n\n${local.link}` : local.answer;
  }

  const openRouterKey = Deno.env.get("OPENROUTER_API_KEY")?.trim() ?? "";
  if (!openRouterKey) throw new Error("Missing OPENROUTER_API_KEY");
  return askOpenRouter(text, openRouterKey);
}

function verifySecret(req: Request): boolean {
  const expected = Deno.env.get("TELEGRAM_WEBHOOK_SECRET")?.trim();
  if (!expected) return true;
  return req.headers.get("x-telegram-bot-api-secret-token") === expected;
}

Deno.serve(async (req) => {
  if (req.method === "GET") {
    return json({
      ok: true,
      service: "onni-telegram",
      hasBotToken: Boolean(Deno.env.get("TELEGRAM_BOT_TOKEN")?.trim()),
      hasOpenRouter: Boolean(Deno.env.get("OPENROUTER_API_KEY")?.trim()),
    });
  }

  if (req.method !== "POST") {
    return json({ error: "Method not allowed" }, 405);
  }

  if (!verifySecret(req)) {
    return json({ error: "Webhook secret inválido" }, 403);
  }

  const botToken = Deno.env.get("TELEGRAM_BOT_TOKEN")?.trim() ?? "";
  if (!botToken) {
    return json({ error: "Missing TELEGRAM_BOT_TOKEN" }, 500);
  }

  try {
    const update = (await req.json()) as TelegramUpdate;
    const message = update.message || update.edited_message;
    const chatId = message?.chat?.id;
    const text = message?.text?.trim();

    if (!chatId || !text) {
      return json({ ok: true, skipped: true });
    }

    await telegramApi(botToken, "sendChatAction", { chat_id: chatId, action: "typing" });
    const reply = await processText(text);
    await telegramApi(botToken, "sendMessage", { chat_id: chatId, text: reply.slice(0, 4096) });
    return json({ ok: true });
  } catch (error) {
    const detail = error instanceof Error ? error.message : "Unexpected error";
    console.error("[onni-telegram]", detail);
    return json({ error: detail }, 502);
  }
});
