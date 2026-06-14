/**
 * POST /api/telegram/webhook
 * Webhook de Telegram → Onni (OpenRouter + reglas locales).
 *
 * Vercel env:
 *   TELEGRAM_BOT_TOKEN
 *   OPENROUTER_API_KEY
 *   TELEGRAM_WEBHOOK_SECRET (opcional)
 *   TELEGRAM_ALLOWED_CHAT_IDS (opcional, coma-separados)
 */

import { processOnniTelegramText } from "./onniTelegramCore.js";
import {
  getTelegramBotToken,
  isChatAllowed,
  sendTelegramChatAction,
  sendTelegramMessage,
  verifyTelegramWebhookSecret,
} from "./telegramApi.js";

function cors(res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, X-Telegram-Bot-Api-Secret-Token");
}

export default async function handler(req, res) {
  cors(res);

  if (req.method === "OPTIONS") {
    return res.status(204).end();
  }

  if (req.method !== "POST") {
    return res.status(405).json({ ok: false, error: "Método no permitido" });
  }

  const token = getTelegramBotToken(process.env);
  if (!token) {
    return res.status(500).json({ ok: false, error: "Falta TELEGRAM_BOT_TOKEN" });
  }

  if (!verifyTelegramWebhookSecret(req, process.env)) {
    return res.status(403).json({ ok: false, error: "Webhook secret inválido" });
  }

  const update = req.body ?? {};
  const message = update.message || update.edited_message;
  const chatId = message?.chat?.id;
  const text = message?.text?.trim();

  if (!chatId || !text) {
    return res.status(200).json({ ok: true, skipped: true });
  }

  if (!isChatAllowed(chatId, process.env)) {
    await sendTelegramMessage(token, chatId, "Este bot aún no está habilitado para tu cuenta.");
    return res.status(200).json({ ok: true, denied: true });
  }

  try {
    await sendTelegramChatAction(token, chatId, "typing");
    const reply = await processOnniTelegramText(text, process.env);
    await sendTelegramMessage(token, chatId, reply);
    return res.status(200).json({ ok: true });
  } catch (error) {
    const detail = error instanceof Error ? error.message : "Error inesperado";
    console.error("[Telegram webhook]", detail);
    try {
      await sendTelegramMessage(
        token,
        chatId,
        "Tuve un problema al responder. Revisa OPENROUTER_API_KEY y vuelve a intentar.",
      );
    } catch {
      /* ignore secondary failure */
    }
    return res.status(200).json({ ok: false, error: detail });
  }
}
