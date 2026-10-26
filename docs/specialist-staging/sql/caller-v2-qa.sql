BEGIN;
DO $qa$
DECLARE a record; n integer;
BEGIN
 IF (SELECT count(*) FROM public.ai4cc_specialist_staging_articles WHERE package_version='scoped-v2')<>269 THEN RAISE EXCEPTION 'caller count'; END IF;
 FOR a IN SELECT * FROM public.ai4cc_specialist_staging_articles LOOP
  IF NOT EXISTS(SELECT 1 FROM public.ai4cc_specialist_staging_knowledge_v2(a.tenant_id,a.product_scope,a.stable_id,5) r WHERE r.id=a.id AND r.content=a.content) THEN RAISE EXCEPTION 'missing caller UUID %',a.stable_id; END IF;
 END LOOP;
 IF EXISTS(SELECT 1 FROM public.ai4cc_specialist_staging_knowledge_v2('d7e80001-0000-4000-b000-000000000001','sales','SAL-001',5)) THEN RAISE EXCEPTION 'foreign tenant'; END IF;
 IF EXISTS(SELECT 1 FROM public.ai4cc_specialist_staging_knowledge_v2('5885a020-d363-4c27-910a-c035eda132f5','support_hvac','SERVICE_HOURS',5)) THEN RAISE EXCEPTION 'foreign HVAC'; END IF;
 IF EXISTS(SELECT 1 FROM public.ai4cc_specialist_staging_knowledge_v2('5885a020-d363-4c27-910a-c035eda132f5','sales','SUP-080',5)) THEN RAISE EXCEPTION 'same-tenant cross product'; END IF;
 IF EXISTS(SELECT 1 FROM public.ai4cc_specialist_staging_knowledge_v2('5885a020-d363-4c27-910a-c035eda132f5','sales','xx',5)) THEN RAISE EXCEPTION 'short query'; END IF;
 UPDATE public.ai4cc_specialist_staging_articles SET approved=false WHERE stable_id='SAL-001' AND product_scope='sales';
 IF EXISTS(SELECT 1 FROM public.ai4cc_specialist_staging_knowledge_v2('5885a020-d363-4c27-910a-c035eda132f5','sales','SAL-001',5)) THEN RAISE EXCEPTION 'unapproved accepted'; END IF;
 UPDATE public.ai4cc_specialist_staging_articles SET approved=true,publication_state='retired' WHERE stable_id='SAL-001' AND product_scope='sales';
 IF EXISTS(SELECT 1 FROM public.ai4cc_specialist_staging_knowledge_v2('5885a020-d363-4c27-910a-c035eda132f5','sales','SAL-001',5)) THEN RAISE EXCEPTION 'retired accepted'; END IF;
 UPDATE public.ai4cc_specialist_staging_articles SET publication_state='published',effective_at=now()-interval '2 days',expires_at=now()-interval '1 day' WHERE stable_id='SAL-001' AND product_scope='sales';
 IF EXISTS(SELECT 1 FROM public.ai4cc_specialist_staging_knowledge_v2('5885a020-d363-4c27-910a-c035eda132f5','sales','SAL-001',5)) THEN RAISE EXCEPTION 'expired accepted'; END IF;
 UPDATE public.ai4cc_specialist_staging_articles SET effective_at=now()+interval '1 day',expires_at=now()+interval '2 days' WHERE stable_id='SAL-001' AND product_scope='sales';
 IF EXISTS(SELECT 1 FROM public.ai4cc_specialist_staging_knowledge_v2('5885a020-d363-4c27-910a-c035eda132f5','sales','SAL-001',5)) THEN RAISE EXCEPTION 'future accepted'; END IF;
 IF has_function_privilege('anon','public.ai4cc_specialist_staging_knowledge_v2(uuid,text,text,integer)','EXECUTE') OR has_function_privilege('authenticated','public.ai4cc_specialist_staging_knowledge_v2(uuid,text,text,integer)','EXECUTE') OR has_table_privilege('anon','public.ai4cc_specialist_staging_articles','SELECT') OR has_table_privilege('authenticated','public.ai4cc_specialist_staging_articles','SELECT') THEN RAISE EXCEPTION 'public access'; END IF;
END $qa$;
SELECT 'PASS' AS caller_v2_qa,269 AS exact_uuid_retrievals;
ROLLBACK;
