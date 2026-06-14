import { runOnniChat } from "../onni/chatCore.js";
import { formatOpActionForTelegram, resolveOpCommand } from "../onni/opCommandCore.js";

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

function normalizeUserText(text) {
  return String(text || "")
    .trim()
    .replace(/^onni[,:]?\s+/i, "")
    .replace(/^hola\s+onni[,:]?\s+/i, "")
    .trim();
}

function buildReply(answer, action) {
  const link = formatOpActionForTelegram(action);
  if (!link) return answer;
  if (link.startsWith("http")) return `${answer}\n\n${link}`;
  return `${answer}\n\n${link}`;
}

export async function processOnniTelegramText(rawText, env) {
  const text = normalizeUserText(rawText);

  if (!text) {
    return START_TEXT;
  }

  if (/^\/start(?:@\w+)?$/i.test(text)) {
    return START_TEXT;
  }

  if (/^\/help(?:@\w+)?$/i.test(text)) {
    return HELP_TEXT;
  }

  const command = resolveOpCommand(text, TELEGRAM_CONTEXT);

  if (command.handled && command.action) {
    return buildReply(command.answer, command.action);
  }

  if (command.handled) {
    return command.answer;
  }

  const ai = await runOnniChat({ message: text, contextPath: TELEGRAM_CONTEXT }, env);
  return String(ai.answer || "No pude generar una respuesta.").trim();
}
