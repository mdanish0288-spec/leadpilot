-- Batch helpers. SECURITY INVOKER: they run as the signed-in owner, so RLS (owner + 2FA) still applies.
create or replace function public.set_sheet_rows(p_rows jsonb) returns int
language sql security invoker set search_path = '' as $$
  with u as (
    update public.leads l set sheet_row = (x->>'row')::int, sheet_synced_at = now()
    from jsonb_array_elements(p_rows) x
    where l.id = (x->>'id')::uuid
    returning 1)
  select count(*)::int from u;
$$;

create or replace function public.apply_website_checks(p_checks jsonb) returns int
language sql security invoker set search_path = '' as $$
  with u as (
    update public.leads l set
      website_status = x->>'website_status',
      website_issues = coalesce(array(select jsonb_array_elements_text(x->'website_issues')), '{}'),
      lead_type = x->>'lead_type',
      email = coalesce(l.email, nullif(x->>'email', '')),
      instagram = coalesce(l.instagram, nullif(x->>'instagram', ''))
    from jsonb_array_elements(p_checks) x
    where l.id = (x->>'id')::uuid and l.website_status = 'pending'
    returning 1)
  select count(*)::int from u;
$$;

revoke all on function public.set_sheet_rows(jsonb), public.apply_website_checks(jsonb) from public, anon;
grant execute on function public.set_sheet_rows(jsonb), public.apply_website_checks(jsonb) to authenticated;
