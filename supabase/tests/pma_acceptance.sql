-- Synthetic security and workflow acceptance; everything is rolled back.
begin;
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
select set_config('request.jwt.claims','{"sub":"10000000-0000-4000-8000-000000000001","role":"authenticated"}',true);
do $$ declare ch text; a jsonb; b jsonb; counts jsonb; begin
 foreach ch in array array['voice','sms','chat'] loop
 a=private.pm_record_channel_turn('20000000-0000-4000-8000-000000000001','40000000-0000-4000-8000-000000000001','30000000-0000-4000-8000-000000000001','50000000-0000-4000-8000-000000000001','synthetic-channel-'||ch,ch,'Synthetic leaking tap','maintenance_request','plumbing','normal');
 b=private.pm_record_channel_turn('20000000-0000-4000-8000-000000000001','40000000-0000-4000-8000-000000000001','30000000-0000-4000-8000-000000000001','50000000-0000-4000-8000-000000000001','synthetic-channel-'||ch,ch,'Synthetic leaking tap','maintenance_request','plumbing','normal');
 if a->>'requestId' is null or a->>'requestId'<>b->>'requestId' or b->>'replayed'<>'true' then raise exception 'Channel persistence/replay failed'; end if;
 end loop;
 if (select count(*) from public.ai4cc_transcripts where tenant_id='20000000-0000-4000-8000-000000000001')<>6 then raise exception 'Channel transcripts mismatch'; end if;
 counts=public.pm_dashboard_counts('20000000-0000-4000-8000-000000000001');
 if counts->>'Communications'<>'3' or counts->>'Open Requests'<>'3' then raise exception 'Dashboard reconciliation failed: %',counts; end if;
end $$;
update public.pm_properties set accepts_inquiries=true where id='40000000-0000-4000-8000-000000000002';
select set_config('request.jwt.claims','{"sub":"10000000-0000-4000-8000-000000000006","role":"authenticated"}',true);
do $$ declare a jsonb;b jsonb; begin
 if jsonb_array_length(public.pm_available_properties())<>1 then raise exception 'Unpublished property disclosure'; end if;
 a=public.pm_prospect_inquiry('40000000-0000-4000-8000-000000000002','Synthetic Prospect','Synthetic leasing inquiry',now()+interval '2 days');
 b=public.pm_prospect_inquiry('40000000-0000-4000-8000-000000000002','Synthetic Prospect','Synthetic leasing inquiry',now()+interval '2 days');
 if a->>'leadId'<>b->>'leadId' or a->>'showingId'<>b->>'showingId' or a->>'housingDecisionMade'<>'false' then raise exception 'Prospect replay/housing restriction failed'; end if;
 if (select count(*) from public.pm_showings)<>1 then raise exception 'Prospect showing visibility failed'; end if;
 if exists(select 1 from public.ai4cc_contacts) then raise exception 'Prospect sees CRM'; end if;
 begin
 perform public.pm_convert_prospect('20000000-0000-4000-8000-000000000001','40000000-0000-4000-8000-000000000002',(a->>'leadId')::uuid,'50000000-0000-4000-8000-000000000002',current_date);
 raise exception 'Prospect made housing decision'; exception when insufficient_privilege then null; end;
end $$;
select set_config('request.jwt.claims','{"sub":"10000000-0000-4000-8000-000000000001","role":"authenticated"}',true);
do $$ declare l uuid;v jsonb;n integer;begin
 select lead_id into l from public.pm_prospect_interests where auth_user_id='10000000-0000-4000-8000-000000000006';
 v=public.pm_convert_prospect('20000000-0000-4000-8000-000000000001','40000000-0000-4000-8000-000000000002',l,'50000000-0000-4000-8000-000000000002',current_date);
 if v->>'occupancyId' is null then raise exception 'Human conversion failed'; end if;
 v=public.pm_dashboard_counts('20000000-0000-4000-8000-000000000001');
 if v->>'Leads'<>'2' then raise exception 'Prospect lead metrics mismatch: %',v; end if;
 for n in 1..90 loop if not public.pm_rate_limit() then raise exception 'Rate limit early rejection'; end if; end loop;
 if public.pm_rate_limit() then raise exception 'Rate limit failed'; end if;
 begin
 insert into public.pm_attachments(tenant_id,property_id,request_id,object_path,file_name,mime_type,size_bytes)
 values('20000000-0000-4000-8000-000000000001','40000000-0000-4000-8000-000000000001','70000000-0000-4000-8000-000000000001','other-owner/file','synthetic.pdf','application/pdf',5);
 raise exception 'Unscoped attachment allowed'; exception when check_violation then null; end;
end $$;
reset role;
do $$ declare t uuid; r jsonb; begin
 if not exists(select 1 from public.audit_log where tenant_id='20000000-0000-4000-8000-000000000001' and action='pma.insert') then raise exception 'Audit missing'; end if;
 select id into t from public.automation_tasks where tenant_id='20000000-0000-4000-8000-000000000001' and task_code='PMA_NOTIFICATION' limit 1;
 if t is null then raise exception 'Notification not queued'; end if;
 r=public.pm_test_notification('20000000-0000-4000-8000-000000000001',t,'10000000-0000-4000-8000-000000000001');
 if r->>'delivery_state'<>'SIMULATED' then raise exception 'Sandbox notification failed'; end if;
end $$;
-- Knowledge hierarchy and disclosure acceptance, using the existing synthetic fixtures.
reset role;
insert into public.pm_units(id,tenant_id,property_id,label) values('50000000-0000-4000-8000-000000000004','20000000-0000-4000-8000-000000000001','40000000-0000-4000-8000-000000000001','4');
insert into public.ai4cc_knowledge_entries(tenant_id,property_id,unit_id,title,content,visibility,approved,valid_until) values
 ('20000000-0000-4000-8000-000000000001',null,null,'scopeprobe','Owner default scopeprobe','public',true,null),
 ('20000000-0000-4000-8000-000000000001','40000000-0000-4000-8000-000000000001',null,'scopeprobe','Property scopeprobe','resident',true,null),
 ('20000000-0000-4000-8000-000000000001','40000000-0000-4000-8000-000000000001','50000000-0000-4000-8000-000000000001','scopeprobe','Unit scopeprobe','resident',true,null),
 ('20000000-0000-4000-8000-000000000001','40000000-0000-4000-8000-000000000001','50000000-0000-4000-8000-000000000004','unitprivateprobe','Other unit private answer','public',true,null),
 ('20000000-0000-4000-8000-000000000001','40000000-0000-4000-8000-000000000001',null,'expiredprobe','Expired answer','public',true,now()-interval '1 day'),
 ('20000000-0000-4000-8000-000000000001','40000000-0000-4000-8000-000000000001',null,'draftprobe','Draft answer','public',false,null),
 ('20000000-0000-4000-8000-000000000001','40000000-0000-4000-8000-000000000001',null,'conflictprobe','First conflicting answer','public',true,null),
 ('20000000-0000-4000-8000-000000000001','40000000-0000-4000-8000-000000000001',null,'conflictprobe','Second conflicting answer','public',true,null),
 ('20000000-0000-4000-8000-000000000001',null,null,'staffonlyprobe','Owner preferences private','staff',false,null);
set local role authenticated;
select set_config('request.jwt.claims','{"sub":"10000000-0000-4000-8000-000000000001","role":"authenticated"}',true);
do $$ declare v jsonb;begin
 v=private.pm_record_channel_turn('20000000-0000-4000-8000-000000000001','40000000-0000-4000-8000-000000000001','30000000-0000-4000-8000-000000000001','50000000-0000-4000-8000-000000000001','knowledge-unit-01','chat','scopeprobe','policy_question','other','normal');
 if v->>'reply'<>'Unit scopeprobe' or v->>'knowledgeScope'<>'unit' then raise exception 'Unit precedence failed: %',v;end if;
 v=private.pm_record_channel_turn('20000000-0000-4000-8000-000000000001','40000000-0000-4000-8000-000000000001','30000000-0000-4000-8000-000000000001',null,'knowledge-property-01','chat','scopeprobe','policy_question','other','normal');
 if v->>'reply'<>'Property scopeprobe' then raise exception 'Property precedence failed: %',v;end if;
 v=private.pm_record_channel_turn('20000000-0000-4000-8000-000000000001','40000000-0000-4000-8000-000000000001','30000000-0000-4000-8000-000000000002',null,'knowledge-audience-01','sms','scopeprobe','policy_question','other','normal');
 if v->>'reply'<>'Owner default scopeprobe' then raise exception 'Resident answer leaked to nonresident: %',v;end if;
 v=private.pm_record_channel_turn('20000000-0000-4000-8000-000000000001','40000000-0000-4000-8000-000000000001','30000000-0000-4000-8000-000000000001',null,'knowledge-conflict-01','voice','conflictprobe','policy_question','other','normal');
 if v->>'knowledgeConflict'<>'true' or v->>'requiresHumanReview'<>'true' then raise exception 'Conflict not escalated';end if;
 v=private.pm_record_channel_turn('20000000-0000-4000-8000-000000000001','40000000-0000-4000-8000-000000000001','30000000-0000-4000-8000-000000000001',null,'knowledge-expired-01','chat','expiredprobe','policy_question','other','normal');
 if v->>'knowledgeId' is not null or v->>'requiresHumanReview'<>'true' then raise exception 'Expired knowledge used';end if;
 begin
 insert into public.ai4cc_knowledge_entries(tenant_id,property_id,unit_id,title,content)values('20000000-0000-4000-8000-000000000001','40000000-0000-4000-8000-000000000002','50000000-0000-4000-8000-000000000001','bad','bad');
 raise exception 'Cross-property unit accepted';exception when foreign_key_violation then null;end;
 begin
 insert into public.ai4cc_knowledge_entries(tenant_id,title,content,category,approved)values('20000000-0000-4000-8000-000000000001','bad','bad','pma_template',true);
 raise exception 'Template approved';exception when check_violation then null;end;
 begin
 insert into public.ai4cc_knowledge_entries(tenant_id,title,content,model_section,visibility)values('20000000-0000-4000-8000-000000000001','bad','bad','owner_preferences','public');
 raise exception 'Owner preferences public';exception when check_violation then null;end;
end $$;
select set_config('request.jwt.claims','{"sub":"10000000-0000-4000-8000-000000000004","role":"authenticated"}',true);
do $$ begin
 if exists(select 1 from public.ai4cc_knowledge_entries where title in ('unitprivateprobe','expiredprobe','draftprobe','staffonlyprobe')) then raise exception 'Resident knowledge scope leak';end if;
 if not exists(select 1 from public.ai4cc_knowledge_entries where content='Unit scopeprobe')then raise exception 'Resident lost own unit knowledge';end if;
end $$;
select set_config('request.jwt.claims','{"sub":"10000000-0000-4000-8000-000000000006","role":"authenticated"}',true);
do $$ declare v jsonb;begin
 v=public.pm_available_properties();
 if v::text like '%Other unit private answer%' or v::text like '%Expired answer%' then raise exception 'Prospect listing exposed unit/expired knowledge';end if;
end $$;
reset role;
select 'PASS: workspace/property isolation, role restrictions, relationships, resident/vendor scope, maintenance lifecycle, assignment/showing replay, knowledge, audit, canonical voice/SMS/chat workflow records, exact dashboard metrics, prospective resident access, human conversion, rate limits, attachment scope and simulated notification' as result;
rollback;
