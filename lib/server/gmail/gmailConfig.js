const DEFAULT_OAUTH_BASE = "https://onni-eight.vercel.app";
export const GMAIL_SEND_SCOPE = "https://www.googleapis.com/auth/gmail.send";

export function getGmailOAuthBaseUrl(env) {
  return (env.GMAIL_OAUTH_BASE_URL || DEFAULT_OAUTH_BASE).replace(/\/$/, "");
}

export function getGmailRedirectUri(env) {
  const custom = env.GMAIL_REDIRECT_URI?.trim();
  if (custom) return custom;
  return `${getGmailOAuthBaseUrl(env)}/api/gmail/oauth/callback`;
}

export function getGmailCredentials(env) {
  return {
    clientId: env.GMAIL_CLIENT_ID?.trim() || "",
    clientSecret: env.GMAIL_CLIENT_SECRET?.trim() || "",
    refreshToken: env.GMAIL_REFRESH_TOKEN?.trim() || "",
    user: env.GMAIL_USER?.trim() || "",
  };
}

export function isGmailConfigured(env) {
  const { clientId, clientSecret, refreshToken, user } = getGmailCredentials(env);
  return Boolean(clientId && clientSecret && refreshToken && user);
}

export function getGmailOAuthStartUrl(env) {
  return `${getGmailOAuthBaseUrl(env)}/api/gmail/oauth/start`;
}
