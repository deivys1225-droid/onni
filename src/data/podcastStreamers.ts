import { SALA_MP4_URL_BY_ID } from "@/data/salaVideoUrls";

export type StreamStatus = "live" | "offline";
export type StreamType = "platform" | "youtube";

export interface StreamerProfile {
  id: string;
  name: string;
  avatar: string;
  /** Panorama equirectangular único por sala (Lobby 360). */
  panoramaImage: string;
  /** Nombre del entorno inmersivo (ej. Sala Cuántica). */
  immersiveSalaName: string;
  status: StreamStatus;
  streamType?: StreamType;
  youtubeVideoId?: string;
  /** Video de muestra en la sala si no hay YouTube en vivo */
  fallbackVideoId?: string;
  /** MP4 principal (Cloudinary) para pantalla / 360 en la sala inmersiva */
  salaVideoUrl?: string;
  loungeTitle: string;
  loungeDescription: string;
  ticketGrada: number;
  ticketVip: number;
  featuredGames: string[];
}

export const podcastStreamers: StreamerProfile[] = [
  {
    id: "nova-byte",
    name: "7 cambios de la economía gracias a la IA",
    avatar: "/7-cambios-economia-ia.png",
    immersiveSalaName: "Economía e IA",
    panoramaImage:
      "https://images.unsplash.com/photo-1635070041078-e363dbe005cb?auto=format&fit=crop&w=4096&q=85",
    status: "live",
    streamType: "platform",
    fallbackVideoId: "M7lc1UVf-VE",
    salaVideoUrl: SALA_MP4_URL_BY_ID["nova-byte"],
    loungeTitle: "7 cambios de la economía gracias a la IA",
    loungeDescription:
      "Impacto de la inteligencia artificial en la economía global antes de 2030.",
    ticketGrada: 4.99,
    ticketVip: 14.99,
    featuredGames: ["Ajedrez Blitz VR", "TCG Arena Podcast", "Drop Zone Battle"],
  },
  {
    id: "luisito-comunica-er",
    name: "Por qué la IA transformará la economía",
    avatar: "/ia-transformara-economia.png",
    immersiveSalaName: "Economía e IA",
    panoramaImage:
      "https://images.unsplash.com/photo-1534796636912-3b95b3ab5986?auto=format&fit=crop&w=4096&q=85",
    status: "live",
    streamType: "platform",
    salaVideoUrl: SALA_MP4_URL_BY_ID["luisito-comunica-er"],
    fallbackVideoId: "ScMzIvxBSi4",
    loungeTitle: "Por qué la IA transformará la economía",
    loungeDescription:
      "2026 como punto clave para la inteligencia artificial y la transformación económica global.",
    ticketGrada: 0,
    ticketVip: 0,
    featuredGames: ["Travel Quest VR", "Fan Zone", "Meet & Greet"],
  },
  {
    id: "ia-y-robots",
    name: "IA y ROBOTS",
    avatar: "/ia-y-robots.png",
    immersiveSalaName: "Economía e IA",
    panoramaImage:
      "https://images.unsplash.com/photo-1485827404703-89b55fcc595e?auto=format&fit=crop&w=4096&q=85",
    status: "live",
    streamType: "platform",
    salaVideoUrl: SALA_MP4_URL_BY_ID["ia-y-robots"],
    fallbackVideoId: "M7lc1UVf-VE",
    loungeTitle: "IA y ROBOTS",
    loungeDescription:
      "La IA y los robots van a provocar el mayor boom económico de la historia.",
    ticketGrada: 0,
    ticketVip: 0,
    featuredGames: ["Robotics Lab VR", "Fan Zone", "Meet & Greet"],
  },
  {
    id: "gopro-gpy",
    name: "GoPro GP",
    avatar: "/gopro-gpy-avatar.png",
    immersiveSalaName: "GoPro 360",
    panoramaImage:
      "https://images.unsplash.com/photo-1451187580459-43490279c0fa?auto=format&fit=crop&w=4096&q=85",
    status: "live",
    streamType: "platform",
    salaVideoUrl: SALA_MP4_URL_BY_ID["gopro-gpy"],
    fallbackVideoId: "ScMzIvxBSi4",
    loungeTitle: "Action Cam Lounge",
    loungeDescription:
      "Recorridos 360, aventura y contenido inmersivo en primera persona.",
    ticketGrada: 0,
    ticketVip: 0,
    featuredGames: ["Action Tour VR", "Fan Zone", "Creator Chat"],
  },
];

export function resolvePodcastVideoId(s: StreamerProfile): string {
  if (s.streamType === "youtube" && s.youtubeVideoId) return s.youtubeVideoId;
  if (s.fallbackVideoId) return s.fallbackVideoId;
  return s.youtubeVideoId ?? "M7lc1UVf-VE";
}
