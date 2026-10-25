-- PMA v2: controlled staging-only notification recipient selection
-- REVIEW-ONLY. DO NOT APPLY before SMS inbound visibility and role-routing tests.
-- This deliberately patches the existing secured function, keeping all call/session/property validation intact.
-- It will not send to newly configured test destinations until their preference rows are explicitly activated.
begin;
do $migration$
declare original_ddl text; patched_ddl text; old_filter text; new_filter text;
begin
  if current_database() is null then raise exception 'Database identity unavailable'; end if;
  select pg_get_functiondef(p.oid) into original_ddl
  from pg_proc p join pg_namespace n on n.oid=p.pronamespace
  where n.nspname='private' and p.proname='pm_staging_emergency_prepare_v1'
  and pg_get_function_identity_arguments(p.oid) like 't uuid, p uuid, call_sid text, session_id uuid, intent text, message text%';
  if original_ddl is null then raise exception 'Expected PMA staging function not found'; end if;
  if position('Staging scope rejected' in original_ddl)=0
     or position('Active bound PMA call required' in original_ddl)=0
     or position('service_role' in original_ddl)=0
  then raise exception 'Security validation guard missing'; end if;
  old_filter := 'and x.event_type=''emergency_escalation'' and x.active=true and x.staging_override=true'
     || chr(10) || ' and ((x.channel=''sms'' and x.destination=''+17753508039'') or x.channel=''email'');';
  new_filter := 'and x.active=true and x.staging_override=true'
     || chr(10) || ' and ('
     || chr(10) || '  (x.channel=''sms'' and ('
     || chr(10) || '     (x.event_type=''emergency_escalation'' and x.destination=''+17753508039'')'
     || chr(10) || '     or (x.event_type=''pma_v2_maintenance_vendor_test'' and x.destination=''+17253305102'')'
     || chr(10) || '     or (x.event_type=''pma_v2_tenant_test'' and x.destination=''+17027102622'')'
     || chr(10) || '     or (x.event_type=''pma_v2_owner_backup_test'' and x.destination=''+17029351414'')'
     || chr(10) || '  ))'
     || chr(10) || '  or (x.channel=''email'' and x.event_type=''emergency_escalation'')'
     || chr(10) || ' );';
  if position(old_filter in original_ddl)=0 then
    raise exception 'Original SMS restriction changed; refuse unsafe patch';
  end if;
  patched_ddl := replace(original_ddl,old_filter,new_filter);
  execute patched_ddl;
end;
$migration$;
commit;
-- Post-change review: ensure newly inserted role-specific preferences remain inactive.
-- select event_type,destination,active from public.pm_notification_preferences where event_type like 'pma_v2_%';
