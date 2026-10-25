-- REVIEW ONLY: not applied. Adds staging evidence; does not activate preferences.
begin;
create table private.pm_staging_sms_vendor_binding_v1(
 tenant_id uuid not null,property_id uuid not null,vendor_id uuid not null,
 destination text not null check(destination='+17253305102'),
 primary key(tenant_id,property_id),
 foreign key(vendor_id) references public.pm_vendors(id)
);
create table private.pm_staging_sms_attempts_v1(
 id uuid primary key default gen_random_uuid(),tenant_id uuid not null,property_id uuid not null,
 incident_id uuid not null references public.platform_incidents(id),
 recipient_role text not null check(recipient_role in ('owner','vendor','tenant','owner_backup')),
 destination text not null,vendor_id uuid references public.pm_vendors(id),
 ack_token text not null unique default replace(gen_random_uuid()::text,'-',''),
 submission_state text not null default 'PREPARED' check(submission_state in ('PREPARED','SUBMITTED','FAILED','UNKNOWN')),
 provider_sid text unique,provider_initial_status text,delivery_status text,delivery_rank integer not null default 0,submission_error_code text,delivery_error_code text,
 vendor_test_ack_received_at timestamptz,created_at timestamptz not null default clock_timestamp(),
 updated_at timestamptz not null default clock_timestamp(),unique(incident_id,recipient_role)
);
create table private.pm_staging_sms_events_v1(
 event_key text primary key,attempt_id uuid not null references private.pm_staging_sms_attempts_v1(id),
 event_kind text not null,provider_sid text,status text,error_code text,created_at timestamptz not null default clock_timestamp()
);
create table private.pm_staging_sms_inbox_v1(
 message_sid text primary key,sender text not null,destination text not null,body_hash text not null,
 attempt_id uuid references private.pm_staging_sms_attempts_v1(id),created_at timestamptz not null default clock_timestamp()
);
alter table private.pm_staging_sms_vendor_binding_v1 enable row level security;
alter table private.pm_staging_sms_attempts_v1 enable row level security;
alter table private.pm_staging_sms_events_v1 enable row level security;
alter table private.pm_staging_sms_inbox_v1 enable row level security;
revoke all on private.pm_staging_sms_vendor_binding_v1,private.pm_staging_sms_attempts_v1,private.pm_staging_sms_events_v1,private.pm_staging_sms_inbox_v1 from public,anon,authenticated,service_role;

create function private.pm_staging_sms_evidence_v1(t uuid,p uuid,payload jsonb) returns jsonb
language plpgsql security definer set search_path='' as $$
<<sms_scope>>
declare op text=payload->>'op';role_name text;dest text;event_name text;inc public.platform_incidents;
 a private.pm_staging_sms_attempts_v1;inbox private.pm_staging_sms_inbox_v1;vendor uuid;
 sid text=payload->>'message_sid';status text=payload->>'status';error_code text=payload->>'error_code';
 rank_value integer;created_id uuid;event_key text;ack text=payload->>'ack_token';
begin
 if coalesce(current_setting('request.jwt.claims',true),'{}')::jsonb->>'role' is distinct from 'service_role'
 or t is distinct from '5885a020-d363-4c27-910a-c035eda132f5'::uuid
 or p is distinct from 'eead9ac5-b28b-4594-b75b-a9e9bbbd111f'::uuid then
  raise exception 'Staging evidence scope rejected' using errcode='42501';end if;
 if jsonb_typeof(payload) is distinct from 'object' or octet_length(payload::text)>4000
 or op not in ('begin','complete','status','receive','inspect') or op is null then
  raise exception 'Invalid evidence operation' using errcode='22023';end if;
 if error_code is not null and error_code !~ '^[0-9]{1,8}$' then raise exception 'Invalid provider error' using errcode='22023';end if;
 if op='inspect' then
  return jsonb_build_object('attempts',(select coalesce(jsonb_agg(jsonb_build_object(
   'attemptId',x.id,'incidentId',x.incident_id,'recipientRole',x.recipient_role,'destinationSuffix',right(x.destination,4),
   'submissionState',x.submission_state,'providerMessageId',x.provider_sid,'providerInitialStatus',x.provider_initial_status,
   'deliveryStatus',x.delivery_status,'submissionErrorCode',x.submission_error_code,'deliveryErrorCode',x.delivery_error_code,
   'vendorTestAckReceivedAt',x.vendor_test_ack_received_at,'vendorAcceptedAssignment',false,'createdAt',x.created_at
  ) order by x.created_at desc),'[]'::jsonb) from (select logged.* from private.pm_staging_sms_attempts_v1 logged where logged.tenant_id=t and logged.property_id=p order by logged.created_at desc limit 50) x),
   'ownedInboxCount',(select count(*) from private.pm_staging_sms_inbox_v1),'liveSmsAttempted',false);
 end if;
 if op='begin' then
  role_name=payload->>'role';
  dest=case role_name when 'owner' then '+17753508039' when 'vendor' then '+17253305102' when 'tenant' then '+17027102622' when 'owner_backup' then '+17029351414' end;
  event_name=case role_name when 'owner' then 'emergency_escalation' when 'vendor' then 'pma_v2_maintenance_vendor_test' when 'tenant' then 'pma_v2_tenant_test' when 'owner_backup' then 'pma_v2_owner_backup_test' end;
  if dest is null then raise exception 'Unapproved recipient role' using errcode='42501';end if;
  select * into inc from public.platform_incidents x where x.id=(payload->>'incident_id')::uuid and x.tenant_id=t
   and x.service='pma-voice-staging' and x.status='OPEN' and x.metadata->>'property_id'=p::text
   and x.metadata->>'staging'='true' and x.opened_at<=clock_timestamp() and x.opened_at>clock_timestamp()-interval '2 hours';
  if not found then raise exception 'Bound incident required' using errcode='42501';end if;
  if inc.metadata->>'test_mode'='true' then
   if inc.metadata->>'session_id' is distinct from '00000000-0000-4000-8000-000000000000' or inc.opened_at<clock_timestamp()-interval '15 minutes' then raise exception 'Fresh synthetic incident required' using errcode='42501';end if;
  elsif not exists(select 1 from public.ai4cc_interactions i where i.id=(inc.metadata->>'session_id')::uuid and i.tenant_id=t and i.ended_at is null and i.metadata->>'call_sid'=inc.metadata->>'call_sid' and i.metadata->>'property_id'=p::text and i.metadata->>'selected_route'='property-management-assistant' and i.metadata->>'voice_demo'='true' and i.started_at<=clock_timestamp() and i.started_at>clock_timestamp()-interval '2 hours') then
   raise exception 'Active bound PMA call required' using errcode='42501';end if;
  if not exists(select 1 from public.pm_notification_preferences x where x.tenant_id=t and x.entity_type='property' and x.entity_id=p and x.channel='sms' and x.event_type=event_name and x.destination=dest and x.active and x.staging_override) then raise exception 'Active approved preference required' using errcode='42501';end if;
  if role_name='vendor' then
   select b.vendor_id into vendor from private.pm_staging_sms_vendor_binding_v1 b
    join public.pm_property_vendors v on v.tenant_id=b.tenant_id and v.property_id=b.property_id and v.vendor_id=b.vendor_id
    join public.pm_vendors r on r.id=v.vendor_id and r.tenant_id=t and r.status='active'
    where b.tenant_id=t and b.property_id=p and b.destination=dest;
   if not found then raise exception 'Verified staging vendor assignment required' using errcode='42501';end if;
  end if;
  insert into private.pm_staging_sms_attempts_v1(tenant_id,property_id,incident_id,recipient_role,destination,vendor_id)
   values(t,p,inc.id,role_name,dest,vendor) on conflict(incident_id,recipient_role) do nothing returning id into created_id;
  select * into a from private.pm_staging_sms_attempts_v1 x where x.incident_id=inc.id and x.recipient_role=role_name;
  return jsonb_build_object('attempt_id',a.id,'ack_token',a.ack_token,'claimed',created_id is not null);
 end if;
 if op='receive' then
  if sid is null or sid !~ '^SM[0-9a-fA-F]{32}$' or payload->>'body_hash' is null or payload->>'body_hash' !~ '^[0-9a-f]{64}$'
   or ((payload->>'from'='+17252010584' and payload->>'to' in ('+17253305102','+17027102622','+17029351414')) or (payload->>'from'='+17253305102' and payload->>'to'='+17252010584')) is distinct from true then raise exception 'Unapproved owned-number event' using errcode='42501';end if;
  if ack is not null then
   if ack !~ '^[0-9a-f]{32}$' or payload->>'from' is distinct from '+17253305102' or payload->>'to' is distinct from '+17252010584' then raise exception 'Invalid test acknowledgment' using errcode='42501';end if;
   select * into a from private.pm_staging_sms_attempts_v1 x where x.tenant_id=t and x.property_id=p and x.ack_token=ack and x.recipient_role='vendor' and x.provider_sid is not null and x.submission_state='SUBMITTED' and x.created_at>clock_timestamp()-interval '2 hours' for update;
   if not found then raise exception 'Bound vendor test notification required' using errcode='42501';end if;
  end if;
  insert into private.pm_staging_sms_inbox_v1(message_sid,sender,destination,body_hash,attempt_id) values(sid,payload->>'from',payload->>'to',payload->>'body_hash',a.id) on conflict do nothing;
  select * into inbox from private.pm_staging_sms_inbox_v1 x where x.message_sid=sid;
  if inbox.sender<>payload->>'from' or inbox.destination<>payload->>'to' or inbox.body_hash<>payload->>'body_hash' or inbox.attempt_id is distinct from a.id then raise exception 'Immutable inbox event mismatch' using errcode='42501';end if;
  if a.id is not null then
   update private.pm_staging_sms_attempts_v1 x set vendor_test_ack_received_at=coalesce(x.vendor_test_ack_received_at,clock_timestamp()),updated_at=clock_timestamp() where x.id=a.id;
   insert into private.pm_staging_sms_events_v1(event_key,attempt_id,event_kind,provider_sid,status) values('ack:'||sid,a.id,'vendor_test_ack',sid,'TEST_ACK_RECEIVED') on conflict do nothing;
  end if;
  return jsonb_build_object('received',true,'vendorTestAcknowledgment',a.id is not null,'vendorAcceptedAssignment',false,'replySmsSent',false);
 end if;
 select * into a from private.pm_staging_sms_attempts_v1 x where x.id=(payload->>'attempt_id')::uuid and x.tenant_id=t and x.property_id=p for update;
 if not found then raise exception 'Bound notification attempt required' using errcode='42501';end if;
 if sid is not null and sid !~ '^SM[0-9a-fA-F]{32}$' then raise exception 'Invalid provider reference' using errcode='22023';end if;
 if sid is not null and a.provider_sid is not null and sid<>a.provider_sid then raise exception 'Immutable provider reference mismatch' using errcode='42501';end if;
 if op='complete' then
  if payload->>'submission_state' not in ('SUBMITTED','FAILED','UNKNOWN') or payload->>'submission_state' is null or (payload->>'submission_state'='SUBMITTED' and sid is null) then raise exception 'Invalid submission receipt' using errcode='22023';end if;
  if status is not null and status not in ('accepted','queued','sending','sent','delivered','undelivered','failed') then raise exception 'Invalid initial provider status' using errcode='22023';end if;
  if a.submission_state<>'PREPARED' and a.submission_state<>payload->>'submission_state' then raise exception 'Submission already recorded' using errcode='42501';end if;
  update private.pm_staging_sms_attempts_v1 x set submission_state=payload->>'submission_state',provider_sid=coalesce(x.provider_sid,sid),provider_initial_status=coalesce(x.provider_initial_status,status),submission_error_code=coalesce(x.submission_error_code,sms_scope.error_code),updated_at=clock_timestamp() where x.id=a.id;
  event_key='submission:'||a.id::text;
  insert into private.pm_staging_sms_events_v1(event_key,attempt_id,event_kind,provider_sid,status,error_code) values(event_key,a.id,'submission',sid,payload->>'submission_state',error_code) on conflict do nothing;
  -- Submission is not a delivery event. Only signed callbacks set delivery_status.
 else
  if sid is null or payload->>'from' is distinct from '+17252010584' or payload->>'to' is distinct from a.destination or status is null or status not in ('accepted','queued','sending','sent','delivered','undelivered','failed') then raise exception 'Unapproved status correlation' using errcode='42501';end if;
  rank_value=case status when 'accepted' then 5 when 'queued' then 10 when 'sending' then 20 when 'sent' then 30 when 'failed' then 90 when 'undelivered' then 90 when 'delivered' then 100 end;
  update private.pm_staging_sms_attempts_v1 x set provider_sid=coalesce(x.provider_sid,sid),delivery_status=case when rank_value>x.delivery_rank then status else x.delivery_status end,delivery_rank=greatest(x.delivery_rank,rank_value),delivery_error_code=case when rank_value>x.delivery_rank then sms_scope.error_code else x.delivery_error_code end,updated_at=clock_timestamp() where x.id=a.id;
  event_key='status:'||sid||':'||status||':'||coalesce(error_code,'');
  insert into private.pm_staging_sms_events_v1(event_key,attempt_id,event_kind,provider_sid,status,error_code) values(event_key,a.id,'delivery_status',sid,status,error_code) on conflict do nothing;
 end if;
 return jsonb_build_object('recorded',true,'attempt_id',a.id,'vendorAcceptedAssignment',false);
end $$;
create function public.pm_staging_sms_evidence_v1(t uuid,p uuid,payload jsonb) returns jsonb language sql security invoker set search_path='' as $$select private.pm_staging_sms_evidence_v1(t,p,payload);$$;
revoke all on function private.pm_staging_sms_evidence_v1(uuid,uuid,jsonb),public.pm_staging_sms_evidence_v1(uuid,uuid,jsonb) from public,anon,authenticated;
grant execute on function private.pm_staging_sms_evidence_v1(uuid,uuid,jsonb),public.pm_staging_sms_evidence_v1(uuid,uuid,jsonb) to service_role;
commit;
