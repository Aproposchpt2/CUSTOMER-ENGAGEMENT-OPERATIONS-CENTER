-- Applied 2026-10-25 to STELLAR staging project hvzauakkhlivzeqatfqm.
CREATE TABLE IF NOT EXISTS public.ai4cc_specialist_package_versions (
  package_key text PRIMARY KEY,
  product text NOT NULL CHECK(product IN ('sales','support','support_platform','shared_intents')),
  tenant_id uuid NULL,
  package_version text NOT NULL,
  source_revision text NOT NULL,
  record_count integer NOT NULL CHECK(record_count>=0),
  caller_eligible_count integer NOT NULL DEFAULT 0 CHECK(caller_eligible_count>=0),
  publication_state text NOT NULL DEFAULT 'draft' CHECK(publication_state IN ('draft','review','published','retired')),
  approved boolean NOT NULL DEFAULT false,
  active boolean NOT NULL DEFAULT false,
  activated_at timestamptz NULL,
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT specialist_package_no_unapproved_activation CHECK (
    NOT active OR (approved AND publication_state='published' AND caller_eligible_count>0 AND activated_at IS NOT NULL)
  ),
  CONSTRAINT specialist_package_tenant_binding CHECK (
    (product='sales' AND tenant_id='5885a020-d363-4c27-910a-c035eda132f5'::uuid)
    OR (product='support' AND tenant_id='d7e80001-0000-4000-b000-000000000001'::uuid)
    OR (product='support_platform' AND tenant_id='5885a020-d363-4c27-910a-c035eda132f5'::uuid)
    OR (product='shared_intents' AND tenant_id IS NULL)
  )
);
ALTER TABLE public.ai4cc_specialist_package_versions ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.ai4cc_specialist_package_versions FROM PUBLIC,anon,authenticated;
GRANT SELECT,INSERT,UPDATE ON public.ai4cc_specialist_package_versions TO service_role;
CREATE UNIQUE INDEX IF NOT EXISTS ai4cc_specialist_one_active_per_product
 ON public.ai4cc_specialist_package_versions(product,tenant_id) WHERE active;
-- Four staged packages. All inactive and review-required.
INSERT INTO public.ai4cc_specialist_package_versions(package_key,product,tenant_id,package_version,source_revision,record_count,caller_eligible_count,publication_state,approved,active) VALUES
('stellar-sales-source-20261025','sales','5885a020-d363-4c27-910a-c035eda132f5','source-recovery-1.0','f40ba7879a1c7e10ba269a6a9b31108166c10355',39,0,'review',false,false),
('stellar-support-platform-20261025','support_platform','5885a020-d363-4c27-910a-c035eda132f5','source-recovery-1.0','f40ba7879a1c7e10ba269a6a9b31108166c10355',7,0,'review',false,false),
('summit-hvac-support-existing','support','d7e80001-0000-4000-b000-000000000001','copilot-hvac-1.1-recovery-review','staging-inventory-20261025',40,0,'review',false,false),
('stellar-specialist-intents-2.0','shared_intents',NULL,'2.0','f40ba7879a1c7e10ba269a6a9b31108166c10355',283,0,'review',false,false)
ON CONFLICT(package_key) DO NOTHING;