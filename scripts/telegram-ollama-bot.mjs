/**
 * Bot Telegram en tu PC → Ollama (gemma3:1b) + control PC + envío Gmail.
 */

import { loadEnvLocal } from "./load-env-local.mjs";
import { processOnniTelegramUpdate } from "../lib/server/telegram/onniTelegramCore.js";
import {
  getTelegramBotToken,
  isChatAllowed,
  sendTelegramChatAction,
  sendTelegramMessage,
} from "../lib/server/telegram/telegramApi.js";

loadEnvLocal();

const token = getTelegramBotToken(process.env);
if (!token) {
  console.error("Falta TELEGRAM_BOT_TOKEN en .env.local");
  process.exit(1);
}

process.env.TELEGRAM_BOT_TOKEN = token;
process.env.OLLAMA_ENABLED = "true";
process.env.OLLAMA_ONLY = "true";
process.env.OLLAMA_MODEL = process.env.OLLAMA_MODEL?.trim() || "gemma3:1b";
process.env.OLLAMA_HOST = process.env.OLLAMA_HOST?.trim() || "http://127.0.0.1:11434";
process.env.TELEGRAM_EXECUTE_PC_ACTIONS = "true";

async function telegramApi(method, body = {}) {
  const response = await fetch(`https://api.telegram.org/bot${token}/${method}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  return response.json();
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function ensureOllama() {
  try {
    const host = process.env.OLLAMA_HOST.replace(/\/$/, "");
    const response = await fetch(`${host}/api/tags`);
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const json = await response.json();
    const names = (json.models || []).map((m) => m.name);
    const model = process.env.OLLAMA_MODEL;
    if (!names.some((n) => n === model || n.startsWith(`${model}:`))) {
      console.warn(`Modelo ${model} no listado en Ollama. Modelos: ${names.join(", ") || "(ninguno)"}`);
    }
  } catch (error) {
    console.error("No pude conectar con Ollama en", process.env.OLLAMA_HOST);
    console.error("Abre Ollama o ejecuta: ollama serve");
    process.exit(1);
  }
}

async function handleUpdate(update) {
  const message = update.message || update.edited_message;
  const chatId = message?.chat?.id;
  if (!chatId) return;

  const hasText = Boolean(message?.text?.trim() || message?.caption?.trim());
  const hasDocument = Boolean(message?.document);
  if (!hasText && !hasDocument) return;

  if (!isChatAllowed(chatId, process.env)) {
    await sendTelegramMessage(token, chatId, "Este bot aún no está habilitado para tu cuenta.");
    return;
  }

  try {
    await sendTelegramChatAction(token, chatId, "typing");
    const reply = await processOnniTelegramUpdate(update, process.env);
    if (reply) {
      await sendTelegramMessage(token, chatId, reply);
      const preview = hasText ? message.text?.slice(0, 40) : `[archivo] ${message.document?.file_name || ""}`;
      console.log(`[ok] chat ${chatId}: ${preview}…`);
    }
  } catch (error) {
    const detail = error instanceof Error ? error.message : String(error);
    console.error("[Telegram bot]", detail);
    await sendTelegramMessage(
      token,
      chatId,
      "Tuve un problema. Revisa Ollama, Gmail (.env.local) o el log del bot.",
    );
  }
}

await ensureOllama();

const deleted = await telegramApi("deleteWebhook", { drop_pending_updates: false });
console.log("Webhook Vercel desactivado:", deleted.ok ? "sí" : deleted.description);

let offset = 0;
console.log(
  `Onni Telegram + Ollama (${process.env.OLLAMA_MODEL}) + PC + Gmail. Ctrl+C para salir.`,
);

while (true) {
  try {
    const updates = await telegramApi("getUpdates", {
      offset,
      timeout: 25,
      allowed_updates: ["message", "edited_message"],
    });

    if (!updates.ok) {
      console.error("getUpdates:", updates.description || updates);
      await sleep(3000);
      continue;
    }

    for (const update of updates.result || []) {
      offset = update.update_id + 1;
      await handleUpdate(update);
    }
  } catch (error) {
    console.error(error);
    await sleep(3000);
  }
}
