import { isAndroidLiveStreamChoicePlatform } from "@/lib/liveStreamOpenDirect";
import { invokeOpenModelDirect } from "@/lib/model3dOpenDirect";

/** Sección Aula Virtual 360 en la web (solo tarjeta Coliseo; botón navbar). */
export const GALERIA_AULA_SECTION_PATH = "/3d";

/** Sección Educación: lobby 3D, cursos y modelos. */
export const EDUCACION_SECTION_PATH = "/educacion";

/** Ancla de la tarjeta Lobby Aula 3D dentro de {@link EDUCACION_SECTION_PATH}. */
export const EDUCACION_LOBBY_CARD_HASH = "aula-virtual-card";

export const EDUCACION_LOBBY_CARD_HREF = `${EDUCACION_SECTION_PATH}#${EDUCACION_LOBBY_CARD_HASH}`;

/** @deprecated Usar {@link EDUCACION_LOBBY_CARD_HASH}. */
export const GALERIA_AULA_CARD_HASH = EDUCACION_LOBBY_CARD_HASH;

/** @deprecated Usar {@link EDUCACION_LOBBY_CARD_HREF}. */
export const GALERIA_AULA_SECTION_HREF = EDUCACION_LOBBY_CARD_HREF;

/** Lobby 3D caminable en navegador (botón de la tarjeta en web). */
export const AULA_VIRTUAL_LOBBY_PATH = "/aula-virtual";

/** URL cargada por {@code AulaVirtualActivity} en Android. */
export const AULA_VIRTUAL_PRODUCTION_URL = "https://onnivers.com/aula-virtual";

/** Pared web del aula 3D (iframe casi a tamaño completo en la pared del fondo). */
export const AULA_VIRTUAL_MAIN_WALL_URL = "https://onnivers.com/";

/** @deprecated Usar {@link GALERIA_AULA_SECTION_PATH} o {@link AULA_VIRTUAL_LOBBY_PATH}. */
export const AULA_VIRTUAL_PATH = AULA_VIRTUAL_LOBBY_PATH;

/**
 * Tarjeta «Entrar al Aula Virtual» en APK: lobby estéreo nativo
 * ({@code openModelDirect} → AulaVirtualActivity).
 */
export function openAulaVirtualLobbyOnAndroid(): boolean {
  if (!isAndroidLiveStreamChoicePlatform()) return false;
  return invokeOpenModelDirect();
}

/** Alias legado del nombre anterior. */
export function openAulaVirtualOnAndroid(): boolean {
  return openAulaVirtualLobbyOnAndroid();
}
