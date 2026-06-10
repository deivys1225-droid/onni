import { supabase, supabasePublicUrl, supabasePublishableKey } from "@/integrations/supabase/client";

export type AgoraVoiceRole = "host" | "audience";

export type AgoraVoiceSession = {
  appId: string;
  channelName: string;
  token: string;
};

type AgoraTokenResponse = {
  appId?: string;
  channelName?: string;
  hostToken?: string;
  audienceToken?: string;
  error?: string;
};

async function invokeAgoraToken(channelName: string): Promise<AgoraTokenResponse> {
  const { data: invokedData, error: fnError } = await supabase.functions.invoke("agora-token", {
    body: { channelName, uid: 0 },
  });

  if (!fnError && invokedData) {
    return invokedData as AgoraTokenResponse;
  }

  const response = await fetch(`${supabasePublicUrl}/functions/v1/agora-token`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      apikey: supabasePublishableKey,
      Authorization: `Bearer ${supabasePublishableKey}`,
    },
    body: JSON.stringify({ channelName, uid: 0 }),
  });
  const json = (await response.json()) as AgoraTokenResponse;
  if (!response.ok) {
    throw new Error(json.error?.trim() || fnError?.message || "No se pudo generar token de voz.");
  }
  return json;
}

export type AgoraVoiceTokens = {
  appId: string;
  channelName: string;
  hostToken: string;
  audienceToken: string;
};

export async function fetchAgoraVoiceTokens(channelName: string): Promise<AgoraVoiceTokens> {
  const payload = await invokeAgoraToken(channelName);
  const appId = payload.appId?.trim() ?? "";
  const normalizedChannel = payload.channelName?.trim() ?? "";
  const hostToken = payload.hostToken?.trim() ?? "";
  const audienceToken = payload.audienceToken?.trim() ?? "";

  if (!appId) throw new Error("Falta App ID para Agora Voice.");
  if (!normalizedChannel) throw new Error("Canal de voz inválido.");
  if (!hostToken || !audienceToken) throw new Error("No se recibieron tokens de voz.");

  return { appId, channelName: normalizedChannel, hostToken, audienceToken };
}

export async function fetchAgoraVoiceSession(
  channelName: string,
  role: AgoraVoiceRole,
): Promise<AgoraVoiceSession> {
  const tokens = await fetchAgoraVoiceTokens(channelName);
  const token = role === "host" ? tokens.hostToken : tokens.audienceToken;
  return { appId: tokens.appId, channelName: tokens.channelName, token };
}

