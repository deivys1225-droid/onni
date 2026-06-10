import { supabase } from "@/integrations/supabase/client";
import type { LeadfinderSearchResponse } from "@/lib/leadfinderClient";

export type LeadSearchJobRow = {
  id: string;
  query_text: string;
  region_text: string;
  status: string;
  result_count: number;
  created_at: string;
};

export type LeadRawResultRow = {
  id: string;
  lead_search_job_id: string;
  name: string;
  entity_type: string;
  phone: string | null;
  email: string | null;
  address: string | null;
  website: string | null;
  source_url: string | null;
  source_kind: string;
  created_at: string;
};

export async function createLeadSearchJob(params: {
  query: string;
  region: string;
  requestedLimit: number;
}): Promise<LeadSearchJobRow> {
  const { data, error } = await supabase
    .from("lead_search_jobs")
    .insert({
      created_by: null,
      status: "running",
      query_text: params.query,
      region_text: params.region,
      source_google_maps: false,
      source_web: true,
      requested_limit: params.requestedLimit,
      started_at: new Date().toISOString(),
    })
    .select("id, query_text, region_text, status, result_count, created_at")
    .single();

  if (error) {
    // Modo offline/local: no bloquear si Supabase falla.
    return {
      id: crypto.randomUUID(),
      query_text: params.query,
      region_text: params.region,
      status: "running",
      result_count: 0,
      created_at: new Date().toISOString(),
    };
  }
  return data as LeadSearchJobRow;
}

export async function completeLeadSearchJob(
  jobId: string,
  response: LeadfinderSearchResponse,
): Promise<void> {
  const rows = response.results.map((item) => ({
    lead_search_job_id: jobId,
    name: item.name,
    entity_type: `${item.entity_type}:${item.school_segment}:fit${item.buyer_fit_score}`,
    phone: item.phone ?? null,
    email: item.email ?? null,
    address: item.address ?? null,
    website: item.website ?? null,
    source_url: item.source_url ?? null,
    source_kind: item.source_kind ?? "web",
  }));

  if (rows.length > 0) {
    const { error: rawError } = await supabase.from("lead_search_raw_results").insert(rows);
    if (rawError) return;
  }

  const { error: updateError } = await supabase
    .from("lead_search_jobs")
    .update({
      status: "completed",
      result_count: rows.length,
      finished_at: new Date().toISOString(),
    })
    .eq("id", jobId);

  if (updateError) return;
}

export async function failLeadSearchJob(jobId: string, message: string): Promise<void> {
  const { error } = await supabase
    .from("lead_search_jobs")
    .update({
      status: "failed",
      error_message: message,
      finished_at: new Date().toISOString(),
    })
    .eq("id", jobId);
  if (error) return;
}

export async function getLatestLeadSearchSnapshot(): Promise<{
  job: LeadSearchJobRow | null;
  rows: LeadRawResultRow[];
}> {
  const { data: jobs, error: jobsError } = await supabase
    .from("lead_search_jobs")
    .select("id, query_text, region_text, status, result_count, created_at")
    .order("created_at", { ascending: false })
    .limit(1);
  if (jobsError) return { job: null, rows: [] };

  const job = ((jobs ?? [])[0] as LeadSearchJobRow | undefined) ?? null;
  if (!job) return { job: null, rows: [] };

  const { data: rows, error: rowsError } = await supabase
    .from("lead_search_raw_results")
    .select("id, lead_search_job_id, name, entity_type, phone, email, address, website, source_url, source_kind, created_at")
    .eq("lead_search_job_id", job.id)
    .order("created_at", { ascending: true });
  if (rowsError) return { job, rows: [] };

  return { job, rows: (rows ?? []) as LeadRawResultRow[] };
}
