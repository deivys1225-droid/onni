export const LOBBY_IMMERSIVE_PRODUCTION_URL = "https://onnivers.com/lobby-inmersivo";

/** Hay puente nativo inyectado por MainActivity (APK). */
export function hasAndroidNativeBridge(): boolean {
  return typeof window.AndroidBridge !== "undefined" || typeof window.Android !== "undefined";
}

/** Tierra / inicio (APK): solo {@code openLobby()} → {@code LobbyVrActivity}. */
export function invokeOpenLobby(): boolean {
  if (typeof window.AndroidBridge?.openLobby === "function") {
    window.AndroidBridge.openLobby();
    return true;
  }
  if (typeof window.Android?.openLobby === "function") {
    window.Android.openLobby();
    return true;
  }
  return false;
}

/** @deprecated Usar {@link invokeOpenLobby}. */
export function invokeOpenLobbyStereoDirect(): boolean {
  return invokeOpenLobby();
}
