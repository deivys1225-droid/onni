-- LeadFinder / ExcelTool / EmailTool - Phase 1 base schema
-- Designed to be modular for future tools and background workers.

-- Optional helper extension.
create extension if not exists pgcrypto;

-- 1) Search jobs orchestrated by the app.
create table if not exists public.lead_search_jobs (
  id uuid primary key default gen_random_uuid(),
  created_by uuid references auth.users(id) on delete set null,
  status text not null default 'queued' check (status in ('queued', 'running', 'completed', 'failed', 'cancelled')),
  query_text text not null,
  region_text text not null,
  source_google_maps boolean not null default true,
  source_web boolean not null default true,
  requested_limit integer not null default 50 check (requested_limit > 0 and requested_limit <= 2000),
  result_count integer not null default 0,
  error_message text,
  started_at timestamptz,
  finished_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_lead_search_jobs_status on public.lead_search_jobs(status);
create index if not exists idx_lead_search_jobs_created_at on public.lead_search_jobs(created_at desc);

-- 2) Normalized organizations.
create table if not exists public.organizations (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  entity_type text not null,
  country text default 'Colombia',
  department text,
  city text,
  address text,
  website text,
  google_maps_place_id text,
  confidence_score numeric(5,2) not null default 0 check (confidence_score >= 0 and confidence_score <= 100),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_organizations_entity_type on public.organizations(entity_type);
create index if not exists idx_organizations_city on public.organizations(city);
create unique index if not exists uq_organizations_place_id
  on public.organizations(google_maps_place_id)
  where google_maps_place_id is not null;

-- 3) Contact points per organization (multi phone/email support).
create table if not exists public.organization_contacts (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  contact_type text not null check (contact_type in ('phone', 'email', 'website', 'other')),
  contact_value text not null,
  is_primary boolean not null default false,
  created_at timestamptz not null default now()
);

create index if not exists idx_org_contacts_org on public.organization_contacts(organization_id);
create index if not exists idx_org_contacts_type on public.organization_contacts(contact_type);

-- 4) Source traceability for each organization datum.
create table if not exists public.organization_sources (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  lead_search_job_id uuid references public.lead_search_jobs(id) on delete set null,
  source_kind text not null check (source_kind in ('google_maps', 'web', 'manual')),
  source_url text,
  extracted_fields jsonb not null default '{}'::jsonb,
  extracted_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create index if not exists idx_org_sources_org on public.organization_sources(organization_id);
create index if not exists idx_org_sources_job on public.organization_sources(lead_search_job_id);

-- 5) Search result join table (what appeared in each run).
create table if not exists public.lead_search_results (
  id uuid primary key default gen_random_uuid(),
  lead_search_job_id uuid not null references public.lead_search_jobs(id) on delete cascade,
  organization_id uuid not null references public.organizations(id) on delete cascade,
  rank_position integer not null default 0,
  dedupe_key text,
  created_at timestamptz not null default now()
);

create unique index if not exists uq_lead_job_org on public.lead_search_results(lead_search_job_id, organization_id);
create index if not exists idx_lead_results_job_rank on public.lead_search_results(lead_search_job_id, rank_position);

-- 6) Exports metadata (ExcelTool).
create table if not exists public.data_exports (
  id uuid primary key default gen_random_uuid(),
  created_by uuid references auth.users(id) on delete set null,
  lead_search_job_id uuid references public.lead_search_jobs(id) on delete set null,
  export_format text not null default 'xlsx' check (export_format in ('xlsx', 'csv')),
  status text not null default 'queued' check (status in ('queued', 'running', 'completed', 'failed')),
  file_path text,
  file_size_bytes bigint,
  filters jsonb not null default '{}'::jsonb,
  error_message text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_data_exports_status on public.data_exports(status);

-- 7) Email drafts (EmailTool).
create table if not exists public.email_drafts (
  id uuid primary key default gen_random_uuid(),
  created_by uuid references auth.users(id) on delete set null,
  organization_id uuid not null references public.organizations(id) on delete cascade,
  lead_search_job_id uuid references public.lead_search_jobs(id) on delete set null,
  recipient_email text,
  subject text not null,
  body text not null,
  tone text default 'professional',
  status text not null default 'draft' check (status in ('draft', 'approved', 'sent', 'cancelled')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_email_drafts_org on public.email_drafts(organization_id);
create index if not exists idx_email_drafts_status on public.email_drafts(status);

-- 8) Trigger helper for updated_at consistency.
create or replace function public.touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_touch_lead_search_jobs on public.lead_search_jobs;
create trigger trg_touch_lead_search_jobs
before update on public.lead_search_jobs
for each row execute function public.touch_updated_at();

drop trigger if exists trg_touch_organizations on public.organizations;
create trigger trg_touch_organizations
before update on public.organizations
for each row execute function public.touch_updated_at();

drop trigger if exists trg_touch_data_exports on public.data_exports;
create trigger trg_touch_data_exports
before update on public.data_exports
for each row execute function public.touch_updated_at();

drop trigger if exists trg_touch_email_drafts on public.email_drafts;
create trigger trg_touch_email_drafts
before update on public.email_drafts
for each row execute function public.touch_updated_at();

-- 9) Basic RLS (owner visibility; simple baseline).
alter table public.lead_search_jobs enable row level security;
alter table public.organizations enable row level security;
alter table public.organization_contacts enable row level security;
alter table public.organization_sources enable row level security;
alter table public.lead_search_results enable row level security;
alter table public.data_exports enable row level security;
alter table public.email_drafts enable row level security;

-- Search jobs.
drop policy if exists "lead_search_jobs_select_own" on public.lead_search_jobs;
create policy "lead_search_jobs_select_own"
on public.lead_search_jobs
for select
to authenticated
using (created_by = auth.uid());

drop policy if exists "lead_search_jobs_insert_own" on public.lead_search_jobs;
create policy "lead_search_jobs_insert_own"
on public.lead_search_jobs
for insert
to authenticated
with check (created_by = auth.uid());

drop policy if exists "lead_search_jobs_update_own" on public.lead_search_jobs;
create policy "lead_search_jobs_update_own"
on public.lead_search_jobs
for update
to authenticated
using (created_by = auth.uid())
with check (created_by = auth.uid());

-- Organizations and related tables: readable by authenticated users.
drop policy if exists "organizations_select_authenticated" on public.organizations;
create policy "organizations_select_authenticated"
on public.organizations
for select
to authenticated
using (true);

drop policy if exists "organization_contacts_select_authenticated" on public.organization_contacts;
create policy "organization_contacts_select_authenticated"
on public.organization_contacts
for select
to authenticated
using (true);

drop policy if exists "organization_sources_select_authenticated" on public.organization_sources;
create policy "organization_sources_select_authenticated"
on public.organization_sources
for select
to authenticated
using (true);

drop policy if exists "lead_search_results_select_authenticated" on public.lead_search_results;
create policy "lead_search_results_select_authenticated"
on public.lead_search_results
for select
to authenticated
using (true);

-- Exports and drafts owner-only.
drop policy if exists "data_exports_select_own" on public.data_exports;
create policy "data_exports_select_own"
on public.data_exports
for select
to authenticated
using (created_by = auth.uid());

drop policy if exists "data_exports_insert_own" on public.data_exports;
create policy "data_exports_insert_own"
on public.data_exports
for insert
to authenticated
with check (created_by = auth.uid());

drop policy if exists "email_drafts_select_own" on public.email_drafts;
create policy "email_drafts_select_own"
on public.email_drafts
for select
to authenticated
using (created_by = auth.uid());

drop policy if exists "email_drafts_insert_own" on public.email_drafts;
create policy "email_drafts_insert_own"
on public.email_drafts
for insert
to authenticated
with check (created_by = auth.uid());
