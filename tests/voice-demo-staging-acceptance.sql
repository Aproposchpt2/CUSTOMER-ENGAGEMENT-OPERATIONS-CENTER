begin;
set local role service_role;
do $test$
declare t uuid='5885a020-d363-4c27-910a-c035eda132f5';p uuid='eead9ac5-b28b-4594-b75b-a9e9bbbd111f';c uuid='a0a9111d-2e22-46ad-bd1a-3f7256d52bd5';a uuid='c6891f06-521d-4740-b293-b877df2bd612';s jsonb;sid uuid;x jsonb;y jsonb;payload jsonb; lid uuid;ended timestamptz;
begin
 s=public.stellar_voice_demo_session_staging(t,p,c,'init','CAeeeeeeeeeeeeeeeeeeeeeeeeeeeeee01','+15555550123');
 sid=(s->>'session_id')::uuid;
 s=public.stellar_voice_demo_session_staging(t,p,c,'choose','CAeeeeeeeeeeeeeeeeeeeeeeeeeeeeee01','+15555550123','sales-specialist');
 s=public.stellar_voice_demo_session_staging(t,p,c,'choose','CAeeeeeeeeeeeeeeeeeeeeeeeeeeeeee01','+15555550123','support-specialist');
 if s->>'agentRoute'<>'sales-specialist' then raise exception 'Route changed';end if;
 s=public.stellar_voice_demo_session_staging(t,p,c,'start','CAeeeeeeeeeeeeeeeeeeeeeeeeeeeeee01',null,'sales-specialist',sid);
 payload=jsonb_build_object('confirmed',true,'interactionId',sid,'callerName','Synthetic Demo Caller','businessName','Fictional Demo Company','email','synthetic-demo@example.test','phone','+15555550123','description','Synthetic IVR sales acceptance test, no outreach.','serviceInterest','Sales Specialist');
 x=public.stellar_voice_demo_sales_submit_staging(t,p,c,a,sid,payload);
 y=public.stellar_voice_demo_sales_submit_staging(t,p,c,a,sid,payload);
 if x->'lead'->>'id' is null or x->'lead'->>'id' is distinct from y->'lead'->>'id' or y->>'deduplicated'<>'true' then raise exception 'Lead replay failed';end if;
 select ended_at into ended from public.ai4cc_interactions where id=sid;
 if ended is not null then raise exception 'Lead creation ended the call';end if;
 s=public.stellar_voice_demo_session_staging(t,p,c,'end','CAeeeeeeeeeeeeeeeeeeeeeeeeeeeeee01',null,'sales-specialist',sid);
 begin
  perform public.stellar_voice_demo_session_staging(t,p,c,'start','CAeeeeeeeeeeeeeeeeeeeeeeeeeeeeee01',null,'sales-specialist',sid);
  raise exception 'Ended session reopened';
 exception when insufficient_privilege then null;end;
 s=public.stellar_voice_demo_session_staging(t,p,c,'choose','CAeeeeeeeeeeeeeeeeeeeeeeeeeeeeee02','+15555550123','support-specialist');
 begin
  perform public.stellar_voice_demo_sales_submit_staging(t,p,c,a,(s->>'session_id')::uuid,payload);
  raise exception 'Support invoked Sales';
 exception when insufficient_privilege then null;end;
 begin
  perform public.stellar_voice_demo_session_staging('00000000-0000-4000-8000-000000000001',p,c,'init','CAeeeeeeeeeeeeeeeeeeeeeeeeeeeeee03','+15555550123');
  raise exception 'Foreign tenant accepted';
 exception when insufficient_privilege then null;end;
end $test$;
set local role anon;
do $test$ begin
 begin
  perform public.stellar_voice_demo_session_staging(null,null,null,'init','CAeeeeeeeeeeeeeeeeeeeeeeeeeeeeee04','+15555550123');
  raise exception 'Anonymous RPC accepted';
 exception when insufficient_privilege then null;end;
end $test$;
reset role;
select 'PASS: immutable route, lead idempotency, call lifecycle, cross-agent and tenant rejection, anonymous rejection' as acceptance;
rollback;
