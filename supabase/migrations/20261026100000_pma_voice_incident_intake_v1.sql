-- Staging-first PMA voice incident intake. This creates a reported case for
-- property review; it does not authenticate occupancy or send notifications.
begin;

alter table public.pm_maintenance_requests
  add column if not exists case_number text;
update public.pm_maintenance_requests
   set case_number='PMA-'||upper(substr(replace(gen_random_uuid()::text,'-',''),1,10))
 where case_number is null;
alter table public.pm_maintenance_requests
  alter column case_number set default ('PMA-'||upper(substr(replace(gen_random_uuid()::text,'-',''),1,10))),
  alter column case_number set not null;
create unique index if not exists pm_maintenance_requests_case_number_uq
  on public.pm_maintenance_requests(case_number);

create table private.pm_voice_transcript_captures_v1(
 session_id uuid primary key references private.pm_voice_sessions_v1(session_id),
 tenant_id uuid not null,property_id uuid not null,call_sid text not null,
 operation_id text not null unique default ('pma:v1:'||gen_random_uuid()::text),
 transcript_hash text not null check(length(transcript_hash)=32),row_count integer not null check(row_count between 1 and 200),
 captured_at timestamptz not null default now(),
 foreign key(tenant_id,property_id) references private.pm_voice_config_v1(tenant_id,property_id)
);
alter table private.pm_voice_transcript_captures_v1 enable row level security;
revoke all on private.pm_voice_transcript_captures_v1 from public,anon,authenticated,service_role;

create function private.pma_voice_assert_scope(t uuid,p uuid,session_id uuid,call_sid text)
returns uuid language plpgsql security definer set search_path='' as $$
declare parent public.ai4cc_interactions; cfg private.pm_voice_config_v1; bound private.pm_voice_sessions_v1;
begin
 if coalesce(auth.role(),'')<>'service_role' then raise exception 'Service role required' using errcode='42501';end if;
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
 then raise exception 'Active staging PMA session required' using errcode='42501';end if;
 insert into private.pm_voice_sessions_v1(session_id,tenant_id,property_id,call_sid,actor_id,expires_at)
 values(session_id,t,p,call_sid,cfg.actor_id,parent.started_at+interval '2 hours') on conflict do nothing;
 select * into bound from private.pm_voice_sessions_v1 q where q.session_id=pma_voice_assert_scope.session_id;
 if bound.tenant_id<>t or bound.property_id<>p or bound.call_sid<>call_sid or bound.actor_id<>cfg.actor_id or bound.expires_at<=now()
 then raise exception 'Immutable PMA session scope mismatch' using errcode='42501';end if;
 return cfg.actor_id;
end $$;
revoke all on function private.pma_voice_assert_scope(uuid,uuid,uuid,text) from public,anon,authenticated,service_role;

create function public.pma_voice_incident_create_v1(t uuid,p uuid,session_id uuid,call_sid text,incident jsonb)
returns jsonb language plpgsql security definer set search_path='' as $$
declare actor uuid; prior_claims text; op private.pm_voice_operations_v1; facts jsonb; cid uuid; saved jsonb; req public.pm_maintenance_requests; opid text;
 name text; address text; unit_label text; description text; urgent boolean;
begin
 actor=private.pma_voice_assert_scope(t,p,session_id,call_sid);
 if jsonb_typeof(incident) is distinct from 'object' or octet_length(incident::text)>10000
 or exists(select 1 from jsonb_object_keys(incident) k where k not in ('reportedName','reportedAddress','reportedUnit','description'))
 then raise exception 'Invalid incident report' using errcode='22023';end if;
 name=btrim(incident->>'reportedName');address=btrim(incident->>'reportedAddress');unit_label=btrim(incident->>'reportedUnit');description=incident->>'description';
 if name is null or length(name) not between 2 and 150 or address is null or length(address) not between 5 and 300
 or unit_label is null or length(unit_label) not between 1 and 80 or description is null or length(description) not between 1 and 4000
 then raise exception 'Tenant name, address, apartment and incident description are required' using errcode='22023';end if;
 facts=jsonb_build_object('reportedName',name,'reportedAddress',address,'reportedUnit',unit_label,'description',description);
 perform pg_advisory_xact_lock(hashtextextended(t::text||':pma-voice-incident:'||session_id::text,0));
 select * into op from private.pm_voice_operations_v1 q where q.session_id=pma_voice_incident_create_v1.session_id and q.kind='maintenance' and q.revision=0 for update;
 if found then
  if op.facts<>facts then return jsonb_build_object('state','CONFLICT','interactionPersisted',true,'domainPersisted',true,'persisted',true,'requestId',op.outcome->>'requestId','caseNumber',op.outcome->>'caseNumber','operationId',op.operation_id,'reply','The report already exists with different details. The original report is unchanged; property staff must review the correction.','notificationSent',false,'testOnly',true);end if;
  return op.outcome||jsonb_build_object('replayed',true);
 end if;
 prior_claims=current_setting('request.jwt.claims',true);
 perform set_config('request.jwt.claims',jsonb_build_object('sub',actor,'role','authenticated')::text,true);
 if not private.pm_staff(t,p,true) then raise exception 'Configured actor lacks property write authority' using errcode='42501';end if;
 insert into public.ai4cc_contacts(tenant_id,display_name,lead_source,metadata)
 values(t,name,'pma_voice_incident',jsonb_build_object('source','pma_voice_incident','identity_status','caller_asserted','pma_session_id',session_id,'property_id',p)) returning id into cid;
 insert into private.pm_voice_operations_v1(session_id,kind,revision,facts,outcome)
 values(session_id,'maintenance',0,facts,'{}'::jsonb) returning * into op;
 opid=op.operation_id;
 urgent=description~*'(fire|smoke|gas leak|smell gas|sparking|electrical danger|severe flooding|burst pipe|immediate threat|immediate danger)';
 insert into public.pm_maintenance_requests(tenant_id,property_id,unit_id,contact_id,interaction_id,summary,description,category,priority,status,source_channel,idempotency_key,intake_details)
 values(t,p,null,cid,session_id,left(description,500),description,'other',case when urgent then 'emergency' else 'normal' end,'New','voice','pma-voice:'||session_id::text,
   jsonb_build_object('voiceSessionId',session_id,'callerAssertedIdentity',true,'reportedName',name,'reportedAddress',address,
     'reportedUnit',unit_label,'descriptionVerbatim',description,'contactPreferenceState','NOT_COLLECTED','urgentReviewRequired',urgent))
 returning * into req;
 saved=jsonb_build_object('state','CONFIRMED','interactionPersisted',true,'domainPersisted',true,'persisted',true,
   'requestId',req.id,'caseNumber',req.case_number,'operationId',opid,'status',req.status,'urgentReviewRequired',urgent,
   'reply','Your incident report has been created. Your case number is '||req.case_number||'.',
   'notificationSent',false,'notificationState','NOT_SENT','vendorAssigned',false,'testOnly',true);
 update private.pm_voice_operations_v1 set outcome=saved where operation_id=opid;
 perform set_config('request.jwt.claims',coalesce(prior_claims,''),true);
 insert into public.audit_log(tenant_id,actor_user_id,action,entity_type,entity_id,details)
 values(t,actor,'pma.voice.incident.create.v1','pm_maintenance_requests',req.id::text,
   jsonb_build_object('property_id',p,'session_id',session_id,'call_sid',call_sid,'operation_id',opid,'test_only',true));
 return saved;
exception when others then
 perform set_config('request.jwt.claims',coalesce(prior_claims,''),true);
 raise;
end $$;
revoke all on function public.pma_voice_incident_create_v1(uuid,uuid,uuid,text,jsonb) from public,anon,authenticated;
grant execute on function public.pma_voice_incident_create_v1(uuid,uuid,uuid,text,jsonb) to service_role;

create function public.pma_voice_incident_preference_v1(t uuid,p uuid,session_id uuid,call_sid text,request_id uuid,method text,destination text,consent boolean)
returns jsonb language plpgsql security definer set search_path='' as $$
declare actor uuid; prior_claims text; req public.pm_maintenance_requests; normalized text; opid text;
begin
 actor=private.pma_voice_assert_scope(t,p,session_id,call_sid);
 if method not in ('sms','email','phone') or consent is distinct from true or request_id is null then raise exception 'Explicit update preference consent required' using errcode='22023';end if;
 normalized=btrim(destination);
 if method='email' and normalized !~ '^[^ @]+@[^ @]+\.[^ @]+$' then raise exception 'Valid email destination required' using errcode='22023';end if;
 if method in ('sms','phone') and normalized !~ '^\+[1-9][0-9]{7,14}$' then raise exception 'Valid phone destination required' using errcode='22023';end if;
 perform pg_advisory_xact_lock(hashtextextended(t::text||':pma-voice-contact-preference:'||request_id::text,0));
 select * into req from public.pm_maintenance_requests q where q.tenant_id=t and q.property_id=p and q.id=request_id
   and q.intake_details->>'voiceSessionId'=pma_voice_incident_preference_v1.session_id::text for update;
 if not found then raise exception 'Incident report is not bound to this call' using errcode='42501';end if;
 if req.intake_details->'contactPreference'->>'method'=method
   and req.intake_details->'contactPreference'->>'destination'=normalized
   and req.intake_details->'contactPreference'->'consent'='true'::jsonb then
  return jsonb_build_object('state','CONFIRMED','interactionPersisted',true,'domainPersisted',true,'persisted',true,
   'requestId',request_id,'operationId',req.intake_details->'contactPreference'->>'operationId','status',req.status,
   'reply','Your contact preference is already recorded. No update message has been sent.','notificationSent',false,'testOnly',true,'replayed',true);
 end if;
 opid='pma:v1:'||gen_random_uuid()::text;
 prior_claims=current_setting('request.jwt.claims',true);
 perform set_config('request.jwt.claims',jsonb_build_object('sub',actor,'role','authenticated')::text,true);
 if not private.pm_staff(t,p,true) then raise exception 'Configured actor lacks property write authority' using errcode='42501';end if;
 update public.pm_maintenance_requests set intake_details=intake_details||jsonb_build_object('contactPreference',jsonb_build_object(
   'method',method,'destination',normalized,'consent',true,'operationId',opid,'recordedAt',now(),'notificationSent',false,'source','caller_confirmed'))
 where tenant_id=t and property_id=p and id=request_id;
 perform set_config('request.jwt.claims',coalesce(prior_claims,''),true);
 insert into public.audit_log(tenant_id,actor_user_id,action,entity_type,entity_id,details)
 values(t,actor,'pma.voice.incident.contact_preference.v1','pm_maintenance_requests',request_id::text,
   jsonb_build_object('property_id',p,'session_id',session_id,'method',method,'consent',true,'notification_sent',false,'test_only',true));
 return jsonb_build_object('state','CONFIRMED','interactionPersisted',true,'domainPersisted',true,'persisted',true,
   'requestId',request_id,'operationId',opid,'status',req.status,
   'reply','Your contact preference has been recorded. No update message has been sent.','notificationSent',false,'testOnly',true);
exception when others then
 perform set_config('request.jwt.claims',coalesce(prior_claims,''),true);
 raise;
end $$;
revoke all on function public.pma_voice_incident_preference_v1(uuid,uuid,uuid,text,uuid,text,text,boolean) from public,anon,authenticated;
grant execute on function public.pma_voice_incident_preference_v1(uuid,uuid,uuid,text,uuid,text,text,boolean) to service_role;

create function public.pma_voice_transcript_save_v1(t uuid,p uuid,session_id uuid,call_sid text,transcript jsonb)
returns jsonb language plpgsql security definer set search_path='' as $$
declare actor uuid; prior_claims text; existing private.pm_voice_transcript_captures_v1; transcript_hash text; seq integer; item jsonb; speaker text; content text; n integer=0; opid text;
begin
 actor=private.pma_voice_assert_scope(t,p,session_id,call_sid);
 if jsonb_typeof(transcript) is distinct from 'array' or jsonb_array_length(transcript) not between 1 and 200
 then raise exception 'Invalid staging transcript' using errcode='22023';end if;
 if exists(select 1 from jsonb_array_elements(transcript) x where jsonb_typeof(x) is distinct from 'object'
   or x->>'speaker' not in ('customer','agent') or jsonb_typeof(x->'content') is distinct from 'string'
   or length(btrim(x->>'content')) not between 1 and 4000
   or exists(select 1 from jsonb_object_keys(x) k where k not in ('speaker','content')))
 then raise exception 'Invalid staging transcript turn' using errcode='22023';end if;
 transcript_hash=md5(transcript::text);
 perform pg_advisory_xact_lock(hashtextextended(t::text||':pma-voice-transcript:'||session_id::text,0));
 select * into existing from private.pm_voice_transcript_captures_v1 q where q.session_id=pma_voice_transcript_save_v1.session_id for update;
 if found then
  if existing.transcript_hash<>transcript_hash then raise exception 'Transcript capture already finalized with different content' using errcode='23514';end if;
  return jsonb_build_object('state','CONFIRMED','interactionPersisted',true,'domainPersisted',true,'persisted',true,
    'operationId',existing.operation_id,'transcriptTurns',existing.row_count,'replayed',true,'testOnly',true);
 end if;
 prior_claims=current_setting('request.jwt.claims',true);
 perform set_config('request.jwt.claims',jsonb_build_object('sub',actor,'role','authenticated')::text,true);
 if not private.pm_staff(t,p,true) then raise exception 'Configured actor lacks property write authority' using errcode='42501';end if;
 select coalesce(max(sequence_no),0)+1 into seq from public.ai4cc_transcripts where tenant_id=t and interaction_id=session_id;
 for item in select value from jsonb_array_elements(transcript) loop
  speaker=item->>'speaker';content=item->>'content';
  insert into public.ai4cc_transcripts(tenant_id,interaction_id,speaker,sequence_no,content,metadata)
  values(t,session_id,speaker,seq+n,content,jsonb_build_object('source','pma_voice_runtime','testOnly',true));
  n=n+1;
 end loop;
 insert into private.pm_voice_transcript_captures_v1(session_id,tenant_id,property_id,call_sid,transcript_hash,row_count)
 values(session_id,t,p,call_sid,transcript_hash,n) returning operation_id into opid;
 perform set_config('request.jwt.claims',coalesce(prior_claims,''),true);
 insert into public.audit_log(tenant_id,actor_user_id,action,entity_type,entity_id,details)
 values(t,actor,'pma.voice.transcript.capture.v1','ai4cc_interactions',session_id::text,
   jsonb_build_object('property_id',p,'call_sid',call_sid,'turn_count',n,'test_only',true));
 return jsonb_build_object('state','CONFIRMED','interactionPersisted',true,'domainPersisted',true,'persisted',true,
   'operationId',opid,'transcriptTurns',n,'testOnly',true);
exception when others then
 perform set_config('request.jwt.claims',coalesce(prior_claims,''),true);
 raise;
end $$;
revoke all on function public.pma_voice_transcript_save_v1(uuid,uuid,uuid,text,jsonb) from public,anon,authenticated;
grant execute on function public.pma_voice_transcript_save_v1(uuid,uuid,uuid,text,jsonb) to service_role;

commit;
