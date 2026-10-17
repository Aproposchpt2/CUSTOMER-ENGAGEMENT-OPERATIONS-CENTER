-- Grant read access on stellar_support_cases so the dashboard service-role
-- client can query it. The table was created directly (no prior migration),
-- so standard PostgREST grants were never applied.
grant select on table public.stellar_support_cases to service_role, authenticated;

-- RLS policy: tenant admins can read their own tenant's cases via the contact FK.
alter table public.stellar_support_cases enable row level security;

create policy "tenant_members_read_cases"
  on public.stellar_support_cases
  for select
  using (
    contact_id in (
      select id from public.ai4cc_contacts c
      where c.tenant_id in (
        select tenant_id from public.tenant_users
        where user_id = auth.uid() and status = 'ACTIVE'
      )
    )
  );
