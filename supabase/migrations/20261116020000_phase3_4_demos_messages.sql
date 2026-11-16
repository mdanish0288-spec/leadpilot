alter table public.leads add column services text[] not null default '{}';
alter table public.leads add column demo_slug text unique check (demo_slug is null or demo_slug ~ '^[a-z0-9-]{3,80}$');
alter table public.leads add column demo_theme text;
create table public.messages (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  lead_id uuid not null references public.leads(id) on delete cascade,
  channel text not null check (channel in ('whatsapp','email','instagram','call','other')),
  direction text not null check (direction in ('out','in')),
  body text not null,
  checks jsonb not null default '[]',
  status text not null default 'logged'
);
create index messages_lead_idx on public.messages (lead_id, created_at);
alter table public.messages enable row level security;
revoke all on public.messages from anon;
create policy owner_all_messages on public.messages for all to authenticated using ((select private.is_owner())) with check ((select private.is_owner()));
alter table public.api_usage drop constraint api_usage_kind_check;
alter table public.api_usage add constraint api_usage_kind_check check (kind in ('command','search','transcribe','website_check','import','reply'));
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('demos', 'demos', true, 1048576, array['text/html','text/plain']) on conflict (id) do nothing;
create policy demos_owner_insert on storage.objects for insert to authenticated with check (bucket_id = 'demos' and (select private.is_owner()));
create policy demos_owner_update on storage.objects for update to authenticated using (bucket_id = 'demos' and (select private.is_owner()));
create policy demos_owner_delete on storage.objects for delete to authenticated using (bucket_id = 'demos' and (select private.is_owner()));
create policy demos_owner_select on storage.objects for select to authenticated using (bucket_id = 'demos' and (select private.is_owner()));
