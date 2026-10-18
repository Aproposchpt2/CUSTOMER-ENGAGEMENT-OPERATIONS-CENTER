-- Stellar UC staging orchestration ledger v1. Staging only.
-- Execute ONLY on project hvzauakkhlivzeqatfqm.
create table if not exists public.stellar_orchestrator_workflows_staging (
 workflow_id uuid primary key default gen_random_uuid(),
 tenant_id uuid not null,
 session_id text not null check (char_length(session_id) between 1 and 200),
 call_id text not null check (char_length(call_id) between 1 and 200),
 tool_call_id text not null check (char_length(tool_call_id) between 1 and 200),
 workflow_type text not null check (workflow_type = 'support_ticket_creation'),
 state text not null default 'ACCEPTED' check (state in ('ACCEPTED','RUNNING','COMPLETED','FAILED','UNKNOWN')),
 case_id uuid,
 version bigint not null default 1,
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now(),
 unique(tenant_id,session_id,tool_call_id),
 check (state <> 'COMPLETED' or case_id is not null)
);
create table if not exists public.stellar_orchestrator_events_staging (
 event_id bigint generated always as identity primary key,
 workflow_id uuid not null references public.stellar_orchestrator_workflows_staging(workflow_id),
 tenant_id uuid not null,
 session_id text not null,
 event_type text not null check(event_type in ('ACCEPTED','RUNNING','COMPLETED','FAILED','UNKNOWN')),
 case_id uuid,
 created_at timestamptz not null default now(),
 delivered_at timestamptz,
 attempts integer not null default 0,
 next_attempt_at timestamptz not null default now(),
 last_error text
);
create index if not exists stellar_orch_events_pending_idx
 on public.stellar_orchestrator_events_staging(next_attempt_at,event_id)
 where delivered_at is null;
alter table public.stellar_orchestrator_workflows_staging enable row level security;
alter table public.stellar_orchestrator_events_staging enable row level security;
revoke all on public.stellar_orchestrator_workflows_staging from anon, authenticated;
revoke all on public.stellar_orchestrator_events_staging from anon, authenticated;
revoke all on sequence public.stellar_orchestrator_events_staging_event_id_seq from anon, authenticated;
-- Transactional acceptance with deduplication and outbox event.
create or replace function public.stellar_orch_accept_staging(
 p_tenant_id uuid,p_session_id text,p_call_id text,p_tool_call_id text
) returns table (workflow_id uuid, workflow_state text, deduplicated boolean)
language plpgsql security definer set search_path='' as $$
declare v_id uuid; v_state text; v_inserted boolean;
begin
 if p_tenant_id <> '5885a020-d363-4c27-910a-c035eda132f5'::uuid
 or coalesce(length(p_session_id),0) not between 1 and 200
 or coalesce(length(p_call_id),0) not between 1 and 200
 or coalesce(length(p_tool_call_id),0) not between 1 and 200
 then raise exception 'STAGING_REQUEST_REJECTED'; end if;
 insert into public.stellar_orchestrator_workflows_staging
 (tenant_id,session_id,call_id,tool_call_id,workflow_type)
 values(p_tenant_id,p_session_id,p_call_id,p_tool_call_id,'support_ticket_creation')
 on conflict (tenant_id,session_id,tool_call_id) do nothing
 returning stellar_orchestrator_workflows_staging.workflow_id into v_id;
 v_inserted := v_id is not null;
 if not v_inserted then
  select w.workflow_id,w.state into v_id,v_state from public.stellar_orchestrator_workflows_staging w
  where w.tenant_id=p_tenant_id and w.session_id=p_session_id and w.tool_call_id=p_tool_call_id;
 else
  v_state:='ACCEPTED';
  insert into public.stellar_orchestrator_events_staging(workflow_id,tenant_id,session_id,event_type)
  values(v_id,p_tenant_id,p_session_id,'ACCEPTED');
 end if;
 return query select v_id,v_state,not v_inserted;
end $$;
-- Only valid state transitions; state update and event are one transaction.
create or replace function public.stellar_orch_transition_staging(
 p_workflow_id uuid,p_from text,p_to text,p_case_id uuid default null
) returns boolean language plpgsql security definer set search_path='' as $$
declare w public.stellar_orchestrator_workflows_staging%rowtype;
begin
 if not ((p_from='ACCEPTED' and p_to='RUNNING') or
 (p_from='RUNNING' and p_to in ('COMPLETED','FAILED','UNKNOWN')) or
 (p_from='UNKNOWN' and p_to in ('COMPLETED','FAILED'))) then raise exception 'INVALID_TRANSITION';end if;
 if p_to='COMPLETED' and p_case_id is null then raise exception 'MISSING_VERIFIED_CASE';end if;
 update public.stellar_orchestrator_workflows_staging
 set state=p_to,case_id=case when p_to='COMPLETED' then p_case_id else case_id end,
 version=version+1,updated_at=now()
 where workflow_id=p_workflow_id and state=p_from
 returning * into w;
 if not found then return false;end if;
 insert into public.stellar_orchestrator_events_staging(workflow_id,tenant_id,session_id,event_type,case_id)
 values(w.workflow_id,w.tenant_id,w.session_id,p_to,w.case_id);
 return true;
end $$;
revoke all on function public.stellar_orch_accept_staging(uuid,text,text,text) from public,anon,authenticated;
revoke all on function public.stellar_orch_transition_staging(uuid,text,text,uuid) from public,anon,authenticated;
grant execute on function public.stellar_orch_accept_staging(uuid,text,text,text) to service_role;
grant execute on function public.stellar_orch_transition_staging(uuid,text,text,uuid) to service_role;
