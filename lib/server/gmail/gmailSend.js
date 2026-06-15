import { getGmailCredentials } from "./gmailConfig.js";
import { refreshGmailAccessToken } from "./gmailOAuth.js";

function encodeSubject(subject) {
  const value = String(subject || "").trim() || "(sin asunto)";
  if (/^[\x20-\x7E]*$/.test(value)) return value;
  const encoded = Buffer.from(value, "utf8").toString("base64");
  return `=?UTF-8?B?${encoded}?=`;
}

function toBase64Url(buffer) {
  return Buffer.from(buffer)
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

function buildMimeMessage({ from, to, subject, body, attachment }) {
  const fromHeader = from.includes("<") ? from : `<${from}>`;
  const textBody = String(body || "").trim() || " ";

  if (!attachment?.data) {
    const lines = [
      `From: ${fromHeader}`,
      `To: ${to}`,
      `Subject: ${encodeSubject(subject)}`,
      "MIME-Version: 1.0",
      "Content-Type: text/plain; charset=UTF-8",
      "Content-Transfer-Encoding: 8bit",
      "",
      textBody,
    ];
    return lines.join("\r\n");
  }

  const boundary = `onni_${Date.now()}_${Math.random().toString(36).slice(2)}`;
  const filename = String(attachment.filename || "adjunto.bin").replace(/[\r\n"]/g, "_");
  const mimeType = String(attachment.mimeType || "application/octet-stream");
  const base64Chunk = Buffer.from(attachment.data).toString("base64");

  const parts = [
    `From: ${fromHeader}`,
    `To: ${to}`,
    `Subject: ${encodeSubject(subject)}`,
    "MIME-Version: 1.0",
    `Content-Type: multipart/mixed; boundary="${boundary}"`,
    "",
    `--${boundary}`,
    "Content-Type: text/plain; charset=UTF-8",
    "Content-Transfer-Encoding: 8bit",
    "",
    textBody,
    `--${boundary}`,
    `Content-Type: ${mimeType}; name="${filename}"`,
    "Content-Transfer-Encoding: base64",
    `Content-Disposition: attachment; filename="${filename}"`,
    "",
    base64Chunk,
    `--${boundary}--`,
    "",
  ];

  return parts.join("\r\n");
}

export async function sendGmailMessage({ to, subject, body, attachment }, env) {
  const { user } = getGmailCredentials(env);
  if (!user) throw new Error("Falta GMAIL_USER");

  const accessToken = await refreshGmailAccessToken(env);
  const raw = buildMimeMessage({
    from: user,
    to,
    subject,
    body,
    attachment,
  });

  const response = await fetch("https://gmail.googleapis.com/gmail/v1/users/me/messages/send", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ raw: toBase64Url(raw) }),
  });

  const json = await response.json();
  if (!response.ok) {
    const detail = json.error?.message || `HTTP ${response.status}`;
    throw new Error(String(detail));
  }

  return json;
}

export async function sendGmailBulk(
  { recipients, subject, body, attachment, delayMs = 2500, onProgress },
  env,
) {
  const results = [];

  for (let index = 0; index < recipients.length; index += 1) {
    const to = recipients[index];
    try {
      await sendGmailMessage({ to, subject, body, attachment }, env);
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
