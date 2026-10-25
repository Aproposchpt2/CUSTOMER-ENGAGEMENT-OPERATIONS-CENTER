begin;
set local role service_role;
select set_config('request.jwt.claims','{"role":"service_role"}',true);
do $$declare a jsonb;b jsonb;cs text='CA'||replace(gen_random_uuid()::text,'-','');begin
 a=public.pm_staging_emergency_prepare_v1('5885a020-d363-4c27-910a-c035eda132f5','eead9ac5-b28b-4594-b75b-a9e9bbbd111f',cs,'00000000-0000-4000-8000-000000000000','GAS_EMERGENCY','Independent rollback-only release audit',true);
 b=public.pm_staging_emergency_prepare_v1('5885a020-d363-4c27-910a-c035eda132f5','eead9ac5-b28b-4594-b75b-a9e9bbbd111f',cs,'00000000-0000-4000-8000-000000000000','GAS_EMERGENCY','Independent rollback-only release audit',true);
 if a->>'incidentId' is null or a->>'notify'<>'true' or b->>'notify'<>'false' or a->>'incidentId'<>b->>'incidentId' then raise exception 'Incident deduplication failed';end if;
 if exists(select 1 from jsonb_array_elements(a->'preferences') x where x->>'channel'='sms' and x->>'destination'<>'+17753508039') then raise exception 'Inactive recipient leaked';end if;
 if (select count(*) from jsonb_array_elements(a->'preferences') x where x->>'channel'='sms')<>1 then raise exception 'Owner recipient missing';end if;
 begin perform public.pm_staging_emergency_prepare_v1('00000000-0000-4000-8000-000000000099','eead9ac5-b28b-4594-b75b-a9e9bbbd111f',cs,'00000000-0000-4000-8000-000000000000','GAS_EMERGENCY','Audit',true);raise exception 'Foreign scope accepted';exception when insufficient_privilege then null;end;
 begin perform public.pm_staging_emergency_prepare_v1('5885a020-d363-4c27-910a-c035eda132f5','eead9ac5-b28b-4594-b75b-a9e9bbbd111f',cs,'00000000-0000-4000-8000-000000000000','GAS_EMERGENCY','Audit',false);raise exception 'Unbound call accepted';exception when insufficient_privilege then null;end;
end $$;
select 'PASS: incident persistence, deduplication, owner-only active selection, foreign scope and unbound-call denial; rollback; no SMS transport' as evidence;
rollback;
