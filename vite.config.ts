import { defineConfig, loadEnv, type Plugin } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";

function paypalSdkHeadPlugin(mode: string, env: Record<string, string>): Plugin {
  const environment = env.VITE_PAYPAL_ENVIRONMENT === "production" ? "production" : "sandbox";
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

export default defineConfig(async ({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  const plugins: Plugin[] = [react(), paypalSdkHeadPlugin(mode, env)];

  if (mode === "development") {
    const devChatEnv: Record<string, string> = {
      OLLAMA_ENABLED: env.OLLAMA_ENABLED || env.VITE_OLLAMA_ENABLED || "",
      OLLAMA_ONLY: env.OLLAMA_ONLY || env.VITE_OLLAMA_ONLY || "",
      OLLAMA_HOST: env.OLLAMA_HOST || env.VITE_OLLAMA_HOST || "",
      OLLAMA_MODEL: env.OLLAMA_MODEL || env.VITE_OLLAMA_MODEL || "",
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
    const { onniChatDevPlugin } = await import("./vite/onniChatDevPlugin");
    plugins.push(onniChatDevPlugin(devChatEnv));
  }

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
    plugins,
    resolve: {
      alias: {
        "@": path.resolve(__dirname, "./src"),
      },
      dedupe: [
        "react",
        "react-dom",
        "react/jsx-runtime",
        "react/jsx-dev-runtime",
        "@tanstack/react-query",
        "@tanstack/query-core",
      ],
    },
  };
});
