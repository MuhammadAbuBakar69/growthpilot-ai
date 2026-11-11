-- GrowthPilot AI — initial schema.
-- Design notes are in docs/DATABASE_SCHEMA.md. Three rules govern this file:
--   1. Every tenant-owned row carries org_id and is protected by RLS, not by application code alone.
--   2. Anything the AI asserts carries its evidence class, so a hypothesis can never render as a finding.
--   3. Scores are stored with the methodology that produced them, because a number without its formula
--      is unfalsifiable.

create extension if not exists pgcrypto;
create extension if not exists vector;

-- ---------------------------------------------------------------- enums
create type member_role        as enum ('owner', 'admin', 'strategist', 'viewer');
create type business_size      as enum ('solo', 'micro', 'small', 'medium', 'large', 'enterprise');
create type audit_status       as enum ('queued', 'crawling', 'analyzing', 'complete', 'failed');
create type finding_category   as enum ('structure', 'ux', 'performance', 'seo', 'conversion', 'content', 'social', 'acquisition', 'competitor');
create type evidence_class     as enum ('measured', 'inferred', 'hypothesis', 'unavailable');
create type severity_level     as enum ('critical', 'high', 'medium', 'low', 'info');
create type recommendation_state as enum ('draft', 'proposed', 'approved', 'rejected', 'superseded');
create type task_status        as enum ('recommended', 'pending', 'in_progress', 'completed', 'failed', 'needs_review');
create type agent_kind         as enum ('business_intel', 'website', 'seo', 'marketing', 'social', 'acquisition', 'competitor', 'roadmap', 'analyst', 'manager');
create type agent_run_state    as enum ('queued', 'running', 'succeeded', 'failed', 'blocked_on_approval');
create type integration_kind   as enum ('google_search_console', 'google_analytics', 'meta', 'linkedin', 'youtube', 'pagespeed', 'openai', 'gemini', 'other');
create type report_kind        as enum ('growth_audit', 'website', 'seo', 'social', 'marketing', 'competitor', 'acquisition', 'roadmap', 'performance');
create type lead_state         as enum ('identified', 'qualified', 'contacted', 'replied', 'meeting', 'won', 'lost', 'disqualified');

-- ---------------------------------------------------------------- identity
-- Mirrors the auth provider's user table so the schema is portable between Supabase and a
-- self-hosted stack. Auth stays in the provider; authorisation lives here.
create table app_users (
  id            uuid primary key,
  email         citext unique not null,
  display_name  text not null default '',
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  deleted_at    timestamptz
);
create index on app_users (email) where deleted_at is null;

create table organizations (
  id            uuid primary key default gen_random_uuid(),
  name          text not null check (length(trim(name)) between 1 and 120),
  slug          citext unique not null,
  plan          text not null default 'trial',
  created_by    uuid references app_users (id) on delete set null,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  deleted_at    timestamptz
);

create table org_members (
  org_id        uuid not null references organizations (id) on delete cascade,
  user_id       uuid not null references app_users (id) on delete cascade,
  role          member_role not null default 'viewer',
  invited_by    uuid references app_users (id) on delete set null,
  created_at    timestamptz not null default now(),
  primary key (org_id, user_id)
);
create index on org_members (user_id);

-- ---------------------------------------------------------------- business profile
create table business_profiles (
  id                uuid primary key default gen_random_uuid(),
  org_id            uuid not null references organizations (id) on delete cascade,
  name              text not null check (length(trim(name)) between 1 and 160),
  website_url       text,
  industry          text,
  description       text,
  business_size     business_size,
  target_locations  text[] not null default '{}',
  target_audience   text,
  monthly_targets   jsonb not null default '{}',      -- {leads: 20, revenue: 500000, ...}
  marketing_budget  numeric(12, 2),
  challenges        text[] not null default '{}',
  positioning       text,                              -- brand positioning, refined by agents
  personas          jsonb not null default '[]',       -- [{name, role, pains[], triggers[]}]
  social_links      jsonb not null default '{}',       -- {instagram: url, ...}
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now(),
  deleted_at        timestamptz
);
create index on business_profiles (org_id) where deleted_at is null;

create table business_goals (
  id            uuid primary key default gen_random_uuid(),
  org_id        uuid not null references organizations (id) on delete cascade,
  business_id   uuid not null references business_profiles (id) on delete cascade,
  label         text not null,
  metric        text not null,
  target_value  numeric,
  current_value numeric,
  due_on        date,
  created_at    timestamptz not null default now()
);
create index on business_goals (business_id, due_on);

-- ---------------------------------------------------------------- scores and audits
-- A score is meaningless without its method, so both are stored together.
create table scores (
  id            uuid primary key default gen_random_uuid(),
  org_id        uuid not null references organizations (id) on delete cascade,
  business_id   uuid not null references business_profiles (id) on delete cascade,
  audit_id      uuid,
  category      finding_category not null,
  value         numeric(5, 2) not null check (value >= 0 and value <= 100),
  methodology   text not null,
  evidence_class evidence_class not null default 'measured',
  inputs        jsonb not null default '{}',
  computed_at   timestamptz not null default now()
);
create index on scores (business_id, category, computed_at desc);

create table website_audits (
  id            uuid primary key default gen_random_uuid(),
  org_id        uuid not null references organizations (id) on delete cascade,
  business_id   uuid not null references business_profiles (id) on delete cascade,
  url           text not null,
  status        audit_status not null default 'queued',
  requested_by  uuid references app_users (id) on delete set null,
  started_at    timestamptz,
  finished_at   timestamptz,
  error         text,
  summary       jsonb not null default '{}',
  created_at    timestamptz not null default now()
);
create index on website_audits (business_id, created_at desc);
create index on website_audits (status) where status in ('queued', 'crawling', 'analyzing');

create table website_pages (
  id            uuid primary key default gen_random_uuid(),
  org_id        uuid not null references organizations (id) on delete cascade,
  audit_id      uuid not null references website_audits (id) on delete cascade,
  url           text not null,
  http_status   int,
  title         text,
  meta_description text,
  h1            text,
  word_count    int,
  load_ms       int,
  bytes         bigint,
  findings      jsonb not null default '[]',
  created_at    timestamptz not null default now()
);
create index on website_pages (audit_id);

create table findings (
  id            uuid primary key default gen_random_uuid(),
  org_id        uuid not null references organizations (id) on delete cascade,
  business_id   uuid not null references business_profiles (id) on delete cascade,
  audit_id      uuid references website_audits (id) on delete cascade,
  category      finding_category not null,
  title         text not null,
  detail        text not null,
  evidence      text not null,                       -- what was actually observed
  evidence_class evidence_class not null,
  severity      severity_level not null default 'medium',
  source_url    text,
  created_at    timestamptz not null default now()
);
create index on findings (business_id, category, severity);

-- ---------------------------------------------------------------- competitors, social
create table competitors (
  id            uuid primary key default gen_random_uuid(),
  org_id        uuid not null references organizations (id) on delete cascade,
  business_id   uuid not null references business_profiles (id) on delete cascade,
  name          text not null,
  website_url   text,
  notes         text,
  last_analyzed_at timestamptz,
  created_at    timestamptz not null default now()
);
create index on competitors (business_id);

create table competitor_findings (
  id            uuid primary key default gen_random_uuid(),
  org_id        uuid not null references organizations (id) on delete cascade,
  competitor_id uuid not null references competitors (id) on delete cascade,
  dimension     text not null,                       -- positioning, content, seo, ux, offer
  observation   text not null,
  evidence_url  text,
  evidence_class evidence_class not null,
  created_at    timestamptz not null default now()
);

create table social_accounts (
  id            uuid primary key default gen_random_uuid(),
  org_id        uuid not null references organizations (id) on delete cascade,
  business_id   uuid not null references business_profiles (id) on delete cascade,
  platform      text not null check (platform in ('instagram','facebook','linkedin','tiktok','youtube','pinterest','x')),
  handle        text not null,
  external_id   text,
  connected     boolean not null default false,
  token_ref     text,                                -- pointer to the secret store, never the token
  created_at    timestamptz not null default now(),
  unique (business_id, platform, handle)
);

create table social_metrics (
  id            uuid primary key default gen_random_uuid(),
  org_id        uuid not null references organizations (id) on delete cascade,
  account_id    uuid not null references social_accounts (id) on delete cascade,
  captured_on   date not null,
  followers     int,
  posts         int,
  engagement    numeric(10, 4),
  reach         int,
  source        text not null default 'api',
  raw           jsonb not null default '{}',
  unique (account_id, captured_on)
);

-- ---------------------------------------------------------------- strategy, plan, tasks
create table strategies (
  id            uuid primary key default gen_random_uuid(),
  org_id        uuid not null references organizations (id) on delete cascade,
  business_id   uuid not null references business_profiles (id) on delete cascade,
  title         text not null,
  body          jsonb not null,                      -- persona, channels, funnel, content pillars
  model         text,
  generated_by  agent_kind not null default 'marketing',
  created_at    timestamptz not null default now()
);

create table recommendations (
  id            uuid primary key default gen_random_uuid(),
  org_id        uuid not null references organizations (id) on delete cascade,
  business_id   uuid not null references business_profiles (id) on delete cascade,
  strategy_id   uuid references strategies (id) on delete set null,
  title         text not null,
  problem       text not null,
  evidence      jsonb not null default '[]',         -- [{type, ref, quote}]
  evidence_class evidence_class not null,
  root_cause    text,
  impact        text,
  priority      severity_level not null default 'medium',
  solution      text not null,
  steps         jsonb not null default '[]',
  resources     text[] not null default '{}',
  effort        text,
  expected      text,
  success_metric text,
  state         recommendation_state not null default 'proposed',
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);
create index on recommendations (business_id, priority, state);

create table growth_tasks (
  id            uuid primary key default gen_random_uuid(),
  org_id        uuid not null references organizations (id) on delete cascade,
  business_id   uuid not null references business_profiles (id) on delete cascade,
  recommendation_id uuid references recommendations (id) on delete set null,
  title         text not null,
  detail        text,
  phase         int check (phase in (30, 60, 90)),
  status        task_status not null default 'recommended',
  owner_user_id uuid references app_users (id) on delete set null,
  due_on        date,
  depends_on    uuid[] not null default '{}',
  effort        text,
  success_metric text,
  outcome       text,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);
create index on growth_tasks (business_id, status, due_on);

create table campaigns (
  id            uuid primary key default gen_random_uuid(),
  org_id        uuid not null references organizations (id) on delete cascade,
  business_id   uuid not null references business_profiles (id) on delete cascade,
  name          text not null,
  channel       text not null,
  budget        numeric(12, 2),
  starts_on     date,
  ends_on       date,
  metrics       jsonb not null default '{}',
  created_at    timestamptz not null default now()
);

-- ---------------------------------------------------------------- acquisition
create table leads (
  id            uuid primary key default gen_random_uuid(),
  org_id        uuid not null references organizations (id) on delete cascade,
  business_id   uuid not null references business_profiles (id) on delete cascade,
  company       text not null,
  contact_name  text,
  contact_email text,
  website_url   text,
  industry      text,
  location      text,
  source        text not null,
  state         lead_state not null default 'identified',
  notes         text,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);
create index on leads (business_id, state);

create table lead_scores (
  id            uuid primary key default gen_random_uuid(),
  org_id        uuid not null references organizations (id) on delete cascade,
  lead_id       uuid not null references leads (id) on delete cascade,
  score         numeric(5, 2) not null,
  criteria      jsonb not null,                      -- [{key, weight, value, reason}]
  computed_at   timestamptz not null default now()
);

-- ---------------------------------------------------------------- AI execution
create table ai_conversations (
  id            uuid primary key default gen_random_uuid(),
  org_id        uuid not null references organizations (id) on delete cascade,
  business_id   uuid not null references business_profiles (id) on delete cascade,
  user_id       uuid references app_users (id) on delete set null,
  title         text,
  created_at    timestamptz not null default now()
);

create table ai_messages (
  id              uuid primary key default gen_random_uuid(),
  org_id          uuid not null references organizations (id) on delete cascade,
  conversation_id uuid not null references ai_conversations (id) on delete cascade,
  role            text not null check (role in ('user','assistant','tool','system')),
  content         text not null,
  citations       jsonb not null default '[]',       -- [{kind, id, label}]
  agent_run_id    uuid,
  created_at      timestamptz not null default now()
);
create index on ai_messages (conversation_id, created_at);

create table agent_runs (
  id            uuid primary key default gen_random_uuid(),
  org_id        uuid not null references organizations (id) on delete cascade,
  business_id   uuid not null references business_profiles (id) on delete cascade,
  agent         agent_kind not null,
  state         agent_run_state not null default 'queued',
  input         jsonb not null default '{}',
  output        jsonb,
  error         text,
  prompt_tokens int,
  output_tokens int,
  cost_usd      numeric(10, 5),
  started_at    timestamptz,
  finished_at   timestamptz,
  created_at    timestamptz not null default now()
);
create index on agent_runs (business_id, agent, created_at desc);

-- ---------------------------------------------------------------- reporting, ops
create table reports (
  id            uuid primary key default gen_random_uuid(),
  org_id        uuid not null references organizations (id) on delete cascade,
  business_id   uuid not null references business_profiles (id) on delete cascade,
  kind          report_kind not null,
  title         text not null,
  storage_ref   text,                                -- object storage key, not a public URL
  payload       jsonb not null default '{}',
  created_at    timestamptz not null default now()
);

create table integrations (
  id            uuid primary key default gen_random_uuid(),
  org_id        uuid not null references organizations (id) on delete cascade,
  kind          integration_kind not null,
  status        text not null default 'disconnected',
  external_id   text,
  token_ref     text,                                -- secret store reference only
  scopes        text[] not null default '{}',
  connected_at  timestamptz,
  created_at    timestamptz not null default now(),
  unique (org_id, kind, external_id)
);

create table notifications (
  id            uuid primary key default gen_random_uuid(),
  org_id        uuid not null references organizations (id) on delete cascade,
  user_id       uuid references app_users (id) on delete cascade,
  kind          text not null,
  body          text not null,
  read_at       timestamptz,
  created_at    timestamptz not null default now()
);

create table audit_logs (
  id            bigserial primary key,
  org_id        uuid references organizations (id) on delete set null,
  actor_user_id uuid references app_users (id) on delete set null,
  action        text not null,
  target        text,
  metadata      jsonb not null default '{}',
  ip            inet,
  created_at    timestamptz not null default now()
);
create index on audit_logs (org_id, created_at desc);

-- ---------------------------------------------------------------- updated_at
create or replace function touch_updated_at() returns trigger language plpgsql as $$
begin
  new.updated_at := now();
  return new;
end $$;

do $$
declare t text;
begin
  foreach t in array array['app_users','organizations','business_profiles','recommendations','growth_tasks','leads']
  loop
    execute format('create trigger %I_touch before update on %I for each row execute function touch_updated_at()', t, t);
  end loop;
end $$;
