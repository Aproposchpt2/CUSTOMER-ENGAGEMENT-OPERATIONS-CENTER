-- STELLAR STAGING QA: non-destructive invariants. Executed 2026-10-25, PASS.
DO $qa$
DECLARE n int;
BEGIN
 IF (SELECT count(*) FROM public.ai4cc_specialist_intent_catalog)<>283 THEN RAISE EXCEPTION '283 intent registry incomplete'; END IF;
 IF (SELECT count(*) FROM public.ai4cc_specialist_intent_catalog WHERE group_name='sales')<>100 THEN RAISE EXCEPTION 'Sales intents incomplete'; END IF;
 IF (SELECT count(*) FROM public.ai4cc_specialist_intent_catalog WHERE group_name='support')<>150 THEN RAISE EXCEPTION 'Support intents incomplete'; END IF;
 IF (SELECT count(*) FROM public.ai4cc_specialist_intent_catalog WHERE group_name='universal')<>16 THEN RAISE EXCEPTION 'Universal intents incomplete'; END IF;
 IF (SELECT count(*) FROM public.ai4cc_specialist_intent_catalog WHERE group_name='conversation_control')<>9 THEN RAISE EXCEPTION 'Control intents incomplete'; END IF;
 IF (SELECT count(*) FROM public.ai4cc_specialist_intent_catalog WHERE group_name='safety')<>8 THEN RAISE EXCEPTION 'Safety intents incomplete'; END IF;
 IF (SELECT count(*) FROM public.ai4cc_specialist_intent_catalog WHERE enabled OR approval_state<>'review_required')<>0 THEN RAISE EXCEPTION 'unapproved intent enabled'; END IF;
 IF (SELECT count(*) FROM public.ai4cc_specialist_package_versions)<>4 THEN RAISE EXCEPTION 'package ledger incomplete'; END IF;
 IF (SELECT count(*) FROM public.ai4cc_specialist_package_versions WHERE active OR approved)<>0 THEN RAISE EXCEPTION 'unapproved package active'; END IF;
 IF (SELECT count(*) FROM public.ai4cc_knowledge_entries WHERE category='sales_source_review_draft' AND 'source-package-20261025-v1'=any(tags))<>39 THEN RAISE EXCEPTION 'Sales source drafts incomplete'; END IF;
 IF (SELECT count(*) FROM public.ai4cc_knowledge_entries WHERE category='support_platform_review_draft' AND 'source-package-20261025-v1'=any(tags))<>7 THEN RAISE EXCEPTION 'Support platform source drafts incomplete'; END IF;
 IF (SELECT count(*) FROM public.ai4cc_knowledge_entries WHERE 'source-package-20261025-v1'=any(tags) AND (approved OR visibility<>'staff' OR audience_scope<>'staff' OR publication_state<>'draft' OR source_status<>'UNKNOWN'))<>0 THEN RAISE EXCEPTION 'source draft exposed'; END IF;
 IF has_function_privilege('anon','public.ai4cc_specialist_caller_knowledge_v1(uuid,text,integer)','EXECUTE')
    OR has_function_privilege('authenticated','public.ai4cc_specialist_caller_knowledge_v1(uuid,text,integer)','EXECUTE')
    OR NOT has_function_privilege('service_role','public.ai4cc_specialist_caller_knowledge_v1(uuid,text,integer)','EXECUTE') THEN RAISE EXCEPTION 'RPC grants unsafe'; END IF;
 IF has_table_privilege('anon','public.ai4cc_specialist_intent_catalog','SELECT')
    OR has_table_privilege('authenticated','public.ai4cc_specialist_intent_catalog','SELECT') THEN RAISE EXCEPTION 'Catalog grants unsafe'; END IF;
 BEGIN
  UPDATE public.ai4cc_specialist_package_versions SET active=true WHERE package_key='stellar-sales-source-20261025';
  RAISE EXCEPTION 'UNSAFE: draft activation succeeded';
 EXCEPTION WHEN check_violation THEN NULL;
 END;
END $qa$;
SELECT 'PASS' AS staging_readiness_invariants,
 (SELECT count(*) FROM public.ai4cc_specialist_intent_catalog) AS intents,
 (SELECT count(*) FROM public.ai4cc_specialist_package_versions WHERE active) AS active_packages;
-- Additional transactional synthetic eligibility fixture test was executed separately:
-- Sales VERIFIED public published => one match; Summit VERIFIED public published => one match;
-- wrong tenant, draft, staff, expired, future, valid_until expired, PROPOSED,
-- non-Sales category and short query => excluded. Transaction ROLLBACK verified zero fixture rows.
-- Hosted actual Sales/Summit positive caller retrieval remains blocked by lack of owner-approved public records.
