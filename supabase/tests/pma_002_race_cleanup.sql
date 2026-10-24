begin;
select set_config('request.jwt.claims','{}',true);
do $$begin
 if not exists(select 1 from public.tenants where id='20000000-0000-4000-8000-000000000001' and tenant_slug='pma002-race' and business_name='Synthetic PMA002 concurrency') then raise exception 'Synthetic cleanup guard rejected';end if;
 if (select count(*) from private.pm_tour_operations_v1 where tenant_id='20000000-0000-4000-8000-000000000001')<>1 or (select count(*) from public.pm_showings where tenant_id='20000000-0000-4000-8000-000000000001')<>1 then raise exception 'Capacity-one concurrency failed';end if;
end $$;
delete from private.pm_tour_operations_v1 where tenant_id='20000000-0000-4000-8000-000000000001';
delete from private.pm_tour_slots_v1 where tenant_id='20000000-0000-4000-8000-000000000001';
delete from public.pm_showings where tenant_id='20000000-0000-4000-8000-000000000001';
delete from public.ai4cc_leads where tenant_id='20000000-0000-4000-8000-000000000001';
delete from public.pm_properties where tenant_id='20000000-0000-4000-8000-000000000001';
delete from public.ai4cc_contacts where tenant_id='20000000-0000-4000-8000-000000000001';
delete from public.tenant_users where tenant_id='20000000-0000-4000-8000-000000000001';
delete from public.audit_log where tenant_id='20000000-0000-4000-8000-000000000001';
delete from public.tenants where id='20000000-0000-4000-8000-000000000001' and tenant_slug='pma002-race';
delete from auth.users where id='10000000-0000-4000-8000-000000000001' and email='pma002-race@example.invalid';
select 'PASS: exactly one reservation/showing; guarded synthetic concurrency fixtures removed' as result;
commit;
