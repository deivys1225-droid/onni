import type { IncomingMessage, ServerResponse } from "node:http";
import type { Plugin } from "vite";
import { runOnniChat } from "../api/onni/chatCore.js";
import { runLeadfinderSearch } from "../api/leadfinder/searchCore.js";
import telegramWebhookHandler from "../api/telegram-webhook.js";

function readJsonBody(req: IncomingMessage): Promise<unknown> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    req.on("data", (chunk) => chunks.push(Buffer.from(chunk)));
    req.on("end", () => {
      try {
        const raw = Buffer.concat(chunks).toString("utf8");
        resolve(raw ? JSON.parse(raw) : {});
      } catch (error) {
        reject(error);
      }
    });
    req.on("error", reject);
  });
}

function sendJson(res: ServerResponse, status: number, payload: unknown) {
  res.statusCode = status;
  res.setHeader("Content-Type", "application/json");
  res.end(JSON.stringify(payload));
}

/** Adaptador mínimo para reutilizar el handler de Vercel en Vite dev. */
function createMockRes() {
  let statusCode = 200;
  let payload: unknown = null;
  return {
    res: {
      statusCode: 200,
      setHeader() {},
      status(code: number) {
        statusCode = code;
        return this;
      },
      json(body: unknown) {
        payload = body;
        return this;
      },
      end() {
        return this;
      },
    },
    getResult: () => ({ statusCode, payload }),
  };
}

/** En `npm run dev`, sirve POST /api/onni/chat y /api/telegram/webhook. */
export function onniChatDevPlugin(env: Record<string, string>): Plugin {
  return {
    name: "onni-chat-dev",
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        const url = req.url?.split("?")[0];
        if (
          url !== "/api/onni/chat" &&
          url !== "/api/leadfinder/search" &&
          url !== "/api/telegram/webhook" &&
          url !== "/api/telegram-webhook"
        ) {
          return next();
        }

        if (req.method === "OPTIONS") {
          res.statusCode = 204;
          res.end();
          return;
        }

        if (req.method !== "POST") {
          sendJson(res, 405, { ok: false, error: "Método no permitido" });
          return;
        }

        try {
          const body = await readJsonBody(req);
          if (url === "/api/telegram/webhook" || url === "/api/telegram-webhook") {
            const previousEnv = {
              TELEGRAM_BOT_TOKEN: process.env.TELEGRAM_BOT_TOKEN,
              TELEGRAM_WEBHOOK_SECRET: process.env.TELEGRAM_WEBHOOK_SECRET,
              TELEGRAM_ALLOWED_CHAT_IDS: process.env.TELEGRAM_ALLOWED_CHAT_IDS,
              OPENROUTER_API_KEY: process.env.OPENROUTER_API_KEY,
              OPENROUTER_MODEL: process.env.OPENROUTER_MODEL,
              OPENROUTER_SITE_URL: process.env.OPENROUTER_SITE_URL,
              OPENROUTER_SITE_TITLE: process.env.OPENROUTER_SITE_TITLE,
            };
            Object.assign(process.env, env);
            const mock = createMockRes();
            try {
              await telegramWebhookHandler(
                {
                  method: "POST",
                  body,
                  headers: req.headers as Record<string, string | string[] | undefined>,
                },
                mock.res,
              );
            } finally {
              Object.assign(process.env, previousEnv);
            }
            sendJson(res, mock.getResult().statusCode, mock.getResult().payload ?? { ok: true });
            return;
          }
          if (url === "/api/onni/chat") {
            const result = await runOnniChat(body as { message?: string; contextPath?: string }, env);
            sendJson(res, 200, result);
            return;
          }
          const result = await runLeadfinderSearch(
            body as { query?: string; region?: string; limit?: number; useGoogleMaps?: boolean },
            env,
          );
          sendJson(res, 200, result);
        } catch (error) {
          const message = error instanceof Error ? error.message : "Error inesperado";
          const status =
            error && typeof error === "object" && "statusCode" in error
              ? Number((error as { statusCode?: number }).statusCode) || 502
              : 502;
          sendJson(res, status, { ok: false, error: message });
        }
      });
    },
  };
}
