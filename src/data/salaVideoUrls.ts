/**
 * MP4 de Cloudinary por id de sala (perfil podcast o ruta teatro).
 * Único origen para Nuestras Salas y deep links de reproducción.
 */
const ECONOMIA_IA_MP4 =
  "https://res.cloudinary.com/dmbpk37l5/video/upload/v1780849172/7_cambios_que_transformar%C3%A1n_la_econom%C3%ADa_antes_de_2030_-_Si_lo_hubiera_sabido_othuus.mp4";

const IA_TRANSFORMARA_ECONOMIA_MP4 =
  "https://res.cloudinary.com/dmbpk37l5/video/upload/v1780849097/Por_qu%C3%A9_2026_ser%C3%A1_clave_para_la_Inteligencia_Artificial_y_la_transformaci%C3%B3n_de_la_econom%C3%ADa_global_zv15r3.mp4";

const IA_Y_ROBOTS_MP4 =
  "https://res.cloudinary.com/dmbpk37l5/video/upload/v1780849180/La_IA_y_los_robots_van_a_provocar_el_mayor_boom_econ%C3%B3mico_de_la_historia_-_Si_lo_hubiera_sabido_qhqwco.mp4";

export const SALA_MP4_URL_BY_ID: Record<string, string> = {
  "nova-byte": ECONOMIA_IA_MP4,
  "luisito-comunica-er": IA_TRANSFORMARA_ECONOMIA_MP4,
  "ia-y-robots": IA_Y_ROBOTS_MP4,
  "gopro-gpy":
    "https://res.cloudinary.com/dfsabdxup/video/upload/v1778011486/gopro_1_jyzdtl.mp4",
};

export function onniverseDeepLink(mp4Url: string): string {
  return `onniverso://open?url=${encodeURIComponent(mp4Url)}`;
}
