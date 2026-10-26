-- Dedicated staging caller store; existing PMA/IVR and legacy KB are untouched.
CREATE TABLE public.ai4cc_specialist_staging_articles (
 id uuid PRIMARY KEY,stable_id text NOT NULL,package_version text NOT NULL DEFAULT 'scoped-v2',
 product_scope text NOT NULL CHECK(product_scope IN ('sales','support_platform','support_hvac')),
 tenant_id uuid NOT NULL,title text NOT NULL,content text NOT NULL CHECK(length(btrim(content))>0),
 source_ref text NOT NULL,source_status text NOT NULL CHECK(source_status IN ('VERIFIED_SOURCE_DERIVATION','VERIFIED_SYNTHETIC_SOURCE')),
 execution_mode text NOT NULL CHECK(execution_mode IN ('INFORMATION_ONLY','CONFIRMED_LEAD_INTAKE','CONFIRMED_SUPPORT_INTAKE','SAFETY_GUIDANCE')),
 test_only boolean NOT NULL CHECK(test_only),approval_basis text NOT NULL,
 publication_state text NOT NULL DEFAULT 'published' CHECK(publication_state IN ('published','retired')),
 approved boolean NOT NULL DEFAULT true, effective_at timestamptz NOT NULL DEFAULT now(),expires_at timestamptz NOT NULL DEFAULT (now()+interval '30 days'),
 UNIQUE(package_version,product_scope,stable_id),CHECK(expires_at>effective_at),
 CHECK(((product_scope IN ('sales','support_platform') AND tenant_id='5885a020-d363-4c27-910a-c035eda132f5'::uuid)
 OR (product_scope='support_hvac' AND tenant_id='d7e80001-0000-4000-b000-000000000001'::uuid)) IS TRUE)
);
ALTER TABLE public.ai4cc_specialist_staging_articles ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.ai4cc_specialist_staging_articles FROM PUBLIC,anon,authenticated;
GRANT SELECT,INSERT,UPDATE ON public.ai4cc_specialist_staging_articles TO service_role;
CREATE FUNCTION public.ai4cc_specialist_staging_knowledge_v2(p_tenant_id uuid,p_scope text,p_query text,p_limit integer DEFAULT 5)
RETURNS TABLE(id uuid,stable_id text,tenant_id uuid,product_scope text,title text,content text,source_status text,execution_mode text,test_only boolean,package_version text,effective_at timestamptz,expires_at timestamptz)
LANGUAGE sql STABLE SECURITY INVOKER SET search_path=''
AS $$
 SELECT a.id,a.stable_id,a.tenant_id,a.product_scope,a.title,a.content,a.source_status,a.execution_mode,a.test_only,a.package_version,a.effective_at,a.expires_at
 FROM public.ai4cc_specialist_staging_articles a
 WHERE a.tenant_id=p_tenant_id AND a.product_scope=p_scope AND a.package_version='scoped-v2'
 AND ((p_scope IN ('sales','support_platform') AND p_tenant_id='5885a020-d363-4c27-910a-c035eda132f5'::uuid)
 OR (p_scope='support_hvac' AND p_tenant_id='d7e80001-0000-4000-b000-000000000001'::uuid))
 AND a.approved IS TRUE AND a.publication_state='published' AND a.test_only IS TRUE
 AND a.effective_at<=now() AND a.expires_at>now()
 AND p_query IS NOT NULL AND length(btrim(p_query)) BETWEEN 3 AND 240
 AND (lower(a.stable_id)=lower(btrim(p_query)) OR strpos(lower(a.title),lower(btrim(p_query)))>0 OR strpos(lower(a.content),lower(btrim(p_query)))>0)
 ORDER BY (lower(a.stable_id)=lower(btrim(p_query))) DESC,a.title,a.id
 LIMIT LEAST(GREATEST(COALESCE(p_limit,5),1),5);
$$;
REVOKE ALL ON FUNCTION public.ai4cc_specialist_staging_knowledge_v2(uuid,text,text,integer) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.ai4cc_specialist_staging_knowledge_v2(uuid,text,text,integer) TO service_role;
