import fs from "fs/promises";
import os from "os";
import path from "path";
import { sendSmtpBulk } from "../mail/smtpSend.js";
import { isSmtpConfigured, smtpSetupMessage } from "../mail/smtpConfig.js";
import { downloadTelegramFile, sendTelegramMessage } from "../telegram/telegramApi.js";

const MAX_RECIPIENTS = 50;
const sessions = new Map();

const STEPS = {
  SUBJECT: "subject",
  BODY: "body",
  RECIPIENTS: "recipients",
  ATTACHMENT_CHOICE: "attachment_choice",
  ATTACHMENT_FILE: "attachment_file",
  CONFIRM: "confirm",
  SENDING: "sending",
};

function normalizeYesNo(text) {
  const value = String(text || "").trim().toLowerCase();
  if (/^(si|sí|yes|y|ok|dale|confirmo|enviar)$/.test(value)) return "yes";
  if (/^(no|nop|cancelar|cancel)$/.test(value)) return "no";
  return null;
}

function isEmailFlowTrigger(text) {
  return /^(enviar|mandar)\s+correos?$/i.test(String(text || "").trim());
}

export function isTelegramEmailFlowActive(chatId) {
  return sessions.has(String(chatId));
}

function parseEmailAddresses(text) {
  const parts = String(text || "")
    .split(/[\s,;]+/)
    .map((part) => part.trim())
    .filter(Boolean);

  const emailRe = /^[^\s@]+@[^\s@]+\.[^\s@]+$/i;
  const valid = [];

  for (const part of parts) {
    if (emailRe.test(part)) valid.push(part);
  }

  return [...new Set(valid)];
}

function truncate(text, max = 180) {
  const value = String(text || "").trim();
  if (value.length <= max) return value;
  return `${value.slice(0, max)}…`;
}

function buildConfirmSummary(session) {
  const lines = [
    "Confirma el envío:",
    "",
    `Asunto: ${session.subject}`,
    `Mensaje: ${truncate(session.body, 240)}`,
    `Destinatarios (${session.recipients.length}): ${session.recipients.slice(0, 5).join(", ")}${
      session.recipients.length > 5 ? "…" : ""
    }`,
    `Adjunto: ${session.attachment ? session.attachment.filename : "no"}`,
    "",
    "Responde sí para enviar o no para cancelar.",
  ];
  return lines.join("\n");
}

function mailSetupMessage() {
  return smtpSetupMessage();
}

function startSession(chatId) {
  sessions.set(String(chatId), {
    step: STEPS.SUBJECT,
    subject: "",
    body: "",
    recipients: [],
    attachment: null,
  });
}

function clearSession(chatId) {
  sessions.delete(String(chatId));
}

async function saveTelegramAttachment(token, document) {
  const fileId = document?.file_id;
  if (!fileId) throw new Error("Archivo inválido de Telegram.");

  const { buffer, filePath } = await downloadTelegramFile(token, fileId);
  const originalName = document.file_name || path.basename(filePath) || "adjunto.bin";
  const safeName = String(originalName).replace(/[^\w.\- ()áéíóúñÁÉÍÓÚÑ]/gi, "_");

  const tempDir = path.join(os.tmpdir(), "onni-telegram-mail");
  await fs.mkdir(tempDir, { recursive: true });
  const localPath = path.join(tempDir, `${Date.now()}_${safeName}`);
  await fs.writeFile(localPath, buffer);

  return {
    filename: safeName,
    mimeType: document.mime_type || "application/octet-stream",
    data: buffer,
    localPath,
  };
}

async function executeSend(session, chatId, token, env) {
  session.step = STEPS.SENDING;

  const progressLines = [];
  const { sent, failed, total, results } = await sendSmtpBulk(
    {
      recipients: session.recipients,
      subject: session.subject,
      body: session.body,
      attachment: session.attachment
        ? { filename: session.attachment.filename, mimeType: session.attachment.mimeType, data: session.attachment.data }
        : null,
      onProgress: async ({ index, total: count, to, ok, message }) => {
        const line = ok ? `${index}/${count} enviado → ${to}` : `${index}/${count} falló → ${to}: ${message}`;
        progressLines.push(line);
        if (token && chatId) {
          await sendTelegramMessage(token, chatId, line);
        }
      },
    },
    env,
  );

  clearSession(chatId);

  const failedList = results.filter((r) => !r.ok);
  const summary = [
    sent === total ? "Listo." : "Terminado con errores.",
    `Enviados: ${sent}/${total}`,
    failed ? `Fallidos: ${failed}` : "",
    failedList.length
      ? `Errores:\n${failedList.map((r) => `• ${r.to}: ${r.message}`).join("\n")}`
      : "",
  ]
    .filter(Boolean)
    .join("\n");

  return summary;
}

export async function processTelegramEmailFlow({ chatId, text, document, token, env }) {
  const chatKey = String(chatId);
  const trimmed = String(text || "").trim();
  const session = sessions.get(chatKey);

  if (session?.step === STEPS.SENDING) {
    return "Estoy enviando correos. Espera un momento…";
  }

  if (!session && trimmed && /^cancelar?$/i.test(trimmed)) {
    return "No hay envío de correos en curso.";
  }

  if (session && /^cancelar?$/i.test(trimmed)) {
    clearSession(chatKey);
    return "Envío de correos cancelado.";
  }

  if (!session && isEmailFlowTrigger(trimmed)) {
    if (!isSmtpConfigured(env)) {
      return mailSetupMessage();
    }
    startSession(chatKey);
    return "Vamos a enviar correos.\n\n¿Cuál es el asunto del correo?";
  }

  if (!session) {
    return null;
  }

  if (session.step === STEPS.ATTACHMENT_FILE && document) {
    try {
      session.attachment = await saveTelegramAttachment(token, document);
      session.step = STEPS.CONFIRM;
      return `Archivo recibido: ${session.attachment.filename}\n\n${buildConfirmSummary(session)}`;
    } catch (error) {
      const detail = error instanceof Error ? error.message : String(error);
      return `No pude recibir el archivo: ${detail}\n\nEnvíalo de nuevo o escribe cancelar.`;
    }
  }

  if (document && !trimmed) {
    return "Recibí un archivo. Si es el adjunto del correo, primero responde sí o no cuando te pregunte por adjunto.";
  }

  if (!trimmed) {
    return "Escríbeme texto o envía el archivo cuando te lo pida.";
  }

  switch (session.step) {
    case STEPS.SUBJECT:
      session.subject = trimmed;
      session.step = STEPS.BODY;
      return "¿Cuál es el mensaje o cuerpo del correo?";

    case STEPS.BODY:
      session.body = trimmed;
      session.step = STEPS.RECIPIENTS;
      return "Pega la lista de correos (uno por línea o separados por coma). Máximo 50.";

    case STEPS.RECIPIENTS: {
      const recipients = parseEmailAddresses(trimmed);
      if (!recipients.length) {
        return "No encontré correos válidos. Ejemplo:\njuan@empresa.com\nmaria@empresa.com";
      }
      if (recipients.length > MAX_RECIPIENTS) {
        return `Hay ${recipients.length} correos. El máximo es ${MAX_RECIPIENTS}. Acorta la lista.`;
      }
      session.recipients = recipients;
      session.step = STEPS.ATTACHMENT_CHOICE;
      return `Lista recibida: ${recipients.length} correo(s).\n\n¿Adjuntar archivo? Responde sí o no.`;
    }

    case STEPS.ATTACHMENT_CHOICE: {
      const choice = normalizeYesNo(trimmed);
      if (choice === "yes") {
        session.step = STEPS.ATTACHMENT_FILE;
        return "Envíame el archivo (PDF, Word, etc.) como documento en Telegram.";
      }
      if (choice === "no") {
        session.step = STEPS.CONFIRM;
        return buildConfirmSummary(session);
      }
      return "Responde sí o no sobre el adjunto.";
    }

    case STEPS.ATTACHMENT_FILE:
      return "Espero el archivo como documento en Telegram (clip → archivo). O escribe cancelar.";

    case STEPS.CONFIRM: {
      const choice = normalizeYesNo(trimmed);
      if (choice === "no") {
        clearSession(chatKey);
        return "Envío cancelado.";
      }
      if (choice !== "yes") {
        return buildConfirmSummary(session);
      }
      return executeSend(session, chatKey, token, env);
    }

    default:
      clearSession(chatKey);
      return "Reinicié el flujo. Escribe enviar correos para empezar de nuevo.";
  }
}
