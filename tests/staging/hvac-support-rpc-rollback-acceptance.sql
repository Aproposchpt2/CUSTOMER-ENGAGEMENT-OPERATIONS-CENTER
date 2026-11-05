-- STAGING ONLY: transaction-safe acceptance test for Summit HVAC RPC.
-- Run against hvzauakkhlivzeqatfqm with an administrative test connection.
-- Each test assertion raises an error on failure; no test records survive ROLLBACK.
BEGIN;
DO $$
DECLARE
  v_fn oid;
  v_one record;
  v_two record;
  v_case_count integer;
  v_denied boolean := false;
  v_session constant text := 'phone-staging:CAeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee';
BEGIN
  v_fn := 'public.stellar_create_hvac_demo_support_intake(uuid,text,text,text,text,text,date,text,text,text,text)'::regprocedure;
  IF (SELECT prosecdef FROM pg_proc WHERE oid=v_fn) THEN
    RAISE EXCEPTION 'HVAC_RPC_MUST_BE_SECURITY_INVOKER';
  END IF;
  IF NOT has_function_privilege('service_role',v_fn,'EXECUTE')
    OR has_function_privilege('anon',v_fn,'EXECUTE')
    OR has_function_privilege('authenticated',v_fn,'EXECUTE') THEN
    RAISE EXCEPTION 'HVAC_RPC_FUNCTION_GRANT_INVARIANT_FAILED';
  END IF;
END $$;
SET LOCAL ROLE service_role;
DO $$
DECLARE
  a record;
  b record;
  n integer;
  denied boolean := false;
  sid constant text := 'phone-staging:CAeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee';
BEGIN
  SELECT * INTO a FROM public.stellar_create_hvac_demo_support_intake(
    'd7e80001-0000-4000-b000-000000000001',sid,
    'Synthetic HVAC Acceptance','hvac-acceptance@example.invalid','',
    'Heating','2026-10-24','Fictional no heat issue for controlled verification',
    'No unsafe troubleshooting','Synthetic test only','NORMAL');
  IF a.case_id IS NULL OR a.customer_id IS NULL OR a.created_new IS DISTINCT FROM true THEN
    RAISE EXCEPTION 'HVAC_FIRST_SAVE_UNCONFIRMED';
  END IF;
  SELECT * INTO b FROM public.stellar_create_hvac_demo_support_intake(
    'd7e80001-0000-4000-b000-000000000001',sid,
    'Synthetic HVAC Acceptance','hvac-acceptance@example.invalid','',
    'Heating','2026-10-24','Fictional no heat issue for controlled verification',
    'No unsafe troubleshooting','Synthetic test only','NORMAL');
  IF b.case_id IS DISTINCT FROM a.case_id OR b.customer_id IS DISTINCT FROM a.customer_id
      OR b.created_new IS DISTINCT FROM false THEN
    RAISE EXCEPTION 'HVAC_IDEMPOTENCY_FAILED';
  END IF;
  SELECT count(*) INTO n FROM public.stellar_support_cases
    WHERE id=a.case_id AND tenant_id='d7e80001-0000-4000-b000-000000000001'
      AND test_only=true AND intake_session_id=sid;
  IF n<>1 THEN RAISE EXCEPTION 'HVAC_CASE_TENANT_ISOLATION_FAILED'; END IF;
  BEGIN
    PERFORM * FROM public.stellar_create_hvac_demo_support_intake(
      '5885a020-d363-4c27-910a-c035eda132f5',
      'phone-staging:CAffffffffffffffffffffffffffffffff',
      'Synthetic Foreign Tenant','foreign@example.invalid','',
      'Heating','2026-10-24','Foreign tenant negative test only',
      '','', 'NORMAL');
  EXCEPTION WHEN insufficient_privilege THEN denied := true;
  END;
  IF NOT denied THEN RAISE EXCEPTION 'FOREIGN_TENANT_NOT_DENIED'; END IF;
  RAISE NOTICE 'HVAC_RPC_STAGING_TEST_PASS — rollback follows';
END $$;
ROLLBACK;
-- Follow by verifying no rows with the synthetic session were persisted.
