begin;
create function private.pm_catalog_config() returns jsonb language sql immutable security invoker set search_path='' as $cfg$ select $json${"version":"1.0","thresholds":{"high":0.9,"medium":0.7,"rule":0.94,"ambiguous":0.78,"unknown":0.3},"availabilityMaxAgeHours":24,"scoreDisclaimer":"Rule scores are conservative routing heuristics, not calibrated probabilities. A model score never conveys authorization.","scopeNote":"platform_tenant_id and the legacy tenant_id both mean the existing owner workspace; residents remain contacts/occupancies.","modelFields":["topic","bedrooms","move_date","impact","category","description","safety_indicators","response","vendor_status","notes","followup_requested"],"canonicalFields":["intent","confidence","channel","platform_tenant_id","property_id","unit_id","contact_role","contact_id","tenant_id","prospect_id","workflow_action","priority","requires_clarification","requires_escalation","requires_notification","safety_override","knowledge_entry_ids","correlation_id","timestamp"],"intents":[{"id":"INT-001","intent":"LEASING_INQUIRY","agent":"Leasing Agent","workflow":"WF-001 Leasing Inquiry","action":"leasing","required":["property"],"pattern":"tell me about the property|how much is rent|leasing|amenities","examples":["What units do you have?","Tell me about the property.","How much is rent?"],"restrictions":"No guaranteed availability or pricing.","safety":false,"legacy":"leasing_inquiry"},{"id":"INT-002","intent":"UNIT_AVAILABILITY","agent":"Leasing Agent","workflow":"Availability Lookup","action":"availability","required":["property","unit_preference","move_date"],"pattern":"available|availability|bedrooms?|next opening","examples":["Do you have a two-bedroom?","When is the next opening?"],"restrictions":"Use only fresh authoritative inventory; never guarantee availability.","safety":false,"legacy":"leasing_inquiry"},{"id":"INT-003","intent":"SHOWING_REQUEST","agent":"Leasing Agent","workflow":"WF-002 Showing Request","action":"showing","required":["property","prospect_name","contact_method","showing_time"],"pattern":"showing|tour|see the unit|visit the (unit|property)","examples":["Can I see the unit?","Schedule a showing."],"restrictions":"Requested times are not confirmed until the workflow/calendar confirms them.","safety":false,"legacy":"showing_request"},{"id":"INT-004","intent":"APPLICATION_QUESTION","agent":"Leasing Agent","workflow":"Application Question Workflow","action":"knowledge","required":["property","topic"],"pattern":"apply|applying|application|what is the fee","examples":["How do I apply?","What is the fee?"],"restrictions":"No screening, applicant approval/rejection or legal determination.","safety":false,"legacy":"policy_question"},{"id":"INT-005","intent":"PROPERTY_POLICY","agent":"Tenant Assistant","workflow":"Knowledge Response","action":"knowledge","required":["property","topic","audience"],"pattern":"policy|policies|quiet hours|guests use|smoking|balcony|trash|grill","examples":["What are quiet hours?","Can guests use the pool?"],"restrictions":"Missing, expired or conflicting knowledge escalates.","safety":false,"legacy":"policy_question"},{"id":"INT-006","intent":"PET_POLICY","agent":"Tenant Assistant","workflow":"Policy Knowledge Workflow","action":"knowledge","required":["property","topic"],"pattern":"pets?|pet rent|service animals?|assistance animals?","examples":["Are pets allowed?","How much is pet rent?"],"restrictions":"No assistance-animal eligibility decisions.","safety":false,"legacy":"policy_question"},{"id":"INT-007","intent":"PARKING_QUESTION","agent":"Tenant Assistant","workflow":"Policy Knowledge Workflow","action":"knowledge","required":["property","audience"],"pattern":"parking|park|permit|towed|towing","examples":["Where can guests park?","Do I need a permit?"],"restrictions":"Never expose private resident or vehicle information.","safety":false,"legacy":"policy_question"},{"id":"INT-008","intent":"MOVE_IN","agent":"Tenant Assistant","workflow":"WF-013 Move-In","action":"knowledge","required":["property","unit","resident_identity"],"pattern":"move[ -]?in|moving in|how do i get (my )?keys|key pickup","examples":["How do I get keys?","What do I need before move-in?"],"restrictions":"No access credentials before authorization.","safety":false,"legacy":"policy_question"},{"id":"INT-009","intent":"MOVE_OUT","agent":"Tenant Assistant","workflow":"WF-014 Move-Out","action":"knowledge","required":["property","unit","resident_identity"],"pattern":"move[ -]?out|moving out|notice is required|return (my )?keys","examples":["How much notice is required?","Where do I return keys?"],"restrictions":"No lease interpretation or legal advice.","safety":false,"legacy":"policy_question"},{"id":"INT-010","intent":"MAINTENANCE_REQUEST","agent":"Maintenance Intake Agent","workflow":"WF-005 Maintenance Request","action":"maintenance","required":["property","unit_or_common_area","contact","category","description","impact","safety_indicators"],"pattern":"leak(?:ing)?|broken|not working|repair|maintenance|no heat|no cooling|clogged|pests?|locked out|internet down","examples":["My AC is not working.","Water is leaking."],"restrictions":"No guaranteed repair time, assignment or resolution.","safety":false,"legacy":"maintenance_request"},{"id":"INT-011","intent":"MAINTENANCE_STATUS","agent":"Tenant Assistant","workflow":"Maintenance Status Lookup","action":"status","required":["property","resident_identity","request_or_unit"],"pattern":"(repair|maintenance|request|ticket).*(status|update|progress)|(status|update).*(repair|request|ticket)|has anyone been assigned|what is happening with my request","examples":["Has anyone been assigned?","What is happening with my request?"],"restrictions":"Never expose another resident\u2019s request.","safety":false,"legacy":"maintenance_status"},{"id":"INT-012","intent":"FIRE_OR_SMOKE","agent":"Emergency Escalation Agent","workflow":"WF-006 Emergency","action":"emergency","required":[],"pattern":"fire|smoke","examples":["There is a fire.","The unit is filling with smoke."],"restrictions":"Safety first; no fabricated emergency-services dispatch.","safety":true,"legacy":"emergency_event"},{"id":"INT-013","intent":"SUSPECTED_GAS_LEAK","agent":"Emergency Escalation Agent","workflow":"WF-006 Emergency","action":"emergency","required":[],"pattern":"gas leak|smell gas|gas odou?r|smells like gas","examples":["I smell gas.","There may be a gas leak."],"restrictions":"Do not troubleshoot or delay evacuation guidance.","safety":true,"legacy":"emergency_event"},{"id":"INT-014","intent":"ELECTRICAL_HAZARD","agent":"Emergency Escalation Agent","workflow":"WF-006 Emergency","action":"emergency","required":[],"pattern":"sparks?|sparking|electrical hazard|exposed (?:wire|wires|conductors)|panel is smoking","examples":["The outlet is sparking.","The panel is smoking."],"restrictions":"No unsafe physical intervention.","safety":true,"legacy":"emergency_event"},{"id":"INT-015","intent":"MAJOR_FLOODING","agent":"Emergency Escalation Agent","workflow":"WF-006 Emergency","action":"emergency","required":[],"pattern":"flooding|burst (?:pipe|plumbing)|pipe burst|water is pouring|uncontrolled water","examples":["A pipe burst.","Water is pouring into the unit."],"restrictions":"No promised shutoff or vendor arrival.","safety":true,"legacy":"emergency_event"},{"id":"INT-016","intent":"PERSONAL_SAFETY_THREAT","agent":"Emergency Escalation Agent","workflow":"WF-006 Emergency","action":"emergency","required":[],"pattern":"security threat|threatening me|dangerous person|violence|structural threat|ceiling collaps\\w*","examples":["Someone is threatening me.","A dangerous person is on the property."],"restrictions":"Do not mediate or delay safety guidance to collect details. Structural threats are conservatively escalated here.","safety":true,"legacy":"emergency_event"},{"id":"INT-017","intent":"VENDOR_RESPONSE","agent":"Vendor Coordination Agent","workflow":"WF-007 Vendor Assignment","action":"vendor_response","required":["vendor_identity","assignment","response"],"pattern":"(?:vendor|contractor).*(?:accept|decline)|i can take the job|we need more information","examples":["I can take the job.","We need more information."],"restrictions":"No contract or spending authority.","safety":false,"legacy":"vendor_response"},{"id":"INT-018","intent":"VENDOR_STATUS_UPDATE","agent":"Vendor Coordination Agent","workflow":"WF-008 Vendor Completion","action":"vendor_status","required":["vendor_identity","assignment","vendor_status","notes"],"pattern":"work has started|repair is complete|(?:vendor|contractor).*(?:completed|scheduled|progress)","examples":["Work has started.","Repair is complete."],"restrictions":"Completion is a report; staff verify and close the request.","safety":false,"legacy":"vendor_response"},{"id":"INT-019","intent":"OWNER_REQUEST","agent":"Owner Assistant","workflow":"Owner Dashboard Query","action":"owner_query","required":["owner_identity","query"],"pattern":"show open requests|what happened today|owner (?:request|dashboard|summary)","examples":["Show open requests.","What happened today?"],"restrictions":"Existing authenticated owner/admin scope only; no cross-tenant aggregation.","safety":false,"legacy":"unknown_question"},{"id":"INT-020","intent":"OWNER_OVERRIDE","agent":"Owner Assistant","workflow":"Owner Decision Workflow","action":"owner_override","required":["owner_identity","property","target","change","confirmation"],"pattern":"assign this vendor|escalate this issue|change (?:the )?priority|owner override","examples":["Assign this vendor.","Escalate this issue."],"restrictions":"Authentication, explicit confirmation, target/version checks and audit required.","safety":false,"legacy":"unknown_question"},{"id":"INT-021","intent":"PAYMENT_QUESTION","agent":"Tenant Assistant","workflow":"Payment Information Workflow","action":"payment","required":["property","resident_identity","topic"],"pattern":"pay rent|payment|balance","examples":["How do I pay rent?","Was my payment received?"],"restrictions":"Approved instructions only without an authorized accounting integration; no balances or financial advice.","safety":false,"legacy":"policy_question"},{"id":"INT-022","intent":"LEASE_QUESTION","agent":"Tenant Assistant","workflow":"Lease Question Escalation","action":"lease","required":["property","resident_identity","question"],"pattern":"what does this clause mean|break my lease|lease terms|lease interpretation|legal advice","examples":["What does this clause mean?","Can I break my lease?"],"restrictions":"No lease interpretation or legal advice.","safety":false,"legacy":"unknown_question"},{"id":"INT-023","intent":"UNKNOWN_QUESTION","agent":"Tenant Assistant","workflow":"WF-009 Knowledge Escalation","action":"unknown","required":[],"pattern":"(?!)","examples":["Unrecognized or unsupported request."],"restrictions":"Create a human follow-up and knowledge gap; never fabricate an answer.","safety":false,"legacy":"unknown_question"},{"id":"INT-024","intent":"HELP_REQUEST","agent":"Channel Agent","workflow":"System Help","action":"help","required":[],"pattern":"what can you (?:help|do)|how can you help|what do you do","examples":["What can you help me with?"],"restrictions":"Describe only available capabilities for the verified role.","safety":false,"legacy":"unknown_question"},{"id":"INT-025","intent":"GENERAL_GREETING","agent":"Channel Agent","workflow":"Greeting","action":"greeting","required":[],"pattern":"^(?:hello|hi|hey|good (?:morning|afternoon|evening))[!. ]*$","examples":["Hello.","Good morning."],"restrictions":"No lead, work order or follow-up task for greeting alone.","safety":false,"legacy":"unknown_question"}]}$json$::jsonb; $cfg$;
revoke all on function private.pm_catalog_config() from public,anon;
grant execute on function private.pm_catalog_config() to authenticated,service_role;
create or replace function private.pm_knowledge_answer(t uuid,p uuid,c uuid,u uuid,msg text) returns jsonb language plpgsql stable security invoker set search_path='' as $$
declare answers jsonb;
begin
 if not (private.pm_staff(t,p,true) or private.pm_resident(t,p,c,u)) then raise exception 'Forbidden' using errcode='42501'; end if;
 with candidates as (
  select k.*,case when k.unit_id is not null then 3 when k.property_id is not null then 2 else 1 end as rank
  from public.ai4cc_knowledge_entries k where k.tenant_id=t and (k.property_id=p or k.property_id is null)
   and (k.unit_id is null or (u=k.unit_id and exists(select 1 from public.pm_occupancies o where o.tenant_id=t and o.property_id=p and o.unit_id=u and o.contact_id=c and o.status='active' and o.starts_on<=current_date and (o.ends_on is null or o.ends_on>=current_date))))
   and k.approved and k.visibility in ('public','resident') and (k.valid_until is null or k.valid_until>now())
   and (k.visibility='public' or exists(select 1 from public.pm_occupancies o where o.tenant_id=t and o.property_id=p and o.contact_id=c and o.status='active' and o.starts_on<=current_date and (o.ends_on is null or o.ends_on>=current_date) and (u is null or o.unit_id=u)))
   and to_tsvector('english',k.title||' '||k.content)@@plainto_tsquery('english',msg)
 ) select jsonb_agg(to_jsonb(x) order by x.updated_at desc,x.id) into answers from candidates x where rank=(select max(rank) from candidates);
 if answers is null then return jsonb_build_object('reply','I do not have an approved current answer for this property and contact. The property team needs to review your question.','requiresHumanReview',true); end if;
 if jsonb_array_length(answers)>1 then return jsonb_build_object('reply','I found multiple approved answers and need the property team to confirm which applies.','requiresHumanReview',true,'knowledgeConflict',true); end if;
 return jsonb_build_object('reply',answers->0->>'content','knowledgeId',answers->0->>'id','knowledgeScope',case (answers->0->>'rank')::integer when 3 then 'unit' when 2 then 'property' else 'owner' end,'requiresHumanReview',false);
end $$;
create or replace function private.pm_record_channel_turn(t uuid,p uuid,c uuid,u uuid,k text,ch text,msg text,intent text,category text,priority text,show_at timestamptz default null,request_id uuid default null)
returns jsonb language plpgsql security definer set search_path='' as $$
declare i public.ai4cc_interactions; req public.pm_maintenance_requests; showing public.pm_showings; lead uuid; answer text; kb public.ai4cc_knowledge_entries; outcome jsonb; q text;
begin
 if not (private.pm_staff(t,p,true) or private.pm_resident(t,p,c,u)) then raise exception 'Forbidden' using errcode='42501'; end if;
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
   outcome=outcome||private.pm_knowledge_answer(t,p,c,u,msg);
   answer=outcome->>'reply';
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
create function private.pm_catalog_turn(t uuid,p uuid,c uuid,u uuid,k text,ch text,msg text,d jsonb,confirmed boolean,show_at timestamptz,request_id uuid,w jsonb,owner_session boolean)
returns jsonb language plpgsql security definer set search_path='' as $$
declare cfg jsonb=private.pm_catalog_config();def jsonb;x jsonb;e jsonb;name text;cf numeric;act text;route text;f text;missing text[]='{}';allowed boolean;staff boolean;native_resident boolean;vendor boolean=false;resident boolean=false;role_name text='prospect';safety boolean=false;review boolean=false;notify boolean=false;answer text;fingerprint text;outc jsonb='{}';iid uuid;task uuid;aid uuid;contact public.ai4cc_contacts;a public.pm_vendor_assignments;r public.pm_maintenance_requests;kb jsonb='[]';ids jsonb='[]';started timestamptz=clock_timestamp();category text;
begin
 if auth.uid() is null or not exists(select 1 from public.tenants where id=t and status in ('ACTIVE','SETUP')) then raise exception 'Forbidden' using errcode='42501';end if;
 if ch is null or ch not in ('voice','sms','chat') or k is null or length(k) not between 8 and 160 or msg is null or length(msg) not between 1 and 4000 then raise exception 'Invalid channel turn' using errcode='23514';end if;
 if p is not null and not exists(select 1 from public.pm_properties where tenant_id=t and id=p and status='active') then raise exception 'Invalid property' using errcode='42501';end if;
 if c is not null then select * into contact from public.ai4cc_contacts where tenant_id=t and id=c;if not found then raise exception 'Invalid contact' using errcode='42501';end if;end if;
 if u is not null and (p is null or not exists(select 1 from public.pm_units where tenant_id=t and property_id=p and id=u)) then raise exception 'Invalid unit scope' using errcode='42501';end if;
 if w is null or jsonb_typeof(w)<>'object' or octet_length(w::text)>10000 or exists(select 1 from jsonb_object_keys(w) z where z not in ('action','requestId','vendorId','assignmentId','response','status','version','scheduledAt','resolution','priority')) then raise exception 'Invalid workflow fields' using errcode='23514';end if;
 aid=nullif(w->>'assignmentId','')::uuid;
 if aid is not null then select * into a from public.pm_vendor_assignments where id=aid and tenant_id=t and property_id=p;vendor=found and private.pm_vendor(t,a.vendor_id) and exists(select 1 from public.pm_vendors v where v.id=a.vendor_id and v.tenant_id=t and v.contact_id=c);end if;
 staff=case when p is null then private.is_tenant_member(t) else private.pm_staff(t,p,true) end;
 native_resident=p is not null and c is not null and private.pm_resident(t,p,c,u);
 if not staff and not native_resident and not vendor then raise exception 'Forbidden' using errcode='42501';end if;
 resident=c is not null and p is not null and exists(select 1 from public.pm_occupancies o where o.tenant_id=t and o.property_id=p and o.contact_id=c and o.status='active' and o.starts_on<=current_date and (o.ends_on is null or o.ends_on>=current_date) and (u is null or o.unit_id=u));
 if resident then role_name='resident';end if;if vendor then role_name='vendor';end if;
 if d is null or jsonb_typeof(d)<>'object' or jsonb_typeof(d->'entities')<>'object' or jsonb_typeof(d->'confidence')<>'number' or octet_length(d::text)>20000 or exists(select 1 from jsonb_object_keys(d) z where z not in ('intent','confidence','entities','confidence_source')) then raise exception 'Invalid structured classification' using errcode='23514';end if;
 name=d->>'intent';cf=(d->>'confidence')::numeric;e=d->'entities';
 if cf<0 or cf>1 then raise exception 'Invalid confidence' using errcode='23514';end if;
 select value into def from jsonb_array_elements(cfg->'intents') where value->>'intent'=name;
 if def is null then raise exception 'Unknown catalog intent' using errcode='23514';end if;
 if exists(select 1 from jsonb_object_keys(e) z where not (cfg->'modelFields')?z) then raise exception 'Untrusted model fields' using errcode='23514';end if;
 for f,x in select key,value from jsonb_each(e) loop
  if f='safety_indicators' then
   if jsonb_typeof(x)<>'array' or jsonb_array_length(x)>10 then raise exception 'Invalid safety indicators' using errcode='23514';end if;
   if exists(select 1 from jsonb_array_elements(x) v where jsonb_typeof(v)<>'string' or length(v#>>'{}')>200) then raise exception 'Invalid safety indicator' using errcode='23514';end if;
  elsif f='bedrooms' then if jsonb_typeof(x)<>'number' or (x#>>'{}')::numeric<>trunc((x#>>'{}')::numeric) or (x#>>'{}')::numeric not between 0 and 30 then raise exception 'Invalid bedrooms' using errcode='23514';end if;
  elsif f='followup_requested' then if jsonb_typeof(x)<>'boolean' then raise exception 'Invalid follow-up choice' using errcode='23514';end if;
  elsif jsonb_typeof(x)<>'string' or length(x#>>'{}')>2000 then raise exception 'Invalid model value' using errcode='23514';end if;
 end loop;
 -- Independently repeat deterministic safety review before confidence routing or actions.
 for x in select value from jsonb_array_elements(cfg->'intents') loop
  if (x->>'safety')::boolean and msg~*('\y('||(x->>'pattern')||')\y') then def=x;name=x->>'intent';cf=1;safety=true;exit;end if;
 end loop;
 if not safety and cf<(cfg->'thresholds'->>'medium')::numeric then name='UNKNOWN_QUESTION';select value into def from jsonb_array_elements(cfg->'intents') where value->>'intent'=name;end if;
 act=def->>'action';category=coalesce(e->>'category','other');
 if category not in ('plumbing','electrical','hvac','structural','appliance','pest_control','locks','internet','common_area','other') then raise exception 'Invalid category' using errcode='23514';end if;
 if owner_session and private.pm_owner(t) and act in ('owner_query','owner_override') then role_name='owner';end if;
 fingerprint=md5(jsonb_build_object('p',p,'c',c,'u',u,'msg',msg,'d',d,'confirmed',confirmed,'show_at',show_at,'request',request_id,'w',w,'owner_session',owner_session)::text);
 perform pg_advisory_xact_lock(hashtextextended(t::text||':pma-channel:'||k,0));
 select id,metadata->'outcome' into iid,outc from public.ai4cc_interactions where tenant_id=t and external_id='pma:'||ch||':'||k;
 if found then
  if not exists(select 1 from public.ai4cc_interactions where id=iid and metadata->>'catalog_hash'=fingerprint) then raise exception 'Operation key conflict' using errcode='23514';end if;
  return outc||jsonb_build_object('replayed',true);
 end if;
 outc='{}';
 for f in select jsonb_array_elements_text(def->'required') loop
  allowed=case f
   when 'property' then p is not null when 'unit' then u is not null
   when 'unit_or_common_area' then u is not null or category='common_area'
   when 'contact' then c is not null when 'prospect_name' then nullif(trim(contact.display_name),'') is not null
   when 'contact_method' then coalesce(nullif(contact.phone,''),nullif(contact.email,'')) is not null
   when 'showing_time' then show_at is not null and show_at>now()
   when 'unit_preference' then u is not null or e?'bedrooms'
   when 'move_date' then coalesce(e->>'move_date','')~'^\d{4}-\d{2}-\d{2}$'
   when 'resident_identity' then resident when 'vendor_identity' then vendor when 'owner_identity' then role_name='owner'
   when 'audience' then c is not null
   when 'topic' then length(trim(coalesce(e->>'topic',msg)))>0
   when 'description' then length(trim(coalesce(e->>'description',msg)))>0
   when 'category' then e?'category'
   when 'impact' then length(trim(coalesce(e->>'impact','')))>0
   when 'safety_indicators' then e?'safety_indicators'
   when 'request_or_unit' then request_id is not null or u is not null
   when 'assignment' then vendor and aid is not null
   when 'response' then coalesce(w->>'response',e->>'response','') in ('accepted','declined','completed','information_requested')
   when 'vendor_status' then coalesce(w->>'status',e->>'vendor_status','') in ('scheduled','in_progress','completed')
   when 'notes' then length(trim(coalesce(e->>'notes',msg)))>0
   when 'query' then length(trim(msg))>0 when 'question' then length(trim(msg))>0
   when 'target' then nullif(w->>'requestId','') is not null
   when 'change' then w->>'action' in ('assign','priority','transition')
   when 'confirmation' then confirmed else false end;
  if not coalesce(allowed,false) then missing=array_append(missing,f);end if;
 end loop;
 if act in ('showing','maintenance','vendor_response','vendor_status') and not confirmed then missing=array_append(missing,'confirmation');end if;
 if act='leasing' and coalesce((e->>'followup_requested')::boolean,false) then
  if not confirmed then missing=array_append(missing,'confirmation');end if;
  if c is null or coalesce(nullif(contact.phone,''),nullif(contact.email,'')) is null then missing=array_append(missing,'contact_method');end if;
 end if;
 if not safety and act in ('owner_query','owner_override') and role_name<>'owner' then route='authorization_required';
 elsif not safety and cf>=(cfg->'thresholds'->>'medium')::numeric and cf<(cfg->'thresholds'->>'high')::numeric then route='clarify';
 elsif not safety and cardinality(missing)>0 then route='clarify';else route=act;end if;
 if route='leasing' and not coalesce((e->>'followup_requested')::boolean,false) then route='leasing_information';end if;
 -- Reuse the existing transactional engine for the original business workflows.
 if route in ('leasing','showing','maintenance','status','knowledge','emergency') and p is not null and c is not null then
  if route='maintenance' and not resident then route='authorization_required';
  else
   if route='status' and request_id is null then select id into request_id from public.pm_maintenance_requests where tenant_id=t and property_id=p and unit_id=u and contact_id=c order by created_at desc limit 1;end if;
   outc=private.pm_record_channel_turn(t,p,c,u,k,ch,msg,def->>'legacy',category,case when safety then 'emergency' else 'normal' end,show_at,request_id);
   iid=(outc->>'interactionId')::uuid;answer=outc->>'reply';review=coalesce((outc->>'requiresHumanReview')::boolean,false);notify=route in ('maintenance','emergency');
   if outc?'knowledgeId' then kb=jsonb_build_array(outc->>'knowledgeId');end if;
   for f in select unnest(array['requestId','leadId','showingId']) loop if outc->>f is not null then ids=ids||jsonb_build_array(outc->>f);end if;end loop;
  end if;
 elsif route='leasing_information' then
  select jsonb_build_object('name',prop.name,'amenities',prop.amenities) into x from public.pm_properties prop where prop.tenant_id=t and prop.id=p and prop.accepts_inquiries;
  if x is null then answer='The property team needs to confirm approved public information.';review=true;
  else outc=outc||jsonb_build_object('property_information',x);answer='Here is the approved public property information. Pricing and availability require property-team confirmation. Would you like to request a showing?';end if;
 elsif route='availability' then
  select jsonb_agg(jsonb_build_object('unit_id',v.id,'label',v.label,'bedrooms',v.bedrooms,'record_updated_at',v.updated_at)) into x from public.pm_units v
  where v.tenant_id=t and v.property_id=p and v.status='vacant' and (not(e?'bedrooms') or v.bedrooms=(e->>'bedrooms')::integer)
  and v.updated_at>now()-make_interval(hours=>(cfg->>'availabilityMaxAgeHours')::integer)
  and exists(select 1 from public.pm_properties prop where prop.tenant_id=t and prop.id=p and prop.accepts_inquiries);
  if x is null then answer='I do not have current verified availability to quote. The property team needs to confirm it.';review=true;
  else answer='Current property records list these units as vacant. Availability for your move date still requires property-team confirmation.';outc=outc||jsonb_build_object('units',x,'availabilityGuaranteed',false);end if;
 elsif route='owner_query' then
  select jsonb_build_object('open_requests',count(*) filter(where status not in ('Completed','Closed')),'emergency_requests',count(*) filter(where priority='emergency' and status not in ('Completed','Closed')),'updated_today',count(*) filter(where updated_at::date=current_date)) into x from public.pm_maintenance_requests where tenant_id=t and (p is null or property_id=p);
  outc=outc||jsonb_build_object('summary',x);answer='Here is your authorized operational summary from current records.';
 elsif route='owner_override' then
  select * into r from public.pm_maintenance_requests where tenant_id=t and property_id=p and id=(w->>'requestId')::uuid for update;
  if not found then raise exception 'Target not found' using errcode='42501';end if;
  if coalesce(w->>'version','')!~'^\d+$' or (w->>'version')::integer is distinct from r.version then raise exception 'Request changed; refresh first' using errcode='23514';end if;
  if w->>'action'='assign' then outc=outc||jsonb_build_object('assignment',public.pm_assign_vendor(t,p,r.id,(w->>'vendorId')::uuid));
  else
   if w->>'action'='priority' then
    if coalesce(w->>'priority','') not in ('low','normal','high','emergency') or r.status='Closed' then raise exception 'Invalid priority change' using errcode='23514';end if;
    update public.pm_maintenance_requests set priority=w->>'priority' where tenant_id=t and id=r.id;
   elsif w->>'action'='transition' then
    update public.pm_maintenance_requests set status=w->>'status',scheduled_at=case when w->>'status'='Scheduled' then (w->>'scheduledAt')::timestamptz else scheduled_at end,resolution=case when w->>'status'='Completed' then w->>'resolution' else resolution end where tenant_id=t and id=r.id;
   else raise exception 'Invalid owner action' using errcode='23514';end if;
  end if;
  ids=jsonb_build_array(r.id);notify=true;answer='Your authorized change was recorded. Notification delivery is not confirmed.';
 elsif route in ('vendor_response','vendor_status') then
  if not vendor then route='authorization_required';
  elsif route='vendor_response' and coalesce(w->>'response',e->>'response')<>'information_requested' then outc=outc||public.pm_vendor_response(aid,coalesce(w->>'response',e->>'response'),left(msg,2000));notify=true;ids=jsonb_build_array(aid);answer='Your assignment response was recorded. Property staff must verify completion.';
  elsif route='vendor_status' and coalesce(w->>'status',e->>'vendor_status')='completed' then outc=outc||public.pm_vendor_response(aid,'completed',left(msg,2000));notify=true;ids=jsonb_build_array(aid);answer='Your completion report was recorded. Staff must verify and close the request.';
  else
   if a.status not in ('assigned','accepted') then raise exception 'Assignment is no longer active' using errcode='23514';end if;
   update public.pm_vendor_assignments set vendor_notes=left(msg,2000) where tenant_id=t and id=aid;
   ids=jsonb_build_array(aid);notify=true;review=true;answer='Your update was recorded for property-team review. No arrival time or closure is confirmed.';
  end if;
 elsif route='payment' then
  if msg~*'balance|payment received|was .*payment|did .*payment' then answer='I cannot verify balances or payment receipt through a connected accounting system. The property team must review this.';review=true;
  else x=private.pm_knowledge_answer(t,p,c,u,msg);answer=x->>'reply';review=coalesce((x->>'requiresHumanReview')::boolean,false);if x?'knowledgeId' then kb=jsonb_build_array(x->>'knowledgeId');end if;end if;
 elsif route='lease' then answer='I cannot interpret lease clauses or provide legal advice. I can record your question for authorized property staff.';review=true;
 elsif route='unknown' then answer='I do not have a reliable approved answer. Your question has been recorded for property-team follow-up.';review=true;
 elsif route='help' then answer='I can help with approved property information, maintenance intake and authorized request status. Showing times require confirmation. Vendor and owner actions require the appropriate authenticated account.';
 elsif route='greeting' then answer='Hello. How can I help with your property today?';
 elsif route='clarify' then answer=case when cardinality(missing)>0 then 'Please provide or verify '||replace(missing[1],'_',' ')||' so I can help.' else 'Which one request would you like help with first?' end;
 end if;
 if route='authorization_required' then answer='Please use the appropriate authenticated owner, resident or vendor account for this action.';review=false;notify=false;end if;
 if safety and (p is null or c is null) then answer='Move to safety and contact local emergency services. For suspected gas, leave the area and call your utility or emergency services from a safe location. Emergency dispatch is not confirmed. Share the property only when safe; a safety follow-up will be recorded.';review=true;notify=true;end if;
 if answer is null then answer='The property team needs to review this before any action is taken.';review=true;end if;
 if iid is null then
  insert into public.ai4cc_interactions(tenant_id,channel,direction,external_id,customer_identifier,status,ended_at,metadata) values(t,ch,'inbound','pma:'||ch||':'||k,coalesce(c::text,auth.uid()::text),'completed',now(),jsonb_build_object('source','pma','property_id',p,'contact_id',c,'sandbox',true)) returning id into iid;
  insert into public.ai4cc_transcripts(tenant_id,interaction_id,speaker,sequence_no,content,metadata)values(t,iid,'customer',1,msg,jsonb_build_object('source','pma','sandbox',true)),(t,iid,'agent',2,answer,jsonb_build_object('source','pma','sandbox',true));
 end if;
 if review and route not in ('greeting','help','clarify','authorization_required') then
  insert into public.automation_tasks(tenant_id,task_code,task_name,task_type,status,priority,requires_intervention,intervention_reason,payload)
  values(t,'PMA_KNOWLEDGE_GAP','PMA intent follow-up','MANUAL','BLOCKED',case when safety then 1 else 100 end,true,'Authorized property team review required',jsonb_build_object('source','pma','sandbox',true,'property_id',p,'contact_id',c,'interaction_id',iid,'intent',name,'original_question',msg,'delivery_state','NOT_SENT'))returning id into task;
  notify=true;ids=ids||jsonb_build_array(task);outc=outc||jsonb_build_object('followupTaskId',task);
 end if;
 ids=jsonb_build_array(iid)||ids;
 outc=outc||jsonb_build_object('intent',name,'confidence',cf,'confidence_source',case when safety then 'deterministic_safety' else d->>'confidence_source' end,'catalog_version',cfg->>'version','channel',ch,'platform_tenant_id',t,'tenant_id',t,'property_id',p,'unit_id',u,'contact_role',role_name,'contact_id',c,'prospect_id',outc->'leadId','workflow_action',route,'agent',def->>'agent','workflow',def->>'workflow','priority',case when safety then 'emergency' else 'normal' end,'requires_clarification',route='clarify','requires_escalation',review,'requires_notification',notify,'safety_override',safety,'knowledge_entry_ids',kb,'correlation_id',iid,'timestamp',now(),'resolution',case when route='clarify' then 'clarification_required' when route='authorization_required' then 'authorization_required' when review then 'staff_review_required' else 'recorded' end,'escalation_level',case when safety then 'critical' when review then 'medium' else 'low' end,'duration',extract(epoch from(clock_timestamp()-started))*1000,'duration_scope','workflow_ms','record_ids_created_or_updated',ids,'missing_entities',to_jsonb(missing),'reply',answer,'interactionId',iid,'persisted',true,'notificationSent',false,'emergencyServicesContacted',false,'vendorArrivalConfirmed',false,'issueResolved',false);
 update public.ai4cc_interactions set metadata=metadata||jsonb_build_object('catalog_hash',fingerprint,'catalog',outc-'reply','outcome',outc)where tenant_id=t and id=iid;
 insert into public.audit_log(tenant_id,actor_user_id,action,entity_type,entity_id,details)values(t,auth.uid(),'pma.intent.routed','ai4cc_interactions',iid::text,outc-'reply');
 return outc;
end $$;
revoke all on function private.pm_catalog_turn(uuid,uuid,uuid,uuid,text,text,text,jsonb,boolean,timestamptz,uuid,jsonb,boolean) from public,anon;
grant execute on function private.pm_catalog_turn(uuid,uuid,uuid,uuid,text,text,text,jsonb,boolean,timestamptz,uuid,jsonb,boolean) to authenticated,service_role;
create function public.pm_catalog_turn(t uuid,p uuid,c uuid,u uuid,k text,ch text,msg text,d jsonb,confirmed boolean default false,show_at timestamptz default null,request_id uuid default null,w jsonb default '{}'::jsonb)
returns jsonb language sql security invoker set search_path='' as $$ select private.pm_catalog_turn(t,p,c,u,k,ch,msg,d,confirmed,show_at,request_id,w,true); $$;
revoke all on function public.pm_catalog_turn(uuid,uuid,uuid,uuid,text,text,text,jsonb,boolean,timestamptz,uuid,jsonb) from public,anon;
grant execute on function public.pm_catalog_turn(uuid,uuid,uuid,uuid,text,text,text,jsonb,boolean,timestamptz,uuid,jsonb) to authenticated;
create function public.pm_trusted_catalog_turn(actor uuid,t uuid,p uuid,c uuid,u uuid,k text,ch text,msg text,d jsonb,confirmed boolean default false,show_at timestamptz default null,request_id uuid default null,w jsonb default '{}'::jsonb)
returns jsonb language plpgsql security invoker set search_path='' as $$
declare previous text;outc jsonb;
begin
 if actor is null then raise exception 'Missing trusted actor' using errcode='42501';end if;
 previous=current_setting('request.jwt.claims',true);perform set_config('request.jwt.claims',jsonb_build_object('sub',actor,'role','authenticated')::text,true);
 begin
  if not private.pm_rate_limit() then raise exception 'Rate limit exceeded' using errcode='42501';end if;
  outc=private.pm_catalog_turn(t,p,c,u,k,ch,msg,d,confirmed,show_at,request_id,w,false);
 exception when others then perform set_config('request.jwt.claims',coalesce(previous,''),true);raise;end;
 perform set_config('request.jwt.claims',coalesce(previous,''),true);return outc;
end $$;
revoke all on function public.pm_trusted_catalog_turn(uuid,uuid,uuid,uuid,uuid,text,text,text,jsonb,boolean,timestamptz,uuid,jsonb) from public,anon,authenticated;
grant execute on function public.pm_trusted_catalog_turn(uuid,uuid,uuid,uuid,uuid,text,text,text,jsonb,boolean,timestamptz,uuid,jsonb) to service_role;
revoke execute on function public.pm_record_channel_turn(uuid,uuid,uuid,uuid,text,text,text,text,text,text,timestamptz,uuid) from authenticated;
revoke execute on function public.pm_trusted_channel_turn(uuid,uuid,uuid,uuid,uuid,text,text,text,text,text,text,timestamptz,uuid) from service_role;

commit;
