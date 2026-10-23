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
