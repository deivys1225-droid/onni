/**
 * Registra el webhook de Telegram para Onni.
 *
 * Uso (PowerShell):
 *   $env:TELEGRAM_BOT_TOKEN="..."
 *   $env:TELEGRAM_WEBHOOK_URL="https://onnivers.com/api/telegram/webhook"
 *   $env:TELEGRAM_WEBHOOK_SECRET="mi-secreto-opcional"
 *   node scripts/telegram-set-webhook.mjs
 */

const token = process.env.TELEGRAM_BOT_TOKEN?.trim();
const webhookUrl = process.env.TELEGRAM_WEBHOOK_URL?.trim();
const secret = process.env.TELEGRAM_WEBHOOK_SECRET?.trim();

if (!token) {
  console.error("Falta TELEGRAM_BOT_TOKEN");
  process.exit(1);
}
if (!webhookUrl) {
  console.error("Falta TELEGRAM_WEBHOOK_URL (ej. https://onnivers.com/api/telegram-webhook)");
  process.exit(1);
}

const body = {
  url: webhookUrl,
  allowed_updates: ["message", "edited_message"],
  drop_pending_updates: true,
};
if (secret) body.secret_token = secret;

const response = await fetch(`https://api.telegram.org/bot${token}/setWebhook`, {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify(body),
});

const json = await response.json();
console.log(JSON.stringify(json, null, 2));
if (!json.ok) process.exit(1);

const info = await fetch(`https://api.telegram.org/bot${token}/getWebhookInfo`);
console.log("Webhook info:", JSON.stringify(await info.json(), null, 2));
