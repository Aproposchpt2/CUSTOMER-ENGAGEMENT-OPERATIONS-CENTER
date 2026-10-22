begin;
create or replace function private.pm_prospect_inquiry(p uuid,full_name text,msg text,at_time timestamptz default null) returns jsonb language plpgsql security definer set search_path='' as $$
declare prop public.pm_properties; interest public.pm_prospect_interests; c uuid;l uuid; email text;s public.pm_showings;
begin
 if auth.uid() is null or length(trim(full_name)) not between 2 and 160 or length(msg) not between 1 and 4000 then raise exception 'Verified identity and inquiry required' using errcode='42501'; end if;
 select u.email into email from auth.users u where u.id=auth.uid() and u.email_confirmed_at is not null;
 if email is null then raise exception 'Confirm your existing account email first' using errcode='42501'; end if;
 select * into prop from public.pm_properties where id=p and accepts_inquiries and status='active';
 if not found or not exists(select 1 from public.tenants w where w.id=prop.tenant_id and w.status='ACTIVE') then raise exception 'Property not accepting inquiries' using errcode='42501'; end if;
 perform pg_advisory_xact_lock(hashtextextended(auth.uid()::text||':prospect:'||p::text,0));
 select * into interest from public.pm_prospect_interests where property_id=p and auth_user_id=auth.uid();
 if found then c=interest.contact_id;l=interest.lead_id;
 else
   select contact_id into c from public.pm_occupancies where tenant_id=prop.tenant_id and auth_user_id=auth.uid() order by created_at desc limit 1;
   if c is null then select contact_id into c from public.pm_prospect_interests where tenant_id=prop.tenant_id and auth_user_id=auth.uid() order by created_at desc limit 1; end if;
   if c is null then
     insert into public.ai4cc_contacts(tenant_id,display_name,email,lead_source,metadata) values(prop.tenant_id,full_name,email,'pma',jsonb_build_object('source','pma','synthetic',true)) returning id into c;
   end if;
   insert into public.ai4cc_leads(tenant_id,contact_id,title,service_interest,description,metadata) values(prop.tenant_id,c,'Property leasing inquiry','Property leasing',msg,jsonb_build_object('source','pma','property_id',p,'synthetic',true)) returning id into l;
   insert into public.pm_prospect_interests(tenant_id,property_id,auth_user_id,contact_id,lead_id) values(prop.tenant_id,p,auth.uid(),c,l);
 end if;
 if at_time is not null then
   if at_time<=now() then raise exception 'Choose a future showing time' using errcode='23514'; end if;
   insert into public.pm_showings(tenant_id,property_id,contact_id,lead_id,requested_at,notes,idempotency_key)
   values(prop.tenant_id,p,c,l,at_time,msg,'prospect:'||auth.uid()::text||':'||p::text||':'||extract(epoch from at_time)::text)
   on conflict(tenant_id,idempotency_key) do update set notes=pm_showings.notes returning * into s;
 end if;
 return jsonb_build_object('leadId',l,'showingId',s.id,'showingStatus',case when s.id is null then null else 'requested' end,'availabilityGuaranteed',false,'housingDecisionMade',false);
end;
$$;
create or replace function public.pm_record_channel_turn(t uuid,p uuid,c uuid,u uuid,k text,ch text,msg text,intent text,category text,priority text,show_at timestamptz default null,request_id uuid default null)
returns jsonb language plpgsql security invoker set search_path='' as $$
declare i public.ai4cc_interactions; req public.pm_maintenance_requests; showing public.pm_showings; lead uuid; answer text; kb public.ai4cc_knowledge_entries; outcome jsonb; q text;
begin
 if not private.pm_staff(t,p,true) then raise exception 'Forbidden' using errcode='42501'; end if;
 if ch not in ('voice','sms','chat') or length(k) not between 8 and 160 or length(msg) not between 1 and 4000 then raise exception 'Invalid channel input' using errcode='23514'; end if;
 if intent not in ('leasing_inquiry','showing_request','maintenance_request','maintenance_status','policy_question','tenant_question','vendor_response','emergency_event','unknown_question') then raise exception 'Invalid intent' using errcode='23514'; end if;
 if not exists(select 1 from public.ai4cc_contacts where tenant_id=t and id=c) then raise exception 'Contact not found' using errcode='23503'; end if;
 if not exists(select 1 from public.pm_properties where tenant_id=t and id=p and status='active') then raise exception 'Property unavailable' using errcode='23514'; end if;
 if u is not null and not exists(select 1 from public.pm_units where tenant_id=t and property_id=p and id=u) then raise exception 'Invalid property unit' using errcode='23503'; end if;
 perform pg_advisory_xact_lock(hashtextextended(t::text||':pma-channel:'||k,0));
 select * into i from public.ai4cc_interactions where tenant_id=t and external_id='pma:'||ch||':'||k;
 if found then
   if i.metadata->>'property_id'<>p::text or i.metadata->>'contact_id'<>c::text or i.metadata->>'message_hash'<>md5(jsonb_build_object('msg',msg,'unit',u,'intent',intent,'category',category,'priority',priority,'show_at',show_at,'request_id',request_id)::text) then raise exception 'Channel operation key conflict' using errcode='23514'; end if;
   return (i.metadata->'outcome')||jsonb_build_object('replayed',true);
 end if;
 insert into public.ai4cc_interactions(tenant_id,channel,direction,external_id,customer_identifier,status,ended_at,metadata)
 values(t,ch,'inbound','pma:'||ch||':'||k,c::text,'completed',now(),jsonb_build_object('source','pma','property_id',p,'contact_id',c,'intent',intent,'sandbox',true,'message_hash',md5(jsonb_build_object('msg',msg,'unit',u,'intent',intent,'category',category,'priority',priority,'show_at',show_at,'request_id',request_id)::text))) returning * into i;
 answer='Please clarify your question so the property team can assist.';
 outcome=jsonb_build_object('intent',intent,'interactionId',i.id,'persisted',true,'notificationSent',false,'emergencyServicesContacted',false,'vendorArrivalConfirmed',false,'issueResolved',false,'requiresHumanReview',false);
 if intent in ('maintenance_request','emergency_event') then
   insert into public.pm_maintenance_requests(tenant_id,property_id,unit_id,contact_id,interaction_id,summary,description,category,priority,source_channel,idempotency_key)
   values(t,p,u,c,i.id,left(msg,500),msg,category,case when intent='emergency_event' then 'emergency' else priority end,ch,'channel:'||ch||':'||k) returning * into req;
   answer='Your request has been recorded. Reference: '||req.id::text||'. Status: New. The property team will review it.';
   if intent='emergency_event' then answer='If you are in immediate danger, move to a safe location and contact local emergency services. I cannot confirm emergency dispatch. '||answer; end if;
   outcome=outcome||jsonb_build_object('requestId',req.id,'status',req.status,'requiresHumanReview',intent='emergency_event');
 elsif intent in ('leasing_inquiry','showing_request') then
   if intent='showing_request' and show_at is not null then
     showing=public.pm_request_showing(t,p,u,c,show_at,msg,'channel:'||ch||':'||k);
     lead=showing.lead_id;
     outcome=outcome||jsonb_build_object('showingId',showing.id,'showingStatus','requested');
   else
     insert into public.ai4cc_leads(tenant_id,contact_id,originating_interaction_id,originating_channel,title,service_interest,description,metadata)
     values(t,c,i.id,ch,'Property leasing inquiry','Property leasing',msg,jsonb_build_object('source','pma','property_id',p)) returning id into lead;
   end if;
   update public.ai4cc_leads set originating_interaction_id=i.id,originating_channel=ch where tenant_id=t and id=lead;
   answer='Your leasing inquiry has been recorded. The property team must confirm current availability and any showing time. No application or housing decision has been made.';
   outcome=outcome||jsonb_build_object('leadId',lead,'availabilityGuaranteed',false,'requiresClarification',intent='showing_request' and show_at is null);
 elsif intent='maintenance_status' then
   if request_id is not null then
     select * into req from public.pm_maintenance_requests where tenant_id=t and property_id=p and id=request_id and contact_id=c;
     if found then answer='Request '||req.id::text||' has status '||req.status||'.'; outcome=outcome||jsonb_build_object('requestId',req.id,'status',req.status);
     else answer='I could not verify that request for this contact and property.'; end if;
   else answer='Please provide your request reference so its status can be verified.'; end if;
 elsif intent in ('policy_question','tenant_question') then
   select * into kb from public.ai4cc_knowledge_entries where tenant_id=t and property_id=p and approved and visibility in ('public','resident')
   and to_tsvector('english',title||' '||content)@@plainto_tsquery('english',msg)
   order by updated_at desc limit 1;
   if found then answer=kb.content; outcome=outcome||jsonb_build_object('knowledgeId',kb.id);
   else answer='I do not have an approved answer for this property. The property team needs to review your question.'; outcome=outcome||jsonb_build_object('requiresHumanReview',true); end if;
 elsif intent='vendor_response' then
   answer='Please use your authenticated vendor assignment to accept, decline or report completed work.';
 else outcome=outcome||jsonb_build_object('requiresHumanReview',true);
 end if;
 outcome=outcome||jsonb_build_object('reply',answer);
 insert into public.ai4cc_transcripts(tenant_id,interaction_id,speaker,sequence_no,content,metadata) values
 (t,i.id,'customer',1,msg,jsonb_build_object('source','pma','sandbox',true)),
 (t,i.id,'agent',2,answer,jsonb_build_object('source','pma','sandbox',true));
 update public.ai4cc_interactions set metadata=i.metadata||jsonb_build_object('outcome',outcome) where tenant_id=t and id=i.id;
 return outcome;
end;
$$;
create or replace function public.pm_dashboard_counts(t uuid) returns jsonb language sql stable security invoker set search_path='' as $$
 select jsonb_build_object(
 'Properties',(select count(*) from public.pm_properties where tenant_id=t),
 'Units',(select count(*) from public.pm_units where tenant_id=t),
 'Open Requests',(select count(*) from public.pm_maintenance_requests where tenant_id=t and status not in ('Completed','Closed')),
 'Emergency Requests',(select count(*) from public.pm_maintenance_requests where tenant_id=t and priority='emergency' and status not in ('Completed','Closed')),
 'Vendor Assignments',(select count(*) from public.pm_vendor_assignments where tenant_id=t and status in ('assigned','accepted')),
 'Leads',(select count(distinct lead_id) from (select lead_id from public.pm_showings where tenant_id=t union select lead_id from public.pm_prospect_interests where tenant_id=t union select l.id from public.ai4cc_leads l where l.tenant_id=t and l.metadata->>'source'='pma' and exists(select 1 from public.pm_properties p where p.tenant_id=t and p.id::text=l.metadata->>'property_id' and private.pm_staff(t,p.id))) leads),
 'Showings',(select count(*) from public.pm_showings where tenant_id=t and status in ('requested','confirmed')),
 'Communications',(select count(*) from public.ai4cc_interactions i where i.tenant_id=t and i.metadata->>'source'='pma'
 and exists(select 1 from public.pm_properties p where p.tenant_id=t and p.id::text=i.metadata->>'property_id' and private.pm_staff(t,p.id)))
 );
$$;

alter table public.pm_attachments add constraint pm_attachment_scoped_path check(object_path=tenant_id::text||'/'||property_id::text||'/'||request_id::text||'/'||id::text);
alter table public.pm_attachments add constraint pm_attachment_allowed_type check(mime_type in ('application/pdf','image/jpeg','image/png'));
create policy pm_showing_prospect_read on public.pm_showings for select to authenticated using(exists(select 1 from public.pm_prospect_interests pi where pi.tenant_id=pm_showings.tenant_id and pi.property_id=pm_showings.property_id and pi.lead_id=pm_showings.lead_id and pi.auth_user_id=(select auth.uid())));
commit;
