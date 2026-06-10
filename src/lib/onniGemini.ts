import { ONNI_PERSONALITY } from "@/data/onniBrain";
import { supabase, supabasePublicUrl, supabasePublishableKey } from "@/integrations/supabase/client";

export type OnniGeminiRequest = {
  message: string;
  contextPath: string;
};

export type OnniGeminiResponse = {
  answer: string;
  model?: string;
};

async function invokeOnniGeminiEdge(body: OnniGeminiRequest): Promise<OnniGeminiResponse> {
  const { data: invokedData, error: fnError } = await supabase.functions.invoke("onni-gemini", {
    body,
  });

  if (!fnError && invokedData && typeof invokedData === "object") {
    const answer = String((invokedData as { answer?: string }).answer ?? "").trim();
    if (answer) return { answer, model: (invokedData as { model?: string }).model };
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
    throw new Error(responseJson.error || fnError?.message || "No se pudo consultar Gemini.");
  }
  const answer = String(responseJson.answer ?? "").trim();
  if (!answer) throw new Error("Gemini devolvió una respuesta vacía.");
  return { answer, model: responseJson.model };
}

export function buildOnniGeminiSystemPrompt(contextPath: string): string {
  return [
    "Eres Onni, la asistente de OnniVerso. Estás impulsada por Google Gemini y SÍ estás conectada a esa IA.",
    "Si preguntan si usas Gemini o si estás conectada, responde afirmativamente (sí, uso Google Gemini).",
    "NUNCA digas que no estás conectada a Gemini ni que solo usas reglas.",
    `El usuario está en la ruta: ${contextPath || "/"}.`,
    "OnniVerso es una plataforma de experiencias inmersivas; no enumeres secciones salvo que pregunten explícitamente qué hay o dónde ir.",
    "No tienes resultados en vivo de partidos deportivos ni noticias del día.",
    ONNI_PERSONALITY.tone,
    "Responde en español, breve (1–2 frases). No inventes URLs.",
    "NUNCA listes lobby, conciertos, tienda, Coliseo, aulas ni opciones de menú en saludos o respuestas genéricas.",
    "NO cierres invitando a elegir una sección ni con «dime cuál te interesa». Responde solo lo preguntado.",
  ].join(" ");
}

/** Quita el cierre típico de Gemini con sugerencias de comandos que no queremos por voz. */
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

/** Solo desarrollo local si VITE_GEMINI_API_KEY está en .env.local (no usar en producción). */
async function askOnniGeminiDevDirect(body: OnniGeminiRequest, apiKey: string): Promise<OnniGeminiResponse> {
  const model = "gemini-2.5-flash";
  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${encodeURIComponent(apiKey)}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: buildOnniGeminiSystemPrompt(body.contextPath) }] },
        contents: [{ role: "user", parts: [{ text: body.message }] }],
        generationConfig: { maxOutputTokens: 512, temperature: 0.65 },
      }),
    },
  );
  const json = (await response.json()) as {
    error?: { message?: string };
    candidates?: { content?: { parts?: { text?: string }[] } }[];
  };
  if (!response.ok) {
    throw new Error(json.error?.message || `Gemini error (${response.status})`);
  }
  const answer =
    json.candidates?.[0]?.content?.parts?.map((p) => p.text ?? "").join("").trim() ?? "";
  if (!answer) throw new Error("Gemini devolvió una respuesta vacía.");
  return { answer, model };
}

/** Consulta Gemini vía Edge Function (producción). En dev, fallback opcional con VITE_GEMINI_API_KEY. */
export async function askOnniGemini(body: OnniGeminiRequest): Promise<string | null> {
  const message = body.message.trim();
  if (!message) return null;

  try {
    const result = await invokeOnniGeminiEdge({ message, contextPath: body.contextPath });
    return stripOnniCommandFooter(result.answer);
  } catch (edgeError) {
    const devKey = (import.meta.env.VITE_GEMINI_API_KEY as string | undefined)?.trim();
    if (import.meta.env.DEV && devKey) {
      try {
        const result = await askOnniGeminiDevDirect({ message, contextPath: body.contextPath }, devKey);
        return stripOnniCommandFooter(result.answer);
      } catch (devError) {
        console.warn("[Onni Gemini dev]", devError);
      }
    }
    console.warn("[Onni Gemini]", edgeError);
    return null;
  }
}

export function isOnniNavigationResult(result: {
  navigateTo?: string;
  navigateBack?: boolean;
  command?: unknown;
}): boolean {
  return Boolean(result.navigateTo || result.navigateBack || result.command);
}
