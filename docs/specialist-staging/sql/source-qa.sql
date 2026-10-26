BEGIN;
DO $qa$
DECLARE n int;
BEGIN
 IF (SELECT count(*) FROM public.ai4cc_specialist_source_records WHERE package_key='specialist-source-20261025-v1')<>655 THEN RAISE EXCEPTION 'source row count'; END IF;
 IF (SELECT count(*) FROM public.ai4cc_specialist_source_records WHERE record_type='knowledge' AND product_scope='sales')<>100 THEN RAISE EXCEPTION 'Sales coverage'; END IF;
 IF (SELECT count(*) FROM public.ai4cc_specialist_source_records WHERE record_type='knowledge' AND product_scope='support_platform')<>150 THEN RAISE EXCEPTION 'platform Support coverage'; END IF;
 IF (SELECT count(*) FROM public.ai4cc_specialist_source_records WHERE record_type='intent' AND product_scope='support_hvac')<>19 THEN RAISE EXCEPTION 'HVAC catalog'; END IF;
 IF (SELECT sum(jsonb_array_length(payload)) FROM public.ai4cc_specialist_source_records WHERE record_type='test_bundle')<>630 THEN RAISE EXCEPTION 'test specifications'; END IF;
 IF EXISTS(SELECT 1 FROM public.ai4cc_specialist_source_records WHERE caller_enabled OR review_state<>'draft') THEN RAISE EXCEPTION 'source publication'; END IF;
 IF EXISTS(SELECT 1 FROM public.ai4cc_specialist_source_records WHERE record_type='intent' AND product_scope<>'support_hvac' AND (SELECT count(*) FROM jsonb_object_keys(payload))<>32) THEN RAISE EXCEPTION 'catalog field loss'; END IF;
 IF NOT EXISTS(SELECT 1 FROM pg_class WHERE oid='public.ai4cc_specialist_source_records'::regclass AND relrowsecurity) THEN RAISE EXCEPTION 'RLS disabled'; END IF;
 IF has_table_privilege('anon','public.ai4cc_specialist_source_records','SELECT') OR has_table_privilege('authenticated','public.ai4cc_specialist_source_records','SELECT') THEN RAISE EXCEPTION 'public registry access'; END IF;
 IF has_function_privilege('anon','public.ai4cc_specialist_review_source_v1(uuid,text,text,text)','EXECUTE') OR has_function_privilege('authenticated','public.ai4cc_specialist_review_source_v1(uuid,text,text,text)','EXECUTE') THEN RAISE EXCEPTION 'public review RPC'; END IF;
 IF NOT has_function_privilege('service_role','public.ai4cc_specialist_review_source_v1(uuid,text,text,text)','EXECUTE') THEN RAISE EXCEPTION 'missing review access'; END IF;
 IF EXISTS(SELECT * FROM public.ai4cc_specialist_review_source_v1('d7e80001-0000-4000-b000-000000000001','support_platform','knowledge','SUP-080')) THEN RAISE EXCEPTION 'cross-scope leakage'; END IF;
 IF EXISTS(SELECT * FROM public.ai4cc_specialist_review_source_v1('5885a020-d363-4c27-910a-c035eda132f5','support_hvac','intent','GAS_LEAK')) THEN RAISE EXCEPTION 'HVAC wrong tenant'; END IF;
 BEGIN
  UPDATE public.ai4cc_specialist_source_records SET caller_enabled=true WHERE record_id='SAL-082' AND record_type='knowledge';
  RAISE EXCEPTION 'activation constraint failed';
 EXCEPTION WHEN check_violation THEN NULL;
 END;
 BEGIN
  UPDATE public.ai4cc_specialist_source_records SET tenant_id=NULL WHERE record_id='SAL-082' AND record_type='knowledge';
  RAISE EXCEPTION 'null tenant accepted';
 EXCEPTION WHEN check_violation THEN NULL;
 END;
END $qa$;
SET LOCAL ROLE service_role;
SELECT record_id,review_state,caller_enabled FROM public.ai4cc_specialist_review_source_v1('5885a020-d363-4c27-910a-c035eda132f5','sales','knowledge','SAL-082');
SELECT record_id,review_state,caller_enabled FROM public.ai4cc_specialist_review_source_v1('d7e80001-0000-4000-b000-000000000001','support_hvac','intent','GAS_LEAK');
RESET ROLE;
SELECT 'PASS' AS source_integration_qa;
ROLLBACK;
