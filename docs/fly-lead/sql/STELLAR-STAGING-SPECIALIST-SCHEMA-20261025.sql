-- STELLAR staging-only specialist schema, applied 2026-10-25 to hvzauakkhlivzeqatfqm.
-- This is a replayable reference, not an instruction to reapply an already-recorded migration.
CREATE TABLE IF NOT EXISTS public.ai4cc_specialist_intent_catalog (
  stable_id text PRIMARY KEY CHECK (stable_id ~ '^(SAL|SUP|UNI|CTL|SAFE)-[0-9]{3}$'),
  package_version text NOT NULL,
  source_revision text NOT NULL,
  intent_symbol text NOT NULL,
  group_name text NOT NULL CHECK (group_name IN ('sales','support','universal','conversation_control','safety')),
  tenant_id uuid NULL,
  definition jsonb NOT NULL,
  workflow_binding text NOT NULL DEFAULT 'classification_only',
  implementation_status text NOT NULL DEFAULT 'CATALOG_ONLY',
  enabled boolean NOT NULL DEFAULT false,
  approval_state text NOT NULL DEFAULT 'review_required' CHECK (approval_state IN ('review_required','approved')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT specialist_catalog_tenant_scope CHECK (
    (group_name='sales' AND tenant_id='5885a020-d363-4c27-910a-c035eda132f5'::uuid)
    OR (group_name='support' AND tenant_id='d7e80001-0000-4000-b000-000000000001'::uuid)
    OR (group_name IN ('universal','conversation_control','safety') AND tenant_id IS NULL)
  )
);
ALTER TABLE public.ai4cc_specialist_intent_catalog ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.ai4cc_specialist_intent_catalog FROM PUBLIC,anon,authenticated;
GRANT SELECT,INSERT,UPDATE ON public.ai4cc_specialist_intent_catalog TO service_role;
CREATE INDEX IF NOT EXISTS ai4cc_specialist_intent_catalog_scope_idx
  ON public.ai4cc_specialist_intent_catalog(group_name,tenant_id,enabled,approval_state);
CREATE OR REPLACE FUNCTION public.ai4cc_specialist_caller_knowledge_v1(
  p_tenant_id uuid,p_query text,p_limit integer DEFAULT 5
) RETURNS TABLE (
  id uuid,tenant_id uuid,title text,category text,content text,source_status text,
  version_num integer,effective_at timestamptz,expires_at timestamptz,valid_until timestamptz
) LANGUAGE sql STABLE SECURITY INVOKER SET search_path='' AS $fn$
 SELECT k.id,k.tenant_id,k.title,k.category,k.content,k.source_status,k.version_num,
        k.effective_at,k.expires_at,k.valid_until
 FROM public.ai4cc_knowledge_entries k
 WHERE p_tenant_id IN ('5885a020-d363-4c27-910a-c035eda132f5'::uuid,'d7e80001-0000-4000-b000-000000000001'::uuid)
   AND k.tenant_id=p_tenant_id
   AND ((p_tenant_id='5885a020-d363-4c27-910a-c035eda132f5'::uuid AND k.category LIKE 'sales\_%' ESCAPE '\')
     OR (p_tenant_id='d7e80001-0000-4000-b000-000000000001'::uuid AND k.category<>'pma_agent_model_v1'))
   AND k.approved IS TRUE AND k.visibility='public' AND k.audience_scope='public'
   AND k.publication_state='published' AND k.source_status='VERIFIED'
   AND length(btrim(k.content))>0
   AND (k.effective_at IS NULL OR k.effective_at<=now())
   AND (k.expires_at IS NULL OR k.expires_at>now())
   AND (k.valid_until IS NULL OR k.valid_until>now())
   AND p_query IS NOT NULL AND length(btrim(p_query)) BETWEEN 3 AND 240
   AND (strpos(lower(k.title),lower(btrim(p_query)))>0
     OR strpos(lower(k.content),lower(btrim(p_query)))>0)
 ORDER BY k.title,k.id LIMIT LEAST(GREATEST(COALESCE(p_limit,5),1),5)
$fn$;
REVOKE ALL ON FUNCTION public.ai4cc_specialist_caller_knowledge_v1(uuid,text,integer) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.ai4cc_specialist_caller_knowledge_v1(uuid,text,integer) TO service_role;
-- Do not enable catalog rows or publish knowledge without separate approved content review.
