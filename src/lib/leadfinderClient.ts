import { supabase } from "@/integrations/supabase/client";

export type LeadfinderSearchParams = {
  query: string;
  region: string;
  limit?: number;
  useGoogleMaps?: boolean;
};

export type LeadfinderResultRow = {
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

export type LeadfinderSearchResponse = {
  provider: string;
  query: string;
  region: string;
  count: number;
  results: LeadfinderResultRow[];
};

export async function runLeadfinderSearch(params: LeadfinderSearchParams): Promise<LeadfinderSearchResponse> {
  const response = await fetch("/api/leadfinder/search", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      query: params.query,
      region: params.region,
      limit: params.limit ?? 20,
      useGoogleMaps: params.useGoogleMaps === true,
    }),
  });
  const data = await response.json();
  if (!response.ok || data?.ok === false) {
    throw new Error(String(data?.error || `LeadFinder API error (${response.status})`));
  }
  const safe = data as LeadfinderSearchResponse | null;
  if (!safe || !Array.isArray(safe.results)) {
    throw new Error("Leadfinder devolvio un formato invalido.");
  }
  return safe;
}

export async function runLeadfinderSearchViaSupabaseFn(
  params: LeadfinderSearchParams,
): Promise<LeadfinderSearchResponse> {
  const { data, error } = await supabase.functions.invoke("leadfinder-search", {
    body: {
      query: params.query,
      region: params.region,
      limit: params.limit ?? 20,
      useGoogleMaps: params.useGoogleMaps === true,
    },
  });
  if (error) throw error;
  const response = data as LeadfinderSearchResponse | null;
  if (!response || !Array.isArray(response.results)) {
    throw new Error("Leadfinder devolvio un formato invalido.");
  }
  return response;
}
