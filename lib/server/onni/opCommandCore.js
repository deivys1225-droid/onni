/** Reglas locales de Onni (compartidas con Telegram; la web usa opAssistantResolver.ts). */

const SITE_URLS = {
  google: "https://www.google.com/",
  youtube: "https://www.youtube.com/",
  facebook: "https://www.facebook.com/",
  instagram: "https://www.instagram.com/",
  twitter: "https://x.com/",
  x: "https://x.com/",
  gmail: "https://mail.google.com/",
  outlook: "https://outlook.live.com/",
  excel: "https://www.office.com/launch/excel",
  spotify: "https://open.spotify.com/",
  netflix: "https://www.netflix.com/",
  github: "https://github.com/",
  maps: "https://maps.google.com/",
  "google maps": "https://maps.google.com/",
};

/** Normaliza frases típicas de Telegram antes de resolver comandos. */
export function normalizeTelegramCommandText(text) {
  return String(text || "")
    .trim()
    .replace(/^onni[,:]?\s+/i, "")
    .replace(/^hola\s+onni[,:]?\s+/i, "")
    .replace(/^(por favor|please)[,:]?\s+/i, "")
    .replace(/^(puedes|podr[ií]as|quiero que)[,:]?\s+/i, "")
    .replace(/^(abrir|abreme|ábreme|abre me)\s+/i, "abre ")
    .replace(/^(cerrar|ciérrame|cérrame|cierra me)\s+/i, "cierra ")
    .replace(/\bbusques\b/gi, "busca")
    .replace(/\bbúscame\b/gi, "busca")
    .replace(/\bbúsca\b/gi, "busca")
    .replace(/\bbuscar\b/gi, "busca")
    .replace(/\s+(por favor|please)$/i, "")
    .trim();
}

const NON_GOOGLE_SEARCH_ENGINES = /\b(en\s+)?(youtube|maps|spotify|netflix|facebook|instagram)\b/i;

/** Extrae la consulta de búsqueda en Google desde frases naturales en español. */
export function resolveGoogleSearchQuery(textRaw) {
  const raw = String(textRaw || "").trim();
  if (!raw) return null;

  const patterns = [
    /(?:busca|search)\s+(?:en\s+)?google\s+(?:sobre|de|para|con)\s+(.+)/i,
    /(?:busca|search)\s+(?:en\s+)?google\s+(.+)/i,
    /(?:busca|search)\s+(.+?)\s+en\s+google/i,
    /google\s+(?:busca|search)\s+(?:sobre|de|para|con)?\s*(.+)/i,
    /abre\s+google\s+(?:y\s+)?(?:busca|search)\s+(?:sobre|de|para|con)?\s*(.+)/i,
    /abre\s+google\s+(?:con|para|sobre)\s+(.+)/i,
    /(?:investiga|encuentra|mira)\s+(?:en\s+)?google\s+(?:sobre|de|para|con)?\s*(.+)/i,
    /(?:investiga|encuentra|mira)\s+(.+?)\s+en\s+google/i,
    /(?:haz|hacer)\s+(?:una\s+)?b[uú]squeda\s+(?:en\s+)?google\s+(?:de|sobre|para|con)\s+(.+)/i,
    /(?:haz|hacer)\s+(?:una\s+)?b[uú]squeda\s+(?:de|sobre|para|con)\s+(.+?)\s+en\s+google/i,
  ];

  for (const pattern of patterns) {
    const match = raw.match(pattern);
    const query = match?.[1]?.trim();
    if (query) return query;
  }

  const generic = raw.match(/^(?:busca|search)\s+(.+)$/i);
  if (generic?.[1]) {
    const query = generic[1].trim();
    if (!NON_GOOGLE_SEARCH_ENGINES.test(query)) {
      return query.replace(/\s+en\s+google$/i, "").trim() || query;
    }
  }

  return null;
}

const CLOSE_ALIASES = {
  google: "google",
  youtube: "youtube",
  maps: "maps",
  whatsapp: "whatsapp",
  word: "word",
  excel: "excel",
  chrome: "chrome",
  edge: "edge",
  firefox: "firefox",
  spotify: "spotify",
  netflix: "netflix",
  reproductor: "reproductor",
  navegador: "navegador",
  ventana: "ventana",
  "la ventana": "ventana",
  "esta ventana": "ventana",
  "ventana activa": "ventana",
};

export function resolveOpCommand(textRaw, _currentPath = "/", _session = {}) {
  const raw = String(textRaw || "").trim();

  if (!raw) {
    return { answer: "¿Qué necesitas?", handled: true };
  }

  if (/^cierra(\s+la\s+)?(ventana|esta ventana|ventana activa)$/i.test(raw)) {
    return {
      answer: "Cerrando la ventana en tu PC.",
      handled: true,
      action: { type: "close_active_window" },
    };
  }

  const closeNamed = raw.match(/^cierra(\s+(?:el\s+|la\s+))?(.+)$/i);
  if (closeNamed?.[2]) {
    const targetRaw = closeNamed[2].trim();
    const targetKey = targetRaw.toLowerCase();
    const app = CLOSE_ALIASES[targetKey] || targetRaw;

    if (app === "ventana") {
      return {
        answer: "Cerrando la ventana en tu PC.",
        handled: true,
        action: { type: "close_active_window" },
      };
    }

    if (app === "navegador") {
      return {
        answer: "Cerrando el navegador en tu PC.",
        handled: true,
        action: { type: "close_app", app: "navegador" },
      };
    }

    return {
      answer: `Cerrando ${targetRaw} en tu PC.`,
      handled: true,
      action: { type: "close_app", app },
    };
  }

  const ytWithQuery = raw.match(/abre\s+(?:el\s+)?youtube\s+con\s+(.+)/i);
  if (ytWithQuery?.[1]) {
    const q = ytWithQuery[1].trim();
    return {
      answer: `Abriendo YouTube con: ${q}`,
      handled: true,
      action: {
        type: "open_url",
        url: `https://www.youtube.com/results?search_query=${encodeURIComponent(q)}`,
      },
    };
  }

  if (/\babre(\s+(?:el\s+)?)?youtube\b/i.test(raw) || /\babrir\s+youtube\b/i.test(raw)) {
    return {
      answer: "Abriendo YouTube en tu PC.",
      handled: true,
      action: { type: "open_url", url: "https://www.youtube.com/" },
    };
  }

  const googleQuery = resolveGoogleSearchQuery(raw);
  if (googleQuery) {
    return {
      answer: `Buscando en Google: ${googleQuery}`,
      handled: true,
      action: { type: "search_google", query: googleQuery },
    };
  }

  if (/\babre(\s+(?:el\s+)?)?google\b/i.test(raw) || /\babrir\s+google\b/i.test(raw)) {
    return {
      answer: "Abriendo Google en tu PC.",
      handled: true,
      action: { type: "open_url", url: "https://www.google.com/" },
    };
  }

  if (/\babre(\s+(?:el\s+)?)?(google\s+)?maps\b/i.test(raw) || /\babrir\s+maps\b/i.test(raw)) {
    return {
      answer: "Abriendo Google Maps en tu PC.",
      handled: true,
      action: { type: "open_url", url: "https://maps.google.com/" },
    };
  }

  if (/\babre\s+(mi\s+)?wh(a|á)ts?app\b/i.test(raw)) {
    return {
      answer: "Abriendo WhatsApp en tu PC.",
      handled: true,
      action: { type: "open_app", app: "whatsapp" },
    };
  }

  if (/\babre\s+word\b/i.test(raw)) {
    return {
      answer: "Abriendo Microsoft Word en tu PC.",
      handled: true,
      action: { type: "open_app", app: "word" },
    };
  }

  if (/\babre(\s+el)?\s+reproductor\b/i.test(raw)) {
    return {
      answer: "Abriendo el reproductor en tu PC.",
      handled: true,
      action: { type: "open_app", app: "reproductor" },
    };
  }

  if (/(haz|crea|genera).*(pdf).*(esta pagina|esta página|pagina actual|página actual)/i.test(raw)) {
    return {
      answer: "Generando PDF de la página.",
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

  const openNamedSite = raw.match(/^abre(\s+(?:el\s+|la\s+))?(.+)$/i);
  if (openNamedSite?.[2]) {
    const target = openNamedSite[2].trim().toLowerCase();
    const directUrl = SITE_URLS[target];
    if (directUrl) {
      return {
        answer: `Abriendo ${openNamedSite[2].trim()} en tu PC.`,
        handled: true,
        action: { type: "open_url", url: directUrl },
      };
    }

    for (const [name, url] of Object.entries(SITE_URLS)) {
      if (target.includes(name)) {
        return {
          answer: `Abriendo ${openNamedSite[2].trim()} en tu PC.`,
          handled: true,
          action: { type: "open_url", url },
        };
      }
    }

    if (!/(youtube|google|whatsapp|word|reproductor)/i.test(target)) {
      return {
        answer: `Intentando abrir ${openNamedSite[2].trim()} en tu PC.`,
        handled: true,
        action: { type: "open_app", app: openNamedSite[2].trim() },
      };
    }
  }

  return { answer: "Te escucho.", handled: false };
}

/** Resuelve comandos ya normalizados para Telegram. */
export function resolveTelegramOpCommand(textRaw) {
  const normalized = normalizeTelegramCommandText(textRaw);
  return resolveOpCommand(normalized, "/telegram");
}
