begin;
-- Service role has no direct audit_log INSERT in staging. Keep that restriction.
-- Bound synthetic-session writes run through a private definer with service-only execute.
alter function public.pm_capture_prospect_v1(uuid,uuid,uuid,text,text,jsonb) set schema private;
alter function private.pm_capture_prospect_v1(uuid,uuid,uuid,text,text,jsonb) security definer;
revoke all on function private.pm_capture_prospect_v1(uuid,uuid,uuid,text,text,jsonb) from public,anon,authenticated;
grant execute on function private.pm_capture_prospect_v1(uuid,uuid,uuid,text,text,jsonb) to service_role;
create function public.pm_capture_prospect_v1(t uuid,p uuid,session_id uuid,call_sid text,operation_id text,details jsonb)
returns jsonb language sql security invoker set search_path='' as $$select private.pm_capture_prospect_v1(t,p,session_id,call_sid,operation_id,details);$$;
revoke all on function public.pm_capture_prospect_v1(uuid,uuid,uuid,text,text,jsonb) from public,anon,authenticated;
grant execute on function public.pm_capture_prospect_v1(uuid,uuid,uuid,text,text,jsonb) to service_role;
commit;
