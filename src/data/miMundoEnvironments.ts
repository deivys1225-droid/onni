/**
 * Ambientes del selector. La Luna no usa estas URLs.
 * - equirect: panorama 360° como fondo de escena (sin geometria de sala).
 * - equirect_interior: esfera interior con textura equirect (Espacio Infantil).
 */
const EQ = "https://cdn.jsdelivr.net/gh/mrdoob/three.js@dev/examples/textures/equirectangular";

/** Sustituye este archivo en `public/images/` por tu imagen equirectangular de referencia (mismo nombre). */
export const ESPACIO_INFANTIL_EQUIRECT_PATH = "/images/espacio-infantil-equirect.jpg";

export type MiMundoEnvironmentId = "lobby" | "beach_night" | "neon_disco";

export type MiMundoRoomMode = "equirect" | "equirect_interior";

export interface MiMundoEnvironmentPreset {
  id: MiMundoEnvironmentId;
  label: string;
  subtitle: string;
  roomMode: MiMundoRoomMode;
  /** Panorama 360° de fondo; solo si roomMode === "equirect". */
  equirectUrl?: string;
  /** Textura equirectangular para esfera interior; solo si roomMode === "equirect_interior". */
  interiorEquirectUrl?: string;
  previewImageUrl: string;
}

export const MI_MUNDO_ENVIRONMENTS: MiMundoEnvironmentPreset[] = [
  {
    id: "lobby",
    label: "Canserbero",
    subtitle: "Escenario principal · homenaje",
    roomMode: "equirect",
    equirectUrl: "https://images.unsplash.com/photo-1470225620780-dba8ba36b745?auto=format&fit=crop&w=2000&q=80",
    previewImageUrl: "https://images.unsplash.com/photo-1470225620780-dba8ba36b745?auto=format&fit=crop&w=1200&q=80",
  },
  {
    id: "beach_night",
    label: "Estadio",
    subtitle: "Vista 360 · grada central",
    roomMode: "equirect",
    equirectUrl: "https://images.unsplash.com/photo-1431324155629-1a6deb1dec8d?auto=format&fit=crop&w=2000&q=80",
    previewImageUrl: "https://images.unsplash.com/photo-1431324155629-1a6deb1dec8d?auto=format&fit=crop&w=1200&q=80",
  },
  {
    id: "neon_disco",
    label: "Estadio 2",
    subtitle: "Panorámica nocturna · luces",
    roomMode: "equirect",
    equirectUrl: "https://images.unsplash.com/photo-1540747913346-19e32dc3e97e?auto=format&fit=crop&w=2000&q=80",
    previewImageUrl: "https://images.unsplash.com/photo-1540747913346-19e32dc3e97e?auto=format&fit=crop&w=1200&q=80",
  },
];

export const MI_MUNDO_ENV_STORAGE_KEY = "mi-mundo-vr-environment-id";

export function getPresetById(id: MiMundoEnvironmentId): MiMundoEnvironmentPreset {
  const found = MI_MUNDO_ENVIRONMENTS.find((e) => e.id === id);
  return found ?? MI_MUNDO_ENVIRONMENTS[0];
}

export function getRoomMode(id: MiMundoEnvironmentId): MiMundoRoomMode {
  return getPresetById(id).roomMode;
}

export function getPreviewImageUrl(id: MiMundoEnvironmentId): string {
  return getPresetById(id).previewImageUrl;
}

/** Panorama de fondo (sin geometria); null en Espacio Infantil. */
export function getEquirectBackgroundUrl(id: MiMundoEnvironmentId): string | null {
  const p = getPresetById(id);
  if (p.roomMode !== "equirect" || !p.equirectUrl) return null;
  return p.equirectUrl;
}

/** Textura de la esfera interior; solo Espacio Infantil. */
export function getInteriorEquirectUrl(id: MiMundoEnvironmentId): string | null {
  const p = getPresetById(id);
  if (p.roomMode !== "equirect_interior" || !p.interiorEquirectUrl) return null;
  return p.interiorEquirectUrl;
}

export function normalizeStoredEnvironmentId(raw: string | null): MiMundoEnvironmentId | null {
  if (!raw) return null;
  if (MI_MUNDO_ENVIRONMENTS.some((e) => e.id === raw)) return raw as MiMundoEnvironmentId;
  return null;
}
