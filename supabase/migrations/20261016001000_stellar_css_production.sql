-- Gate 5: Production migration for Stellar CSS (Customer Support System)
-- Creates stellar_support_cases table and intake RPC on production.
-- Mirrors the table created directly on staging during the POC.

create table if not exists public.stellar_support_cases (
  case_id       uuid primary key default gen_random_uuid(),
  contact_id    uuid not null references public.ai4cc_contacts(id) on delete cascade,
  session_id    text,
  product       text,
  purchase_date text,
  issue         text,
  steps         text,
  impact        text,
  priority      text not null default 'NORMAL',
  created_at    timestamptz not null default now()
);

create index if not exists stellar_support_cases_contact_id_idx
  on public.stellar_support_cases(contact_id);

create index if not exists stellar_support_cases_created_at_idx
  on public.stellar_support_cases(created_at desc);

-- PostgREST grants
grant select, insert on table public.stellar_support_cases to service_role, authenticated;

-- RLS
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

-- Production intake function (upserts contact, inserts case, returns IDs)
create or replace function public.stellar_create_support_intake(
  p_tenant_id    uuid,
  p_session_id   text,
  p_name         text,
  p_email        text,
  p_phone        text,
  p_product      text,
  p_purchase_date text,
  p_issue        text,
  p_steps        text,
  p_impact       text,
  p_priority     text
)
returns table (customer_id uuid, case_id uuid, created_new boolean)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_contact_id uuid;
  v_case_id    uuid;
  v_created    boolean := false;
begin
  -- Find existing contact for this tenant by email or phone
  select id into v_contact_id
  from ai4cc_contacts
  where tenant_id = p_tenant_id
    and (
      (p_email <> '' and email = p_email)
      or (p_phone <> '' and phone = p_phone)
    )
  limit 1;

  -- Create contact if none found
  if v_contact_id is null then
    insert into ai4cc_contacts (tenant_id, display_name, email, phone)
    values (
      p_tenant_id,
      p_name,
      nullif(p_email, ''),
      nullif(p_phone, '')
    )
    returning id into v_contact_id;
    v_created := true;
  end if;

  -- Insert support case
  insert into stellar_support_cases (
    contact_id, session_id, product, purchase_date,
    issue, steps, impact, priority
  ) values (
    v_contact_id,
    nullif(p_session_id, ''),
    nullif(p_product, ''),
    nullif(p_purchase_date, ''),
    p_issue,
    nullif(p_steps, ''),
    nullif(p_impact, ''),
    p_priority
  )
  returning stellar_support_cases.case_id into v_case_id;

  return query select v_contact_id, v_case_id, v_created;
end;
$$;

grant execute on function public.stellar_create_support_intake to authenticated, service_role;
