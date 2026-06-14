const TELEGRAM_API = "https://api.telegram.org";

export function getTelegramBotToken(env) {
  return env.TELEGRAM_BOT_TOKEN?.trim() || env.VITE_TELEGRAM_BOT_TOKEN?.trim() || "";
}

export async function telegramRequest(token, method, body) {
  const response = await fetch(`${TELEGRAM_API}/bot${token}/${method}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const json = await response.json();
  if (!response.ok || json.ok === false) {
    const detail = json.description || `Telegram ${method} error (${response.status})`;
    throw new Error(String(detail));
  }
  return json.result;
}

export async function sendTelegramMessage(token, chatId, text, options = {}) {
  const payload = {
    chat_id: chatId,
    text: String(text || "").slice(0, 4096),
    disable_web_page_preview: options.disablePreview ?? false,
  };
  if (options.parseMode) payload.parse_mode = options.parseMode;
  return telegramRequest(token, "sendMessage", payload);
}

export async function sendTelegramChatAction(token, chatId, action = "typing") {
  return telegramRequest(token, "sendChatAction", { chat_id: chatId, action });
}

export function isChatAllowed(chatId, env) {
  const raw = env.TELEGRAM_ALLOWED_CHAT_IDS?.trim();
  if (!raw) return true;
  const allowed = raw.split(",").map((id) => id.trim()).filter(Boolean);
  return allowed.includes(String(chatId));
}

export function verifyTelegramWebhookSecret(req, env) {
  const expected = env.TELEGRAM_WEBHOOK_SECRET?.trim();
  if (!expected) return true;
  const received = req.headers?.["x-telegram-bot-api-secret-token"];
  return received === expected;
}
