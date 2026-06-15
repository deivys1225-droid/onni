/**
 * Abre el OAuth de Gmail en el navegador (callback en Vercel).
 * Tras autorizar, copia GMAIL_REFRESH_TOKEN a .env.local
 */
import { exec } from "child_process";
import { loadEnvLocal } from "./load-env-local.mjs";
import { getGmailOAuthStartUrl } from "../lib/server/gmail/gmailConfig.js";

loadEnvLocal();

const startUrl = getGmailOAuthStartUrl(process.env);
console.log("\nAbre esta URL en el navegador y autoriza tu Gmail:\n");
console.log(startUrl);
console.log("\nLuego copia GMAIL_REFRESH_TOKEN a .env.local y reinicia npm run telegram:bot\n");

if (process.platform === "win32") {
  exec(`start "" "${startUrl}"`);
}
