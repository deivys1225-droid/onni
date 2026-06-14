/** Reglas locales de Onni (compartidas con Telegram; la web usa opAssistantResolver.ts). */

export function resolveOpCommand(textRaw, _currentPath = "/", _session = {}) {
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
      action: {
        type: "open_url",
        url: `https://www.youtube.com/results?search_query=${encodeURIComponent(q)}`,
      },
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

export function formatOpActionForTelegram(action) {
  if (!action) return "";

  if (action.type === "open_url") {
    return action.url;
  }

  if (action.type === "search_google") {
    return `https://www.google.com/search?q=${encodeURIComponent(action.query)}`;
  }

  return "Esa acción solo está disponible en OnniVers PC (.exe) o en la web con la app de escritorio.";
}
