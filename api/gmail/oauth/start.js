import { buildGmailAuthUrl } from "../../../lib/server/gmail/gmailOAuth.js";
import { getGmailCredentials } from "../../../lib/server/gmail/gmailConfig.js";

export default async function handler(req, res) {
  if (req.method !== "GET") {
    return res.status(405).json({ ok: false, error: "Método no permitido" });
  }

  const { clientId } = getGmailCredentials(process.env);
  if (!clientId) {
    return res.status(500).send(
      "Falta GMAIL_CLIENT_ID en Vercel. Añade GMAIL_CLIENT_ID y GMAIL_CLIENT_SECRET en Environment Variables.",
    );
  }

  try {
    const url = buildGmailAuthUrl(process.env);
    res.writeHead(302, { Location: url });
    res.end();
  } catch (error) {
    const detail = error instanceof Error ? error.message : String(error);
    return res.status(500).send(`No pude iniciar OAuth: ${detail}`);
  }
}
