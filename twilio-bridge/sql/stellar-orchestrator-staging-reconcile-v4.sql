-- STAGING ONLY: reconcile persisted support case using workflow's original intake session.
-- No support-case writes or re-submissions.
create or replace function public.stellar_orch_reconcile_case_staging(p_workflow_id uuid)
returns table(workflow_state text,verified_case_id uuid)
language plpgsql security definer set search_path='' as $$
declare w public.stellar_orchestrator_workflows_staging%rowtype; v_case uuid; v_count integer;
begin
 select * into w from public.stellar_orchestrator_workflows_staging
 where workflow_id=p_workflow_id for update;
 if not found or w.tenant_id <> '5885a020-d363-4c27-910a-c035eda132f5'::uuid
 then raise exception 'STAGING_WORKFLOW_REJECTED'; end if;
 if w.state='COMPLETED' then
  return query select w.state,w.case_id; return;
 end if;
 if w.state not in ('RUNNING','UNKNOWN') then
  return query select w.state,null::uuid; return;
 end if;
 select count(*),min(c.id) into v_count,v_case
 from public.stellar_support_cases c
 where c.tenant_id=w.tenant_id and c.intake_session_id=w.session_id
 and c.test_only=true;
 if v_count=1 then
   update public.stellar_orchestrator_workflows_staging
   set state='COMPLETED',case_id=v_case,version=version+1,updated_at=now()
   where workflow_id=p_workflow_id;
   insert into public.stellar_orchestrator_events_staging
    (workflow_id,tenant_id,session_id,event_type,case_id)
   values(w.workflow_id,w.tenant_id,w.session_id,'COMPLETED',v_case);
   return query select 'COMPLETED'::text,v_case; return;
 end if;
 if w.state='RUNNING' then
   update public.stellar_orchestrator_workflows_staging
   set state='UNKNOWN',version=version+1,updated_at=now() where workflow_id=p_workflow_id;
   insert into public.stellar_orchestrator_events_staging
    (workflow_id,tenant_id,session_id,event_type)
   values(w.workflow_id,w.tenant_id,w.session_id,'UNKNOWN');
 end if;
 return query select 'UNKNOWN'::text,null::uuid;
end $$;
revoke all on function public.stellar_orch_reconcile_case_staging(uuid) from public,anon,authenticated;
grant execute on function public.stellar_orch_reconcile_case_staging(uuid) to service_role;
