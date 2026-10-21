-- Run only against approved staging project hvzauakkhlivzeqatfqm after migration 20261019220006.
-- All synthetic fixtures and delivery mutations are rolled back.
BEGIN;

SET LOCAL ROLE service_role;
DO $test$
DECLARE c record;w record;cl jsonb;receipt jsonb;token uuid;s text;session text:='phone-staging:CA'||replace(gen_random_uuid()::text,'-','');op text:='dispatcher-rollback-'||gen_random_uuid()::text;
BEGIN
 SELECT * INTO c FROM public.stellar_create_phone_support_test_intake('5885a020-d363-4c27-910a-c035eda132f5',session,'Fictional dispatcher fixture',op||'@example.invalid','','Synthetic test router','2026-10-01','Rollback-only dispatcher SQL verification.','None','Synthetic test only','NORMAL');
 SELECT * INTO w FROM public.stellar_orch_accept_staging('5885a020-d363-4c27-910a-c035eda132f5',session,op,op);
 PERFORM public.stellar_orch_transition_staging(w.workflow_id,'ACCEPTED','RUNNING',NULL);
 PERFORM public.stellar_orch_reconcile_case_staging(w.workflow_id);
 cl:=public.stellar_dispatch_claim_staging('5885a020-d363-4c27-910a-c035eda132f5',ARRAY[w.workflow_id],'rollback-test-worker',10000);
 IF cl IS NULL OR cl->>'attempt'<>'1' THEN RAISE EXCEPTION 'CLAIM_TEST_FAILED';END IF;
 token:=(cl->>'token')::uuid;
 IF (public.stellar_dispatch_verify_staging('5885a020-d363-4c27-910a-c035eda132f5',(cl->'event'->>'eventId')::bigint,token)->>'verified')::boolean IS NOT TRUE THEN RAISE EXCEPTION 'VERIFY_TEST_FAILED';END IF;
 IF public.stellar_dispatch_claim_staging('5885a020-d363-4c27-910a-c035eda132f5',ARRAY[w.workflow_id],'second-worker',10000) IS NOT NULL THEN RAISE EXCEPTION 'DUPLICATE_CLAIM';END IF;
 BEGIN
  PERFORM public.stellar_dispatch_ack_staging('5885a020-d363-4c27-910a-c035eda132f5',(cl->'event'->>'eventId')::bigint,token,repeat('a',64));
  RAISE EXCEPTION 'UNRECEIPTED_ACK_ALLOWED';
 EXCEPTION WHEN OTHERS THEN IF SQLERRM<>'DURABLE_RECEIPT_REQUIRED' THEN RAISE;END IF;END;
 receipt:=public.stellar_dispatch_receive_staging('5885a020-d363-4c27-910a-c035eda132f5',(cl->'event'->>'eventId')::bigint,w.workflow_id,session,c.case_id,'stellar:hvzauakkhlivzeqatfqm:5885a020-d363-4c27-910a-c035eda132f5:'||(cl->'event'->>'eventId'),repeat('a',64));
 PERFORM public.stellar_dispatch_receive_staging('5885a020-d363-4c27-910a-c035eda132f5',(cl->'event'->>'eventId')::bigint,w.workflow_id,session,c.case_id,'stellar:hvzauakkhlivzeqatfqm:5885a020-d363-4c27-910a-c035eda132f5:'||(cl->'event'->>'eventId'),repeat('a',64));
 BEGIN
  PERFORM public.stellar_dispatch_receive_staging('5885a020-d363-4c27-910a-c035eda132f5',(cl->'event'->>'eventId')::bigint,w.workflow_id,session,c.case_id,'stellar:hvzauakkhlivzeqatfqm:5885a020-d363-4c27-910a-c035eda132f5:'||(cl->'event'->>'eventId'),repeat('b',64));
  RAISE EXCEPTION 'HASH_CONFLICT_ALLOWED';
 EXCEPTION WHEN OTHERS THEN IF SQLERRM<>'RECEIVER_PAYLOAD_CONFLICT' THEN RAISE;END IF;END;
 IF public.stellar_dispatch_ack_staging('5885a020-d363-4c27-910a-c035eda132f5',(cl->'event'->>'eventId')::bigint,gen_random_uuid(),repeat('a',64)) IS NOT FALSE THEN RAISE EXCEPTION 'STALE_TOKEN_ALLOWED';END IF;
 IF public.stellar_dispatch_ack_staging('5885a020-d363-4c27-910a-c035eda132f5',(cl->'event'->>'eventId')::bigint,token,repeat('a',64)) IS NOT TRUE THEN RAISE EXCEPTION 'VALID_ACK_REJECTED';END IF;
 IF public.stellar_dispatch_claim_staging('5885a020-d363-4c27-910a-c035eda132f5',ARRAY[w.workflow_id],'repeat-worker',10000) IS NOT NULL THEN RAISE EXCEPTION 'DELIVERED_RECLAIM_ALLOWED';END IF;
 BEGIN
  PERFORM public.stellar_dispatch_claim_staging(gen_random_uuid(),ARRAY[w.workflow_id],'foreign-tenant',10000);
  RAISE EXCEPTION 'FOREIGN_TENANT_ALLOWED';
 EXCEPTION WHEN OTHERS THEN IF SQLERRM<>'DISPATCH_SCOPE_REJECTED' THEN RAISE;END IF;END;
 PERFORM set_config('stellar.dispatch_test_evidence',jsonb_build_object('status','ROLLBACK_SQL_CHECKS_PASS','caseId',c.case_id,'workflowId',w.workflow_id,'eventId',cl->'event'->>'eventId','ack',receipt)::text,true);
END $test$;
RESET ROLE;
SELECT current_setting('stellar.dispatch_test_evidence')::jsonb AS evidence,
 (SELECT count(*) FROM public.stellar_dispatch_receipts_staging) AS receipt_count,
 (SELECT count(*) FROM public.stellar_dispatch_effects_staging) AS effect_count,
 (SELECT count(*) FROM public.stellar_orchestrator_events_staging WHERE delivery_state='DELIVERED') AS delivered_count;
ROLLBACK;