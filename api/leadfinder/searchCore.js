function normalizeLimit(raw) {
  const n = typeof raw === "number" ? raw : Number(raw);
  if (!Number.isFinite(n)) return 20;
  return Math.floor(n) <= 10 ? 10 : 20;
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
  const apiKey = String(env.GOOGLE_CSE_API_KEY || "").trim();
  const cx = String(env.GOOGLE_CSE_CX || "").trim();
  if (!apiKey || !cx) {
    throw Object.assign(new Error("Faltan GOOGLE_CSE_API_KEY y/o GOOGLE_CSE_CX en variables de entorno."), {
      statusCode: 500,
    });
  }
  const finalQuery = `${query} ${region} (colegio OR "institución educativa" OR megacolegio OR "colegio privado" OR "colegio público")`.trim();
  const url = new URL("https://www.googleapis.com/customsearch/v1");
  url.searchParams.set("key", apiKey);
  url.searchParams.set("cx", cx);
  url.searchParams.set("q", finalQuery);
  url.searchParams.set("num", String(limit));
  url.searchParams.set("hl", "es");
  url.searchParams.set("gl", "co");

  const res = await fetch(url.toString(), { method: "GET" });
  const payload = await res.json();
  if (!res.ok) {
    const msg = String(payload?.error?.message || `Google CSE error (${res.status})`);
    throw Object.assign(new Error(msg), { statusCode: res.status });
  }

  const items = payload?.items || [];
  const out = [];
  for (const item of items) {
    const candidate = toCandidateFromSnippet(
      {
        title: item?.title || "",
        link: item?.link || "",
        snippet: item?.snippet || "",
      },
      query,
    );
    if (candidate) out.push(candidate);
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
  if (!query || !region) throw Object.assign(new Error("Falta query o region."), { statusCode: 400 });

  const web = await searchWeb(query, region, limit, env);
  const deduped = dedupeCandidates([...web]).slice(0, limit);

  return {
    ok: true,
    provider: "google-custom-search",
    query,
    region,
    count: deduped.length,
    results: deduped,
  };
}
