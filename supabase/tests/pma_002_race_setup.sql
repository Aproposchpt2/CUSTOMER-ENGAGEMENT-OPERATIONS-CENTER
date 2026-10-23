begin;
select set_config('request.jwt.claims','{}',true);
insert into auth.users(id,email)values('10000000-0000-4000-8000-000000000001','pma002-race@example.invalid');
insert into public.tenants(id,business_name,tenant_slug,status)values('20000000-0000-4000-8000-000000000001','Synthetic PMA002 concurrency','pma002-race','ACTIVE');
insert into public.tenant_users(tenant_id,user_id,role,status)values('20000000-0000-4000-8000-000000000001','10000000-0000-4000-8000-000000000001','OWNER','ACTIVE');
insert into public.ai4cc_contacts(id,tenant_id,display_name)values('30000000-0000-4000-8000-000000000001','20000000-0000-4000-8000-000000000001','Synthetic race prospect');
insert into public.pm_properties(id,tenant_id,name,accepts_inquiries,metadata,timezone)values('40000000-0000-4000-8000-000000000001','20000000-0000-4000-8000-000000000001','Synthetic race fixture',true,'{"pma_synthetic_tours":true}','America/Los_Angeles');
insert into private.pm_tour_slots_v1(id,tenant_id,property_id,starts_at,ends_at,timezone,capacity,source_ref)values('90000000-0000-4000-8000-000000000001','20000000-0000-4000-8000-000000000001','40000000-0000-4000-8000-000000000001','2099-10-25T17:00:00Z','2099-10-25T17:30:00Z','America/Los_Angeles',1,'fixture-race-calendar');
commit;
