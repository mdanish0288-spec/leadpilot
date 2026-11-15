-- Phase 2: searches, leads, API usage (rate limits). Applied 16 Nov 2026.

-- ============ Settings: Google Sheet link ============
alter table public.settings add column google_sheet_id text not null default ''
  check (google_sheet_id = '' or google_sheet_id ~ '^[A-Za-z0-9_-]{20,100}$');

-- ============ Searches (every command is logged) ============
create table public.searches (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  command_text text not null,
  via_voice boolean not null default false,
  country text, country_code text, city text, business_type text, query text,
  results_found int not null default 0,
  new_leads int not null default 0,
  duplicates int not null default 0,
  next_page_token text,
  status text not null default 'running' check (status in ('running','done','failed')),
  error text
);
create index searches_created_idx on public.searches (created_at desc);

-- ============ Leads ============
create table public.leads (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  search_id uuid references public.searches(id) on delete set null,
  place_id text not null unique,
  name text not null,
  business_type text not null,
  primary_type text,
  full_address text,
  neighbourhood text,
  city text,
  country text,
  country_code text check (country_code is null or country_code ~ '^[A-Z]{2}$'),
  phone text,
  phone_intl text,
  whatsapp text,               -- only after it is verified; never guessed
  email text,                  -- only publicly published addresses
  instagram text,
  rating numeric(2,1),
  review_count int,
  price_level text,
  opening_hours jsonb,
  utc_offset_minutes int,
  maps_url text,
  latitude double precision,
  longitude double precision,
  website text,
  website_status text not null default 'none'
    check (website_status in ('none','social_only','pending','broken','weak','good')),
  website_issues text[] not null default '{}',
  lead_type text not null default 'pending' check (lead_type in ('hot','warm','skip','pending')),
  score int check (score between 0 and 100),
  score_reasons jsonb not null default '[]',
  pricing_tier text check (pricing_tier in ('standard','premium','luxury')),
  stage text not null default 'New' check (stage in (
    'New','Demo Ready','Contacted','Replied','Customizing','Meeting Booked','Deal Agreed',
    'Advance Paid','Building Final','Final Review','Fully Paid','Delivered','Not Interested','Do Not Contact')),
  photo_refs jsonb not null default '[]',
  photo_count int not null default 0,
  top_reviews jsonb not null default '[]',
  store_colors text,
  delivery_links jsonb not null default '{}',
  demo_link text,
  contacted_by text,
  client_requirements text,
  meeting_time timestamptz,
  quoted_price numeric(12,2),
  agreed_price numeric(12,2),
  launch_offer_used boolean not null default false,
  currency text,
  domain text,
  payment_method text,
  advance_status text not null default 'Not requested',
  final_payment_status text not null default 'Not requested',
  final_website_link text,
  domain_renewal_date date,
  notes text,
  sheet_row int,
  sheet_synced_at timestamptz
);
create index leads_created_idx on public.leads (created_at desc);
create index leads_stage_idx on public.leads (stage);
create index leads_search_idx on public.leads (search_id);
create index leads_pending_idx on public.leads (website_status) where website_status = 'pending';

create or replace function private.touch_updated_at() returns trigger
language plpgsql set search_path = '' as $$
begin new.updated_at := now(); return new; end $$;
create trigger leads_touch before update on public.leads for each row execute function private.touch_updated_at();

-- HARD RULE: payment stages can only be set by the owner from the dashboard,
-- never by background jobs. Phase 7 adds the "mark paid" flow; until then nothing may set them.
create or replace function private.guard_paid_stages() returns trigger
language plpgsql set search_path = '' as $$
begin
  if new.stage in ('Advance Paid','Fully Paid') and (tg_op = 'INSERT' or old.stage is distinct from new.stage)
     and coalesce(current_setting('leadpilot.owner_marking_paid', true), '') <> 'yes' then
    raise exception 'Only the owner can mark a lead as paid.';
  end if;
  return new;
end $$;
create trigger leads_guard_paid before insert or update on public.leads for each row execute function private.guard_paid_stages();

-- ============ API usage (rate limits) ============
create table public.api_usage (
  id bigint generated always as identity primary key,
  at timestamptz not null default now(),
  kind text not null check (kind in ('command','search','transcribe','website_check'))
);
create index api_usage_kind_at_idx on public.api_usage (kind, at desc);

-- One call from the server = "is this the owner with 2FA?" + "under the hourly limit?" + record use.
create or replace function public.use_quota(p_kind text, p_max_per_hour int) returns text
language plpgsql security definer set search_path = '' as $$
declare n int;
begin
  if not private.is_owner() then return 'not_owner'; end if;
  select count(*) into n from public.api_usage where kind = p_kind and at > now() - interval '1 hour';
  if n >= p_max_per_hour then return 'rate_limited'; end if;
  insert into public.api_usage (kind) values (p_kind);
  return 'ok';
end $$;
revoke all on function public.use_quota(text, int) from public, anon;
grant execute on function public.use_quota(text, int) to authenticated;

-- ============ RLS ============
alter table public.searches enable row level security;
alter table public.leads enable row level security;
alter table public.api_usage enable row level security;
revoke all on public.searches, public.leads, public.api_usage from anon;

create policy owner_all_searches on public.searches for all to authenticated using ((select private.is_owner())) with check ((select private.is_owner()));
create policy owner_all_leads on public.leads for all to authenticated using ((select private.is_owner())) with check ((select private.is_owner()));
create policy owner_reads_usage on public.api_usage for select to authenticated using ((select private.is_owner()));
