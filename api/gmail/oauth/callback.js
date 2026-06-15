import { exchangeGmailAuthCode } from "../../../lib/server/gmail/gmailOAuth.js";
import { getGmailOAuthStartUrl } from "../../../lib/server/gmail/gmailConfig.js";

function htmlPage(title, body) {
  return `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${title}</title>
  <style>
    body { font-family: system-ui, sans-serif; max-width: 720px; margin: 2rem auto; padding: 0 1rem; line-height: 1.5; }
    code, pre { background: #f4f4f5; padding: 0.2rem 0.4rem; border-radius: 4px; word-break: break-all; }
    pre { padding: 1rem; overflow-x: auto; }
    .ok { color: #166534; }
    .err { color: #b91c1c; }
  </style>
</head>
<body>${body}</body>
</html>`;
}

export default async function handler(req, res) {
  if (req.method !== "GET") {
    return res.status(405).json({ ok: false, error: "Método no permitido" });
  }

  const code = req.query?.code;
  if (!code) {
    const startUrl = getGmailOAuthStartUrl(process.env);
    return res.status(400).send(
      htmlPage(
        "Onni Gmail OAuth",
        `<h1>Falta código de autorización</h1>
        <p>Abre primero: <a href="${startUrl}">${startUrl}</a></p>`,
      ),
    );
  }

  try {
    const tokens = await exchangeGmailAuthCode(code, process.env);
    const refresh = String(tokens.refresh_token || "");
    const access = String(tokens.access_token || "");

    if (!refresh) {
      return res.status(200).send(
        htmlPage(
          "Onni Gmail OAuth",
          `<h1 class="err">No llegó refresh_token</h1>
          <p>Google no devolvió refresh_token. Prueba:</p>
          <ol>
            <li>Revoca acceso en <a href="https://myaccount.google.com/permissions">Cuenta Google → Seguridad → Acceso de terceros</a></li>
            <li>Vuelve a abrir <a href="${getGmailOAuthStartUrl(process.env)}">iniciar OAuth</a></li>
          </ol>
          <p>Respuesta parcial: access_token ${access ? "sí" : "no"}</p>`,
        ),
      );
    }

    return res.status(200).send(
      htmlPage(
        "Onni Gmail — listo",
        `<h1 class="ok">Gmail autorizado</h1>
        <p>Copia el <strong>refresh_token</strong> en <code>.env.local</code> (PC) y en Vercel → Environment Variables:</p>
        <pre>GMAIL_REFRESH_TOKEN=${refresh}</pre>
        <p>También necesitas (si no están ya):</p>
        <pre>GMAIL_CLIENT_ID=...
GMAIL_CLIENT_SECRET=...
GMAIL_USER=tu@gmail.com</pre>
        <p>Reinicia <code>npm run telegram:bot</code> y escribe <strong>enviar correos</strong> en Telegram.</p>
        <p><small>No compartas este token. Cierra esta pestaña cuando lo hayas guardado.</small></p>`,
      ),
    );
  } catch (error) {
    const detail = error instanceof Error ? error.message : String(error);
    return res.status(500).send(
      htmlPage(
        "Onni Gmail OAuth — error",
        `<h1 class="err">Error</h1><p>${detail}</p>
        <p><a href="${getGmailOAuthStartUrl(process.env)}">Reintentar</a></p>`,
      ),
    );
  }
}
