begin;
-- Trusted existing bridge authentication selects this service-only entry. Actor and
-- property bindings are server configuration, never caller/model-supplied claims.
create function public.pm_trusted_channel_turn(actor uuid,t uuid,p uuid,c uuid,u uuid,k text,ch text,msg text,intent text,category text,priority text,show_at timestamptz default null,request_id uuid default null)
returns jsonb language plpgsql security invoker set search_path='' as $$
declare previous text;outcome jsonb;
begin
 if actor is null then raise exception 'Missing trusted actor' using errcode='42501'; end if;
 previous=current_setting('request.jwt.claims',true);
 perform set_config('request.jwt.claims',jsonb_build_object('sub',actor,'role','authenticated')::text,true);
 begin
   outcome=private.pm_record_channel_turn(t,p,c,u,k,ch,msg,intent,category,priority,show_at,request_id);
 exception when others then
   perform set_config('request.jwt.claims',coalesce(previous,''),true);raise;
 end;
 perform set_config('request.jwt.claims',coalesce(previous,''),true);
 return outcome;
end;
$$;
revoke all on function public.pm_trusted_channel_turn(uuid,uuid,uuid,uuid,uuid,text,text,text,text,text,text,timestamptz,uuid) from public,anon,authenticated;
grant execute on function public.pm_trusted_channel_turn(uuid,uuid,uuid,uuid,uuid,text,text,text,text,text,text,timestamptz,uuid) to service_role;
commit;
