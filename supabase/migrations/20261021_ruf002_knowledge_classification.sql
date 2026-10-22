-- RUF-002: Knowledge source classification model
-- Adds publication lifecycle, scope, audience, and versioning to ai4cc_knowledge_entries.
-- Idempotent: safe to run on staging (table exists) and production (table does not exist yet).

-- Production path: create the full table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.ai4cc_knowledge_entries (
  id              uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id       uuid        NOT NULL,
  title           text        NOT NULL,
  category        text        NOT NULL DEFAULT 'general',
  content         text        NOT NULL DEFAULT '',
  tags            text[]      NOT NULL DEFAULT '{}',
  visibility      text        NOT NULL DEFAULT 'staff',
  approved        boolean     NOT NULL DEFAULT false,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);

-- RUF-002 classification columns (idempotent ADD IF NOT EXISTS)
ALTER TABLE public.ai4cc_knowledge_entries
  ADD COLUMN IF NOT EXISTS source_status    text        NOT NULL DEFAULT 'UNKNOWN'
    CHECK (source_status IN ('VERIFIED','PROPOSED','PLANNED','DEMO','UNKNOWN')),
  ADD COLUMN IF NOT EXISTS scope            text        NOT NULL DEFAULT 'tenant'
    CHECK (scope IN ('platform','tenant','product')),
  ADD COLUMN IF NOT EXISTS audience_scope   text        NOT NULL DEFAULT 'staff'
    CHECK (audience_scope IN ('public','staff','owner','vendor','internal')),
  ADD COLUMN IF NOT EXISTS publication_state text       NOT NULL DEFAULT 'draft'
    CHECK (publication_state IN ('draft','published','archived')),
  ADD COLUMN IF NOT EXISTS version_num      integer     NOT NULL DEFAULT 1 CHECK (version_num >= 1),
  ADD COLUMN IF NOT EXISTS reviewer_id      uuid,
  ADD COLUMN IF NOT EXISTS effective_at     timestamptz,
  ADD COLUMN IF NOT EXISTS expires_at       timestamptz;

-- Enforce: expires_at must be after effective_at when both are set
ALTER TABLE public.ai4cc_knowledge_entries
  DROP CONSTRAINT IF EXISTS ke_expiry_after_effective;
ALTER TABLE public.ai4cc_knowledge_entries
  ADD CONSTRAINT ke_expiry_after_effective
    CHECK (expires_at IS NULL OR effective_at IS NULL OR expires_at > effective_at);

-- Index: tenant + publication_state + audience_scope (drives RUF-005 visibility queries)
CREATE INDEX IF NOT EXISTS idx_ke_tenant_pub_audience
  ON public.ai4cc_knowledge_entries (tenant_id, publication_state, audience_scope);

-- Index: source_status (used by admin review workflows)
CREATE INDEX IF NOT EXISTS idx_ke_source_status
  ON public.ai4cc_knowledge_entries (source_status);

-- RLS: enable if not already on
ALTER TABLE public.ai4cc_knowledge_entries ENABLE ROW LEVEL SECURITY;

-- Policy: service_role bypass (authoritative writes from bridge/API)
DROP POLICY IF EXISTS ke_service_role_all ON public.ai4cc_knowledge_entries;
CREATE POLICY ke_service_role_all ON public.ai4cc_knowledge_entries
  FOR ALL TO service_role USING (true) WITH CHECK (true);

-- Policy: authenticated users see only their tenant's published entries scoped to staff or public
DROP POLICY IF EXISTS ke_authenticated_read ON public.ai4cc_knowledge_entries;
CREATE POLICY ke_authenticated_read ON public.ai4cc_knowledge_entries
  FOR SELECT TO authenticated
  USING (
    tenant_id = (current_setting('app.current_tenant_id', true))::uuid
    AND publication_state = 'published'
    AND audience_scope IN ('staff','public')
  );

-- Policy: anon sees only published + public entries (no tenant isolation for public KB)
DROP POLICY IF EXISTS ke_anon_read ON public.ai4cc_knowledge_entries;
CREATE POLICY ke_anon_read ON public.ai4cc_knowledge_entries
  FOR SELECT TO anon
  USING (publication_state = 'published' AND audience_scope = 'public');
