-- Existing ai4cc_interactions remains the authoritative call/session log.
create or replace function public.stellar_voice_demo_session_staging(
 t uuid,p uuid,c uuid,event text,call_sid text,caller_number text default null,
 agent_route text default null,session_id uuid default null,details jsonb default '{}'::jsonb
) returns jsonb language plpgsql security invoker set search_path='' as $$
declare sid uuid; r public.ai4cc_interactions; chosen text; at_time timestamptz=clock_timestamp();
begin
 if call_sid !~ '^CA[0-9a-fA-F]{32}$' or event not in ('init','choose','repeat','timeout','start','end') then raise exception 'Invalid voice session event' using errcode='22023';end if;
 if agent_route is not null and agent_route not in ('support-specialist','sales-specialist','property-management-assistant') then raise exception 'Invalid agent route' using errcode='22023';end if;
 if not exists(select 1 from public.pm_properties x join public.ai4cc_contacts y on y.tenant_id=x.tenant_id where x.id=p and x.tenant_id=t and y.id=c and y.metadata->>'synthetic'='true') then raise exception 'Synthetic voice fixture required' using errcode='42501';end if;
 sid=md5(t::text||':voice-demo:'||call_sid)::uuid;
 if session_id is not null and session_id<>sid then raise exception 'Session mismatch' using errcode='42501';end if;
 perform pg_advisory_xact_lock(hashtextextended(t::text||':voice-demo:'||call_sid,0));
 if event in ('init','choose','repeat','timeout') then
  if caller_number is null or caller_number !~ '^\+[1-9][0-9]{7,14}$' then raise exception 'Invalid caller' using errcode='22023';end if;
  insert into public.ai4cc_interactions(id,tenant_id,channel,direction,external_id,customer_identifier,status,started_at,metadata)
  values(sid,t,'voice','inbound','voice-demo:'||call_sid,caller_number,'open',at_time,jsonb_build_object('synthetic',true,'voice_demo',true,'property_id',p,'contact_id',c,'call_sid',call_sid,'caller_number',caller_number,'session_id',sid,'selected_route',null,'selected_agent',null,'start_time',at_time,'end_time',null))
  on conflict(tenant_id,channel,external_id) do nothing;
 end if;
 select * into r from public.ai4cc_interactions where id=sid and tenant_id=t for update;
 if not found or (r.metadata->>'voice_demo') is distinct from 'true' or (r.metadata->>'property_id') is distinct from p::text or (r.metadata->>'contact_id') is distinct from c::text then raise exception 'Unknown voice session' using errcode='42501';end if;
 if caller_number is not null and caller_number<>r.customer_identifier then raise exception 'Caller mismatch' using errcode='42501';end if;
 chosen=r.metadata->>'selected_route';
 if event='choose' and chosen is null and r.ended_at is null then
  if agent_route is null then raise exception 'Missing route' using errcode='22023';end if;
  chosen=agent_route;
  update public.ai4cc_interactions set metadata=metadata||jsonb_build_object('selected_route',chosen,'selected_agent',chosen) where id=sid and tenant_id=t;
 elsif event='start' then
  if chosen is null or chosen is distinct from agent_route or r.ended_at is not null then raise exception 'Route cannot change' using errcode='42501';end if;
  update public.ai4cc_interactions set status='active' where id=sid and tenant_id=t;
 elsif event='end' or (event='timeout' and chosen is null) then
  if agent_route is not null and chosen is distinct from agent_route then raise exception 'Route cannot change' using errcode='42501';end if;
  update public.ai4cc_interactions set status=case when chosen is null then 'abandoned' else 'completed' end,ended_at=coalesce(ended_at,at_time),metadata=metadata||jsonb_build_object('end_time',coalesce(ended_at,at_time),'end_reason',coalesce(details->>'reason',event)) where id=sid and tenant_id=t;
 end if;
 select * into r from public.ai4cc_interactions where id=sid and tenant_id=t;
 return jsonb_build_object('session_id',r.id,'call_sid',call_sid,'caller_number',r.customer_identifier,'agentRoute',r.metadata->>'selected_route','selected_route',r.metadata->>'selected_route','selected_agent',r.metadata->>'selected_agent','start_time',r.started_at,'end_time',r.ended_at);
end $$;
revoke all on function public.stellar_voice_demo_session_staging(uuid,uuid,uuid,text,text,text,text,uuid,jsonb) from public,anon,authenticated;
grant execute on function public.stellar_voice_demo_session_staging(uuid,uuid,uuid,text,text,text,text,uuid,jsonb) to service_role;

-- Adapt the existing canonical lead RPC; do not duplicate CRM tables or logic.
create or replace function public.stellar_voice_demo_sales_submit_staging(
 t uuid,p uuid,c uuid,actor uuid,session_id uuid,payload jsonb
) returns jsonb language plpgsql security invoker set search_path='' as $$
declare parent public.ai4cc_interactions; child_id uuid; saved jsonb; lid uuid; cid uuid;
 n text; v_email text; v_phone text; description text;
begin
 select * into parent from public.ai4cc_interactions i where i.id=session_id and i.tenant_id=t for update;
 if not found or (parent.metadata->>'synthetic') is distinct from 'true' or (parent.metadata->>'voice_demo') is distinct from 'true' or (parent.metadata->>'selected_route') is distinct from 'sales-specialist' or (parent.metadata->>'property_id') is distinct from p::text or (parent.metadata->>'contact_id') is distinct from c::text then raise exception 'Sales session rejected' using errcode='42501';end if;
 if not exists(select 1 from public.ai4cc_contacts x where x.id=c and x.tenant_id=t and x.metadata->>'synthetic'='true') then raise exception 'Synthetic fixture required' using errcode='42501';end if;
 if parent.metadata ? 'sales_lead_id' then
  lid=(parent.metadata->>'sales_lead_id')::uuid;
  if not exists(select 1 from public.ai4cc_leads l where l.id=lid and l.tenant_id=t and l.metadata->>'synthetic'='true') then raise exception 'Lead recovery rejected' using errcode='42501';end if;
  return jsonb_build_object('lead',jsonb_build_object('id',lid),'testOnly',true,'persisted',true,'notificationSent',false,'deduplicated',true);
 end if;
 if parent.ended_at is not null or (payload->>'confirmed') is distinct from 'true' or (payload->>'interactionId') is distinct from session_id::text then raise exception 'Confirmed active sales session required' using errcode='42501';end if;
 n=btrim(payload->>'callerName');v_email=nullif(lower(btrim(payload->>'email')),'');v_phone=nullif(btrim(payload->>'phone'),'');description=btrim(payload->>'description');
 if n is null or length(n)<2 or length(n)>150 or description is null or length(description)<10 or length(description)>2000 or (v_email is null and v_phone is null) or (v_email is not null and (length(v_email)>254 or v_email !~ '^[^ @]+@[^ @]+\.[^ @]+$')) or (v_phone is not null and v_phone !~ '^\+[1-9][0-9]{7,14}$') or length(coalesce(payload->>'businessName',''))>200 or length(coalesce(payload->>'serviceInterest',''))>300 then raise exception 'Invalid confirmed sales details' using errcode='22023';end if;
 child_id=md5(t::text||':voice-demo-sales-intake:'||session_id::text)::uuid;
 insert into public.ai4cc_interactions(id,tenant_id,channel,direction,external_id,customer_identifier,status,started_at,ended_at,metadata)
 values(child_id,t,'voice','inbound','voice-demo-sales-intake:'||session_id::text,'synthetic:'||session_id::text,'completed',clock_timestamp(),clock_timestamp(),jsonb_build_object('synthetic',true,'voice_demo',true,'parent_session_id',session_id,'detectedIntent','SALES_INQUIRY','notificationsDisabled',true));
 saved=public.ai4cc_create_lead_from_interaction(t,actor,child_id,'opaque','synthetic:'||session_id::text,null,null,n,payload->>'businessName','Synthetic voice demo lead',payload->>'serviceInterest',description,'new','normal',50,0,0,'Synthetic demonstration only; no outbound contact.',null);
 lid=(saved->'lead'->>'id')::uuid;cid=(saved->'contact'->>'id')::uuid;
 if lid is null or cid is null then raise exception 'Canonical lead write unconfirmed';end if;
 update public.ai4cc_contacts set email=v_email,phone=v_phone,metadata=metadata||jsonb_build_object('synthetic',true,'voice_demo_session_id',session_id,'notificationsDisabled',true) where id=cid and tenant_id=t;
 update public.ai4cc_leads set metadata=metadata||jsonb_build_object('synthetic',true,'voice_demo_session_id',session_id,'notificationsDisabled',true) where id=lid and tenant_id=t;
 update public.ai4cc_interactions set metadata=metadata||jsonb_build_object('sales_lead_id',lid) where id=session_id and tenant_id=t;
 return jsonb_build_object('lead',jsonb_build_object('id',lid),'contact',jsonb_build_object('id',cid),'testOnly',true,'persisted',true,'notificationSent',false,'deduplicated',false);
end $$;
revoke all on function public.stellar_voice_demo_sales_submit_staging(uuid,uuid,uuid,uuid,uuid,jsonb) from public,anon,authenticated;
grant execute on function public.stellar_voice_demo_sales_submit_staging(uuid,uuid,uuid,uuid,uuid,jsonb) to service_role;

