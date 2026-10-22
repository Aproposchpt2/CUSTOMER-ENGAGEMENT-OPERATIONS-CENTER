-- Synthetic security and workflow acceptance; everything is rolled back.
begin;
select set_config('request.jwt.claims','{}',true);
insert into auth.users(id,email) values
 ('10000000-0000-4000-8000-000000000001','pma-owner-a@example.invalid'),
 ('10000000-0000-4000-8000-000000000002','pma-owner-b@example.invalid'),
 ('10000000-0000-4000-8000-000000000003','pma-staff@example.invalid'),
 ('10000000-0000-4000-8000-000000000004','pma-resident@example.invalid'),
 ('10000000-0000-4000-8000-000000000005','pma-vendor@example.invalid'),
 ('10000000-0000-4000-8000-000000000006','pma-prospect@example.invalid');
update auth.users set email_confirmed_at=now() where email like 'pma-%@example.invalid';
insert into public.tenants(id,business_name,tenant_slug,status) values
 ('20000000-0000-4000-8000-000000000001','Synthetic PMA A','pma-synthetic-a','ACTIVE'),
 ('20000000-0000-4000-8000-000000000002','Synthetic PMA B','pma-synthetic-b','ACTIVE');
insert into public.tenant_users(tenant_id,user_id,role,status) values
 ('20000000-0000-4000-8000-000000000001','10000000-0000-4000-8000-000000000001','OWNER','ACTIVE'),
 ('20000000-0000-4000-8000-000000000002','10000000-0000-4000-8000-000000000002','OWNER','ACTIVE'),
 ('20000000-0000-4000-8000-000000000001','10000000-0000-4000-8000-000000000003','AGENT','ACTIVE');
insert into public.ai4cc_contacts(id,tenant_id,display_name) values
 ('30000000-0000-4000-8000-000000000001','20000000-0000-4000-8000-000000000001','Synthetic Resident'),
 ('30000000-0000-4000-8000-000000000002','20000000-0000-4000-8000-000000000001','Synthetic Vendor'),
 ('30000000-0000-4000-8000-000000000003','20000000-0000-4000-8000-000000000002','Synthetic B');
insert into public.pm_properties(id,tenant_id,name) values
 ('40000000-0000-4000-8000-000000000001','20000000-0000-4000-8000-000000000001','Synthetic A1'),
 ('40000000-0000-4000-8000-000000000002','20000000-0000-4000-8000-000000000001','Synthetic A2'),
 ('40000000-0000-4000-8000-000000000003','20000000-0000-4000-8000-000000000002','Synthetic B1');
insert into public.pm_property_staff(tenant_id,property_id,user_id,can_write) values
 ('20000000-0000-4000-8000-000000000001','40000000-0000-4000-8000-000000000001','10000000-0000-4000-8000-000000000003',true);
insert into public.pm_units(id,tenant_id,property_id,label) values
 ('50000000-0000-4000-8000-000000000001','20000000-0000-4000-8000-000000000001','40000000-0000-4000-8000-000000000001','1'),
 ('50000000-0000-4000-8000-000000000002','20000000-0000-4000-8000-000000000001','40000000-0000-4000-8000-000000000002','2');
insert into public.pm_occupancies(tenant_id,property_id,unit_id,contact_id,auth_user_id) values
 ('20000000-0000-4000-8000-000000000001','40000000-0000-4000-8000-000000000001','50000000-0000-4000-8000-000000000001','30000000-0000-4000-8000-000000000001','10000000-0000-4000-8000-000000000004');
insert into public.pm_vendors(id,tenant_id,contact_id,auth_user_id,trade) values
 ('60000000-0000-4000-8000-000000000001','20000000-0000-4000-8000-000000000001','30000000-0000-4000-8000-000000000002','10000000-0000-4000-8000-000000000005','HVAC');
insert into public.pm_property_vendors(tenant_id,property_id,vendor_id) values
 ('20000000-0000-4000-8000-000000000001','40000000-0000-4000-8000-000000000001','60000000-0000-4000-8000-000000000001');

update public.ai4cc_contacts set phone='+12025550199' where tenant_id='20000000-0000-4000-8000-000000000001';
update public.pm_properties set accepts_inquiries=true where id='40000000-0000-4000-8000-000000000001';
insert into public.pm_units(tenant_id,property_id,label,bedrooms,status)values('20000000-0000-4000-8000-000000000001','40000000-0000-4000-8000-000000000001','Catalog synthetic vacancy',2,'vacant');
insert into public.pm_maintenance_requests(id,tenant_id,property_id,unit_id,contact_id,summary,idempotency_key)values('70000000-0000-4000-8000-000000000010','20000000-0000-4000-8000-000000000001','40000000-0000-4000-8000-000000000001','50000000-0000-4000-8000-000000000001','30000000-0000-4000-8000-000000000001','Catalog synthetic fixture','catalog-live-fixture');
set local role authenticated;
select set_config('request.jwt.claims','{"sub":"10000000-0000-4000-8000-000000000001","role":"authenticated"}',true);
select public.pm_assign_vendor('20000000-0000-4000-8000-000000000001','40000000-0000-4000-8000-000000000001','70000000-0000-4000-8000-000000000010','60000000-0000-4000-8000-000000000001');
do $$
declare def jsonb;d jsonb;r jsonb;f text;w jsonb;aid uuid;ver integer;cid uuid;uid uuid;n integer=0;
 t uuid='20000000-0000-4000-8000-000000000001';p uuid='40000000-0000-4000-8000-000000000001';
begin
 select id into aid from public.pm_vendor_assignments where tenant_id=t and request_id='70000000-0000-4000-8000-000000000010';
 for def in select value from jsonb_array_elements(private.pm_catalog_config()->'intents') loop
  perform set_config('request.jwt.claims','{"sub":"10000000-0000-4000-8000-000000000001","role":"authenticated"}',true);
  cid='30000000-0000-4000-8000-000000000001';uid='50000000-0000-4000-8000-000000000001';w='{}';
  if def->>'action' in ('vendor_response','vendor_status') then
   perform set_config('request.jwt.claims','{"sub":"10000000-0000-4000-8000-000000000005","role":"authenticated"}',true);
   cid='30000000-0000-4000-8000-000000000002';uid=null;
   w=jsonb_build_object('assignmentId',aid,'response','accepted','status','in_progress');
  elsif def->>'action'='owner_override' then
   select version into ver from public.pm_maintenance_requests where id='70000000-0000-4000-8000-000000000010';
   w=jsonb_build_object('action','priority','requestId','70000000-0000-4000-8000-000000000010','version',ver,'priority','high');
  end if;
  d=jsonb_build_object('intent',def->>'intent','confidence',0.94,'confidence_source','synthetic_catalog_test','entities',jsonb_build_object('topic','Synthetic policy question','description','Synthetic reported issue','category','plumbing','impact','Reported impact','safety_indicators','[]'::jsonb,'bedrooms',2,'move_date','2099-01-01','notes','Synthetic vendor update','response','accepted','vendor_status','in_progress','followup_requested',false));
  r=public.pm_catalog_turn(t,p,cid,uid,'live-catalog-'||(def->>'id'),'chat',def->'examples'->>0,d,true,now()+interval '1 day','70000000-0000-4000-8000-000000000010',w);
  if r->>'intent'<>def->>'intent' or r->>'persisted'<>'true' or r->>'workflow_action' in ('clarify','authorization_required') then raise exception 'Catalog route failed: % -> %',def->>'intent',r;end if;
  for f in select jsonb_array_elements_text(private.pm_catalog_config()->'canonicalFields') loop if not r?f then raise exception 'Missing canonical field %',f;end if;end loop;
  if (def->>'safety')::boolean and (r->>'safety_override'<>'true' or r->>'priority'<>'emergency' or r->>'emergencyServicesContacted'<>'false') then raise exception 'Safety route failed';end if;
  n=n+1;
 end loop;
 if n<>25 then raise exception 'Catalog count mismatch';end if;
 perform set_config('request.jwt.claims','{"sub":"10000000-0000-4000-8000-000000000001","role":"authenticated"}',true);
 d=jsonb_build_object('intent','MAINTENANCE_REQUEST','confidence',0.7,'entities',jsonb_build_object('category','plumbing','impact','Leaking','safety_indicators','[]'::jsonb));
 r=public.pm_catalog_turn(t,p,'30000000-0000-4000-8000-000000000001','50000000-0000-4000-8000-000000000001','live-catalog-medium','chat','Routine maintenance question',d,true);
 if r->>'workflow_action'<>'clarify' or r?'requestId' then raise exception 'Confidence gate failed';end if;
 d=jsonb_build_object('intent','GENERAL_GREETING','confidence',0.1,'entities','{}'::jsonb);
 r=public.pm_catalog_turn(t,null,null,null,'live-catalog-safety','chat','I smell gas',d,false);
 if r->>'intent'<>'SUSPECTED_GAS_LEAK' or r->>'safety_override'<>'true' or not r?'followupTaskId' then raise exception 'Emergency override failed';end if;
 begin
  perform public.pm_catalog_turn('20000000-0000-4000-8000-000000000002','40000000-0000-4000-8000-000000000003',null,null,'live-catalog-cross-owner','chat','Hello',jsonb_build_object('intent','GENERAL_GREETING','confidence',1,'entities','{}'::jsonb));
  raise exception 'Cross owner allowed';
 exception when insufficient_privilege then null;end;
 if (select count(*) from public.audit_log where tenant_id=t and action='pma.intent.routed')<27 then raise exception 'Missing catalog audit';end if;
end $$;
reset role;
select 'PASS: all 25 catalog routes, canonical fields, confidence gate, emergency override, owner/vendor authority, cross-owner denial and audit; synthetic fixtures rolled back' as result;
rollback;
