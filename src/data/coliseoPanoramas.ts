import { COLOSSEO_PANORAMA } from "@/data/coliseoScene";

export type ColiseoPanoramaId = "coliseo" | "astronomia" | "biologia" | "concierto";

export type ColiseoPanoramaPreset = {
  id: ColiseoPanoramaId;
  label: string;
  panoramaUrl: string;
};

/** Entornos 360° del aula (/coliseo). Coliseo = principal. */
export const COLISEO_PANORAMA_PRESETS: ColiseoPanoramaPreset[] = [
  { id: "coliseo", label: "Coliseo", panoramaUrl: COLOSSEO_PANORAMA },
  {
    id: "astronomia",
    label: "Astronomía",
    panoramaUrl:
      "https://images.unsplash.com/photo-1462331940025-496dfbfc7564?auto=format&fit=crop&w=4096&q=85",
  },
  {
    id: "biologia",
    label: "Biología",
    panoramaUrl:
      "https://images.unsplash.com/photo-1530026405186-ed1f139313f8?auto=format&fit=crop&w=4096&q=85",
  },
  {
    id: "concierto",
    label: "Concierto",
    panoramaUrl: "/assets/textures/salon/lobby_panorama_4096.jpg",
  },
];

export const DEFAULT_COLISEO_PANORAMA_ID: ColiseoPanoramaId = "coliseo";

export function getColiseoPanoramaPreset(id: ColiseoPanoramaId): ColiseoPanoramaPreset {
  return COLISEO_PANORAMA_PRESETS.find((item) => item.id === id) ?? COLISEO_PANORAMA_PRESETS[0];
}
