export type DesktopAction =
  | { type: "open_url"; url: string }
  | { type: "search_google"; query: string }
  | { type: "open_app"; app: string }
  | { type: "create_folder"; name: string; location?: string }
  | { type: "print_pdf_current_page" };

export type OpResolveResult = {
  answer: string;
  handled: boolean;
  action?: DesktopAction;
};

export type OpResolveSession = {
  lastAnswer?: string;
  appRole?: string | null;
};

export function resolveOpCommand(
  textRaw: string,
  _currentPath: string,
  _session: OpResolveSession = {},
): OpResolveResult {
  const raw = String(textRaw || "").trim();

  if (!raw) {
    return { answer: "¿Qué necesitas?", handled: true };
  }

  const ytWithQuery = raw.match(/abre\s+youtube\s+con\s+(.+)/i);
  if (ytWithQuery?.[1]) {
    const q = ytWithQuery[1].trim();
    return {
      answer: `Abriendo YouTube con: ${q}`,
      handled: true,
      action: { type: "open_url", url: `https://www.youtube.com/results?search_query=${encodeURIComponent(q)}` },
    };
  }

  if (/\babre\s+youtube\b/i.test(raw)) {
    return {
      answer: "Abriendo YouTube.",
      handled: true,
      action: { type: "open_url", url: "https://www.youtube.com/" },
    };
  }

  const googleSearch = raw.match(/busca\s+en\s+google\s+(.+)/i);
  if (googleSearch?.[1]) {
    const q = googleSearch[1].trim();
    return {
      answer: `Buscando en Google: ${q}`,
      handled: true,
      action: { type: "search_google", query: q },
    };
  }

  const googleSearchAlt = raw.match(/busca\s+(.+?)\s+en\s+google/i);
  if (googleSearchAlt?.[1]) {
    const q = googleSearchAlt[1].trim();
    return {
      answer: `Buscando en Google: ${q}`,
      handled: true,
      action: { type: "search_google", query: q },
    };
  }

  const googleSearchGeneric = raw.match(/^busca\s+(.+)$/i);
  if (googleSearchGeneric?.[1] && !/\b(en\s+)?youtube\b/i.test(googleSearchGeneric[1])) {
    const q = googleSearchGeneric[1].trim().replace(/\s+en\s+google$/i, "").trim() || googleSearchGeneric[1].trim();
    return {
      answer: `Buscando en Google: ${q}`,
      handled: true,
      action: { type: "search_google", query: q },
    };
  }

  if (/\babre\s+google\b/i.test(raw)) {
    return {
      answer: "Abriendo Google.",
      handled: true,
      action: { type: "open_url", url: "https://www.google.com/" },
    };
  }

  if (/\babre\s+(mi\s+)?wh(a|á)ts?app\b/i.test(raw)) {
    return {
      answer: "Abriendo WhatsApp.",
      handled: true,
      action: { type: "open_app", app: "whatsapp" },
    };
  }

  if (/\babre\s+word\b/i.test(raw)) {
    return {
      answer: "Abriendo Microsoft Word.",
      handled: true,
      action: { type: "open_app", app: "word" },
    };
  }

  if (/\babre(\s+el)?\s+reproductor\b/i.test(raw)) {
    return {
      answer: "Abriendo el reproductor.",
      handled: true,
      action: { type: "open_app", app: "reproductor" },
    };
  }

  if (/(haz|crea|genera).*(pdf).*(esta pagina|esta página|pagina actual|página actual)/i.test(raw)) {
    return {
      answer: "Generando PDF de esta página.",
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
        handled: true,
        action: { type: "open_app", app },
      };
    }
  }

  return { answer: "Te escucho.", handled: false };
}

export function getOpAssistantHint(_currentPath: string): string {
  return "Puedo abrir apps y web, buscar en Google, crear carpetas y exportar PDF.";
}
