export function getSmtpConfig(env) {
  return {
    host: env.SMTP_HOST?.trim() || "smtp.gmail.com",
    port: Number(env.SMTP_PORT || 587),
    secure: String(env.SMTP_SECURE || "").toLowerCase() === "true",
    user: env.SMTP_USER?.trim() || "",
    pass: env.SMTP_PASS?.trim() || env.SMTP_PASSWORD?.trim() || "",
    from: env.SMTP_FROM?.trim() || env.SMTP_USER?.trim() || "",
  };
}

export function isSmtpConfigured(env) {
  const { user, pass } = getSmtpConfig(env);
  return Boolean(user && pass);
}

export function smtpSetupMessage() {
  return [
    "Correo aún no configurado en este PC.",
    "",
    "1. En Gmail (empresatecnologicadecolombia@gmail.com):",
    "   Cuenta Google → Seguridad → Verificación en 2 pasos (activada)",
    "   → Contraseñas de aplicaciones → crea una para «Onni»",
    "",
    "2. En .env.local añade:",
    "   SMTP_USER=empresatecnologicadecolombia@gmail.com",
    "   SMTP_PASS=xxxx xxxx xxxx xxxx   (16 caracteres, sin espacios)",
    "",
    "3. Reinicia: npm run telegram:bot",
    "4. Escribe: enviar correos",
  ].join("\n");
}
