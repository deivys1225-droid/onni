type LeadfinderSearchRequest = {
  query?: string;
  region?: string;
  limit?: number;
  useGoogleMaps?: boolean;
};

type LeadCandidate = {
  name: string;
  entity_type: string;
  school_segment: "privado" | "publico" | "megacolegio" | "otro";
  buyer_fit_score: number;
  match_reasons: string[];
  phone?: string;
  email?: string;
  address?: string;
  website?: string;
  source_url: string;
  source_kind: "web" | "google_maps";
};

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function normalizeLimit(raw: unknown): number {
  const n = typeof raw === "number" ? raw : Number(raw);
  if (!Number.isFinite(n)) return 20;
  const normalized = Math.floor(n);
  if (normalized <= 10) return 10;
  return 20;
}

function normalizeUseGoogleMaps(raw: unknown): boolean {
  return raw === true;
}

function parseEmail(text: string): string | undefined {
  const m = text.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi);
  return m?.[0];
}

function parsePhone(text: string): string | undefined {
  const m = text.match(/(?:\+57\s?)?(?:3\d{2}|\d{1,3})[\s-]?\d{3}[\s-]?\d{4}/);
  return m?.[0]?.trim();
}

function parseWebsite(text: string): string | undefined {
  const m = text.match(/https?:\/\/[^\s)]+/i);
  return m?.[0];
}

function inferSchoolSegment(text: string): "privado" | "publico" | "megacolegio" | "otro" {
  const v = text.toLowerCase();
  if (/\b(mega\s?colegio|megacolegio)\b/.test(v)) return "megacolegio";
  if (/\b(privad[oa]|bilingue|bilingüe|campestre|internacional)\b/.test(v)) return "privado";
  if (/\b(public[oa]|oficial|distrital|municipal|departamental)\b/.test(v)) return "publico";
  return "otro";
}

function buildBuyerFitScore(parts: {
  name: string;
  snippet: string;
  website?: string;
  sourceKind: "web" | "google_maps";
}): { score: number; reasons: string[] } {
  const reasons: string[] = [];
  let score = 0;
  const text = `${parts.name} ${parts.snippet}`.toLowerCase();

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
  if (parts.website && !parts.website.includes("facebook.com")) {
    score += 10;
    reasons.push("Tiene sitio web propio.");
  }
  if (parts.sourceKind === "google_maps") {
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

function isLikelySchool(name: string, snippet: string): boolean {
  const text = `${name} ${snippet}`.toLowerCase();
  return /\b(colegio|institucion educativa|institución educativa|school|liceo|gimnasio|megacolegio)\b/.test(text);
}

function toCandidateFromSnippet(
  snippet: { title?: string; link?: string; snippet?: string },
  query: string,
): LeadCandidate | null {
  const name = (snippet.title ?? "").trim();
  const sourceUrl = (snippet.link ?? "").trim();
  if (!name || !sourceUrl) return null;

  const body = snippet.snippet ?? "";
  if (!isLikelySchool(name, body) && !query.toLowerCase().includes("coleg")) return null;
  const phone = parsePhone(body);
  const email = parseEmail(body);
  const website = parseWebsite(body) ?? sourceUrl;
  const lowered = query.toLowerCase();
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

async function searchWeb(query: string, region: string, limit: number): Promise<LeadCandidate[]> {
  const key = Deno.env.get("SERPAPI_API_KEY")?.trim();
  if (!key) {
    throw new Error("Missing SERPAPI_API_KEY in Supabase Edge secrets.");
  }

  const finalQuery = `${query} ${region} (colegio OR "institución educativa" OR megacolegio OR "colegio privado" OR "colegio público")`.trim();
  const url = new URL("https://serpapi.com/search.json");
  url.searchParams.set("engine", "google");
  url.searchParams.set("q", finalQuery);
  url.searchParams.set("hl", "es");
  url.searchParams.set("gl", "co");
  url.searchParams.set("num", String(limit));
  url.searchParams.set("api_key", key);

  const res = await fetch(url.toString(), { method: "GET" });
  const payload = await res.json();
  if (!res.ok) {
    const msg = String((payload as { error?: string }).error ?? `SerpAPI error (${res.status})`);
    throw new Error(msg);
  }

  const organic = (payload as { organic_results?: Array<{ title?: string; link?: string; snippet?: string }> }).organic_results ?? [];
  const out: LeadCandidate[] = [];
  for (const item of organic) {
    const c = toCandidateFromSnippet(item, query);
    if (c) out.push(c);
  }
  return out;
}

async function searchGoogleMaps(query: string, region: string, limit: number): Promise<LeadCandidate[]> {
  const mapsKey = Deno.env.get("GOOGLE_MAPS_API_KEY")?.trim();
  if (!mapsKey) {
    throw new Error("Missing GOOGLE_MAPS_API_KEY in Supabase Edge secrets.");
  }

  const textSearchUrl = new URL("https://maps.googleapis.com/maps/api/place/textsearch/json");
  textSearchUrl.searchParams.set("query", `${query} ${region} colegio`);
  textSearchUrl.searchParams.set("region", "co");
  textSearchUrl.searchParams.set("language", "es");
  textSearchUrl.searchParams.set("key", mapsKey);

  const searchRes = await fetch(textSearchUrl.toString());
  const searchPayload = await searchRes.json();
  if (!searchRes.ok) {
    const msg = String((searchPayload as { error_message?: string }).error_message ?? `Google Maps error (${searchRes.status})`);
    throw new Error(msg);
  }

  const results = ((searchPayload as { results?: Array<{ name?: string; formatted_address?: string; place_id?: string }> }).results ?? []).slice(0, limit);
  const out: LeadCandidate[] = [];

  for (const item of results) {
    const placeId = (item.place_id ?? "").trim();
    const name = (item.name ?? "").trim();
    if (!placeId || !name) continue;

    const detailsUrl = new URL("https://maps.googleapis.com/maps/api/place/details/json");
    detailsUrl.searchParams.set("place_id", placeId);
    detailsUrl.searchParams.set("fields", "name,formatted_address,formatted_phone_number,website,url");
    detailsUrl.searchParams.set("language", "es");
    detailsUrl.searchParams.set("key", mapsKey);
    const detailsRes = await fetch(detailsUrl.toString());
    const detailsPayload = await detailsRes.json();
    const details = (detailsPayload as { result?: Record<string, unknown> }).result ?? {};

    const snippet = String(details.formatted_address ?? item.formatted_address ?? "");
    if (!isLikelySchool(name, snippet) && !query.toLowerCase().includes("coleg")) continue;
    const website = String(details.website ?? "");
    const sourceUrl = String(details.url ?? "");
    const fit = buildBuyerFitScore({
      name,
      snippet,
      website: website || undefined,
      sourceKind: "google_maps",
    });

    out.push({
      name,
      entity_type: "colegio",
      school_segment: inferSchoolSegment(`${name} ${snippet}`),
      buyer_fit_score: fit.score,
      match_reasons: fit.reasons,
      phone: String(details.formatted_phone_number ?? "") || undefined,
      email: undefined,
      address: snippet || undefined,
      website: website || undefined,
      source_url: sourceUrl || `https://www.google.com/maps/place/?q=place_id:${placeId}`,
      source_kind: "google_maps",
    });
  }

  return out;
}

function dedupeCandidates(candidates: LeadCandidate[]): LeadCandidate[] {
  const byKey = new Map<string, LeadCandidate>();
  for (const item of candidates) {
    const key = `${item.name.toLowerCase()}|${(item.website ?? "").toLowerCase()}|${(item.address ?? "").toLowerCase()}`;
    const prev = byKey.get(key);
    if (!prev) {
      byKey.set(key, item);
      continue;
    }
    const choose = item.buyer_fit_score > prev.buyer_fit_score ? item : prev;
    byKey.set(key, choose);
  }
  return Array.from(byKey.values()).sort((a, b) => b.buyer_fit_score - a.buyer_fit_score);
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  try {
    const body = (await req.json()) as LeadfinderSearchRequest;
    const query = (body.query ?? "").trim();
    const region = (body.region ?? "").trim();
    const limit = normalizeLimit(body.limit);
    const useGoogleMaps = normalizeUseGoogleMaps(body.useGoogleMaps);

    if (!query || !region) {
      return json({ error: "Missing query or region" }, 400);
    }

    const web = await searchWeb(query, region, limit);
    const maps = useGoogleMaps ? await searchGoogleMaps(query, region, limit) : [];
    const deduped = dedupeCandidates([...maps, ...web]).slice(0, limit);
    return json({
      provider: useGoogleMaps ? "google-web-serpapi+google-maps" : "google-web-serpapi",
      query,
      region,
      count: deduped.length,
      results: deduped,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unexpected leadfinder error";
    return json({ error: message }, 500);
  }
});
