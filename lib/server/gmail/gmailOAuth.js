import {
  GMAIL_SEND_SCOPE,
  getGmailCredentials,
  getGmailRedirectUri,
} from "./gmailConfig.js";

const GOOGLE_AUTH = "https://accounts.google.com/o/oauth2/v2/auth";
const GOOGLE_TOKEN = "https://oauth2.googleapis.com/token";

export function buildGmailAuthUrl(env) {
  const { clientId } = getGmailCredentials(env);
  if (!clientId) {
    throw new Error("Falta GMAIL_CLIENT_ID");
  }

  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: getGmailRedirectUri(env),
    response_type: "code",
    scope: GMAIL_SEND_SCOPE,
    access_type: "offline",
    prompt: "consent",
    include_granted_scopes: "true",
  });

  return `${GOOGLE_AUTH}?${params.toString()}`;
}

export async function exchangeGmailAuthCode(code, env) {
  const { clientId, clientSecret } = getGmailCredentials(env);
  if (!clientId || !clientSecret) {
    throw new Error("Faltan GMAIL_CLIENT_ID o GMAIL_CLIENT_SECRET");
  }

  const body = new URLSearchParams({
    code: String(code || "").trim(),
    client_id: clientId,
    client_secret: clientSecret,
    redirect_uri: getGmailRedirectUri(env),
    grant_type: "authorization_code",
  });

  const response = await fetch(GOOGLE_TOKEN, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
  });

  const json = await response.json();
  if (!response.ok) {
    const detail = json.error_description || json.error || `HTTP ${response.status}`;
    throw new Error(String(detail));
  }

  return json;
}

export async function refreshGmailAccessToken(env) {
  const { clientId, clientSecret, refreshToken } = getGmailCredentials(env);
  if (!clientId || !clientSecret || !refreshToken) {
    throw new Error("Gmail no configurado (client_id, secret o refresh_token).");
  }

  const body = new URLSearchParams({
    client_id: clientId,
    client_secret: clientSecret,
    refresh_token: refreshToken,
    grant_type: "refresh_token",
  });

  const response = await fetch(GOOGLE_TOKEN, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
  });

  const json = await response.json();
  if (!response.ok) {
    const detail = json.error_description || json.error || `HTTP ${response.status}`;
    throw new Error(String(detail));
  }

  return String(json.access_token || "");
}
