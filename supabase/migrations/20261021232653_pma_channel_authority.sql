begin;
alter function public.pm_record_channel_turn(uuid,uuid,uuid,uuid,text,text,text,text,text,text,timestamptz,uuid) set schema private;
alter function private.pm_record_channel_turn(uuid,uuid,uuid,uuid,text,text,text,text,text,text,timestamptz,uuid) security definer;
revoke all on function private.pm_record_channel_turn(uuid,uuid,uuid,uuid,text,text,text,text,text,text,timestamptz,uuid) from public,anon;
grant execute on function private.pm_record_channel_turn(uuid,uuid,uuid,uuid,text,text,text,text,text,text,timestamptz,uuid) to authenticated;
create function public.pm_record_channel_turn(t uuid,p uuid,c uuid,u uuid,k text,ch text,msg text,intent text,category text,priority text,show_at timestamptz default null,request_id uuid default null)
returns jsonb language sql security invoker set search_path='' as $$ select private.pm_record_channel_turn(t,p,c,u,k,ch,msg,intent,category,priority,show_at,request_id); $$;
revoke all on function public.pm_record_channel_turn(uuid,uuid,uuid,uuid,text,text,text,text,text,text,timestamptz,uuid) from public,anon;
grant execute on function public.pm_record_channel_turn(uuid,uuid,uuid,uuid,text,text,text,text,text,text,timestamptz,uuid) to authenticated;
commit;
