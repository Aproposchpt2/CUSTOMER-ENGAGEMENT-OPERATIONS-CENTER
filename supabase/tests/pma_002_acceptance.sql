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
update public.pm_properties set accepts_inquiries=true where id='40000000-0000-4000-8000-000000000001';
insert into public.ai4cc_knowledge_entries(tenant_id,property_id,title,content,visibility,approved,publication_state,source_status,effective_at,expires_at) values
('20000000-0000-4000-8000-000000000001','40000000-0000-4000-8000-000000000001','eligibilitygood','eligibilitygood answer','public',true,'published','VERIFIED',null,null),
('20000000-0000-4000-8000-000000000001','40000000-0000-4000-8000-000000000001','eligibilitydraft','eligibilitydraft answer','public',true,'draft','VERIFIED',null,null),
('20000000-0000-4000-8000-000000000001','40000000-0000-4000-8000-000000000001','eligibilityproposed','eligibilityproposed answer','public',true,'published','PROPOSED',null,null),
('20000000-0000-4000-8000-000000000001','40000000-0000-4000-8000-000000000001','eligibilityfuture','eligibilityfuture answer','public',true,'published','VERIFIED','2099-01-01',null),
('20000000-0000-4000-8000-000000000001','40000000-0000-4000-8000-000000000001','eligibilityexpired','eligibilityexpired answer','public',true,'published','VERIFIED',null,'2000-01-01');
set local role service_role;
do $$declare x jsonb;begin
 x=public.pm_public_voice_knowledge_v1('20000000-0000-4000-8000-000000000001','40000000-0000-4000-8000-000000000001');
 if jsonb_array_length(x)<>1 or x->0->>'title'<>'eligibilitygood' then raise exception 'T11 preload eligibility failed';end if;
end $$;
reset role;
set local role authenticated;
select set_config('request.jwt.claims','{"sub":"10000000-0000-4000-8000-000000000001","role":"authenticated"}',true);
do $$declare x jsonb;n text;begin
 foreach n in array array['draft','proposed','future','expired'] loop
  x=private.pm_knowledge_answer('20000000-0000-4000-8000-000000000001','40000000-0000-4000-8000-000000000001','30000000-0000-4000-8000-000000000001',null,'eligibility'||n);
  if x->>'requiresHumanReview'<>'true' or x?'knowledgeId' then raise exception 'T11 transactional eligibility failed: %',n;end if;
 end loop;
 x=public.pm_available_properties();
 if x::text like '%eligibilitydraft%' or x::text like '%eligibilityproposed%' or x::text like '%eligibilityfuture%' or x::text like '%eligibilityexpired%' then raise exception 'T11 public listing eligibility failed';end if;
end $$;
do $$declare a jsonb;b jsonb;begin
 a=public.pm_list_tour_slots_v1('20000000-0000-4000-8000-000000000001','40000000-0000-4000-8000-000000000001','2099-01-01','2099-01-02');
 if a->>'mode'<>'REQUESTED_ONLY' or jsonb_array_length(a->'slots')<>0 then raise exception 'T03 disabled slot source failed';end if;
 a=public.pm_request_or_book_showing_v1('20000000-0000-4000-8000-000000000001','40000000-0000-4000-8000-000000000001','30000000-0000-4000-8000-000000000001',null,'pma002-request-replay','2099-01-01T17:00:00Z','First phrasing');
 b=public.pm_request_or_book_showing_v1('20000000-0000-4000-8000-000000000001','40000000-0000-4000-8000-000000000001','30000000-0000-4000-8000-000000000001',null,'pma002-request-replay','2099-01-01T17:00:00Z','Rephrased retry');
 if a->>'status'<>'REQUESTED' or a->>'bookingConfirmed'<>'false' or a->>'showingId'<>b->>'showingId' or b->>'replayed'<>'true' then raise exception 'T04 requested replay failed';end if;
end $$;
select set_config('request.jwt.claims','{"sub":"10000000-0000-4000-8000-000000000004","role":"authenticated"}',true);
do $$declare a jsonb;b jsonb;details jsonb;begin
 details='{"category":"common_area","description":"Hall light broken","impact":"Dark shared hallway","urgency":"high","safetyIndicators":[],"confirmed":true}'::jsonb;
 a=public.pm_submit_maintenance_v1('20000000-0000-4000-8000-000000000001','40000000-0000-4000-8000-000000000001','30000000-0000-4000-8000-000000000001',null,'pma002-maintenance','chat',details);
 b=public.pm_submit_maintenance_v1('20000000-0000-4000-8000-000000000001','40000000-0000-4000-8000-000000000001','30000000-0000-4000-8000-000000000001',null,'pma002-maintenance','chat',details);
 if a->>'requestId'<>b->>'requestId' or b->>'replayed'<>'true' or a->>'notificationSent'<>'false' or a->>'notificationState'<>'QUEUED_SIMULATED' or a->>'notificationTaskId' is null then raise exception 'T08/T10/T14 intake/recovery/notification failed';end if;
 if not exists(select 1 from public.pm_maintenance_requests where id=(a->>'requestId')::uuid and intake_details->>'impact'='Dark shared hallway' and unit_id is null) then raise exception 'T08 impact/common-area preservation failed';end if;
end $$;
reset role;
insert into public.ai4cc_interactions(id,tenant_id,channel,direction,external_id,customer_identifier,status,metadata)values('a0000000-0000-4000-8000-000000000001','20000000-0000-4000-8000-000000000001','voice','inbound','pma002-prospect-fixture','fixture','active','{"synthetic":true,"voice_demo":true,"property_id":"40000000-0000-4000-8000-000000000001","call_sid":"CA00000000000000000000000000000001","selected_route":"property-management-assistant"}');
set local role service_role;
do $$declare a jsonb;b jsonb;begin
 a=public.pm_capture_prospect_v1('20000000-0000-4000-8000-000000000001','40000000-0000-4000-8000-000000000001','a0000000-0000-4000-8000-000000000001','CA00000000000000000000000000000001','pma002-prospect','{"name":"Synthetic Person","email":" PERSON@EXAMPLE.INVALID ","consent":false,"confirmed":true}');
 if a->>'status'<>'CONSENT_REQUIRED' or a->>'persisted'<>'false' then raise exception 'T06 denied consent persisted';end if;
 a=public.pm_capture_prospect_v1('20000000-0000-4000-8000-000000000001','40000000-0000-4000-8000-000000000001','a0000000-0000-4000-8000-000000000001','CA00000000000000000000000000000001','pma002-prospect','{"name":"Synthetic Person","email":" PERSON@EXAMPLE.INVALID ","consent":true,"confirmed":true}');
 b=public.pm_capture_prospect_v1('20000000-0000-4000-8000-000000000001','40000000-0000-4000-8000-000000000001','a0000000-0000-4000-8000-000000000001','CA00000000000000000000000000000001','pma002-prospect','{"name":"Synthetic Person","email":" PERSON@EXAMPLE.INVALID ","consent":true,"confirmed":true}');
 if a->>'contactId'<>b->>'contactId' or b->>'replayed'<>'true' or a->>'contactId'='30000000-0000-4000-8000-000000000001' then raise exception 'T06 capture identity/replay failed';end if;
end $$;
reset role;
select 'PASS: PMA-002 T03/T04/T06/T08/T10/T11/T14 live staging regression; fixtures rolled back' as result;
rollback;
