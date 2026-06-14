import { ONNI_PERSONALITY } from "@/data/onniBrain";
import { supabase, supabasePublicUrl, supabasePublishableKey } from "@/integrations/supabase/client";

export type OnniGeminiRequest = {
  message: string;
  contextPath: string;
};

export type OnniGeminiResponse = {
  answer: string;
  model?: string;
  provider?: string;
};

export function buildOnniGeminiSystemPrompt(contextPath: string): string {
  return [
    "Eres Onni, la asistente de OnniVerso. Respondes con modelos de IA a través de OpenRouter.",
    "Si preguntan qué IA usas, responde: «Uso modelos de IA a través de OpenRouter».",
    "NUNCA digas que solo usas reglas fijas sin IA.",
    `El usuario está en la ruta: ${contextPath || "/"}.`,
    "OnniVerso es una plataforma de experiencias inmersivas; no enumeres secciones salvo que pregunten explícitamente qué hay o dónde ir.",
    "No tienes resultados en vivo de partidos deportivos ni noticias del día.",
    ONNI_PERSONALITY.tone,
    "Responde en español, breve (1–2 frases). No inventes URLs.",
    "NUNCA listes lobby, conciertos, tienda, Coliseo, aulas ni opciones de menú en saludos o respuestas genéricas.",
    "NO cierres invitando a elegir una sección ni con «dime cuál te interesa». Responde solo lo preguntado.",
  ].join(" ");
}

/** Quita el cierre típico con sugerencias de comandos que no queremos por voz. */
export function stripOnniCommandFooter(text: string): string {
  let out = text.trim();
  const cutPatterns = [
    /\n\s*si necesitas explorar[\s\S]*$/i,
    /\n\s*recuerda que tambien puedes[\s\S]*$/i,
    /\n\s*recuerda que también puedes[\s\S]*$/i,
    /\n\s*[*•-]\s*\*?\*?(lobby|conciertos|ayuda)[\s\S]*$/i,
    /\n\s*(para navegar|comandos como|tambien puedes usar)[\s\S]*$/i,
    /\ben onniverso (tenemos|ofrece|cuenta con)[\s\S]*$/i,
    /[\s\S]*\bdime cu[aá]l te interesa\b[\s\S]*$/i,
  ];
  for (const pattern of cutPatterns) {
    out = out.replace(pattern, "").trim();
  }
  if (!out || /\b(lobby 3d|conciertos en vivo|coliseo 360|aulas virtuales)\b/i.test(out)) {
    return "¡Hola! Soy Onni, tu copiloto en OnniVerso.";
  }
  return out;
}

async function invokeOnniVercelChat(body: OnniGeminiRequest): Promise<OnniGeminiResponse> {
  const response = await fetch("/api/onni/chat", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const json = (await response.json()) as OnniGeminiResponse & { ok?: boolean; error?: string };
  if (!response.ok || json.ok === false) {
    throw new Error(json.error || `Onni chat API error (${response.status})`);
  }
  const answer = String(json.answer ?? "").trim();
  if (!answer) throw new Error("La API de Onni devolvió una respuesta vacía.");
  return { answer, model: json.model, provider: json.provider };
}

async function invokeOnniGeminiEdge(body: OnniGeminiRequest): Promise<OnniGeminiResponse> {
  const { data: invokedData, error: fnError } = await supabase.functions.invoke("onni-gemini", {
    body,
  });

  if (!fnError && invokedData && typeof invokedData === "object") {
    const answer = String((invokedData as { answer?: string }).answer ?? "").trim();
    if (answer) {
      return {
        answer,
        model: (invokedData as { model?: string }).model,
        provider: (invokedData as { provider?: string }).provider,
      };
    }
    const backendError = String((invokedData as { error?: string }).error ?? "").trim();
    if (backendError) throw new Error(backendError);
  }

  const response = await fetch(`${supabasePublicUrl}/functions/v1/onni-gemini`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      apikey: supabasePublishableKey,
      Authorization: `Bearer ${supabasePublishableKey}`,
    },
    body: JSON.stringify(body),
  });

  const responseJson = (await response.json()) as OnniGeminiResponse & { error?: string };
  if (!response.ok) {
    throw new Error(responseJson.error || fnError?.message || "No se pudo consultar la IA de Onni.");
  }
  const answer = String(responseJson.answer ?? "").trim();
  if (!answer) throw new Error("La IA devolvió una respuesta vacía.");
  return { answer, model: responseJson.model, provider: responseJson.provider };
}

/**
 * Consulta IA para Onni vía OpenRouter.
 * Producción: /api/onni/chat (Vercel) o Edge Function onni-gemini (Supabase).
 */
export async function askOnniGemini(body: OnniGeminiRequest): Promise<string | null> {
  const message = body.message.trim();
  if (!message) return null;

  const providers: Array<() => Promise<OnniGeminiResponse>> = [
    () => invokeOnniVercelChat(body),
    () => invokeOnniGeminiEdge(body),
  ];

  for (const attempt of providers) {
    try {
      const result = await attempt();
      return stripOnniCommandFooter(result.answer);
    } catch (error) {
      console.warn("[Onni AI]", error);
    }
  }

  return null;
}

export function isOnniNavigationResult(result: {
  navigateTo?: string;
  navigateBack?: boolean;
  command?: unknown;
}): boolean {
  return Boolean(result.navigateTo || result.navigateBack || result.command);
}
