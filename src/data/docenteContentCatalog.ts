import dinosauriosPreviewImg from "@/assets/aula-preview/dinosaurios.png";
import { cloudinaryVideoPosterUrl } from "@/lib/cloudinaryVideoPoster";
import { publicAssetUrl, publicLocalGlbUrl } from "@/lib/publicAssetUrl";

export type DocenteContentTabId = "videos" | "pdf" | "elementos-3d";

export type DocenteCatalogElement3dItem = {
  id: string;
  title: string;
  description: string;
  /** Enlace remoto (Cloudinary, etc.) para «Copiar». */
  resourceUrl: string;
  /** Archivo en public/assets/models: muestra «Seleccionar» en el panel docente. */
  localGlbPath?: string;
  imageUrl: string;
  badge: string;
};

export type DocenteCatalogVideoItem = {
  id: string;
  title: string;
  description: string;
  videoUrl: string;
  imageUrl: string;
  badge: string;
};

const PRESENTACION_VR_1 =
  "https://res.cloudinary.com/dmbpk37l5/video/upload/v1780439303/presentacion_vr1_nklmmf_ead8hs.mp4";
const PRESENTACION_VR_2 =
  "https://res.cloudinary.com/dmbpk37l5/video/upload/v1780439318/presentacion_vr_2_yf0xys_auwcro.mp4";

export const DOCENTE_CATALOG_VIDEOS: DocenteCatalogVideoItem[] = [
  {
    id: "presentacion-vr-1",
    title: "Presentación educación inmersiva I",
    description:
      "Recorrido introductorio en 360° para presentar el aula virtual: escena, pantalla de clase y experiencia del estudiante con visor.",
    videoUrl: PRESENTACION_VR_1,
    imageUrl: cloudinaryVideoPosterUrl(PRESENTACION_VR_1),
    badge: "Educación inmersiva",
  },
  {
    id: "presentacion-vr-2",
    title: "Presentación educación inmersiva II",
    description:
      "Segunda presentación VR: refuerza el flujo docente–alumno, recursos en sala y uso del Coliseo como aula en vivo.",
    videoUrl: PRESENTACION_VR_2,
    imageUrl: publicAssetUrl("2.jpeg"),
    badge: "Educación inmersiva",
  },
];

const REPTISECT_GLB =
  "https://res.cloudinary.com/dmbpk37l5/image/upload/v1780439265/reptisect_oqtyip_z0mwfk.glb";
const CORAZON_GLB =
  "https://res.cloudinary.com/dmbpk37l5/image/upload/v1780439269/el_corazon_dbhvfn_wjwe5k.glb";
const GEOQUIMICO_GLB =
  "https://res.cloudinary.com/dmbpk37l5/image/upload/v1780439309/modelo_geoquimico_lwbh6v_s3hcjj.glb";
const EARTH_MOON_LOBBY_GLB =
  "https://res.cloudinary.com/dmbpk37l5/image/upload/v1780542025/earth_moon_lobby_daifrb.glb";
const ANATOMIA_HUMANA_LOCAL = "assets/models/modello 3d anatomia umana.glb";
const TIERRA_TEXTURE = publicAssetUrl("assets/textures/earth/earth_day_4096.jpg");

export const DOCENTE_CATALOG_ELEMENTS_3D: DocenteCatalogElement3dItem[] = [
  {
    id: "reptisect",
    title: "Reptisect 3D",
    description:
      "Modelo de reptil para la pared del aula: ideal para biología, paleontología y ciencias naturales en la clase inmersiva.",
    resourceUrl: REPTISECT_GLB,
    imageUrl: dinosauriosPreviewImg,
    badge: "Elemento 3D",
  },
  {
    id: "corazon-glb",
    title: "Corazón humano 3D",
    description:
      "Holograma del corazón en la pared del Coliseo. Anatomía cardiovascular para estudiantes en VR o web.",
    resourceUrl: CORAZON_GLB,
    imageUrl:
      "https://upload.wikimedia.org/wikipedia/commons/thumb/d/d2/3D_model_of_a_human_heart.stl/1280px-3D_model_of_a_human_heart.stl.png",
    badge: "Elemento 3D",
  },
  {
    id: "anatomia-cuerpo-humano",
    title: "Anatomía del cuerpo humano 3D",
    description:
      "Modelo 3D de anatomía humana (28 MB en el servidor). Copia el enlace y pégalo en el GLB de la clase: mismo archivo para docente y estudiantes.",
    localGlbPath: ANATOMIA_HUMANA_LOCAL,
    resourceUrl: publicLocalGlbUrl(ANATOMIA_HUMANA_LOCAL),
    imageUrl: encodeURI(publicAssetUrl("assets/anatomia 2.png")),
    badge: "Elemento 3D",
  },
  {
    id: "modelo-geoquimico",
    title: "Modelo geoquímico 3D",
    description:
      "Estructuras y procesos geoquímicos en 3D para geología, química de la Tierra y educación ambiental.",
    resourceUrl: GEOQUIMICO_GLB,
    imageUrl:
      "https://images.unsplash.com/photo-1451187580459-43490279c0fa?auto=format&fit=crop&w=1200&q=80",
    badge: "Elemento 3D",
  },
  {
    id: "tierra-luna-lobby",
    title: "Tierra y Luna (lobby)",
    description:
      "Modelo 3D del planeta con la Luna en órbita, como en el lobby inmersivo. Ideal para astronomía y ciencias de la Tierra en la pared del Coliseo.",
    resourceUrl: EARTH_MOON_LOBBY_GLB,
    imageUrl: TIERRA_TEXTURE,
    badge: "Elemento 3D",
  },
];
