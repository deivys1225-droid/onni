export type OnniMode = "tareas" | "programador";

export type DesktopAction =
  | { type: "open_url"; url: string }
  | { type: "search_google"; query: string }
  | { type: "open_app"; app: string }
  | { type: "create_folder"; name: string; location?: string }
  | { type: "print_pdf_current_page" };

export type OpResolveResult = {
  answer: string;
  mode: OnniMode;
  handled: boolean;
  action?: DesktopAction;
};

export type OpResolveSession = {
  lastAnswer?: string;
  appRole?: string | null;
  mode?: OnniMode;
};

function normalizeText(input: string): string {
  return String(input || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim();
}

export function resolveOpCommand(
  textRaw: string,
  _currentPath: string,
  session: OpResolveSession = {},
): OpResolveResult {
  const mode: OnniMode = session.mode ?? "tareas";
  const raw = String(textRaw || "").trim();
  const text = normalizeText(raw);

  if (!text) {
    return {
      answer: mode === "tareas" ? "Modo tareas activo. ¿Qué necesitas?" : "Modo programador activo. ¿Qué quieres construir?",
      mode,
      handled: true,
    };
  }

  if (/(^| )onni modo programador( |$)/.test(text)) {
    return {
      answer: "Listo. Cambio a modo programador.",
      mode: "programador",
      handled: true,
    };
  }

  if (/(^| )onni modo tareas( |$)/.test(text)) {
    return {
      answer: "Listo. Cambio a modo tareas.",
      mode: "tareas",
      handled: true,
    };
  }

  if (mode === "programador") {
    return {
      answer: "Modo programador activo. Te ayudo a crear, editar, instalar y ejecutar proyectos.",
      mode,
      handled: false,
    };
  }

  const ytWithQuery = raw.match(/abre\s+youtube\s+con\s+(.+)/i);
  if (ytWithQuery?.[1]) {
    const q = ytWithQuery[1].trim();
    return {
      answer: `Abriendo YouTube con: ${q}`,
      mode,
      handled: true,
      action: { type: "open_url", url: `https://www.youtube.com/results?search_query=${encodeURIComponent(q)}` },
    };
  }

  if (/\babre\s+youtube\b/i.test(raw)) {
    return {
      answer: "Abriendo YouTube.",
      mode,
      handled: true,
      action: { type: "open_url", url: "https://www.youtube.com/" },
    };
  }

  const googleSearch = raw.match(/busca\s+en\s+google\s+(.+)/i);
  if (googleSearch?.[1]) {
    const q = googleSearch[1].trim();
    return {
      answer: `Buscando en Google: ${q}`,
      mode,
      handled: true,
      action: { type: "search_google", query: q },
    };
  }

  if (/\babre\s+google\b/i.test(raw)) {
    return {
      answer: "Abriendo Google.",
      mode,
      handled: true,
      action: { type: "open_url", url: "https://www.google.com/" },
    };
  }

  if (/\babre\s+(mi\s+)?wh(a|á)ts?app\b/i.test(raw)) {
    return {
      answer: "Abriendo WhatsApp.",
      mode,
      handled: true,
      action: { type: "open_app", app: "whatsapp" },
    };
  }

  if (/\babre\s+word\b/i.test(raw)) {
    return {
      answer: "Abriendo Microsoft Word.",
      mode,
      handled: true,
      action: { type: "open_app", app: "word" },
    };
  }

  if (/\babre(\s+el)?\s+reproductor\b/i.test(raw)) {
    return {
      answer: "Abriendo el reproductor.",
      mode,
      handled: true,
      action: { type: "open_app", app: "reproductor" },
    };
  }

  if (/(haz|crea|genera).*(pdf).*(esta pagina|esta página|pagina actual|página actual)/i.test(raw)) {
    return {
      answer: "Generando PDF de esta página.",
      mode,
      handled: true,
      action: { type: "print_pdf_current_page" },
    };
  }

  const createFolder = raw.match(/crea(?:me)?\s+(?:una\s+)?carpeta\s+(.+?)(?:\s+en\s+(.+))?$/i);
  if (createFolder?.[1]) {
    const name = createFolder[1].trim();
    const location = createFolder[2]?.trim();
    return {
      answer: `Creando carpeta "${name}"${location ? ` en ${location}` : " en Escritorio"}.`,
      mode,
      handled: true,
      action: { type: "create_folder", name, location },
    };
  }

  const openGeneric = raw.match(/^abre\s+(.+)$/i);
  if (openGeneric?.[1]) {
    const app = openGeneric[1].trim();
    if (!/(youtube|google|whatsapp|word|reproductor)/i.test(app)) {
      return {
        answer: `Intentando abrir ${app}.`,
        mode,
        handled: true,
        action: { type: "open_app", app },
      };
    }
  }

  return {
    answer: "Te escucho.",
    mode,
    handled: false,
  };
}

export function getOpAssistantHint(_currentPath: string, mode: OnniMode = "tareas"): string {
  return mode === "tareas"
    ? "Modo tareas: abre apps/web, busca en Google, crea carpetas y exporta PDF."
    : "Modo programador: enfocado en crear proyectos, código y automatizaciones.";
}
