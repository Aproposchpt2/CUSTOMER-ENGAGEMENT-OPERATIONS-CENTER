-- PMA-only trusted bridge. No rows are provisioned/enabled by this migration.
-- A DBA must bind a reviewed property writer; service_role has no direct config/ledger rights.
create table private.pm_voice_config_v1(
 tenant_id uuid not null,property_id uuid not null,actor_id uuid not null references auth.users(id),
 enabled boolean not null default false,primary key(tenant_id,property_id),
 foreign key(tenant_id,property_id) references public.pm_properties(tenant_id,id)
);
create table private.pm_voice_sessions_v1(
 session_id uuid primary key references public.ai4cc_interactions(id),tenant_id uuid not null,property_id uuid not null,
 call_sid text not null,actor_id uuid not null,expires_at timestamptz not null,
 foreign key(tenant_id,property_id) references private.pm_voice_config_v1(tenant_id,property_id)
);
create table private.pm_voice_operations_v1(
 session_id uuid not null references private.pm_voice_sessions_v1(session_id),kind text not null,
 revision integer not null default 0,operation_id text not null unique default ('pma:v1:'||gen_random_uuid()::text),
 facts jsonb not null,outcome jsonb not null,created_at timestamptz not null default now(),
 primary key(session_id,kind,revision),check(kind in ('prospect','showing','maintenance'))
);
alter table private.pm_voice_config_v1 enable row level security;
alter table private.pm_voice_sessions_v1 enable row level security;
alter table private.pm_voice_operations_v1 enable row level security;
revoke all on private.pm_voice_config_v1,private.pm_voice_sessions_v1,private.pm_voice_operations_v1 from public,anon,authenticated,service_role;

create function private.pm_voice_turn_v1(t uuid,p uuid,session_id uuid,call_sid text,turn jsonb)
returns jsonb language plpgsql security definer set search_path='' as $$
<<voice_scope>>
declare parent public.ai4cc_interactions;cfg private.pm_voice_config_v1;bound private.pm_voice_sessions_v1;
 op private.pm_voice_operations_v1;prior_claims text;outc jsonb;facts jsonb;kind text;revision integer=0;cid uuid;
 act text;state text='INFORMATION';reply text;kb jsonb;matched jsonb;units jsonb;correlation uuid=gen_random_uuid();
begin
 -- Executable only by service_role. No actor/role/contact/unit input exists.
 select * into cfg from private.pm_voice_config_v1 q where q.tenant_id=t and q.property_id=p and q.enabled;
 if not found then raise exception 'PMA voice binding unavailable' using errcode='42501';end if;
 select * into parent from public.ai4cc_interactions q where q.id=session_id and q.tenant_id=t for update;
 if not found or parent.channel<>'voice' or parent.status not in ('open','active') or parent.ended_at is not null
 or parent.started_at is null or parent.started_at>now() or parent.started_at<now()-interval '2 hours'
 or parent.metadata->>'synthetic' is distinct from 'true' or parent.metadata->>'voice_demo' is distinct from 'true'
 or parent.metadata->>'selected_route' is distinct from 'property-management-assistant'
 or parent.metadata->>'property_id' is distinct from p::text or parent.metadata->>'call_sid' is distinct from call_sid
 or call_sid is null or call_sid !~ '^CA[0-9a-fA-F]{32}$'
 or not exists(select 1 from public.pm_properties q where q.id=p and q.tenant_id=t and q.status='active' and q.accepts_inquiries and q.timezone='America/Los_Angeles')
 then raise exception 'Active PMA session required' using errcode='42501';end if;
 insert into private.pm_voice_sessions_v1 values(session_id,t,p,call_sid,cfg.actor_id,parent.started_at+interval '2 hours') on conflict do nothing;
 select * into bound from private.pm_voice_sessions_v1 q where q.session_id=pm_voice_turn_v1.session_id;
 if bound.tenant_id<>t or bound.property_id<>p or bound.call_sid<>call_sid or bound.actor_id<>cfg.actor_id or bound.expires_at<=now() then raise exception 'Immutable session scope mismatch' using errcode='42501';end if;
 if jsonb_typeof(turn) is distinct from 'object' or octet_length(turn::text)>16000
 or exists(select 1 from jsonb_object_keys(turn) k where k not in ('intent','confidence','message','confirmed','action','safety','details','requestedAt','notes','bedrooms','kind'))
 or not exists(select 1 from jsonb_array_elements(private.pm_catalog_config()->'intents') x where x->>'intent'=turn->>'intent')
 then raise exception 'Invalid bounded turn' using errcode='22023';end if;
 act=turn->>'action';
 prior_claims=current_setting('request.jwt.claims',true);
 perform set_config('request.jwt.claims',jsonb_build_object('sub',cfg.actor_id,'role','authenticated')::text,true);
 begin
  if not private.pm_staff(t,p,true) then raise exception 'Configured actor lacks property write authority' using errcode='42501';end if;
  reply='The property team needs to review this request. No domain request has been saved.';
  if act='recover' then
   if turn->>'kind' not in ('prospect','showing') then raise exception 'Invalid recovery kind' using errcode='22023';end if;
   select * into op from private.pm_voice_operations_v1 q where q.session_id=pm_voice_turn_v1.session_id and q.kind=turn->>'kind' order by q.revision desc limit 1;
   if found and op.outcome<>'{}'::jsonb then perform set_config('request.jwt.claims',coalesce(prior_claims,''),true);return op.outcome||jsonb_build_object('replayed',true,'historical',true);end if;
   state='UNKNOWN';reply='No committed operation was found for this call. Nothing is confirmed.';
  elsif act='safety' then
   -- Record concern against parent session only; caller is not an authenticated resident.
   reply=case when (turn->>'message')~*'carbon monoxide|co alarm|co detector|gas' then 'Leave the area and get to fresh air immediately. From a safe location, contact local emergency services. Do not re-enter until emergency responders say it is safe. I cannot confirm dispatch.'
   when (turn->>'message')~*'medical|breathe|breathing|unconscious|chest pain|overdose' then 'Contact local emergency services immediately. Move to safety if you can and follow the emergency dispatcher instructions. I cannot confirm dispatch.'
   else 'Move to a safe location and contact local emergency services immediately. Do not wait for property staff. I cannot confirm dispatch.' end;
  elsif act='clarify' then state='CLARIFICATION_REQUIRED';reply='Please confirm the missing details and your permission before I save a request.';
  elsif act in ('authorization','maintenance') then
   -- No independent resident/staff identity verifier exists for this voice route.
   -- Preserve structured intake in the interaction log without creating a work order.
   state='AUTHORIZATION_REQUIRED';reply='Please use the authenticated resident or staff portal for this action. A spoken name, caller number or prospect record does not verify resident identity. No work order or dispatch is confirmed.';
  elsif act='slots' then
   outc=public.pm_list_tour_slots_v1(t,p,now(),now()+interval '1 day');
   -- Even fixtures are never offered by the real demonstration voice route.
   outc=jsonb_build_object('mode','REQUESTED_ONLY','slots','[]'::jsonb,'authoritative',false);
   reply='I can save a tour request for staff review. I have no authoritative appointment calendar and cannot confirm a booking.';
  elsif act in ('prospect','showing') then
   kind=act;
   if turn->'confirmed' is distinct from 'true'::jsonb then state='CLARIFICATION_REQUIRED';reply='Please confirm the details before saving.';
   else
    if kind='prospect' then
     if jsonb_typeof(turn->'details') is distinct from 'object' or coalesce(turn->'details'->>'expectedVersion','0')!~'^[0-9]{1,2}$' then raise exception 'Invalid capture revision' using errcode='22023';end if;
     revision=coalesce(turn->'details'->>'expectedVersion','0')::integer;
     facts=turn->'details';
    else
     cid=(parent.metadata->'pma_prospect_capture'->>'contactId')::uuid;
     if cid is null or parent.metadata->'pma_prospect_capture'->'persisted' is distinct from 'true'::jsonb
      or not exists(select 1 from public.ai4cc_contacts q where q.id=cid and q.tenant_id=t and q.metadata->>'pma_session_id'=session_id::text and q.metadata->>'property_id'=p::text and q.metadata->>'consent'='true')
     then state='CLARIFICATION_REQUIRED';reply='I need your consent and confirmed contact details before saving a tour request.';end if;
     if turn->>'requestedAt' is null or turn->>'requestedAt' !~ '(Z|[+-][0-9]{2}:[0-9]{2})$' then raise exception 'Explicit showing instant required' using errcode='22023';end if;
     facts=jsonb_build_object('contactId',cid,'requestedAt',(turn->>'requestedAt')::timestamptz);
    end if;
    if state<>'CLARIFICATION_REQUIRED' then
     select * into op from private.pm_voice_operations_v1 q where q.session_id=pm_voice_turn_v1.session_id and q.kind=voice_scope.kind and q.revision=voice_scope.revision;
     if found then
      if op.facts<>facts then state='CONFLICT';reply='These details differ from the original operation. Staff review is needed; the original request is unchanged.';
      else perform set_config('request.jwt.claims',coalesce(prior_claims,''),true);return op.outcome||jsonb_build_object('replayed',true);end if;
     else
      insert into private.pm_voice_operations_v1(session_id,kind,revision,facts,outcome) values(session_id,kind,revision,facts,'{}') returning * into op;
      if kind='prospect' then
       outc=public.pm_capture_prospect_v1(t,p,session_id,call_sid,op.operation_id,turn->'details');
       if outc->>'status'='CAPTURED' and outc->'persisted'='true'::jsonb then state='CONFIRMED';reply='Your consented contact details were saved. This does not verify resident identity. No notification was sent.';
       else state='CLARIFICATION_REQUIRED';reply='Explicit consent and confirmed contact details are required.';end if;
      else
       -- Force both synthetic fixture gates OFF within this transaction. No slot ID accepted.
       perform set_config('pma.synthetic_tours_enabled','off',true);
       outc=public.pm_request_or_book_showing_v1(t,p,cid,null,op.operation_id,(turn->>'requestedAt')::timestamptz,coalesce(turn->>'notes',''),null,null);
       if outc->>'status'='REQUESTED' and outc->'persisted'='true'::jsonb and outc->>'showingId' is not null then state='REQUESTED';reply='Your tour request was saved, pending staff confirmation. It is not a booked appointment. No notification was sent.';
       else state='UNKNOWN';reply='The request result is unconfirmed. Recover the original operation before confirming it.';end if;
      end if;
     end if;
    end if;
   end if;
  elsif act='availability' then
   select coalesce(jsonb_agg(jsonb_build_object('unit',q.label,'bedrooms',q.bedrooms,'earliestRecordedDate',q.availability_date,'recordUpdatedAt',q.updated_at) order by q.availability_date),'[]'::jsonb) into units
   from public.pm_units q where q.tenant_id=t and q.property_id=p and q.status='vacant' and q.availability_date is not null and q.updated_at>now()-interval '24 hours' and q.updated_at<=now()
   and (turn->'bedrooms' is null or turn->'bedrooms'='null'::jsonb or q.bedrooms=(turn->>'bedrooms')::integer);
   outc=jsonb_build_object('units',units,'availabilityGuaranteed',false,'availabilityMaxAgeHours',24,'timezone','America/Los_Angeles');
   reply=case when jsonb_array_length(units)=0 then 'I have no current verified inventory to quote. Staff must confirm availability.' else 'These are recorded earliest rental dates, not tour appointments or guaranteed availability.' end;
  elsif act='knowledge' then
   kb=public.pm_public_voice_knowledge_v1(t,p);
   select coalesce(jsonb_agg(x),'[]'::jsonb) into matched from jsonb_array_elements(kb) x where to_tsvector('english',coalesce(x->>'title','')||' '||coalesce(x->>'content',''))@@plainto_tsquery('english',turn->>'message');
   if jsonb_array_length(matched)=1 and (turn->>'message')!~*'rent|late fee|grace|smok|pet|assistance animal|screening|credit|deposit|towing|notice' then
    outc=jsonb_build_object('knowledgeEntries',matched);reply=matched->0->>'content';
   else reply='I do not have one unambiguous approved answer for that question. The property team needs to review it.';end if;
  elsif act='information' then
   reply=case turn->>'intent' when 'GENERAL_GREETING' then 'How can I help you with the property?' when 'HELP_REQUEST' then 'I can help with approved property information, current recorded availability and consented tour requests. Resident and staff actions require the authenticated portal.' else 'The property team needs to review account, payment or lease questions through the authenticated portal.' end;
  elsif act<>'staff' then raise exception 'Unsupported bounded action' using errcode='22023';
  end if;
  outc=coalesce(outc,'{}'::jsonb)||jsonb_build_object('state',state,'reply',reply,'interactionPersisted',true,'domainPersisted',state in ('CONFIRMED','REQUESTED'),'bookingConfirmed',false,'notificationSent',false,'providerReceiptId',null,'testOnly',true,'sessionId',session_id,'intent',turn->>'intent','correlationId',correlation);
  if op.operation_id is not null and state in ('CONFIRMED','REQUESTED') then
   outc=outc||jsonb_build_object('operationId',op.operation_id);
   update private.pm_voice_operations_v1 q set outcome=outc where q.operation_id=op.operation_id;
  elsif op.operation_id is not null and op.outcome='{}'::jsonb then delete from private.pm_voice_operations_v1 q where q.operation_id=op.operation_id;
  end if;
  update public.ai4cc_interactions set metadata=metadata||jsonb_build_object('pma_last_turn',jsonb_build_object('intent',turn->>'intent','state',state,'correlation_id',correlation,'operation_id',op.operation_id,'maintenance_intake',case when act='maintenance' then turn->'details' else null end,'safety',act='safety')) where id=session_id and tenant_id=t;
  insert into public.audit_log(tenant_id,actor_user_id,action,entity_type,entity_id,details) values(t,cfg.actor_id,'pma.voice.turn.v1','ai4cc_interactions',session_id::text,jsonb_build_object('intent',turn->>'intent','state',state,'correlation_id',correlation,'operation_id',op.operation_id,'domain_persisted',state in ('CONFIRMED','REQUESTED'),'notification_sent',false));
 exception when others then perform set_config('request.jwt.claims',coalesce(prior_claims,''),true);raise;
 end;
 perform set_config('request.jwt.claims',coalesce(prior_claims,''),true);
 return outc;
end $$;
revoke all on function private.pm_voice_turn_v1(uuid,uuid,uuid,text,jsonb) from public,anon,authenticated;
grant execute on function private.pm_voice_turn_v1(uuid,uuid,uuid,text,jsonb) to service_role;
create function public.pm_voice_turn_v1(t uuid,p uuid,session_id uuid,call_sid text,turn jsonb)
returns jsonb language sql security invoker set search_path='' as $$select private.pm_voice_turn_v1(t,p,session_id,call_sid,turn);$$;
revoke all on function public.pm_voice_turn_v1(uuid,uuid,uuid,text,jsonb) from public,anon,authenticated;
grant execute on function public.pm_voice_turn_v1(uuid,uuid,uuid,text,jsonb) to service_role;
