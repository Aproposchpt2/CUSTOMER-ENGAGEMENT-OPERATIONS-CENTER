-- Synthetic security and workflow acceptance; everything is rolled back.
begin;
insert into auth.users(id,email) values
 ('10000000-0000-4000-8000-000000000001','pma-owner-a@example.invalid'),
 ('10000000-0000-4000-8000-000000000002','pma-owner-b@example.invalid'),
 ('10000000-0000-4000-8000-000000000003','pma-staff@example.invalid'),
 ('10000000-0000-4000-8000-000000000004','pma-resident@example.invalid'),
 ('10000000-0000-4000-8000-000000000005','pma-vendor@example.invalid');
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
 ('50000000-0000-4000-8000-000000000001','20000000-0000-4000-8000-000000000001','40000000-0000-4000-8000-000000000001','1');
insert into public.pm_occupancies(tenant_id,property_id,unit_id,contact_id,auth_user_id) values
 ('20000000-0000-4000-8000-000000000001','40000000-0000-4000-8000-000000000001','50000000-0000-4000-8000-000000000001','30000000-0000-4000-8000-000000000001','10000000-0000-4000-8000-000000000004');
insert into public.pm_vendors(id,tenant_id,contact_id,auth_user_id,trade) values
 ('60000000-0000-4000-8000-000000000001','20000000-0000-4000-8000-000000000001','30000000-0000-4000-8000-000000000002','10000000-0000-4000-8000-000000000005','HVAC');
insert into public.pm_property_vendors(tenant_id,property_id,vendor_id) values
 ('20000000-0000-4000-8000-000000000001','40000000-0000-4000-8000-000000000001','60000000-0000-4000-8000-000000000001');
set local role authenticated;
select set_config('request.jwt.claims','{"sub":"10000000-0000-4000-8000-000000000001","role":"authenticated"}',true);
do $$ begin
 if (select count(*) from public.pm_properties)<>2 then raise exception 'Owner isolation failed'; end if;
 begin
 insert into public.pm_properties(tenant_id,name) values('20000000-0000-4000-8000-000000000002','Unauthorized');
 raise exception 'Cross-tenant insert allowed'; exception when insufficient_privilege then null; end;
 if exists(select 1 from public.pm_properties where tenant_id='20000000-0000-4000-8000-000000000002') then raise exception 'Cross owner read'; end if;
 update public.pm_properties set name='Synthetic A1 changed' where id='40000000-0000-4000-8000-000000000003';
 if found then raise exception 'Cross owner update allowed'; end if;
 delete from public.pm_properties where id='40000000-0000-4000-8000-000000000003';
 if found then raise exception 'Cross owner delete allowed'; end if;
 begin
 insert into public.pm_maintenance_requests(tenant_id,property_id,contact_id,summary,idempotency_key)
 values('20000000-0000-4000-8000-000000000001','40000000-0000-4000-8000-000000000001','30000000-0000-4000-8000-000000000003','Cross tenant contact','bad-contact-key');
 raise exception 'Cross tenant relationship allowed'; exception when foreign_key_violation then null; end;
end $$;
select set_config('request.jwt.claims','{"sub":"10000000-0000-4000-8000-000000000003","role":"authenticated"}',true);
do $$ begin
 if (select count(*) from public.pm_properties)<>1 then raise exception 'Property staff isolation failed'; end if;
 begin update public.pm_property_staff set can_write=true where user_id='10000000-0000-4000-8000-000000000003';
 if found then raise exception 'Staff escalation allowed'; end if; exception when insufficient_privilege then null; end;
 begin insert into public.pm_units(tenant_id,property_id,label) values('20000000-0000-4000-8000-000000000001','40000000-0000-4000-8000-000000000002','unauthorized');
 raise exception 'Cross property write allowed'; exception when insufficient_privilege then null; end;
end $$;
select set_config('request.jwt.claims','{"sub":"10000000-0000-4000-8000-000000000004","role":"authenticated"}',true);
insert into public.pm_maintenance_requests(id,tenant_id,property_id,unit_id,contact_id,summary,idempotency_key,priority)
values('70000000-0000-4000-8000-000000000001','20000000-0000-4000-8000-000000000001','40000000-0000-4000-8000-000000000001','50000000-0000-4000-8000-000000000001','30000000-0000-4000-8000-000000000001','Synthetic no heat','synthetic-request-1','high');
do $$ begin
 if (select count(*) from public.pm_maintenance_requests)<>1 then raise exception 'Resident read failed'; end if;
 if exists(select 1 from public.ai4cc_contacts) then raise exception 'Resident sees CRM'; end if;
 update public.pm_maintenance_requests set status='Closed' where id='70000000-0000-4000-8000-000000000001';
 if found then raise exception 'Resident can close request'; end if;
end $$;
select set_config('request.jwt.claims','{"sub":"10000000-0000-4000-8000-000000000001","role":"authenticated"}',true);
select public.pm_assign_vendor('20000000-0000-4000-8000-000000000001','40000000-0000-4000-8000-000000000001','70000000-0000-4000-8000-000000000001','60000000-0000-4000-8000-000000000001');
select public.pm_assign_vendor('20000000-0000-4000-8000-000000000001','40000000-0000-4000-8000-000000000001','70000000-0000-4000-8000-000000000001','60000000-0000-4000-8000-000000000001');
do $$ begin
 if (select count(*) from public.pm_vendor_assignments)<>1 then raise exception 'Assignment replay duplicated'; end if;
 begin update public.pm_maintenance_requests set status='Closed' where id='70000000-0000-4000-8000-000000000001';
 raise exception 'Invalid transition allowed'; exception when check_violation then null; end;
end $$;
select public.pm_request_showing('20000000-0000-4000-8000-000000000001','40000000-0000-4000-8000-000000000001',null,'30000000-0000-4000-8000-000000000001',now()+interval '1 day','Synthetic showing','showing-replay-key');
select public.pm_request_showing('20000000-0000-4000-8000-000000000001','40000000-0000-4000-8000-000000000001',null,'30000000-0000-4000-8000-000000000001',now()+interval '1 day','Synthetic showing','showing-replay-key');
do $$ begin
 if (select count(*) from public.ai4cc_leads)<>1 then raise exception 'Showing replay duplicated lead'; end if;
end $$;
update public.pm_maintenance_requests set status='Scheduled',scheduled_at=now()+interval '1 day' where id='70000000-0000-4000-8000-000000000001';
update public.pm_maintenance_requests set status='In Progress' where id='70000000-0000-4000-8000-000000000001';
update public.pm_maintenance_requests set status='Completed',resolution='Synthetic repair confirmed by owner' where id='70000000-0000-4000-8000-000000000001';
update public.pm_maintenance_requests set status='Closed' where id='70000000-0000-4000-8000-000000000001';
insert into public.ai4cc_knowledge_entries(tenant_id,property_id,title,content,visibility,approved) values
 ('20000000-0000-4000-8000-000000000001','40000000-0000-4000-8000-000000000001','Resident FAQ','Synthetic policy','resident',true),
 ('20000000-0000-4000-8000-000000000001','40000000-0000-4000-8000-000000000001','Staff FAQ','Private staff policy','staff',true);
select set_config('request.jwt.claims','{"sub":"10000000-0000-4000-8000-000000000004","role":"authenticated"}',true);
do $$ begin if (select count(*) from public.ai4cc_knowledge_entries)<>1 then raise exception 'Knowledge visibility failed'; end if; end $$;
select set_config('request.jwt.claims','{"sub":"10000000-0000-4000-8000-000000000005","role":"authenticated"}',true);
do $$ declare a uuid; begin
 if (select count(*) from public.pm_vendor_assignments)<>1 then raise exception 'Vendor assigned read failed'; end if;
 select id into a from public.pm_vendor_assignments limit 1;
 perform public.pm_vendor_response(a,'accepted','Synthetic acceptance');
 perform public.pm_vendor_response(a,'completed','Synthetic completion');
 if exists(select 1 from public.ai4cc_contacts) then raise exception 'Vendor sees CRM'; end if;
end $$;
reset role;
do $$ declare t uuid; r jsonb; begin
 if not exists(select 1 from public.audit_log where tenant_id='20000000-0000-4000-8000-000000000001' and action='pma.insert') then raise exception 'Audit missing'; end if;
 select id into t from public.automation_tasks where tenant_id='20000000-0000-4000-8000-000000000001' and task_code='PMA_NOTIFICATION' limit 1;
 if t is null then raise exception 'Notification not queued'; end if;
 r=public.pm_test_notification('20000000-0000-4000-8000-000000000001',t,'10000000-0000-4000-8000-000000000001');
 if r->>'delivery_state'<>'SIMULATED' then raise exception 'Sandbox notification failed'; end if;
end $$;
select 'PASS: workspace/property isolation, role restrictions, relationships, resident/vendor scope, maintenance lifecycle, assignment/showing replay, knowledge, audit and simulated notification' as result;
rollback;
