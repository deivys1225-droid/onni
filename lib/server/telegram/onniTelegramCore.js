import { runOnniChat } from "../../../api/onni/chatCore.js";
import {
  executePcAction,
  isPcActionExecutionEnabled,
} from "../onni/pcActionRunner.js";
import {
  normalizeTelegramCommandText,
  resolveTelegramOpCommand,
} from "../onni/opCommandCore.js";
import { getGmailOAuthStartUrl, isGmailConfigured } from "../gmail/gmailConfig.js";
import { processTelegramEmailFlow } from "./telegramEmailFlow.js";

const TELEGRAM_CONTEXT = "/telegram";

const START_TEXT = [
  "Hola, soy Onni, tu asistente de OnniVerso.",
  "",
  "Desde Telegram mandas la orden y yo la ejecuto en tu PC (Windows).",
  "Prueba:",
  "• abre google",
  "• abre youtube",
  "• busca gatos en google",
  "• cierra google / cierra la ventana",
  "• crea carpeta Proyectos en escritorio",
  "• enviar correos (Gmail, uno por uno)",
  "",
  "Necesitas npm run telegram:bot corriendo en tu PC.",
  "Comandos: /help · /start",
].join("\n");

function buildHelpText(env) {
  return [
    "Órdenes en tu PC:",
    "• abre google / youtube / maps / spotify…",
    "• busca … en google",
    "• cierra google, chrome, la ventana…",
    "• crea carpeta Nombre en escritorio",
    "",
    "Correos (Gmail):",
    "• enviar correos → te pregunto asunto, mensaje, lista y adjunto",
    "• requiere Gmail autorizado (.env.local + OAuth)",
    isGmailConfigured(env)
      ? "• Gmail: configurado en este PC"
      : `• Gmail: pendiente → ${getGmailOAuthStartUrl(env)}`,
    "",
    "El bot local (npm run telegram:bot) debe estar activo en Windows.",
  ].join("\n");
}

const VERCEL_PC_HINT =
  "Para controlar tu PC ejecuta npm run telegram:bot en Windows (Vercel no puede abrir apps en tu máquina).";

export async function processOnniTelegramText(rawText, env) {
  const text = normalizeTelegramCommandText(rawText);

  if (!text) {
    return START_TEXT;
  }

  if (/^\/start(?:@\w+)?$/i.test(text)) {
    return START_TEXT;
  }

  if (/^\/help(?:@\w+)?$/i.test(text)) {
    return buildHelpText(env);
  }

  const command = resolveTelegramOpCommand(rawText);

  if (command.handled) {
    if (command.action) {
      if (isPcActionExecutionEnabled(env)) {
        const result = await executePcAction(command.action);
        return `${command.answer}\n${result.message}`.trim();
      }
      return `${command.answer}\n\n${VERCEL_PC_HINT}`;
    }
    return command.answer;
  }

  const ai = await runOnniChat({ message: text, contextPath: TELEGRAM_CONTEXT }, env);
  return String(ai.answer || "No pude generar una respuesta.").trim();
}

/** Procesa mensaje Telegram (texto + documento) con flujo de correos y comandos PC. */
export async function processOnniTelegramUpdate(update, env) {
  const message = update.message || update.edited_message;
  const chatId = message?.chat?.id;
  if (!chatId) return null;

  const token = env.TELEGRAM_BOT_TOKEN?.trim() || env.VITE_TELEGRAM_BOT_TOKEN?.trim() || "";
  const text = message?.text?.trim() || message?.caption?.trim() || "";
  const document = message?.document || null;

  const emailReply = await processTelegramEmailFlow({
    chatId,
    text,
    document,
    token,
    env,
  });

  if (emailReply !== null) {
    return emailReply;
  }

  if (!text) {
    return document
      ? "Recibí un archivo. Para adjuntarlo a un correo escribe enviar correos primero."
      : null;
  }

  return processOnniTelegramText(text, env);
}
