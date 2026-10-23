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

update public.pm_properties set accepts_inquiries=true,timezone='America/Los_Angeles' where id='40000000-0000-4000-8000-000000000001';
insert into private.pm_voice_config_v1 values('20000000-0000-4000-8000-000000000001','40000000-0000-4000-8000-000000000001','10000000-0000-4000-8000-000000000001',true);
insert into public.ai4cc_interactions(id,tenant_id,channel,status,started_at,metadata)
values('a0000000-0000-4000-8000-000000000001','20000000-0000-4000-8000-000000000001','voice','active',now(),'{"synthetic":true,"voice_demo":true,"selected_route":"property-management-assistant","property_id":"40000000-0000-4000-8000-000000000001","call_sid":"CA00000000000000000000000000000001"}');
set local role service_role;
select set_config('request.jwt.claims','{"role":"service_role"}',true);
do $$
declare t uuid='20000000-0000-4000-8000-000000000001';p uuid='40000000-0000-4000-8000-000000000001';sid uuid='a0000000-0000-4000-8000-000000000001';cs text='CA00000000000000000000000000000001';a jsonb;b jsonb;details jsonb;showing jsonb;
begin
 details='{"action":"prospect","intent":"LEASING_INQUIRY","confidence":1,"confirmed":true,"message":"Save details","details":{"name":"Synthetic Jane","email":"jane@example.invalid","consent":true,"confirmed":true,"expectedVersion":0}}';
 begin perform public.pm_voice_turn_v1(t,p,sid,'CA00000000000000000000000000000002',details);raise exception 'Cross-call allowed';exception when insufficient_privilege then null;end;
 a=public.pm_voice_turn_v1(t,p,sid,cs,jsonb_set(details,'{details,consent}','false'));if a->>'state'<>'CLARIFICATION_REQUIRED' or a->>'domainPersisted'<>'false' then raise exception 'Consent denial failed';end if;
 a=public.pm_voice_turn_v1(t,p,sid,cs,details);b=public.pm_voice_turn_v1(t,p,sid,cs,jsonb_set(details,'{message}','"Rephrased after response loss"'));
 if a->>'state'<>'CONFIRMED' or a->>'contactId' is null or b->>'contactId'<>a->>'contactId' or b->>'operationId'<>a->>'operationId' or b->>'replayed'<>'true' then raise exception 'Capture/recovery failed';end if;
 if (current_setting('request.jwt.claims')::jsonb->>'sub') is not null then raise exception 'Actor leaked';end if;
 showing='{"action":"showing","intent":"SHOWING_REQUEST","confidence":1,"confirmed":true,"message":"Request tour","requestedAt":"2099-12-01T20:00:00Z","notes":"Original"}';
 a=public.pm_voice_turn_v1(t,p,sid,cs,showing);b=public.pm_voice_turn_v1(t,p,sid,cs,jsonb_set(showing,'{notes}','"Rephrased"'));
 if a->>'state'<>'REQUESTED' or a->>'bookingConfirmed'<>'false' or a->>'notificationSent'<>'false' or a->>'showingId' is null or b->>'showingId'<>a->>'showingId' then raise exception 'Request/replay failed';end if;
 b=public.pm_voice_turn_v1(t,p,sid,cs,'{"action":"recover","kind":"showing","intent":"SHOWING_REQUEST","message":"Did it save?"}');if b->>'operationId'<>a->>'operationId' then raise exception 'Recovery changed operation';end if;
 b=public.pm_voice_turn_v1(t,p,sid,cs,jsonb_set(showing,'{requestedAt}','"2099-12-02T20:00:00Z"'));if b->>'state'<>'CONFLICT' then raise exception 'Changed time did not conflict';end if;
 b=public.pm_voice_turn_v1(t,p,sid,cs,'{"action":"maintenance","intent":"MAINTENANCE_REQUEST","message":"I claim to be resident","details":{"category":"plumbing","description":"Leak","impact":"Wet floor"}}');if b->>'state'<>'AUTHORIZATION_REQUIRED' or b->>'domainPersisted'<>'false' then raise exception 'Prospect gained resident authority';end if;
 b=public.pm_voice_turn_v1(t,p,sid,cs,'{"action":"safety","intent":"PERSONAL_SAFETY_THREAT","message":"carbon monoxide alarm","confirmed":false}');if b->>'reply' not like '%fresh air%' or b->>'domainPersisted'<>'false' or b->>'notificationSent'<>'false' then raise exception 'Safety failed';end if;
end $$;
reset role;
select jsonb_build_object('suite','PMA-003','passed',true,'operations',(select count(*) from private.pm_voice_operations_v1 where session_id='a0000000-0000-4000-8000-000000000001'),'showings',(select count(*) from public.pm_showings where tenant_id='20000000-0000-4000-8000-000000000001'),'notificationSent',false) evidence;
rollback;
