-- Phase 1: single owner, settings, price tiers, audit log, private file storage.
-- Applied to Supabase project "leadpilot" (ap-south-1) on 15 Nov 2026.

-- ============ Private helpers (not exposed through the API) ============
create schema if not exists private;
revoke all on schema private from public, anon;
grant usage on schema private to authenticated;

-- ============ Single owner ============
create table public.app_owner (
  user_id uuid primary key references auth.users(id) on delete cascade,
  singleton boolean not null default true unique check (singleton),
  created_at timestamptz not null default now()
);

-- Only ONE account can ever exist. Any second sign-up is rejected by the database itself.
create or replace function private.enforce_single_owner() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if exists (select 1 from public.app_owner) then
    raise exception 'Sign-ups are closed. LeadPilot has a single owner.';
  end if;
  return new;
end $$;

create or replace function private.register_owner() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  insert into public.app_owner (user_id) values (new.id);
  return new;
end $$;

create trigger leadpilot_single_owner before insert on auth.users
  for each row execute function private.enforce_single_owner();
create trigger leadpilot_register_owner after insert on auth.users
  for each row execute function private.register_owner();

-- True only for the owner AND only after two-factor verification (aal2).
create or replace function private.is_owner() returns boolean
language sql stable security definer set search_path = '' as $$
  select coalesce((auth.jwt() ->> 'aal') = 'aal2', false)
     and exists (select 1 from public.app_owner o where o.user_id = (select auth.uid()));
$$;
grant execute on function private.is_owner() to authenticated;

-- ============ Settings (exactly one row) ============
create table public.settings (
  id smallint primary key default 1 check (id = 1),
  owner_name text not null default '',
  business_name text not null default '',
  business_email text not null default '',
  whatsapp_number text not null default '',
  instagram_handle text not null default '',
  logo_path text,
  services_included text not null default 'Custom website design, mobile-friendly build, domain for the first year, setup and launch.',
  launch_offer_percent numeric(5,2) not null default 10 check (launch_offer_percent >= 0 and launch_offer_percent <= 50),
  launch_offer_deals_per_city int not null default 10 check (launch_offer_deals_per_city between 0 and 100),
  delivery_days int not null default 7 check (delivery_days between 1 and 90),
  advance_percent int not null default 50 check (advance_percent between 10 and 90),
  free_change_rounds int not null default 1 check (free_change_rounds between 0 and 10),
  paid_change_rounds int not null default 2 check (paid_change_rounds between 0 and 10),
  meeting_days text[] not null default array['mon','tue','wed','thu','fri'],
  meeting_start time not null default '10:00',
  meeting_end time not null default '19:00',
  timezone text not null default 'Asia/Kolkata',
  upi_id text not null default '',
  upi_qr_path text,
  paypal_link text not null default '',
  paypal_qr_path text,
  usdt_address text not null default '',
  usdt_network text not null default 'TRC20' check (usdt_network in ('TRC20','ERC20','BEP20','Polygon','Solana','TON')),
  daily_email_limit int not null default 25 check (daily_email_limit between 0 and 25),
  auto_reply boolean not null default false,
  domain_alert_usd numeric(8,2) not null default 20 check (domain_alert_usd > 0),
  updated_at timestamptz not null default now(),
  check (meeting_end > meeting_start)
);
insert into public.settings (id) values (1);

-- ============ Price tiers (the floor is enforced by the database) ============
create table public.price_tiers (
  region text not null check (region ~ '^[A-Z]{2}$|^INTL$'),
  tier text not null check (tier in ('standard','premium','luxury')),
  currency text not null check (currency ~ '^[A-Z]{3}$'),
  start_price numeric(12,2) not null check (start_price > 0),
  lowest_price numeric(12,2) not null check (lowest_price > 0),
  updated_at timestamptz not null default now(),
  primary key (region, tier),
  check (lowest_price <= start_price)
);
insert into public.price_tiers (region, tier, currency, start_price, lowest_price) values
  ('IN','standard','INR',5500,5000), ('IN','premium','INR',9000,8000), ('IN','luxury','INR',15000,13000),
  ('INTL','standard','USD',350,300), ('INTL','premium','USD',600,500), ('INTL','luxury','USD',1000,850);

-- ============ Audit log (every settings/price change is recorded) ============
create table public.audit_log (
  id bigint generated always as identity primary key,
  at timestamptz not null default now(),
  actor uuid default auth.uid(),
  action text not null,
  details jsonb not null default '{}'
);
create index audit_log_at_idx on public.audit_log (at desc);

create or replace function private.log_change() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if tg_op = 'UPDATE' then new.updated_at := now(); end if;
  insert into public.audit_log (action, details)
  values (tg_table_name || '.' || lower(tg_op),
          jsonb_build_object('old', to_jsonb(old), 'new', to_jsonb(new)));
  return new;
end $$;
create trigger settings_audit before update on public.settings for each row execute function private.log_change();
create trigger price_tiers_audit before insert or update on public.price_tiers for each row execute function private.log_change();

-- ============ Row Level Security on every table ============
alter table public.app_owner enable row level security;
alter table public.settings enable row level security;
alter table public.price_tiers enable row level security;
alter table public.audit_log enable row level security;

revoke all on public.app_owner, public.settings, public.price_tiers, public.audit_log from anon;

create policy owner_reads_self on public.app_owner for select to authenticated using ((select private.is_owner()));
create policy owner_reads_settings on public.settings for select to authenticated using ((select private.is_owner()));
create policy owner_updates_settings on public.settings for update to authenticated using ((select private.is_owner())) with check ((select private.is_owner()));
create policy owner_reads_prices on public.price_tiers for select to authenticated using ((select private.is_owner()));
create policy owner_writes_prices on public.price_tiers for insert to authenticated with check ((select private.is_owner()));
create policy owner_updates_prices on public.price_tiers for update to authenticated using ((select private.is_owner())) with check ((select private.is_owner()));
create policy owner_deletes_prices on public.price_tiers for delete to authenticated using ((select private.is_owner()) and region not in ('IN','INTL'));
create policy owner_reads_audit on public.audit_log for select to authenticated using ((select private.is_owner()));

-- ============ Private file storage (logo, UPI QR, PayPal QR) ============
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('owner-files', 'owner-files', false, 2097152, array['image/png','image/jpeg','image/webp','image/svg+xml'])
on conflict (id) do nothing;

create policy owner_files_read on storage.objects for select to authenticated using (bucket_id = 'owner-files' and (select private.is_owner()));
create policy owner_files_insert on storage.objects for insert to authenticated with check (bucket_id = 'owner-files' and (select private.is_owner()));
create policy owner_files_update on storage.objects for update to authenticated using (bucket_id = 'owner-files' and (select private.is_owner()));
create policy owner_files_delete on storage.objects for delete to authenticated using (bucket_id = 'owner-files' and (select private.is_owner()));
