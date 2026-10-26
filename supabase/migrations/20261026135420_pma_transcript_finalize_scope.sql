-- Staging transcript finalization only: permit the same bound call for five
-- minutes after a verified completion. Incident/preference write scope is unchanged.
begin;

create function private.pma_voice_assert_transcript_scope(t uuid,p uuid,session_id uuid,call_sid text)
returns uuid language plpgsql security definer set search_path='' as $$
declare parent public.ai4cc_interactions; cfg private.pm_voice_config_v1; bound private.pm_voice_sessions_v1;
begin
 if coalesce(auth.role(),'')<>'service_role' then raise exception 'Service role required' using errcode='42501';end if;
 select * into cfg from private.pm_voice_config_v1 q where q.tenant_id=t and q.property_id=p and q.enabled;
 if not found then raise exception 'PMA voice binding unavailable' using errcode='42501';end if;
 select * into parent from public.ai4cc_interactions q where q.id=session_id and q.tenant_id=t for update;
 if not found or parent.channel<>'voice' or not ((parent.status in ('open','active') and parent.ended_at is null)
   or (parent.status='completed' and parent.ended_at between now()-interval '5 minutes' and now() and parent.ended_at>=parent.started_at))
 or parent.started_at is null or parent.started_at>now() or parent.started_at<now()-interval '2 hours'
 or parent.metadata->>'synthetic' is distinct from 'true' or parent.metadata->>'voice_demo' is distinct from 'true'
 or parent.metadata->>'selected_route' is distinct from 'property-management-assistant'
 or parent.metadata->>'property_id' is distinct from p::text or parent.metadata->>'call_sid' is distinct from call_sid
 or call_sid is null or call_sid !~ '^CA[0-9a-fA-F]{32}$'
 or not exists(select 1 from public.pm_properties q where q.id=p and q.tenant_id=t and q.status='active' and q.accepts_inquiries and q.timezone='America/Los_Angeles')
 then raise exception 'Bound staging PMA transcript session required' using errcode='42501';end if;
 insert into private.pm_voice_sessions_v1(session_id,tenant_id,property_id,call_sid,actor_id,expires_at)
 values(session_id,t,p,call_sid,cfg.actor_id,parent.started_at+interval '2 hours') on conflict do nothing;
 select * into bound from private.pm_voice_sessions_v1 q where q.session_id=pma_voice_assert_transcript_scope.session_id;
 if bound.tenant_id<>t or bound.property_id<>p or bound.call_sid<>call_sid or bound.actor_id<>cfg.actor_id or bound.expires_at<=now()
 then raise exception 'Immutable PMA session scope mismatch' using errcode='42501';end if;
 return cfg.actor_id;
end $$;
revoke all on function private.pma_voice_assert_transcript_scope(uuid,uuid,uuid,text) from public,anon,authenticated,service_role;

create or replace function public.pma_voice_transcript_save_v1(t uuid,p uuid,session_id uuid,call_sid text,transcript jsonb)
returns jsonb language plpgsql security definer set search_path='' as $$
declare actor uuid; prior_claims text; existing private.pm_voice_transcript_captures_v1; transcript_hash text; seq integer; item jsonb; speaker text; content text; n integer=0; opid text;
begin
 actor=private.pma_voice_assert_transcript_scope(t,p,session_id,call_sid);
 if jsonb_typeof(transcript) is distinct from 'array' or jsonb_array_length(transcript) not between 1 and 200
 then raise exception 'Invalid staging transcript' using errcode='22023';end if;
 if exists(select 1 from jsonb_array_elements(transcript) x where jsonb_typeof(x) is distinct from 'object'
   or x->>'speaker' is null or x->>'speaker' not in ('customer','agent') or jsonb_typeof(x->'content') is distinct from 'string'
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
