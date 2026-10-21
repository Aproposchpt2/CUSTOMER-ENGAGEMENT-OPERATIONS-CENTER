begin;
create or replace function public.pm_dashboard_counts(t uuid) returns jsonb language sql stable security invoker set search_path='' as $$
 select jsonb_build_object(
 'Properties',(select count(*) from public.pm_properties where tenant_id=t),
 'Units',(select count(*) from public.pm_units where tenant_id=t),
 'Open Requests',(select count(*) from public.pm_maintenance_requests where tenant_id=t and status not in ('Completed','Closed')),
 'Emergency Requests',(select count(*) from public.pm_maintenance_requests where tenant_id=t and priority='emergency' and status not in ('Completed','Closed')),
 'Vendor Assignments',(select count(*) from public.pm_vendor_assignments where tenant_id=t and status in ('assigned','accepted')),
 'Leads',(select count(distinct lead_id) from public.pm_showings where tenant_id=t),
 'Showings',(select count(*) from public.pm_showings where tenant_id=t and status in ('requested','confirmed')),
 'Communications',(select count(*) from public.ai4cc_interactions i where i.tenant_id=t and i.metadata->>'source'='pma'
 and exists(select 1 from public.pm_properties p where p.tenant_id=t and p.id::text=i.metadata->>'property_id' and private.pm_staff(t,p.id)))
 );
$$;
revoke all on function public.pm_dashboard_counts(uuid) from public,anon;
grant execute on function public.pm_dashboard_counts(uuid) to authenticated;
commit;
