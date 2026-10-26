-- Staging-only source registry. Does not feed caller knowledge retrieval.
CREATE TABLE IF NOT EXISTS public.ai4cc_specialist_source_records (
 package_key text NOT NULL,
 record_type text NOT NULL CHECK(record_type IN ('knowledge','intent','test_bundle','guide','manifest','hvac_reference')),
 record_id text NOT NULL,
 product_scope text NOT NULL CHECK(product_scope IN ('sales','support_platform','support_hvac','shared')),
 tenant_id uuid,
 payload jsonb NOT NULL CHECK(jsonb_typeof(payload) IN ('object','array')),
 review_state text NOT NULL DEFAULT 'draft' CHECK(review_state='draft'),
 caller_enabled boolean NOT NULL DEFAULT false CHECK(NOT caller_enabled),
 imported_at timestamptz NOT NULL DEFAULT now(),
 PRIMARY KEY(package_key,record_type,record_id),
 CHECK(((product_scope IN ('sales','support_platform') AND tenant_id='5885a020-d363-4c27-910a-c035eda132f5'::uuid)
 OR (product_scope='support_hvac' AND tenant_id='d7e80001-0000-4000-b000-000000000001'::uuid)
 OR (product_scope='shared' AND tenant_id IS NULL)) IS TRUE)
);
ALTER TABLE public.ai4cc_specialist_source_records ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.ai4cc_specialist_source_records FROM PUBLIC,anon,authenticated;
GRANT SELECT,INSERT,UPDATE ON public.ai4cc_specialist_source_records TO service_role;
CREATE OR REPLACE FUNCTION public.ai4cc_specialist_review_source_v1(p_tenant_id uuid,p_scope text,p_type text,p_record_id text)
RETURNS TABLE(package_key text,record_id text,payload jsonb,review_state text,caller_enabled boolean)
LANGUAGE sql STABLE SECURITY INVOKER SET search_path=''
AS $$
 SELECT s.package_key,s.record_id,s.payload,s.review_state,s.caller_enabled
 FROM public.ai4cc_specialist_source_records s
 WHERE s.tenant_id=p_tenant_id AND s.product_scope=p_scope AND s.record_type=p_type AND s.record_id=p_record_id
 AND ((p_scope IN ('sales','support_platform') AND p_tenant_id='5885a020-d363-4c27-910a-c035eda132f5'::uuid)
 OR (p_scope='support_hvac' AND p_tenant_id='d7e80001-0000-4000-b000-000000000001'::uuid))
 ORDER BY s.package_key;
$$;
REVOKE ALL ON FUNCTION public.ai4cc_specialist_review_source_v1(uuid,text,text,text) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.ai4cc_specialist_review_source_v1(uuid,text,text,text) TO service_role;
