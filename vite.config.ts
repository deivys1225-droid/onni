import { defineConfig, loadEnv, type Plugin } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { onniChatDevPlugin } from "./vite/onniChatDevPlugin";

function paypalSdkHeadPlugin(mode: string, env: Record<string, string>): Plugin {
  const environment = env.VITE_PAYPAL_ENVIRONMENT === "production" ? "production" : "sandbox";
  // Offline-first / Capacitor: NO inyectar el SDK de PayPal en <head> si no hay un client-id real.
  // El fallback antiguo ("test") forzaba una petición eager a sandbox.paypal.com en cada arranque,
  // lo cual rompía el boot sin red. `PayPalScriptProvider` ya carga el SDK *lazy* cuando el usuario
  // entra a una pantalla con botones PayPal, así que el preload solo aporta en builds con PayPal real.
  const envClientId = (env.VITE_PAYPAL_CLIENT_ID ?? "").trim();
  const sdkHost =
    environment === "sandbox" ? "https://www.sandbox.paypal.com" : "https://www.paypal.com";

  return {
    name: "paypal-sdk-head",
    transformIndexHtml(html) {
      if (!envClientId) return html;
      const sdkUrl = `${sdkHost}/sdk/js?client-id=${encodeURIComponent(envClientId)}&currency=USD&intent=capture&components=buttons`;
      return html.replace(
        "</head>",
        `  <script defer src="${sdkUrl}" data-sdk-integration-source="react-paypal-js"></script>\n</head>`,
      );
    },
  };
}

// https://vitejs.dev/config/
// base relativo: obligatorio para que assets carguen en WebView (file://) con Capacitor.
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  const devChatEnv: Record<string, string> = {
    OPENROUTER_API_KEY: env.OPENROUTER_API_KEY || env.VITE_OPENROUTER_API_KEY || "",
    OPENROUTER_MODEL: env.OPENROUTER_MODEL || env.VITE_OPENROUTER_MODEL || "",
    OPENROUTER_SITE_URL: env.OPENROUTER_SITE_URL || env.VITE_SITE_URL || "",
    OPENROUTER_SITE_TITLE: env.OPENROUTER_SITE_TITLE || "",
    TELEGRAM_BOT_TOKEN: env.TELEGRAM_BOT_TOKEN || "",
    TELEGRAM_WEBHOOK_SECRET: env.TELEGRAM_WEBHOOK_SECRET || "",
    TELEGRAM_ALLOWED_CHAT_IDS: env.TELEGRAM_ALLOWED_CHAT_IDS || "",
    GOOGLE_CSE_API_KEY: env.GOOGLE_CSE_API_KEY || env.VITE_GOOGLE_CSE_API_KEY || "",
    GOOGLE_CSE_CX: env.GOOGLE_CSE_CX || env.VITE_GOOGLE_CSE_CX || "",
  };
  return {
  base: "./",
  envPrefix: ["VITE_", "NEXT_PUBLIC_"],
  server: {
    host: "::",
    port: 5173,
    watch: {
      ignored: [
        "**/android/**",
        "**/ANDROID_LOBBY_TIERRA_LISTO/**",
        "**/dist-lobby-earth/**",
      ],
    },
    hmr: {
      overlay: false,
    },
    proxy: {
      "/api/mux": {
        target: "http://localhost:8787",
        changeOrigin: true,
        ws: true,
      },
      "/api/azure": {
        target: "https://onnivers.com",
        changeOrigin: true,
      },
    },
  },
  plugins: [react(), paypalSdkHeadPlugin(mode, env), onniChatDevPlugin(devChatEnv)],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
    dedupe: ["react", "react-dom", "react/jsx-runtime", "react/jsx-dev-runtime", "@tanstack/react-query", "@tanstack/query-core"],
  },
};
});
