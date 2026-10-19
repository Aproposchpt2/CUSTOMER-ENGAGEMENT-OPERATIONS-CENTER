-- STAGING ONLY: hvzauakkhlivzeqatfqm. Not imported by the voice bridge.
-- Requires owner approval of the dispatcher review; leaves existing table ACLs intact.
ALTER TABLE public.stellar_orchestrator_events_staging
 ADD COLUMN delivery_state text NOT NULL DEFAULT 'PENDING',
 ADD COLUMN claim_token uuid,
 ADD COLUMN claim_owner text,
 ADD COLUMN lease_until timestamptz,
 ADD COLUMN payload_sha256 text;
UPDATE public.stellar_orchestrator_events_staging SET delivery_state='DELIVERED' WHERE delivered_at IS NOT NULL;
ALTER TABLE public.stellar_orchestrator_events_staging ALTER COLUMN next_attempt_at DROP NOT NULL;
ALTER TABLE public.stellar_orchestrator_events_staging
 ADD CONSTRAINT stellar_dispatch_state_ck CHECK(delivery_state IN ('PENDING','LEASED','DELIVERED','FAILED','QUARANTINED')),
 ADD CONSTRAINT stellar_dispatch_delivered_ck CHECK((delivery_state='DELIVERED')=(delivered_at IS NOT NULL)),
 ADD CONSTRAINT stellar_dispatch_hash_ck CHECK(payload_sha256 IS NULL OR payload_sha256 ~ '^[0-9a-f]{64}$'),
 ADD CONSTRAINT stellar_dispatch_lease_ck CHECK(
  (delivery_state='LEASED' AND claim_token IS NOT NULL AND claim_owner IS NOT NULL AND lease_until IS NOT NULL)
  OR (delivery_state<>'LEASED' AND claim_token IS NULL AND claim_owner IS NULL AND lease_until IS NULL));
CREATE INDEX stellar_dispatch_due_staging_idx ON public.stellar_orchestrator_events_staging(tenant_id,next_attempt_at,event_id)
 WHERE delivery_state='PENDING' AND event_type='COMPLETED';
CREATE INDEX stellar_dispatch_expired_staging_idx ON public.stellar_orchestrator_events_staging(tenant_id,lease_until,event_id)
 WHERE delivery_state='LEASED' AND event_type='COMPLETED';
CREATE TABLE public.stellar_dispatch_receipts_staging(
 idempotency_key text PRIMARY KEY,
 event_id bigint NOT NULL UNIQUE REFERENCES public.stellar_orchestrator_events_staging(event_id),
 tenant_id uuid NOT NULL CHECK(tenant_id='5885a020-d363-4c27-910a-c035eda132f5'::uuid),
 workflow_id uuid NOT NULL,session_id text NOT NULL,case_id uuid NOT NULL,
 payload_sha256 text NOT NULL CHECK(payload_sha256 ~ '^[0-9a-f]{64}$'),
 received_at timestamptz NOT NULL DEFAULT clock_timestamp());
CREATE TABLE public.stellar_dispatch_effects_staging(
 idempotency_key text PRIMARY KEY REFERENCES public.stellar_dispatch_receipts_staging(idempotency_key),
 event_id bigint NOT NULL UNIQUE REFERENCES public.stellar_orchestrator_events_staging(event_id),
 tenant_id uuid NOT NULL CHECK(tenant_id='5885a020-d363-4c27-910a-c035eda132f5'::uuid),
 case_id uuid NOT NULL,applied_at timestamptz NOT NULL DEFAULT clock_timestamp());
ALTER TABLE public.stellar_dispatch_receipts_staging ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.stellar_dispatch_effects_staging ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.stellar_dispatch_receipts_staging,public.stellar_dispatch_effects_staging FROM PUBLIC,anon,authenticated,service_role;

CREATE FUNCTION public.stellar_dispatch_claim_staging(p_tenant_id uuid,p_workflow_ids uuid[],p_worker_id text,p_lease_ms integer DEFAULT 10000)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE e public.stellar_orchestrator_events_staging%rowtype;ts timestamptz:=clock_timestamp();tok uuid;
BEGIN
 IF p_tenant_id IS DISTINCT FROM '5885a020-d363-4c27-910a-c035eda132f5'::uuid
 OR coalesce(cardinality(p_workflow_ids),0) NOT BETWEEN 1 AND 20 OR array_position(p_workflow_ids,NULL) IS NOT NULL
 OR coalesce(length(p_worker_id),0) NOT BETWEEN 1 AND 150 OR p_lease_ms IS NULL OR p_lease_ms NOT BETWEEN 5000 AND 30000 THEN RAISE EXCEPTION 'DISPATCH_SCOPE_REJECTED';END IF;
 -- Final crashed attempt is terminal; it must not be reclaimed forever.
 UPDATE public.stellar_orchestrator_events_staging SET delivery_state='FAILED',claim_token=NULL,claim_owner=NULL,lease_until=NULL,next_attempt_at=NULL,last_error='ATTEMPTS_EXHAUSTED'
 WHERE tenant_id=p_tenant_id AND workflow_id=ANY(p_workflow_ids) AND event_type='COMPLETED' AND attempts>=5
 AND ((delivery_state='LEASED' AND lease_until<=ts) OR delivery_state='PENDING');
 SELECT * INTO e FROM public.stellar_orchestrator_events_staging
 WHERE tenant_id=p_tenant_id AND workflow_id=ANY(p_workflow_ids) AND event_type='COMPLETED' AND attempts<5
 AND ((delivery_state='PENDING' AND next_attempt_at<=ts) OR (delivery_state='LEASED' AND lease_until<=ts))
 ORDER BY event_id LIMIT 1 FOR UPDATE SKIP LOCKED;
 IF NOT FOUND THEN RETURN NULL;END IF;
 tok:=gen_random_uuid();
 UPDATE public.stellar_orchestrator_events_staging SET delivery_state='LEASED',claim_token=tok,claim_owner=p_worker_id,
 lease_until=ts+p_lease_ms*interval '1 millisecond',attempts=attempts+1,last_error=NULL WHERE event_id=e.event_id RETURNING * INTO e;
 RETURN jsonb_build_object('token',tok,'attempt',e.attempts,'leaseUntil',extract(epoch FROM e.lease_until)*1000,
 'event',jsonb_build_object('eventId',e.event_id::text,'tenantId',e.tenant_id,'workflowId',e.workflow_id,'sessionId',e.session_id,'caseId',e.case_id,'eventType',e.event_type,'createdAt',e.created_at));
END $$;

CREATE FUNCTION public.stellar_dispatch_verify_staging(p_tenant_id uuid,p_event_id bigint,p_token uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE e public.stellar_orchestrator_events_staging%rowtype;
BEGIN
 IF p_tenant_id IS DISTINCT FROM '5885a020-d363-4c27-910a-c035eda132f5'::uuid THEN RAISE EXCEPTION 'DISPATCH_SCOPE_REJECTED';END IF;
 SELECT x.* INTO e FROM public.stellar_orchestrator_events_staging x
 JOIN public.stellar_orchestrator_workflows_staging w ON w.workflow_id=x.workflow_id AND w.tenant_id=x.tenant_id AND w.session_id=x.session_id AND w.case_id=x.case_id AND w.state='COMPLETED'
 JOIN public.stellar_support_cases c ON c.id=x.case_id AND c.tenant_id=x.tenant_id AND c.intake_session_id=x.session_id AND c.test_only=true
 WHERE x.event_id=p_event_id AND x.tenant_id=p_tenant_id AND x.event_type='COMPLETED' AND x.delivery_state='LEASED' AND x.claim_token=p_token AND x.lease_until>clock_timestamp();
 IF NOT FOUND THEN RETURN jsonb_build_object('verified',false);END IF;
 RETURN jsonb_build_object('verified',true,'tenantId',e.tenant_id,'workflowId',e.workflow_id,'sessionId',e.session_id,'caseId',e.case_id);
END $$;

CREATE FUNCTION public.stellar_dispatch_receive_staging(p_tenant_id uuid,p_event_id bigint,p_workflow_id uuid,p_session_id text,p_case_id uuid,p_key text,p_hash text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE e public.stellar_orchestrator_events_staging%rowtype;r public.stellar_dispatch_receipts_staging%rowtype;expected_key text;
BEGIN
 IF p_tenant_id IS DISTINCT FROM '5885a020-d363-4c27-910a-c035eda132f5'::uuid OR p_hash IS NULL OR p_hash !~ '^[0-9a-f]{64}$' THEN RAISE EXCEPTION 'DISPATCH_SCOPE_REJECTED';END IF;
 expected_key:='stellar:hvzauakkhlivzeqatfqm:'||p_tenant_id::text||':'||p_event_id::text;
 IF p_key IS DISTINCT FROM expected_key THEN RAISE EXCEPTION 'RECEIVER_KEY_REJECTED';END IF;
 SELECT x.* INTO e FROM public.stellar_orchestrator_events_staging x
 JOIN public.stellar_orchestrator_workflows_staging w ON w.workflow_id=x.workflow_id AND w.tenant_id=x.tenant_id AND w.session_id=x.session_id AND w.case_id=x.case_id AND w.state='COMPLETED'
 JOIN public.stellar_support_cases c ON c.id=x.case_id AND c.tenant_id=x.tenant_id AND c.intake_session_id=x.session_id AND c.test_only=true
 WHERE x.event_id=p_event_id AND x.tenant_id=p_tenant_id AND x.workflow_id=p_workflow_id AND x.session_id=p_session_id AND x.case_id=p_case_id AND x.event_type='COMPLETED'
 FOR SHARE OF x;
 IF NOT FOUND THEN RAISE EXCEPTION 'RECEIVER_ASSOCIATION_REJECTED';END IF;
 INSERT INTO public.stellar_dispatch_receipts_staging(idempotency_key,event_id,tenant_id,workflow_id,session_id,case_id,payload_sha256)
 VALUES(p_key,p_event_id,p_tenant_id,p_workflow_id,p_session_id,p_case_id,p_hash) ON CONFLICT DO NOTHING;
 SELECT * INTO r FROM public.stellar_dispatch_receipts_staging WHERE idempotency_key=p_key FOR UPDATE;
 IF NOT FOUND OR r.payload_sha256 IS DISTINCT FROM p_hash OR r.event_id IS DISTINCT FROM p_event_id OR r.tenant_id IS DISTINCT FROM p_tenant_id
 OR r.workflow_id IS DISTINCT FROM p_workflow_id OR r.session_id IS DISTINCT FROM p_session_id OR r.case_id IS DISTINCT FROM p_case_id THEN RAISE EXCEPTION 'RECEIVER_PAYLOAD_CONFLICT';END IF;
 INSERT INTO public.stellar_dispatch_effects_staging(idempotency_key,event_id,tenant_id,case_id) VALUES(p_key,p_event_id,p_tenant_id,p_case_id) ON CONFLICT DO NOTHING;
 RETURN jsonb_build_object('accepted',true,'durable',true,'eventId',p_event_id::text,'caseId',p_case_id,'idempotencyKey',p_key,'payloadSha256',p_hash);
END $$;

CREATE FUNCTION public.stellar_dispatch_ack_staging(p_tenant_id uuid,p_event_id bigint,p_token uuid,p_hash text)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE valid jsonb;n integer;
BEGIN
 IF p_tenant_id IS DISTINCT FROM '5885a020-d363-4c27-910a-c035eda132f5'::uuid OR p_hash IS NULL OR p_hash !~ '^[0-9a-f]{64}$' THEN RAISE EXCEPTION 'DISPATCH_SCOPE_REJECTED';END IF;
 valid:=public.stellar_dispatch_verify_staging(p_tenant_id,p_event_id,p_token);
 IF coalesce((valid->>'verified')::boolean,false) IS NOT TRUE THEN RETURN false;END IF;
 -- The local test receiver must have committed both its durable receipt and effect.
 IF NOT EXISTS(SELECT 1 FROM public.stellar_dispatch_receipts_staging r JOIN public.stellar_dispatch_effects_staging a USING(idempotency_key)
 WHERE r.event_id=p_event_id AND r.tenant_id=p_tenant_id AND r.payload_sha256=p_hash AND a.event_id=r.event_id AND a.tenant_id=r.tenant_id AND a.case_id=r.case_id) THEN RAISE EXCEPTION 'DURABLE_RECEIPT_REQUIRED';END IF;
 UPDATE public.stellar_orchestrator_events_staging SET delivery_state='DELIVERED',delivered_at=clock_timestamp(),payload_sha256=p_hash,
 claim_token=NULL,claim_owner=NULL,lease_until=NULL,next_attempt_at=NULL,last_error=NULL
 WHERE event_id=p_event_id AND tenant_id=p_tenant_id AND delivery_state='LEASED' AND claim_token=p_token AND lease_until>clock_timestamp();
 GET DIAGNOSTICS n=ROW_COUNT;RETURN n=1;
END $$;

CREATE FUNCTION public.stellar_dispatch_fail_staging(p_tenant_id uuid,p_event_id bigint,p_token uuid,p_code text)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE e public.stellar_orchestrator_events_staging%rowtype;s text;ts timestamptz:=clock_timestamp();
BEGIN
 IF p_tenant_id IS DISTINCT FROM '5885a020-d363-4c27-910a-c035eda132f5'::uuid THEN RAISE EXCEPTION 'DISPATCH_SCOPE_REJECTED';END IF;
 IF p_code IS NULL OR p_code NOT IN ('TENANT_REJECTED','EVENT_ID_REJECTED','ASSOCIATION_ID_REJECTED','EVENT_TYPE_REJECTED','SESSION_REJECTED','EVENT_TIME_REJECTED','AUTHORITATIVE_ASSOCIATION_INVALID','ACK_MISMATCH','LEASE_EXPIRED','TRANSPORT_TIMEOUT','RECEIVER_REJECTED','ACK_TOO_LARGE','DELIVERY_UNCERTAIN') THEN RAISE EXCEPTION 'DISPATCH_ERROR_CODE_REJECTED';END IF;
 SELECT * INTO e FROM public.stellar_orchestrator_events_staging WHERE event_id=p_event_id AND tenant_id=p_tenant_id AND delivery_state='LEASED' AND claim_token=p_token AND lease_until>ts FOR UPDATE;
 IF NOT FOUND THEN RETURN false;END IF;
 s:=CASE WHEN p_code IN ('TENANT_REJECTED','EVENT_ID_REJECTED','ASSOCIATION_ID_REJECTED','EVENT_TYPE_REJECTED','SESSION_REJECTED','EVENT_TIME_REJECTED','AUTHORITATIVE_ASSOCIATION_INVALID','ACK_MISMATCH') THEN 'QUARANTINED' WHEN e.attempts>=5 THEN 'FAILED' ELSE 'PENDING' END;
 UPDATE public.stellar_orchestrator_events_staging SET delivery_state=s,claim_token=NULL,claim_owner=NULL,lease_until=NULL,last_error=p_code,
 next_attempt_at=CASE WHEN s='PENDING' THEN ts+least(300,power(2,e.attempts-1))::double precision*interval '1 second' ELSE NULL END WHERE event_id=e.event_id;
 RETURN true;
END $$;

REVOKE ALL ON FUNCTION public.stellar_dispatch_claim_staging(uuid,uuid[],text,integer),public.stellar_dispatch_verify_staging(uuid,bigint,uuid),public.stellar_dispatch_receive_staging(uuid,bigint,uuid,text,uuid,text,text),public.stellar_dispatch_ack_staging(uuid,bigint,uuid,text),public.stellar_dispatch_fail_staging(uuid,bigint,uuid,text) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.stellar_dispatch_claim_staging(uuid,uuid[],text,integer),public.stellar_dispatch_verify_staging(uuid,bigint,uuid),public.stellar_dispatch_receive_staging(uuid,bigint,uuid,text,uuid,text,text),public.stellar_dispatch_ack_staging(uuid,bigint,uuid,text),public.stellar_dispatch_fail_staging(uuid,bigint,uuid,text) TO service_role;
