-- PMA Phase 1: Schema additions and workflow infrastructure
-- Staging only (hvzauakkhlivzeqatfqm). Idempotent.

-- Extend pm_units with UAT-required fields
ALTER TABLE public.pm_units
  ADD COLUMN IF NOT EXISTS bathrooms        smallint,
  ADD COLUMN IF NOT EXISTS rent_amount      numeric(10,2),
  ADD COLUMN IF NOT EXISTS deposit_amount   numeric(10,2),
  ADD COLUMN IF NOT EXISTS sq_ft            smallint,
  ADD COLUMN IF NOT EXISTS availability_date date,
  ADD COLUMN IF NOT EXISTS unit_type        text;

-- Extend pm_properties with PMA-required fields
ALTER TABLE public.pm_properties
  ADD COLUMN IF NOT EXISTS property_type  text,
  ADD COLUMN IF NOT EXISTS timezone       text DEFAULT 'America/Los_Angeles',
  ADD COLUMN IF NOT EXISTS business_hours jsonb,
  ADD COLUMN IF NOT EXISTS metadata       jsonb;

-- Workflow ledger: durable idempotent operation state
CREATE TABLE IF NOT EXISTS public.workflow_ledger (
  id             uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id      uuid        NOT NULL,
  operation_id   text        NOT NULL,
  workflow_type  text        NOT NULL,
  status         text        NOT NULL DEFAULT 'ACCEPTED'
    CHECK (status IN ('ACCEPTED','RUNNING','COMPLETED','FAILED','UNKNOWN')),
  entity_type    text,
  entity_id      uuid,
  correlation_id text,
  payload        jsonb,
  result         jsonb,
  attempt_count  integer     NOT NULL DEFAULT 0,
  created_at     timestamptz NOT NULL DEFAULT now(),
  updated_at     timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS idx_wl_operation_id
  ON public.workflow_ledger (tenant_id, operation_id);
CREATE INDEX IF NOT EXISTS idx_wl_status
  ON public.workflow_ledger (tenant_id, status);

-- Workflow outbox: durable event delivery
CREATE TABLE IF NOT EXISTS public.workflow_outbox (
  id              uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id       uuid        NOT NULL,
  workflow_id     uuid,
  event_type      text        NOT NULL,
  status          text        NOT NULL DEFAULT 'PENDING'
    CHECK (status IN ('PENDING','DELIVERING','DELIVERED','FAILED')),
  attempts        integer     NOT NULL DEFAULT 0,
  next_attempt_at timestamptz NOT NULL DEFAULT now(),
  payload         jsonb,
  created_at      timestamptz NOT NULL DEFAULT now(),
  delivered_at    timestamptz
);
CREATE INDEX IF NOT EXISTS idx_wo_pending
  ON public.workflow_outbox (tenant_id, status, next_attempt_at)
  WHERE status IN ('PENDING','DELIVERING');

-- Agent sessions: voice/chat session tracking
CREATE TABLE IF NOT EXISTS public.agent_sessions (
  id               uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id        uuid        NOT NULL,
  channel          text        NOT NULL,
  caller_reference text,
  agent_type       text        NOT NULL,
  agent_id         text,
  started_at       timestamptz NOT NULL DEFAULT now(),
  ended_at         timestamptz,
  outcome          text,
  correlation_id   text,
  metadata         jsonb,
  created_at       timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_as_tenant_started
  ON public.agent_sessions (tenant_id, started_at DESC);

-- Intent events: per-session intent analytics and traceability
CREATE TABLE IF NOT EXISTS public.intent_events (
  id                uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id         uuid        NOT NULL,
  session_id        uuid        REFERENCES public.agent_sessions(id) ON DELETE SET NULL,
  intent_name       text        NOT NULL,
  confidence        numeric(4,3),
  priority          text,
  safety_override   boolean     NOT NULL DEFAULT false,
  workflow_triggered text,
  resolution        text,
  payload           jsonb,
  created_at        timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_ie_tenant_session
  ON public.intent_events (tenant_id, session_id);
CREATE INDEX IF NOT EXISTS idx_ie_safety_override
  ON public.intent_events (tenant_id, safety_override)
  WHERE safety_override = true;

-- Notification preferences: staging-safe routing config
CREATE TABLE IF NOT EXISTS public.pm_notification_preferences (
  id               uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id        uuid        NOT NULL,
  entity_type      text        NOT NULL,
  entity_id        uuid        NOT NULL,
  channel          text        NOT NULL CHECK (channel IN ('email','sms','voice','portal')),
  event_type       text        NOT NULL,
  destination      text        NOT NULL,
  active           boolean     NOT NULL DEFAULT true,
  staging_override boolean     NOT NULL DEFAULT false,
  created_at       timestamptz NOT NULL DEFAULT now(),
  updated_at       timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_np_tenant_entity
  ON public.pm_notification_preferences (tenant_id, entity_type, entity_id);

-- RLS: enable + service_role bypass on all new tables
ALTER TABLE public.workflow_ledger         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workflow_outbox         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.agent_sessions          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.intent_events           ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pm_notification_preferences ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS wl_service_role  ON public.workflow_ledger;
DROP POLICY IF EXISTS wo_service_role  ON public.workflow_outbox;
DROP POLICY IF EXISTS as_service_role  ON public.agent_sessions;
DROP POLICY IF EXISTS ie_service_role  ON public.intent_events;
DROP POLICY IF EXISTS np_service_role  ON public.pm_notification_preferences;

CREATE POLICY wl_service_role  ON public.workflow_ledger         FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY wo_service_role  ON public.workflow_outbox         FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY as_service_role  ON public.agent_sessions          FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY ie_service_role  ON public.intent_events           FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY np_service_role  ON public.pm_notification_preferences FOR ALL TO service_role USING (true) WITH CHECK (true);
