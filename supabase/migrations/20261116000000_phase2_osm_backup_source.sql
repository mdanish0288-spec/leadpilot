-- Where each lead's data came from. OpenStreetMap leads have no ratings/reviews/photos and
-- their "no website" status must be verified by the owner before any contact.
alter table public.leads add column data_source text not null default 'google' check (data_source in ('google','openstreetmap'));
alter table public.leads add column needs_verification boolean not null default false;
alter table public.searches add column source text not null default 'google' check (source in ('google','openstreetmap'));
alter table public.searches add column fallback_reason text;
