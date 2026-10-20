-- Owner approved the narrow staging lookup on October 19, 2026.
-- Read-only canonical binding; never call from a public/browser client.
CREATE FUNCTION public.stellar_orch_lookup_staging(p_tenant_id uuid,p_operation_id text)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path='' AS $$
DECLARE w public.stellar_orchestrator_workflows_staging%rowtype;v_case uuid;v_customer uuid;v_count integer;
BEGIN
 IF p_tenant_id IS DISTINCT FROM '5885a020-d363-4c27-910a-c035eda132f5'::uuid
 OR p_operation_id IS NULL OR length(p_operation_id) NOT BETWEEN 1 AND 200 OR btrim(p_operation_id)='' THEN
  RAISE EXCEPTION 'STAGING_LOOKUP_REJECTED';
 END IF;
 SELECT * INTO w FROM public.stellar_orchestrator_workflows_staging WHERE tenant_id=p_tenant_id AND tool_call_id=p_operation_id;
 IF NOT FOUND THEN RETURN jsonb_build_object('found',false);END IF;
 IF w.state='COMPLETED' THEN
  SELECT count(*) INTO v_count FROM public.stellar_support_cases c WHERE c.tenant_id=w.tenant_id AND c.intake_session_id=w.session_id AND c.test_only=true;
  SELECT c.id,c.contact_id INTO v_case,v_customer FROM public.stellar_support_cases c
  JOIN public.ai4cc_contacts k ON k.id=c.contact_id AND k.tenant_id=c.tenant_id AND k.metadata->>'test_only'='true'
  WHERE c.id=w.case_id AND c.tenant_id=w.tenant_id AND c.intake_session_id=w.session_id AND c.test_only=true;
  IF v_count<>1 OR v_case IS NULL OR v_customer IS NULL THEN RAISE EXCEPTION 'COMPLETED_ASSOCIATION_INVALID';END IF;
 END IF;
 RETURN jsonb_build_object('found',true,'workflowId',w.workflow_id,'tenantId',w.tenant_id,'sessionId',w.session_id,
 'callId',w.call_id,'operationId',w.tool_call_id,'state',w.state,'verifiedCompleted',w.state='COMPLETED',
 'caseId',v_case,'customerId',v_customer,'testOnly',CASE WHEN w.state='COMPLETED' THEN true ELSE NULL END);
END $$;
REVOKE ALL ON FUNCTION public.stellar_orch_lookup_staging(uuid,text) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.stellar_orch_lookup_staging(uuid,text) TO service_role;
