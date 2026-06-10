-- LeadFinder Phase 2: persist raw rows per search run
-- Nota: políticas abiertas para entorno local/prototipo con login local.

create table if not exists public.lead_search_raw_results (
  id uuid primary key default gen_random_uuid(),
  lead_search_job_id uuid not null references public.lead_search_jobs(id) on delete cascade,
  name text not null,
  entity_type text not null,
  phone text,
  email text,
  address text,
  website text,
  source_url text,
  source_kind text not null default 'web',
  created_at timestamptz not null default now()
);

create index if not exists idx_lead_search_raw_results_job
  on public.lead_search_raw_results(lead_search_job_id);

create index if not exists idx_lead_search_raw_results_created_at
  on public.lead_search_raw_results(created_at desc);

alter table public.lead_search_raw_results enable row level security;

-- Jobs: abrir lectura/escritura para prototipo local (admin local sin auth Supabase).
drop policy if exists "lead_search_jobs_select_own" on public.lead_search_jobs;
drop policy if exists "lead_search_jobs_insert_own" on public.lead_search_jobs;
drop policy if exists "lead_search_jobs_update_own" on public.lead_search_jobs;

create policy "lead_search_jobs_select_open"
on public.lead_search_jobs
for select
to anon, authenticated
using (true);

create policy "lead_search_jobs_insert_open"
on public.lead_search_jobs
for insert
to anon, authenticated
with check (true);

create policy "lead_search_jobs_update_open"
on public.lead_search_jobs
for update
to anon, authenticated
using (true)
with check (true);

-- Raw results: abierta para prototipo local.
drop policy if exists "lead_search_raw_results_select_open" on public.lead_search_raw_results;
create policy "lead_search_raw_results_select_open"
on public.lead_search_raw_results
for select
to anon, authenticated
using (true);

drop policy if exists "lead_search_raw_results_insert_open" on public.lead_search_raw_results;
create policy "lead_search_raw_results_insert_open"
on public.lead_search_raw_results
for insert
to anon, authenticated
with check (true);
