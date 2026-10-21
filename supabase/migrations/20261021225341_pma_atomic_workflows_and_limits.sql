begin;
create table private.api_rate_buckets (
 user_id uuid primary key references auth.users(id) on delete cascade,
 window_start timestamptz not null, requests integer not null
);
alter table private.api_rate_buckets enable row level security;
revoke all on private.api_rate_buckets from public,anon,authenticated;
create or replace function public.pm_rate_limit() returns boolean language plpgsql security definer set search_path='' as $$
declare n integer;
begin
 if auth.uid() is null then return false; end if;
 insert into private.api_rate_buckets(user_id,window_start,requests) values(auth.uid(),clock_timestamp(),1)
 on conflict(user_id) do update set
 requests=case when api_rate_buckets.window_start<clock_timestamp()-interval '60 seconds' then 1 else least(api_rate_buckets.requests+1,1000) end,
 window_start=case when api_rate_buckets.window_start<clock_timestamp()-interval '60 seconds' then clock_timestamp() else api_rate_buckets.window_start end
 returning requests into n;
 return n<=90;
end;
$$;
revoke all on function public.pm_rate_limit() from public,anon;
grant execute on function public.pm_rate_limit() to authenticated;
-- Only server-side sandbox testing can consume these blocked PMA tasks.
create or replace function public.pm_test_notification(t uuid,task uuid,actor uuid) returns jsonb
language plpgsql security invoker set search_path='' as $$
declare a public.automation_tasks; run_id uuid;
begin
 select * into a from public.automation_tasks where tenant_id=t and id=task for update;
 if not found or a.task_code<>'PMA_NOTIFICATION' or a.payload->>'source'<>'pma' or a.payload->>'sandbox'<>'true' then raise exception 'Not a PMA sandbox task' using errcode='42501'; end if;
 if a.status='COMPLETE' then return jsonb_build_object('replayed',true,'delivery_state','SIMULATED','notificationSent',false); end if;
 if a.status<>'BLOCKED' then raise exception 'Task state changed' using errcode='23514'; end if;
 insert into public.automation_runs(task_id,tenant_id,automation_name,status,completed_at,input_payload,output_payload)
 values(task,t,'PMA sandbox notification','SUCCESS',now(),a.payload,jsonb_build_object('delivery_state','SIMULATED','notificationSent',false)) returning id into run_id;
 update public.automation_tasks set status='COMPLETE',requires_intervention=false,intervention_reason=null,
 payload=a.payload||jsonb_build_object('delivery_state','SIMULATED'),updated_at=now() where id=task;
 insert into public.audit_log(tenant_id,actor_user_id,action,entity_type,entity_id,details)
 values(t,actor,'pma.notification_simulated','automation_tasks',task::text,jsonb_build_object('run_id',run_id,'notificationSent',false));
 return jsonb_build_object('run_id',run_id,'delivery_state','SIMULATED','notificationSent',false);
end;
$$;
revoke all on function public.pm_test_notification(uuid,uuid,uuid) from public,anon,authenticated;
grant execute on function public.pm_test_notification(uuid,uuid,uuid) to service_role;

commit;
