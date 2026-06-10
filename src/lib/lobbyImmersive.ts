import { hasAndroidNativeBridge, invokeOpenLobby } from "@/lib/lobbyOpenDirect";

export const LOBBY_IMMERSIVE_PATH = "/lobby-inmersivo";
export const LOBBY_OPEN_TRANSITION_MS = 320;

/** APK: {@code openLobby()} → {@code LobbyVrActivity} (Tierra / inicio). */
export function openLobbyImmersiveOnAndroid(): boolean {
  return invokeOpenLobby();
}

export function shouldUseWebLobbyRoute(): boolean {
  return !hasAndroidNativeBridge();
}
