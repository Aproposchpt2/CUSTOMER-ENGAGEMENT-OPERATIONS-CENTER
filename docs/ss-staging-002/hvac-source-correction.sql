-- Applied to staging only after the authorization prerequisite.
-- Preserve the table's source constraint and all tenant/role guards.
DO $repair$
DECLARE definition text;
BEGIN
 IF (SELECT prosecdef FROM pg_proc WHERE oid='public.stellar_create_hvac_demo_support_intake(uuid,text,text,text,text,text,date,text,text,text,text)'::regprocedure) THEN
  RAISE EXCEPTION 'HVAC invoker authorization prerequisite not satisfied';
 END IF;
 SELECT pg_get_functiondef('public.stellar_create_hvac_demo_support_intake(uuid,text,text,text,text,text,date,text,text,text,text)'::regprocedure) INTO definition;
 IF position('''hvac_voice_test''' IN definition)=0 THEN RAISE EXCEPTION 'Unexpected HVAC function source'; END IF;
 EXECUTE replace(definition,'''hvac_voice_test''','''private_voice_test''');
END $repair$;
