/** Destino navegable del sitio (rutas fijas). */
export type OpRouteEntry = {
  id: string;
  path: string;
  label: string;
  description: string;
  aliases: string[];
  /** Si true, la ruta exige sesión (PrivateRoute). */
  requiresAuth?: boolean;
};

/** Artista / sala en Conciertos Live o Podcast. */
export type OpStreamerEntry = {
  id: string;
  name: string;
  immersiveSalaName: string;
  aliases: string[];
  espectadorPath: string;
  podcastPath: string;
};

export type OpLobbyScreen = 1 | 2 | 3;

/** Rutas activas en esta copia (Onni + autenticación). */
export const OP_ROUTES: OpRouteEntry[] = [
  {
    id: "entrar",
    path: "/entrar",
    label: "Entrar",
    description: "Pantalla de bienvenida para acceso y registro.",
    aliases: ["entrar", "login", "iniciar sesion", "acceder", "welcome"],
  },
  {
    id: "registro",
    path: "/registro",
    label: "Registro",
    description: "Formulario para crear cuenta.",
    aliases: ["registro", "registrarme", "crear cuenta", "signup", "inscribirme"],
  },
  {
    id: "auth",
    path: "/auth",
    label: "Autenticación",
    description: "Pantalla de autenticación alternativa.",
    aliases: ["auth", "autenticacion", "autenticar"],
  },
  {
    id: "actualizar-contrasena",
    path: "/actualizar-contrasena",
    label: "Actualizar contraseña",
    description: "Pantalla para cambiar contraseña.",
    aliases: ["actualizar contrasena", "cambiar contrasena", "reset password"],
  },
  {
    id: "inicio",
    path: "/",
    label: "Inicio",
    description: "Pantalla principal con Onni, la asistente de IA.",
    aliases: [
      "inicio",
      "al inicio",
      "a inicio",
      "llevame al inicio",
      "lleva me al inicio",
      "ir al inicio",
      "volver al inicio",
      "traeme al inicio",
      "pagina de inicio",
      "home",
      "principal",
      "onni",
      "hola onni",
    ],
    requiresAuth: true,
  },
  {
    id: "privacidad",
    path: "/privacidad",
    label: "Privacidad",
    description: "Política de privacidad.",
    aliases: ["privacidad", "politica privacidad", "datos personales"],
  },
  {
    id: "terminos",
    path: "/terminos",
    label: "Términos",
    description: "Términos y condiciones.",
    aliases: ["terminos", "condiciones", "legal", "terminos y condiciones"],
  },
];

export const OP_TEATRO_ROOMS: { id: string; title: string; aliases: string[]; path: string }[] = [];

export const OP_STREAMERS: OpStreamerEntry[] = [];

export const OP_LOBBY_HINTS = [] as const;

/** Resumen corto para “¿qué puedes hacer?”. */
export function getOpAssistantHelpText(): string {
  return [
    "Navegación: inicio, entrar, registro, privacidad, términos.",
    "Pregúntame lo que quieras: uso Gemini para responder dudas generales.",
    "Menú: “abre el menú”, “cierra el menú”.",
  ].join("\n");
}
