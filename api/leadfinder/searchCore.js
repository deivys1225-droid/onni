function normalizeLimit(raw) {
  const n = typeof raw === "number" ? raw : Number(raw);
  if (!Number.isFinite(n)) return 20;
  return Math.floor(n) <= 10 ? 10 : 20;
}

function normalizeUseGoogleMaps(raw) {
  return raw === true;
}

function parseEmail(text) {
  const m = String(text || "").match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi);
  return m?.[0];
}

function parsePhone(text) {
  const m = String(text || "").match(/(?:\+57\s?)?(?:3\d{2}|\d{1,3})[\s-]?\d{3}[\s-]?\d{4}/);
  return m?.[0]?.trim();
}

function parseWebsite(text) {
  const m = String(text || "").match(/https?:\/\/[^\s)]+/i);
  return m?.[0];
}

function inferSchoolSegment(text) {
  const v = String(text || "").toLowerCase();
  if (/\b(mega\s?colegio|megacolegio)\b/.test(v)) return "megacolegio";
  if (/\b(privad[oa]|bilingue|bilingüe|campestre|internacional)\b/.test(v)) return "privado";
  if (/\b(public[oa]|oficial|distrital|municipal|departamental)\b/.test(v)) return "publico";
  return "otro";
}

function buildBuyerFitScore({ name, snippet, website, sourceKind }) {
  const reasons = [];
  let score = 0;
  const text = `${name || ""} ${snippet || ""}`.toLowerCase();

  if (/\b(colegio|institucion educativa|institución educativa|school|liceo|gimnasio)\b/.test(text)) {
    score += 30;
    reasons.push("Es una institucion educativa.");
  }
  if (/\b(privad[oa]|public[oa]|oficial|distrital|megacolegio)\b/.test(text)) {
    score += 20;
    reasons.push("Incluye tipo de colegio relevante.");
  }
  if (/\b(bilingue|bilingüe|tecnologico|tecnológico|bachillerato|media tecnica|media técnica)\b/.test(text)) {
    score += 15;
    reasons.push("Perfil academico compatible con VR educativo.");
  }
  if (website && !String(website).includes("facebook.com")) {
    score += 10;
    reasons.push("Tiene sitio web propio.");
  }
  if (sourceKind === "google_maps") {
    score += 15;
    reasons.push("Dato validado por ficha de Maps.");
  }
  if (/\b(universidad|jardin|jardín|guarderia|guardería)\b/.test(text)) {
    score -= 25;
    reasons.push("Parece segmento menos objetivo.");
  }

  const bounded = Math.max(0, Math.min(100, score));
  return { score: bounded, reasons };
}

function isLikelySchool(name, snippet) {
  const text = `${name || ""} ${snippet || ""}`.toLowerCase();
  return /\b(colegio|institucion educativa|institución educativa|school|liceo|gimnasio|megacolegio)\b/.test(text);
}

function toCandidateFromSnippet(snippet, query) {
  const name = (snippet?.title || "").trim();
  const sourceUrl = (snippet?.link || "").trim();
  if (!name || !sourceUrl) return null;

  const body = snippet?.snippet || "";
  if (!isLikelySchool(name, body) && !String(query || "").toLowerCase().includes("coleg")) return null;
  const phone = parsePhone(body);
  const email = parseEmail(body);
  const website = parseWebsite(body) || sourceUrl;
  const lowered = String(query || "").toLowerCase();
  const inferredType = lowered.includes("coleg")
    ? "colegio"
    : lowered.includes("alcald")
      ? "alcaldia"
      : lowered.includes("gobern")
        ? "gobernacion"
        : lowered.includes("secretar")
          ? "secretaria_educacion"
          : "institucion";
  const schoolSegment = inferSchoolSegment(`${name} ${body}`);
  const fit = buildBuyerFitScore({ name, snippet: body, website, sourceKind: "web" });

  return {
    name,
    entity_type: inferredType,
    school_segment: schoolSegment,
    buyer_fit_score: fit.score,
    match_reasons: fit.reasons,
    phone,
    email,
    address: body || undefined,
    website,
    source_url: sourceUrl,
    source_kind: "web",
  };
}

async function searchWeb(query, region, limit, env) {
  const key = String(env.SERPAPI_API_KEY || "").trim();
  const finalQuery = `${query} ${region} (colegio OR "institución educativa" OR megacolegio OR "colegio privado" OR "colegio público")`.trim();

  // 1) Si hay SerpAPI valida, usarla.
  if (key) {
    const url = new URL("https://serpapi.com/search.json");
    url.searchParams.set("engine", "google");
    url.searchParams.set("q", finalQuery);
    url.searchParams.set("hl", "es");
    url.searchParams.set("gl", "co");
    url.searchParams.set("num", String(limit));
    url.searchParams.set("api_key", key);

    const res = await fetch(url.toString(), { method: "GET" });
    const payload = await res.json();
    if (res.ok) {
      const organic = payload?.organic_results || [];
      const out = [];
      for (const item of organic) {
        const c = toCandidateFromSnippet(item, query);
        if (c) out.push(c);
      }
      if (out.length > 0) return out;
    }
    // Si falla (ej. invalid key), caemos a modo gratis automáticamente.
  }

  // 2) Fallback gratis: DuckDuckGo HTML (sin API paga).
  const ddg = await fetch(
    `https://duckduckgo.com/html/?q=${encodeURIComponent(finalQuery)}`,
    {
      method: "GET",
      headers: {
        "User-Agent": "Mozilla/5.0 (compatible; OnniLeadFinder/1.0)",
      },
    },
  );
  const html = await ddg.text();
  if (!ddg.ok || !html) {
    throw Object.assign(new Error("No se pudo consultar buscador web gratis."), {
      statusCode: ddg.status || 502,
    });
  }

  const out = [];
  const resultRegex =
    /<a[^>]*class="[^"]*result__a[^"]*"[^>]*href="([^"]+)"[^>]*>(.*?)<\/a>[\s\S]{0,1200}?<a[^>]*class="[^"]*result__snippet[^"]*"[^>]*>([\s\S]*?)<\/a>/gi;
  let match;
  while ((match = resultRegex.exec(html)) && out.length < limit) {
    const rawLink = match[1] || "";
    const cleanTitle = String(match[2] || "").replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
    const cleanSnippet = String(match[3] || "").replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
    let link = rawLink;
    try {
      const u = new URL(rawLink, "https://duckduckgo.com");
      const uddg = u.searchParams.get("uddg");
      if (uddg) link = decodeURIComponent(uddg);
    } catch {
      // use raw link
    }
    const candidate = toCandidateFromSnippet(
      { title: cleanTitle, link, snippet: cleanSnippet },
      query,
    );
    if (candidate) out.push(candidate);
  }
  return out;
}

async function searchGoogleMaps(query, region, limit, env) {
  const mapsKey = String(env.GOOGLE_MAPS_API_KEY || "").trim();
  if (!mapsKey) throw Object.assign(new Error("Falta GOOGLE_MAPS_API_KEY en .env.local."), { statusCode: 500 });

  const textSearchUrl = new URL("https://maps.googleapis.com/maps/api/place/textsearch/json");
  textSearchUrl.searchParams.set("query", `${query} ${region} colegio`);
  textSearchUrl.searchParams.set("region", "co");
  textSearchUrl.searchParams.set("language", "es");
  textSearchUrl.searchParams.set("key", mapsKey);

  const searchRes = await fetch(textSearchUrl.toString());
  const searchPayload = await searchRes.json();
  if (!searchRes.ok) {
    const msg = String(searchPayload?.error_message || `Google Maps error (${searchRes.status})`);
    throw Object.assign(new Error(msg), { statusCode: searchRes.status });
  }

  const results = (searchPayload?.results || []).slice(0, limit);
  const out = [];
  for (const item of results) {
    const placeId = (item?.place_id || "").trim();
    const name = (item?.name || "").trim();
    if (!placeId || !name) continue;

    const detailsUrl = new URL("https://maps.googleapis.com/maps/api/place/details/json");
    detailsUrl.searchParams.set("place_id", placeId);
    detailsUrl.searchParams.set("fields", "name,formatted_address,formatted_phone_number,website,url");
    detailsUrl.searchParams.set("language", "es");
    detailsUrl.searchParams.set("key", mapsKey);
    const detailsRes = await fetch(detailsUrl.toString());
    const detailsPayload = await detailsRes.json();
    const details = detailsPayload?.result || {};

    const snippet = String(details.formatted_address || item?.formatted_address || "");
    if (!isLikelySchool(name, snippet) && !String(query || "").toLowerCase().includes("coleg")) continue;
    const website = String(details.website || "");
    const sourceUrl = String(details.url || "");
    const fit = buildBuyerFitScore({ name, snippet, website: website || undefined, sourceKind: "google_maps" });

    out.push({
      name,
      entity_type: "colegio",
      school_segment: inferSchoolSegment(`${name} ${snippet}`),
      buyer_fit_score: fit.score,
      match_reasons: fit.reasons,
      phone: String(details.formatted_phone_number || "") || undefined,
      email: undefined,
      address: snippet || undefined,
      website: website || undefined,
      source_url: sourceUrl || `https://www.google.com/maps/place/?q=place_id:${placeId}`,
      source_kind: "google_maps",
    });
  }
  return out;
}

function dedupeCandidates(candidates) {
  const byKey = new Map();
  for (const item of candidates) {
    const key = `${String(item.name || "").toLowerCase()}|${String(item.website || "").toLowerCase()}|${String(item.address || "").toLowerCase()}`;
    const prev = byKey.get(key);
    if (!prev || item.buyer_fit_score > prev.buyer_fit_score) byKey.set(key, item);
  }
  return Array.from(byKey.values()).sort((a, b) => b.buyer_fit_score - a.buyer_fit_score);
}

export async function runLeadfinderSearch(body, env) {
  const query = String(body?.query || "").trim();
  const region = String(body?.region || "").trim();
  const limit = normalizeLimit(body?.limit);
  const useGoogleMaps = normalizeUseGoogleMaps(body?.useGoogleMaps);
  if (!query || !region) throw Object.assign(new Error("Falta query o region."), { statusCode: 400 });

  const web = await searchWeb(query, region, limit, env);
  const maps = useGoogleMaps ? await searchGoogleMaps(query, region, limit, env) : [];
  const deduped = dedupeCandidates([...maps, ...web]).slice(0, limit);

  return {
    ok: true,
    provider: useGoogleMaps ? "google-web-serpapi+google-maps" : "google-web-serpapi",
    query,
    region,
    count: deduped.length,
    results: deduped,
  };
}
