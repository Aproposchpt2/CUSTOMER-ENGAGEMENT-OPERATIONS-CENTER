-- PROPOSED ONLY. Requires separate authorization before applying to staging.
-- No raw table grants, no RLS changes, and no production target support.
create or replace function private.pm_staging_emergency_prepare_v1(
 t uuid,p uuid,call_sid text,session_id uuid,intent text,message text,test_mode boolean default false
) returns jsonb language plpgsql security definer set search_path='' as $$
declare incident uuid; existing uuid; prefs jsonb; severity text; property_name text;
begin
 if coalesce(current_setting('request.jwt.claims',true),'{}')::jsonb->>'role' is distinct from 'service_role' then
  raise exception 'Trusted staging backend required' using errcode='42501';
 end if;
 if t is distinct from '5885a020-d363-4c27-910a-c035eda132f5'::uuid
 or p is distinct from 'eead9ac5-b28b-4594-b75b-a9e9bbbd111f'::uuid then
  raise exception 'Staging scope rejected' using errcode='42501';
 end if;
 if intent is null or intent not in ('FIRE_EMERGENCY','GAS_EMERGENCY','FLOOD_EMERGENCY','SECURITY_EMERGENCY','PERSONAL_SAFETY_THREAT')
 or call_sid is null or call_sid !~ '^CA[0-9a-fA-F]{32}$' or session_id is null
 or message is null or length(btrim(message))=0 or length(message)>500 then
  raise exception 'Invalid emergency request' using errcode='22023';
 end if;
 select x.name into property_name from public.pm_properties x where x.id=p and x.tenant_id=t and x.status='active';
 if not found then raise exception 'Active staging property required' using errcode='42501';end if;
 if test_mode then
  if session_id<>'00000000-0000-4000-8000-000000000000'::uuid then
   raise exception 'Invalid synthetic test session' using errcode='42501';
  end if;
 else
  if not exists(select 1 from public.ai4cc_interactions x where x.id=session_id and x.tenant_id=t
   and x.metadata->>'call_sid'=call_sid and x.metadata->>'property_id'=p::text
   and x.metadata->>'selected_route'='property-management-assistant'
   and x.metadata->>'voice_demo'='true' and x.ended_at is null
   and x.started_at<=clock_timestamp() and x.started_at>clock_timestamp()-interval '2 hours') then
   raise exception 'Active bound PMA call required' using errcode='42501';
  end if;
 end if;
 -- Lock one call/intent so retries reuse the incident without duplicate notifications.
 perform pg_advisory_xact_lock(hashtextextended(t::text||':'||call_sid||':'||intent,0));
 select x.id into existing from public.platform_incidents x where x.tenant_id=t
  and x.service='pma-voice-staging' and x.incident_key='pma:emergency:v1:'||call_sid||':'||intent;
 if existing is not null then
  return jsonb_build_object('incidentId',existing,'notify',false,'preferences','[]'::jsonb,'state','EXISTING_INCIDENT_REVIEW_DELIVERY');
 end if;
 severity=case when intent in ('FIRE_EMERGENCY','GAS_EMERGENCY') then 'SEV1' else 'SEV2' end;
 insert into public.platform_incidents(incident_key,severity,status,title,summary,tenant_id,service,opened_at,metadata)
 values('pma:emergency:v1:'||call_sid||':'||intent,severity,'OPEN','[STAGING] '||replace(intent,'_',' ')||' — '||property_name,
  'Staging report: '||message,t,'pma-voice-staging',clock_timestamp(),
  jsonb_build_object('intent',intent,'call_sid',call_sid,'session_id',session_id,'property_id',p,'staging',true,'test_mode',test_mode,'notification_state','ATTEMPT_PENDING'))
 returning id into incident;
 select coalesce(jsonb_agg(jsonb_build_object('channel',x.channel,'destination',x.destination)),'[]'::jsonb) into prefs
 from public.pm_notification_preferences x where x.tenant_id=t and x.entity_type='property' and x.entity_id=p
 and x.event_type='emergency_escalation' and x.active=true and x.staging_override=true
 and ((x.channel='sms' and x.destination='+17753508039') or x.channel='email');
 return jsonb_build_object('incidentId',incident,'notify',true,'preferences',prefs,'state','INCIDENT_CREATED');
end $$;
revoke all on function private.pm_staging_emergency_prepare_v1(uuid,uuid,text,uuid,text,text,boolean) from public,anon,authenticated;
grant execute on function private.pm_staging_emergency_prepare_v1(uuid,uuid,text,uuid,text,text,boolean) to service_role;

create or replace function public.pm_staging_emergency_prepare_v1(
 t uuid,p uuid,call_sid text,session_id uuid,intent text,message text,test_mode boolean default false
) returns jsonb language sql security invoker set search_path='' as $$
 select private.pm_staging_emergency_prepare_v1(t,p,call_sid,session_id,intent,message,test_mode);
$$;
revoke all on function public.pm_staging_emergency_prepare_v1(uuid,uuid,text,uuid,text,text,boolean) from public,anon,authenticated;
grant execute on function public.pm_staging_emergency_prepare_v1(uuid,uuid,text,uuid,text,text,boolean) to service_role;

create or replace function private.pm_staging_emergency_verify_v1(t uuid,p uuid)
returns jsonb language plpgsql security definer set search_path='' as $$
declare incidents jsonb; prefs jsonb;
begin
 if coalesce(current_setting('request.jwt.claims',true),'{}')::jsonb->>'role' is distinct from 'service_role'
 or t is distinct from '5885a020-d363-4c27-910a-c035eda132f5'::uuid
 or p is distinct from 'eead9ac5-b28b-4594-b75b-a9e9bbbd111f'::uuid then
  raise exception 'Staging verification scope rejected' using errcode='42501';
 end if;
 select coalesce(jsonb_agg(to_jsonb(x)),'[]'::jsonb) into incidents from (
  select i.id,i.incident_key,i.severity,i.status,i.title,i.service,i.opened_at
  from public.platform_incidents i where i.tenant_id=t and i.service='pma-voice-staging'
  and i.metadata->>'property_id'=p::text order by i.opened_at desc limit 5
 ) x;
 select coalesce(jsonb_agg(jsonb_build_object('channel',x.channel,'destination',x.destination,'active',x.active,'staging_override',x.staging_override,'event_type',x.event_type)),'[]'::jsonb)
 into prefs from public.pm_notification_preferences x where x.tenant_id=t and x.entity_type='property'
 and x.entity_id=p and x.event_type='emergency_escalation' and x.staging_override=true;
 return jsonb_build_object('incidents',incidents,'notificationConfig',prefs);
end $$;
revoke all on function private.pm_staging_emergency_verify_v1(uuid,uuid) from public,anon,authenticated;
grant execute on function private.pm_staging_emergency_verify_v1(uuid,uuid) to service_role;
create or replace function public.pm_staging_emergency_verify_v1(t uuid,p uuid)
returns jsonb language sql security invoker set search_path='' as $$
 select private.pm_staging_emergency_verify_v1(t,p);
$$;
revoke all on function public.pm_staging_emergency_verify_v1(uuid,uuid) from public,anon,authenticated;
grant execute on function public.pm_staging_emergency_verify_v1(uuid,uuid) to service_role;
