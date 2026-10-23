begin;
-- Public prospect listing is also an answer surface; use the same eligibility gate.
create or replace function private.pm_available_properties() returns jsonb language sql stable security definer set search_path='' as $$
 select case when auth.uid() is null then '[]'::jsonb else coalesce(jsonb_agg(jsonb_build_object('id',p.id,'name',p.name,'amenities',p.amenities,
 'availabilityRequiresConfirmation',true,'knowledge',(select coalesce(jsonb_agg(jsonb_build_object('id',k.id,'version',k.version_num,'title',k.title,'content',k.content)),'[]'::jsonb) from public.ai4cc_knowledge_entries k where k.property_id=p.id and k.unit_id is null and private.pm_knowledge_eligible_v1(k,p.tenant_id,p.id,null,false,now())))),'[]'::jsonb) end
 from public.pm_properties p join public.tenants w on w.id=p.tenant_id where p.accepts_inquiries and p.status='active' and w.status='ACTIVE';
$$;
commit;
