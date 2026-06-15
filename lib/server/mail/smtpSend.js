import nodemailer from "nodemailer";
import { getSmtpConfig } from "./smtpConfig.js";

function createTransport(env) {
  const cfg = getSmtpConfig(env);
  if (!cfg.user || !cfg.pass) {
    throw new Error("Faltan SMTP_USER o SMTP_PASS en .env.local");
  }

  return nodemailer.createTransport({
    host: cfg.host,
    port: cfg.port,
    secure: cfg.secure,
    auth: { user: cfg.user, pass: cfg.pass },
  });
}

export async function sendSmtpMessage({ to, subject, body, attachment }, env) {
  const cfg = getSmtpConfig(env);
  const transport = createTransport(env);

  const mail = {
    from: cfg.from || cfg.user,
    to,
    subject: String(subject || "").trim() || "(sin asunto)",
    text: String(body || "").trim() || " ",
  };

  if (attachment?.data) {
    mail.attachments = [
      {
        filename: attachment.filename || "adjunto.bin",
        content: attachment.data,
        contentType: attachment.mimeType || "application/octet-stream",
      },
    ];
  }

  return transport.sendMail(mail);
}

export async function sendSmtpBulk(
  { recipients, subject, body, attachment, delayMs = 2500, onProgress },
  env,
) {
  const results = [];

  for (let index = 0; index < recipients.length; index += 1) {
    const to = recipients[index];
    try {
      await sendSmtpMessage({ to, subject, body, attachment }, env);
      results.push({ to, ok: true });
      if (onProgress) {
        await onProgress({ index: index + 1, total: recipients.length, to, ok: true });
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      results.push({ to, ok: false, message });
      if (onProgress) {
        await onProgress({
          index: index + 1,
          total: recipients.length,
          to,
          ok: false,
          message,
        });
      }
    }

    if (index < recipients.length - 1 && delayMs > 0) {
      await new Promise((resolve) => setTimeout(resolve, delayMs));
    }
  }

  const sent = results.filter((r) => r.ok).length;
  const failed = results.length - sent;
  return { results, sent, failed, total: results.length };
}
