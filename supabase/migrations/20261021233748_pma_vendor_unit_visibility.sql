begin;
create policy pm_unit_vendor_read on public.pm_units for select to authenticated using(exists(select 1 from public.pm_maintenance_requests r where r.tenant_id=pm_units.tenant_id and r.property_id=pm_units.property_id and r.unit_id=pm_units.id and private.pm_assigned(r.tenant_id,r.id)));
commit;
