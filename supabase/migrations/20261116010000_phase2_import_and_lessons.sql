-- Leads imported from the owner's own Google Sheet / CSV.
alter table public.leads drop constraint leads_data_source_check;
alter table public.leads add constraint leads_data_source_check check (data_source in ('google','openstreetmap','import'));

-- Same business = same phone (last 10 digits), used to skip duplicates across imports and searches.
alter table public.leads add column phone_key text generated always as (
  nullif(right(regexp_replace(coalesce(phone_intl, phone, ''), '\D', '', 'g'), 10), '')) stored;
create index leads_phone_key_idx on public.leads (phone_key);

alter table public.api_usage drop constraint api_usage_kind_check;
alter table public.api_usage add constraint api_usage_kind_check check (kind in ('command','search','transcribe','website_check','import'));

-- ============ Learning loop ============
-- Every mistake the owner reports is kept, and turned into a rule so it is not repeated.
create table public.lead_feedback (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  lead_id uuid references public.leads(id) on delete set null,
  lead_name text not null,
  reason text not null check (reason in ('has_website','closed','chain','wrong_details','not_target','duplicate')),
  note text
);

create table public.lessons (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  kind text not null check (kind in ('skip_phone','skip_name','skip_place')),
  value text not null,
  reason text not null,
  example text,
  times_applied int not null default 0,
  unique (kind, value)
);

alter table public.lead_feedback enable row level security;
alter table public.lessons enable row level security;
revoke all on public.lead_feedback, public.lessons from anon;
create policy owner_all_feedback on public.lead_feedback for all to authenticated using ((select private.is_owner())) with check ((select private.is_owner()));
create policy owner_all_lessons on public.lessons for all to authenticated using ((select private.is_owner())) with check ((select private.is_owner()));

-- Count how often each lesson stopped a repeat mistake (shown in Settings).
create or replace function public.bump_lessons(p_ids uuid[]) returns void
language sql security invoker set search_path = '' as $$
  update public.lessons set times_applied = times_applied + 1 where id = any(p_ids);
$$;
revoke all on function public.bump_lessons(uuid[]) from public, anon;
grant execute on function public.bump_lessons(uuid[]) to authenticated;
