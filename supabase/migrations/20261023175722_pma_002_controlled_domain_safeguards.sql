-- PMA-002. Additive definitions only; never republishes or edits knowledge rows.
begin;
-- Reconcile source checkout with columns already present in staging. No backfill.
alter table public.ai4cc_knowledge_entries
 add column if not exists source_status text not null default 'UNKNOWN',
 add column if not exists publication_state text not null default 'draft',
 add column if not exists version_num integer not null default 1,
 add column if not exists reviewer_id uuid,
 add column if not exists effective_at timestamptz,
 add column if not exists expires_at timestamptz;
alter table public.pm_properties add column if not exists metadata jsonb,add column if not exists timezone text default 'America/Los_Angeles';
alter table public.pm_units add column if not exists availability_date date;
alter table public.pm_maintenance_requests add column if not exists intake_details jsonb not null default '{}'::jsonb;
create or replace function private.pm_knowledge_eligible_v1(k public.ai4cc_knowledge_entries,t uuid,p uuid,u uuid,resident_access boolean,at_time timestamptz)
returns boolean language sql stable security invoker set search_path='' as $$
 select coalesce(k.tenant_id=t and (k.property_id=p or k.property_id is null)
 and (k.unit_id is null or (resident_access and k.unit_id=u and k.property_id=p))
 and k.approved is true and k.publication_state='published' and k.source_status='VERIFIED'
 and (k.visibility='public' or (k.visibility='resident' and resident_access))
 and k.category is distinct from 'pma_template' and nullif(btrim(k.content),'') is not null
 and (k.effective_at is null or k.effective_at<=at_time)
 and (k.expires_at is null or k.expires_at>at_time)
 and (k.valid_until is null or k.valid_until>at_time),false);
$$;
revoke all on function private.pm_knowledge_eligible_v1(public.ai4cc_knowledge_entries,uuid,uuid,uuid,boolean,timestamptz) from public,anon;
grant execute on function private.pm_knowledge_eligible_v1(public.ai4cc_knowledge_entries,uuid,uuid,uuid,boolean,timestamptz) to authenticated,service_role;
-- Keep staff editing access; narrow only resident/customer answer access.
drop policy if exists ai4cc_knowledge_entries_select on public.ai4cc_knowledge_entries;
create policy ai4cc_knowledge_entries_select on public.ai4cc_knowledge_entries for select to authenticated using (
 (property_id is null and private.is_tenant_member(tenant_id)) or private.pm_staff(tenant_id,property_id)
 or (private.pm_knowledge_eligible_v1(ai4cc_knowledge_entries,tenant_id,property_id,unit_id,true,now()) and
 ((property_id is not null and private.pm_resident(tenant_id,property_id,null,unit_id)) or
 (property_id is null and exists(select 1 from public.pm_occupancies o where o.tenant_id=ai4cc_knowledge_entries.tenant_id and private.pm_resident(o.tenant_id,o.property_id,o.contact_id,o.unit_id))))));
create or replace function public.pm_public_voice_knowledge_v1(t uuid,p uuid)
returns jsonb language sql stable security invoker set search_path='' as $$
 select coalesce(jsonb_agg(to_jsonb(x) order by x.title,x.id),'[]'::jsonb) from (
 select k.id,k.title,k.content,k.tags,k.approved,k.publication_state,k.visibility,k.source_status,k.version_num,k.valid_until,k.effective_at,k.expires_at
 from public.ai4cc_knowledge_entries k where k.property_id=p and k.unit_id is null
 and private.pm_knowledge_eligible_v1(k,t,p,null,false,now())
 and exists(select 1 from public.pm_properties x where x.tenant_id=t and x.id=p and x.status='active' and x.accepts_inquiries)
 order by k.title,k.id limit 64) x;
$$;
revoke all on function public.pm_public_voice_knowledge_v1(uuid,uuid) from public,anon,authenticated;
grant execute on function public.pm_public_voice_knowledge_v1(uuid,uuid) to service_role;
create or replace function private.pm_knowledge_answer(t uuid,p uuid,c uuid,u uuid,msg text) returns jsonb language plpgsql stable security invoker set search_path='' as $$
declare answers jsonb;
begin
 if not (private.pm_staff(t,p,true) or private.pm_resident(t,p,c,u)) then raise exception 'Forbidden' using errcode='42501'; end if;
 with candidates as (
  select k.*,case when k.unit_id is not null then 3 when k.property_id is not null then 2 else 1 end as rank
  from public.ai4cc_knowledge_entries k where k.tenant_id=t and (k.property_id=p or k.property_id is null)
   and (k.unit_id is null or (u=k.unit_id and exists(select 1 from public.pm_occupancies o where o.tenant_id=t and o.property_id=p and o.unit_id=u and o.contact_id=c and o.status='active' and o.starts_on<=current_date and (o.ends_on is null or o.ends_on>=current_date))))
   and private.pm_knowledge_eligible_v1(k,t,p,u,
    exists(select 1 from public.pm_occupancies o where o.tenant_id=t and o.property_id=p and o.contact_id=c and o.status='active' and o.starts_on<=current_date and (o.ends_on is null or o.ends_on>=current_date) and (u is null or o.unit_id=u)),now())
   and to_tsvector('english',k.title||' '||k.content)@@plainto_tsquery('english',msg)
 ) select jsonb_agg(to_jsonb(x) order by x.updated_at desc,x.id) into answers from candidates x where rank=(select max(rank) from candidates);
 if answers is null then return jsonb_build_object('reply','I do not have an approved current answer for this property and contact. The property team needs to review your question.','requiresHumanReview',true); end if;
 if jsonb_array_length(answers)>1 then return jsonb_build_object('reply','I found multiple approved answers and need the property team to confirm which applies.','requiresHumanReview',true,'knowledgeConflict',true); end if;
 return jsonb_build_object('reply',answers->0->>'content','knowledgeId',answers->0->>'id','knowledgeVersion',answers->0->'version_num','knowledgeReviewerId',answers->0->'reviewer_id','knowledgeScope',case (answers->0->>'rank')::integer when 3 then 'unit' when 2 then 'property' else 'owner' end,'requiresHumanReview',false);
end $$;
create or replace function private.pm_catalog_turn(t uuid,p uuid,c uuid,u uuid,k text,ch text,msg text,d jsonb,confirmed boolean,show_at timestamptz,request_id uuid,w jsonb,owner_session boolean)
returns jsonb language plpgsql security definer set search_path='' as $$
declare cfg jsonb=private.pm_catalog_config();def jsonb;x jsonb;e jsonb;name text;cf numeric;act text;route text;f text;missing text[]='{}';allowed boolean;staff boolean;native_resident boolean;vendor boolean=false;resident boolean=false;role_name text='prospect';safety boolean=false;deterministic_safety boolean=false;review boolean=false;notify boolean=false;answer text;fingerprint text;outc jsonb='{}';iid uuid;task uuid;aid uuid;contact public.ai4cc_contacts;a public.pm_vendor_assignments;r public.pm_maintenance_requests;kb jsonb='[]';ids jsonb='[]';started timestamptz=clock_timestamp();category text;
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
  if (x->>'safety')::boolean and msg~*('\y('||(x->>'pattern')||')\y') then def=x;name=x->>'intent';cf=1;safety=true;deterministic_safety=true;exit;end if;
 end loop;
 if not safety and coalesce((def->>'safety')::boolean,false) then safety=true;end if;
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
   if route in ('maintenance','emergency') and outc->>'requestId' is not null then
    update public.pm_maintenance_requests set intake_details=jsonb_build_object('entities',e,'confirmed',confirmed,'original_message',msg,'notification_state','NOT_SENT')
    where tenant_id=t and property_id=p and contact_id=c and id=(outc->>'requestId')::uuid;
   end if;
   iid=(outc->>'interactionId')::uuid;answer=outc->>'reply';review=coalesce((outc->>'requiresHumanReview')::boolean,false);notify=route in ('maintenance','emergency');
   if outc?'knowledgeId' then kb=jsonb_build_array(outc->>'knowledgeId');end if;
   for f in select unnest(array['requestId','leadId','showingId']) loop if outc->>f is not null then ids=ids||jsonb_build_array(outc->>f);end if;end loop;
  end if;
 elsif route='leasing_information' then
  select jsonb_build_object('name',prop.name,'amenities',prop.amenities) into x from public.pm_properties prop where prop.tenant_id=t and prop.id=p and prop.accepts_inquiries;
  if x is null then answer='The property team needs to confirm approved public information.';review=true;
  else outc=outc||jsonb_build_object('property_information',x);answer='Here is the approved public property information. Pricing and availability require property-team confirmation. Would you like to request a showing?';end if;
 elsif route='availability' then
  select jsonb_agg(jsonb_build_object('unit_id',v.id,'label',v.label,'bedrooms',v.bedrooms,'record_updated_at',v.updated_at,'earliestRecordedDate',v.availability_date)) into x from public.pm_units v
  where v.tenant_id=t and v.property_id=p and v.status='vacant' and (u is null or v.id=u) and (not(e?'bedrooms') or v.bedrooms=(e->>'bedrooms')::integer)
  and v.availability_date is not null and v.updated_at<=now()
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
 outc=outc||jsonb_build_object('intent',name,'confidence',cf,'confidence_source',case when deterministic_safety then 'deterministic_safety' else d->>'confidence_source' end,'catalog_version',cfg->>'version','channel',ch,'platform_tenant_id',t,'tenant_id',t,'property_id',p,'unit_id',u,'contact_role',role_name,'contact_id',c,'prospect_id',outc->'leadId','workflow_action',route,'agent',def->>'agent','workflow',def->>'workflow','priority',case when safety then 'emergency' else 'normal' end,'requires_clarification',route='clarify','requires_escalation',review,'requires_notification',notify,'safety_override',safety,'knowledge_entry_ids',kb,'correlation_id',iid,'timestamp',now(),'resolution',case when route='clarify' then 'clarification_required' when route='authorization_required' then 'authorization_required' when review then 'staff_review_required' else 'recorded' end,'escalation_level',case when safety then 'critical' when review then 'medium' else 'low' end,'duration',extract(epoch from(clock_timestamp()-started))*1000,'duration_scope','workflow_ms','record_ids_created_or_updated',ids,'missing_entities',to_jsonb(missing),'reply',answer,'interactionId',iid,'persisted',true,'notificationSent',false,'emergencyServicesContacted',false,'vendorArrivalConfirmed',false,'issueResolved',false);
 update public.ai4cc_interactions set metadata=metadata||jsonb_build_object('catalog_hash',fingerprint,'catalog',outc-'reply','outcome',outc)where tenant_id=t and id=iid;
 insert into public.audit_log(tenant_id,actor_user_id,action,entity_type,entity_id,details)values(t,auth.uid(),'pma.intent.routed','ai4cc_interactions',iid::text,outc-'reply');
 return outc;
end $$;
revoke all on function private.pm_catalog_turn(uuid,uuid,uuid,uuid,text,text,text,jsonb,boolean,timestamptz,uuid,jsonb,boolean) from public,anon;
grant execute on function private.pm_catalog_turn(uuid,uuid,uuid,uuid,text,text,text,jsonb,boolean,timestamptz,uuid,jsonb,boolean) to authenticated,service_role;
-- Synthetic schedule: slot authority remains disabled outside explicit fixture mode.
create table private.pm_tour_slots_v1 (
 id uuid primary key default gen_random_uuid(),tenant_id uuid not null,property_id uuid not null,
 starts_at timestamptz not null,ends_at timestamptz not null,timezone text not null,
 capacity integer not null check(capacity between 1 and 50),version integer not null default 1 check(version>0),
 blackout boolean not null default false,synthetic boolean not null default true check(synthetic),
 source_ref text not null check(length(source_ref) between 1 and 200),
 foreign key(tenant_id,property_id) references public.pm_properties(tenant_id,id),check(ends_at>starts_at)
);
alter table private.pm_tour_slots_v1 enable row level security;
revoke all on private.pm_tour_slots_v1 from public,anon,authenticated;
create unique index if not exists pm_showings_scope_v1 on public.pm_showings(tenant_id,property_id,id);
create table private.pm_tour_operations_v1 (
 tenant_id uuid not null,property_id uuid not null,operation_id text not null check(length(operation_id) between 8 and 160),
 contact_id uuid not null,slot_id uuid references private.pm_tour_slots_v1(id),showing_id uuid not null,
 request_hash text not null,outcome jsonb not null,created_at timestamptz not null default now(),
 primary key(tenant_id,operation_id),foreign key(tenant_id,property_id) references public.pm_properties(tenant_id,id),
 foreign key(tenant_id,contact_id) references public.ai4cc_contacts(tenant_id,id),
 foreign key(tenant_id,property_id,showing_id) references public.pm_showings(tenant_id,property_id,id)
);
alter table private.pm_tour_operations_v1 enable row level security;
revoke all on private.pm_tour_operations_v1 from public,anon,authenticated;
-- The test gate requires BOTH a DB setting and a fixture property; nothing enables them here.
create function private.pm_synthetic_tours_v1(t uuid,p uuid) returns boolean language sql stable security invoker set search_path='' as $$
 select coalesce(current_setting('pma.synthetic_tours_enabled',true)='on' and exists(select 1 from public.pm_properties q where q.tenant_id=t and q.id=p and q.metadata->>'pma_synthetic_tours'='true'),false);
$$;
revoke all on function private.pm_synthetic_tours_v1(uuid,uuid) from public,anon;
grant execute on function private.pm_synthetic_tours_v1(uuid,uuid) to authenticated,service_role;
create function private.pm_list_tour_slots_v1(t uuid,p uuid,from_time timestamptz,to_time timestamptz)
returns jsonb language plpgsql stable security definer set search_path='' as $$
declare slots jsonb;
begin
 if not private.pm_staff(t,p,true) then raise exception 'Forbidden' using errcode='42501';end if;
 if from_time is null or to_time is null or to_time<=from_time or to_time-from_time>interval '31 days' then raise exception 'Invalid slot window' using errcode='22023';end if;
 if not private.pm_synthetic_tours_v1(t,p) then return jsonb_build_object('contractVersion','1.0','mode','REQUESTED_ONLY','slots','[]'::jsonb,'authoritative',false);end if;
 select coalesce(jsonb_agg(to_jsonb(x) order by x.starts_at,x.id),'[]'::jsonb) into slots from (
 select s.id,s.starts_at,s.ends_at,s.timezone,s.version,s.source_ref,s.capacity-count(o.slot_id) as remaining
 from private.pm_tour_slots_v1 s left join private.pm_tour_operations_v1 o on o.slot_id=s.id
 where s.tenant_id=t and s.property_id=p and not s.blackout and s.starts_at>=from_time and s.starts_at>now() and s.ends_at<=to_time
 and exists(select 1 from public.pm_properties q where q.tenant_id=t and q.id=p and q.status='active' and q.accepts_inquiries and q.timezone=s.timezone)
 group by s.id having count(o.slot_id)<s.capacity order by s.starts_at,s.id limit 100) x;
 return jsonb_build_object('contractVersion','1.0','mode','SYNTHETIC_TEST','slots',slots,'authoritative',false,'testOnly',true);
end $$;
revoke all on function private.pm_list_tour_slots_v1(uuid,uuid,timestamptz,timestamptz) from public,anon;
grant execute on function private.pm_list_tour_slots_v1(uuid,uuid,timestamptz,timestamptz) to authenticated;
create function public.pm_list_tour_slots_v1(t uuid,p uuid,from_time timestamptz,to_time timestamptz)
returns jsonb language sql security invoker set search_path='' as $$select private.pm_list_tour_slots_v1(t,p,from_time,to_time);$$;
revoke all on function public.pm_list_tour_slots_v1(uuid,uuid,timestamptz,timestamptz) from public,anon;
grant execute on function public.pm_list_tour_slots_v1(uuid,uuid,timestamptz,timestamptz) to authenticated;
create function private.pm_request_or_book_showing_v1(t uuid,p uuid,c uuid,u uuid,operation_id text,requested_at timestamptz,notes text,slot_id uuid,slot_version integer)
returns jsonb language plpgsql security definer set search_path='' as $$
declare old private.pm_tour_operations_v1;s private.pm_tour_slots_v1;showing public.pm_showings;answer jsonb;fingerprint text;
begin
 if not private.pm_staff(t,p,true) then raise exception 'Forbidden' using errcode='42501';end if;
 if operation_id is null or length(operation_id) not between 8 and 150 or requested_at is null or length(coalesce(notes,''))>2000 then raise exception 'Invalid showing operation' using errcode='22023';end if;
 if not exists(select 1 from public.pm_properties q where q.tenant_id=t and q.id=p and q.status='active' and q.accepts_inquiries) or not exists(select 1 from public.ai4cc_contacts where tenant_id=t and id=c) or (u is not null and not exists(select 1 from public.pm_units where tenant_id=t and property_id=p and id=u)) then raise exception 'Invalid scope' using errcode='42501';end if;
 -- Prose is excluded from identity: rephrased retries recover the committed reference.
 fingerprint=md5(jsonb_build_object('property',p,'contact',c,'unit',u,'time',requested_at,'slot',slot_id,'version',slot_version)::text);
 perform pg_advisory_xact_lock(hashtextextended(t::text||':tour-v1:'||operation_id,0));
 select * into old from private.pm_tour_operations_v1 o where o.tenant_id=t and o.operation_id=pm_request_or_book_showing_v1.operation_id;
 if found then
  if old.property_id<>p or old.contact_id<>c or old.request_hash<>fingerprint then raise exception 'Operation conflict' using errcode='23514';end if;
  return old.outcome||jsonb_build_object('replayed',true);
 end if;
 if requested_at<=now() then raise exception 'Future time required' using errcode='22023';end if;
 if slot_id is not null then
  if not private.pm_synthetic_tours_v1(t,p) then return jsonb_build_object('status','REQUESTED_ONLY','persisted',false,'bookingConfirmed',false,'reason','Scheduling authority unavailable');end if;
  select * into s from private.pm_tour_slots_v1 where id=slot_id and tenant_id=t and property_id=p for update;
  if not found then raise exception 'Invalid slot scope' using errcode='42501';end if;
  if not exists(select 1 from public.pm_properties q where q.tenant_id=t and q.id=p and q.timezone=s.timezone) then raise exception 'Timezone changed; refresh slots' using errcode='23514';end if;
  if s.blackout or s.version is distinct from slot_version or s.starts_at<>requested_at or (select count(*) from private.pm_tour_operations_v1 o where o.slot_id=s.id)>=s.capacity then
   return jsonb_build_object('status','CONFLICT','persisted',false,'bookingConfirmed',false,'testOnly',true);
  end if;
 end if;
 showing=public.pm_request_showing(t,p,u,c,requested_at,coalesce(notes,''),'tour-v1:'||operation_id);
 if slot_id is not null then update public.pm_showings set status='confirmed' where tenant_id=t and property_id=p and id=showing.id;end if;
 answer=jsonb_build_object('contractVersion','1.0','status',case when slot_id is null then 'REQUESTED' else 'CONFIRMED_SYNTHETIC' end,'showingId',showing.id,'leadId',showing.lead_id,'persisted',true,'bookingConfirmed',slot_id is not null,'testOnly',true,'notificationSent',false);
 insert into private.pm_tour_operations_v1(tenant_id,property_id,operation_id,contact_id,slot_id,showing_id,request_hash,outcome) values(t,p,operation_id,c,slot_id,showing.id,fingerprint,answer);
 insert into public.audit_log(tenant_id,actor_user_id,action,entity_type,entity_id,details) values(t,auth.uid(),'pma.tour.v1','pm_showings',showing.id::text,answer);
 return answer;
end $$;
revoke all on function private.pm_request_or_book_showing_v1(uuid,uuid,uuid,uuid,text,timestamptz,text,uuid,integer) from public,anon;
grant execute on function private.pm_request_or_book_showing_v1(uuid,uuid,uuid,uuid,text,timestamptz,text,uuid,integer) to authenticated;
create function public.pm_request_or_book_showing_v1(t uuid,p uuid,c uuid,u uuid,operation_id text,requested_at timestamptz,notes text default '',slot_id uuid default null,slot_version integer default null)
returns jsonb language sql security invoker set search_path='' as $$select private.pm_request_or_book_showing_v1(t,p,c,u,operation_id,requested_at,notes,slot_id,slot_version);$$;
revoke all on function public.pm_request_or_book_showing_v1(uuid,uuid,uuid,uuid,text,timestamptz,text,uuid,integer) from public,anon;
grant execute on function public.pm_request_or_book_showing_v1(uuid,uuid,uuid,uuid,text,timestamptz,text,uuid,integer) to authenticated;

-- Existing CRM is authoritative. Service-only PMA session capture; no caller identity inference.
create function public.pm_capture_prospect_v1(t uuid,p uuid,session_id uuid,call_sid text,operation_id text,details jsonb)
returns jsonb language plpgsql security invoker set search_path='' as $$
declare parent public.ai4cc_interactions;n text;em text;ph text;cid uuid;lid uuid;fingerprint text;prior jsonb;answer jsonb;ver integer;expected integer;
begin
 select * into parent from public.ai4cc_interactions where tenant_id=t and id=session_id for update;
 if not found or parent.channel<>'voice' or parent.ended_at is not null or parent.metadata->>'synthetic' is distinct from 'true' or parent.metadata->>'voice_demo' is distinct from 'true' or parent.metadata->>'selected_route' is distinct from 'property-management-assistant' or parent.metadata->>'property_id' is distinct from p::text or parent.metadata->>'call_sid' is distinct from call_sid or call_sid is null or call_sid !~ '^CA[0-9a-fA-F]{32}$' then raise exception 'Active synthetic PMA session required' using errcode='42501';end if;
 if not exists(select 1 from public.pm_properties where tenant_id=t and id=p and status='active' and accepts_inquiries) then raise exception 'Property unavailable' using errcode='42501';end if;
 if operation_id is null or length(operation_id) not between 8 and 150 or jsonb_typeof(details) is distinct from 'object' or exists(select 1 from jsonb_object_keys(details) f where f not in ('name','email','phone','consent','confirmed','expectedVersion')) then raise exception 'Invalid capture operation' using errcode='22023';end if;
 if details->'consent' is distinct from 'true'::jsonb or details->'confirmed' is distinct from 'true'::jsonb then return jsonb_build_object('status','CONSENT_REQUIRED','persisted',false);end if;
 if jsonb_typeof(details->'name') is distinct from 'string' or (details ? 'email' and details->'email'<>'null'::jsonb and jsonb_typeof(details->'email')<>'string') or (details ? 'phone' and details->'phone'<>'null'::jsonb and jsonb_typeof(details->'phone')<>'string') then raise exception 'Contact details must be text' using errcode='22023';end if;
 n=btrim(details->>'name');em=nullif(lower(btrim(details->>'email')),'');ph=nullif(btrim(details->>'phone'),'');
 if n is null or length(n) not between 2 and 150 or (em is null and ph is null) or (em is not null and (length(em)>254 or em !~ '^[^ @]+@[^ @]+\.[^ @]+$')) or (ph is not null and ph !~ '^\+[1-9][0-9]{7,14}$') then raise exception 'Invalid confirmed contact details' using errcode='22023';end if;
 if coalesce(details->>'expectedVersion','0') !~ '^[0-9]{1,6}$' then raise exception 'Invalid contact version' using errcode='22023';end if;
 expected=coalesce(details->>'expectedVersion','0')::integer;
 fingerprint=md5(jsonb_build_object('name',n,'email',em,'phone',ph,'expectedVersion',expected)::text);
 prior=parent.metadata->'pma_capture_operations'->operation_id;
 if prior is not null then
  if prior->>'fingerprint' is distinct from fingerprint then raise exception 'Operation conflict' using errcode='23514';end if;
  return (prior-'fingerprint')||jsonb_build_object('replayed',true);
 end if;
 ver=coalesce((parent.metadata->'pma_prospect_capture'->>'version')::integer,0);
 if expected<>ver then raise exception 'Contact changed; refresh confirmed details' using errcode='23514';end if;
 if (select count(*) from jsonb_object_keys(coalesce(parent.metadata->'pma_capture_operations','{}'::jsonb)))>=20 then raise exception 'Capture correction limit' using errcode='23514';end if;
 if ver=0 then
  insert into public.ai4cc_contacts(tenant_id,display_name,email,phone,lead_source,metadata)
  values(t,n,em,ph,'pma',jsonb_build_object('pma_session_id',session_id,'property_id',p,'synthetic',true,'consent',true,'confirmed_at',now(),'notificationsDisabled',true)) returning id into cid;
  insert into public.ai4cc_leads(tenant_id,contact_id,originating_interaction_id,originating_channel,title,service_interest,description,metadata)
  values(t,cid,session_id,'voice','Property prospect inquiry','Property leasing','Confirmed PMA prospect capture',jsonb_build_object('source','pma','property_id',p,'session_id',session_id,'synthetic',true,'notificationsDisabled',true)) returning id into lid;
 else
  cid=(parent.metadata->'pma_prospect_capture'->>'contactId')::uuid;lid=(parent.metadata->'pma_prospect_capture'->>'leadId')::uuid;
  update public.ai4cc_contacts set display_name=n,email=em,phone=ph,metadata=metadata||jsonb_build_object('confirmed_at',now(),'consent',true)
  where tenant_id=t and id=cid and metadata->>'pma_session_id'=session_id::text and metadata->>'property_id'=p::text and metadata->>'synthetic'='true';
  if not found then raise exception 'Contact binding rejected' using errcode='42501';end if;
 end if;
 answer=jsonb_build_object('contractVersion','1.0','status','CAPTURED','operationId',operation_id,'fingerprint',fingerprint,'contactId',cid,'leadId',lid,'version',ver+1,'persisted',true,'notificationSent',false,'testOnly',true);
 update public.ai4cc_interactions set metadata=metadata||jsonb_build_object('pma_prospect_capture',answer-'fingerprint','pma_capture_operations',coalesce(metadata->'pma_capture_operations','{}'::jsonb)||jsonb_build_object(operation_id,answer)) where tenant_id=t and id=session_id;
 insert into public.audit_log(tenant_id,action,entity_type,entity_id,details)values(t,'pma.prospect.capture.v1','ai4cc_contacts',cid::text,jsonb_build_object('session_id',session_id,'property_id',p,'consent',true,'operation_id',operation_id,'version',ver+1));
 return answer-'fingerprint';
end $$;
revoke all on function public.pm_capture_prospect_v1(uuid,uuid,uuid,text,text,jsonb) from public,anon,authenticated;
grant execute on function public.pm_capture_prospect_v1(uuid,uuid,uuid,text,text,jsonb) to service_role;

create function private.pm_submit_maintenance_v1(t uuid,p uuid,c uuid,u uuid,operation_id text,ch text,details jsonb)
returns jsonb language plpgsql security definer set search_path='' as $$
declare r public.pm_maintenance_requests;outcome jsonb;fingerprint text;cat text;urg text;descr text;impact text;task uuid;
begin
 if not (private.pm_staff(t,p,true) or private.pm_resident(t,p,c,u)) then raise exception 'Forbidden' using errcode='42501';end if;
 if operation_id is null or length(operation_id) not between 8 and 140 or ch is null or ch not in ('voice','sms','chat') or jsonb_typeof(details) is distinct from 'object' or octet_length(details::text)>12000 or exists(select 1 from jsonb_object_keys(details) k where k not in ('category','description','impact','urgency','safetyIndicators','preferredContactMethod','photos','confirmed')) then raise exception 'Invalid maintenance intake' using errcode='22023';end if;
 if details->'confirmed' is distinct from 'true'::jsonb then return jsonb_build_object('status','CONFIRMATION_REQUIRED','persisted',false);end if;
 cat=details->>'category';urg=details->>'urgency';descr=btrim(details->>'description');impact=btrim(details->>'impact');
 if jsonb_typeof(details->'description') is distinct from 'string' or jsonb_typeof(details->'impact') is distinct from 'string' then raise exception 'Issue details must be text' using errcode='22023';end if;
 if cat is null or cat not in ('plumbing','electrical','hvac','structural','appliance','pest_control','locks','internet','common_area','other') or urg is null or urg not in ('low','normal','high','emergency') or descr is null or length(descr) not between 1 and 4000 or impact is null or length(impact) not between 1 and 2000 or (u is null and cat<>'common_area') or jsonb_typeof(details->'safetyIndicators') is distinct from 'array' then raise exception 'Complete category, location, description, impact, urgency and safety review required' using errcode='22023';end if;
 if jsonb_array_length(details->'safetyIndicators')>10 or exists(select 1 from jsonb_array_elements(details->'safetyIndicators') x where jsonb_typeof(x)<>'string' or length(x#>>'{}')>200) then raise exception 'Invalid safety indicators' using errcode='22023';end if;
 if details ? 'preferredContactMethod' and details->>'preferredContactMethod' not in ('phone','email','sms') then raise exception 'Invalid contact method' using errcode='22023';end if;
 if details ? 'photos' and (jsonb_typeof(details->'photos') is distinct from 'array' or jsonb_array_length(details->'photos')>5) then raise exception 'Invalid optional evidence' using errcode='22023';end if;
 if details ? 'photos' and exists(select 1 from jsonb_array_elements(details->'photos') x where jsonb_typeof(x)<>'string' or length(x#>>'{}')>500) then raise exception 'Invalid optional evidence reference' using errcode='22023';end if;
 -- Existing deterministic safety override wins over a routine urgency assertion.
 if descr~*'\y(fire|smoke|gas leak|smell gas|sparking|flooding|burst pipe|threatening me)\y' or jsonb_array_length(details->'safetyIndicators')>0 then urg='emergency';end if;
 fingerprint=md5(jsonb_build_object('property',p,'contact',c,'unit',u,'channel',ch,'details',details)::text);
 perform pg_advisory_xact_lock(hashtextextended(t::text||':maintenance-v1:'||operation_id,0));
 select * into r from public.pm_maintenance_requests where tenant_id=t and idempotency_key='maintenance-v1:'||operation_id;
 if found then
  if r.property_id<>p or r.contact_id<>c or r.unit_id is distinct from u or r.intake_details->>'fingerprint' is distinct from fingerprint then raise exception 'Maintenance operation conflict' using errcode='23514';end if;
  return r.intake_details->'outcome'||jsonb_build_object('replayed',true);
 end if;
 outcome=private.pm_record_channel_turn(t,p,c,u,'maintenance-v1:'||operation_id,ch,descr,case when urg='emergency' then 'emergency_event' else 'maintenance_request' end,cat,urg,null,null);
 select id into task from public.automation_tasks where tenant_id=t and task_code='PMA_NOTIFICATION' and payload->>'entity_id'=outcome->>'requestId' order by created_at limit 1;
 outcome=outcome||jsonb_build_object('contractVersion','1.0','notificationState','QUEUED_SIMULATED','notificationTaskId',task,'notificationSent',false,'providerReceiptId',null,'urgency',urg);
 update public.pm_maintenance_requests set intake_details=details||jsonb_build_object('fingerprint',fingerprint,'outcome',outcome) where tenant_id=t and property_id=p and id=(outcome->>'requestId')::uuid;
 return outcome;
end $$;
revoke all on function private.pm_submit_maintenance_v1(uuid,uuid,uuid,uuid,text,text,jsonb) from public,anon;
grant execute on function private.pm_submit_maintenance_v1(uuid,uuid,uuid,uuid,text,text,jsonb) to authenticated;
create function public.pm_submit_maintenance_v1(t uuid,p uuid,c uuid,u uuid,operation_id text,ch text,details jsonb)
returns jsonb language sql security invoker set search_path='' as $$select private.pm_submit_maintenance_v1(t,p,c,u,operation_id,ch,details);$$;
revoke all on function public.pm_submit_maintenance_v1(uuid,uuid,uuid,uuid,text,text,jsonb) from public,anon;
grant execute on function public.pm_submit_maintenance_v1(uuid,uuid,uuid,uuid,text,text,jsonb) to authenticated;

commit;
