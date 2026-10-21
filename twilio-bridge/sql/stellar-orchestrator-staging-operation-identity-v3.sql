-- Applied to STELLAR-UCAAS-STAGING only (hvzauakkhlivzeqatfqm), 2026-10-18.
-- Stable business-operation IDs now deduplicate across session reconnects.
create unique index if not exists stellar_orch_staging_tenant_operation_unique
 on public.stellar_orchestrator_workflows_staging(tenant_id,tool_call_id);
create or replace function public.stellar_orch_accept_staging(
 p_tenant_id uuid,p_session_id text,p_call_id text,p_tool_call_id text
) returns table (workflow_id uuid, workflow_state text, deduplicated boolean)
language plpgsql security definer set search_path='' as $$
declare v_id uuid;v_state text;v_inserted boolean;
begin
 if p_tenant_id <> '5885a020-d363-4c27-910a-c035eda132f5'::uuid
 or coalesce(length(p_session_id),0) not between 1 and 200
 or coalesce(length(p_call_id),0) not between 1 and 200
 or coalesce(length(p_tool_call_id),0) not between 1 and 200
 then raise exception 'STAGING_REQUEST_REJECTED';end if;
 insert into public.stellar_orchestrator_workflows_staging
 (tenant_id,session_id,call_id,tool_call_id,workflow_type)
 values(p_tenant_id,p_session_id,p_call_id,p_tool_call_id,'support_ticket_creation')
 on conflict (tenant_id,tool_call_id) do nothing
 returning stellar_orchestrator_workflows_staging.workflow_id into v_id;
 v_inserted:=v_id is not null;
 if not v_inserted then
 select w.workflow_id,w.state into v_id,v_state
 from public.stellar_orchestrator_workflows_staging w
 where w.tenant_id=p_tenant_id and w.tool_call_id=p_tool_call_id;
 else
 v_state:='ACCEPTED';
 insert into public.stellar_orchestrator_events_staging(workflow_id,tenant_id,session_id,event_type)
 values(v_id,p_tenant_id,p_session_id,'ACCEPTED');
 end if;
 return query select v_id,v_state,not v_inserted;
end $$;
revoke all on function public.stellar_orch_accept_staging(uuid,text,text,text) from public,anon,authenticated;
grant execute on function public.stellar_orch_accept_staging(uuid,text,text,text) to service_role;
