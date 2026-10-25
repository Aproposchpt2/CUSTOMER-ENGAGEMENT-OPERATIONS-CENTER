-- HVAC demo support intake RPC for Summit Comfort Heating & Air staging demo.
-- Locked to the Summit Comfort demo tenant by UUID + live metadata verification.
-- test_only=true and notifications_disabled=true are enforced at the DB level.
-- No real customer, vendor, owner or technician notifications are triggered.

create or replace function public.stellar_create_hvac_demo_support_intake(
  p_tenant_id     uuid,
  p_session_id    text,
  p_name          text,
  p_email         text,
  p_phone         text,
  p_product       text,
  p_purchase_date date,
  p_issue         text,
  p_steps         text,
  p_impact        text,
  p_priority      text
)
returns table (customer_id uuid, case_id uuid, created_new boolean)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_contact         uuid;
  v_case            uuid;
  v_tenant_ok       boolean;
begin
  -- Service role authorization: only the staging bridge may call this.
  if current_user <> 'service_role' then
    raise exception 'Not authorized for HVAC demo support' using errcode='42501';
  end if;
  -- Tenant authorization: explicitly authorized UUID + live metadata verification.
  -- Fails closed if the tenant record is missing or misconfigured.
  select
    t.id = 'd7e80001-0000-4000-b000-000000000001'
    and t.status = 'ACTIVE'
    and (t.metadata->>'demo')::boolean is true
    and (t.metadata->>'test_only')::boolean is true
    and (t.metadata->>'notifications_disabled')::boolean is true
  into v_tenant_ok
  from public.tenants t
  where t.id = p_tenant_id
    and t.id = 'd7e80001-0000-4000-b000-000000000001';
  if v_tenant_ok is null or not v_tenant_ok then
    raise exception 'Not authorized for HVAC demo support' using errcode='42501';
  end if;
  -- Input validation mirrors stellar_create_phone_support_test_intake.
  if p_session_id is null or p_session_id !~ '^phone-staging:CA[0-9a-fA-F]{32}$' or
     length(trim(coalesce(p_name,''))) not between 2 and 150 or
     length(trim(coalesce(p_product,''))) not between 2 and 160 or
     length(trim(coalesce(p_issue,''))) not between 10 and 2000 or
     length(coalesce(p_email,''))>254 or length(coalesce(p_phone,''))>40 or
     length(coalesce(p_steps,''))>2000 or length(coalesce(p_impact,''))>2000 or
     (nullif(trim(coalesce(p_email,'')),'') is null and nullif(trim(coalesce(p_phone,'')),'') is null) or
     p_purchase_date is null or p_priority is null or
     p_priority not in ('LOW','NORMAL','HIGH','URGENT') then
    raise exception 'Invalid HVAC demo support intake' using errcode='22023';
  end if;
  -- Serialize test writes per tenant to prevent duplicate contacts on concurrent calls.
  perform pg_advisory_xact_lock(hashtextextended(p_tenant_id::text, 0));
  -- Idempotency: return existing case for this session.
  select id, contact_id into v_case, v_contact
  from public.stellar_support_cases
  where tenant_id = p_tenant_id and intake_session_id = p_session_id and test_only = true;
  if v_case is not null then return query select v_contact, v_case, false; return; end if;
  -- Reuse existing test contact if found by email or phone.
  select id into v_contact
  from public.ai4cc_contacts
  where tenant_id = p_tenant_id and metadata->>'test_only' = 'true'
    and (
      (nullif(trim(coalesce(p_email,'')),'') is not null and lower(email) = lower(trim(p_email)))
      or (nullif(trim(coalesce(p_phone,'')),'') is not null and phone = trim(p_phone))
    )
  order by created_at limit 1;
  if v_contact is null then
    insert into public.ai4cc_contacts(tenant_id, display_name, email, phone, lead_source, metadata)
    values(
      p_tenant_id,
      trim(p_name),
      nullif(trim(p_email), ''),
      nullif(trim(p_phone), ''),
      'hvac_support_desk_test',
      jsonb_build_object('test_only', true, 'source', 'phone_staging_hvac_demo', 'notifications_disabled', true)
    )
    returning id into v_contact;
  end if;
  insert into public.stellar_support_cases(
    tenant_id, contact_id, source, product_name, purchase_date,
    issue_summary, troubleshooting_attempted, business_impact,
    priority, intake_session_id, test_only
  ) values(
    p_tenant_id, v_contact, 'hvac_voice_test', trim(p_product),
    p_purchase_date, trim(p_issue), nullif(trim(p_steps), ''),
    nullif(trim(p_impact), ''), p_priority, p_session_id, true
  ) returning id into v_case;
  return query select v_contact, v_case, true;
end;
$$;

-- Only the service role (used by the staging bridge) may call this function.
grant execute on function public.stellar_create_hvac_demo_support_intake to service_role;
