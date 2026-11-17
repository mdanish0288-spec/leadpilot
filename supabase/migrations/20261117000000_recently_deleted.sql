-- "Recently deleted" bin for leads (like a phone's photo bin).
-- Delete = set deleted_at (hidden everywhere, restorable). After 30 days a daily job deletes it forever.
-- Clients who have paid can never be deleted. Message logs are kept even after a lead is deleted forever.

alter table public.leads add column if not exists deleted_at timestamptz;
create index if not exists leads_deleted_at_idx on public.leads (deleted_at) where deleted_at is not null;

create or replace function private.guard_delete_paid() returns trigger
language plpgsql set search_path = '' as $$
begin
  if new.deleted_at is not null and old.deleted_at is null and new.stage in ('Advance Paid', 'Fully Paid') then
    raise exception 'A client who has paid cannot be deleted.';
  end if;
  return new;
end $$;
drop trigger if exists leads_guard_delete_paid on public.leads;
create trigger leads_guard_delete_paid before update on public.leads for each row execute function private.guard_delete_paid();

create or replace function private.block_hard_delete_paid() returns trigger
language plpgsql set search_path = '' as $$
begin
  if old.stage in ('Advance Paid', 'Fully Paid') then raise exception 'A client who has paid cannot be deleted.'; end if;
  return old;
end $$;
drop trigger if exists leads_block_hard_delete_paid on public.leads;
create trigger leads_block_hard_delete_paid before delete on public.leads for each row execute function private.block_hard_delete_paid();

-- Keep the message log when a lead is deleted forever ("Log every message").
alter table public.messages alter column lead_id drop not null;
alter table public.messages drop constraint if exists messages_lead_id_fkey;
alter table public.messages add constraint messages_lead_id_fkey foreign key (lead_id) references public.leads(id) on delete set null;

-- Daily clean-up at 03:00 UTC: delete forever anything in the bin for more than 30 days.
create extension if not exists pg_cron;
select cron.unschedule(jobid) from cron.job where jobname = 'purge-deleted-leads';
select cron.schedule('purge-deleted-leads', '0 3 * * *',
  $$delete from public.leads where deleted_at < now() - interval '30 days' and stage not in ('Advance Paid', 'Fully Paid')$$);
