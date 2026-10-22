-- RUF-004: Summit Comfort HVAC synthetic demo tenant seed
-- ALL rows are test_only=true. No live notifications. Safe to reset/drop.
-- Target: staging Supabase (hvzauakkhlivzeqatfqm) only.

-- ── Tenant ────────────────────────────────────────────────────────────────────
INSERT INTO public.tenants (id, name, slug, metadata, created_at, updated_at)
VALUES (
  '11111111-demo-hvac-0000-000000000001',
  'Summit Comfort HVAC',
  'summit-comfort-demo',
  '{"test_only": true, "demo": true, "vertical": "hvac", "notifications_disabled": true}',
  now(), now()
) ON CONFLICT (id) DO NOTHING;

-- ── HVAC Knowledge entries ────────────────────────────────────────────────────
-- Emergency safety (source_status=VERIFIED, audience_scope=public)
INSERT INTO public.ai4cc_knowledge_entries
  (id, tenant_id, title, category, content, tags, source_status, scope, audience_scope, publication_state, version_num, effective_at)
VALUES
(
  '11111111-demo-hvac-kb00-000000000001',
  '11111111-demo-hvac-0000-000000000001',
  '[SAFETY] Gas Leak Emergency Protocol',
  'general',
  E'# Gas Leak Emergency\nIf you smell gas:\n1. Do NOT operate any switches or electrical devices.\n2. Leave the building immediately.\n3. Call 911 from outside.\n4. Call your gas provider emergency line.\nDo not re-enter until cleared by emergency services.',
  ARRAY['safety','emergency','gas','hvac'],
  'VERIFIED', 'tenant', 'public', 'published', 1, now()
),
(
  '11111111-demo-hvac-kb00-000000000002',
  '11111111-demo-hvac-0000-000000000001',
  '[SAFETY] Carbon Monoxide Emergency Protocol',
  'general',
  E'# Carbon Monoxide Emergency\nIf your CO detector sounds or you feel symptoms (headache, dizziness, nausea):\n1. Evacuate immediately — do not stop for belongings.\n2. Call 911 from outside.\n3. Do not re-enter until emergency services clear the building.',
  ARRAY['safety','emergency','co','carbon-monoxide','hvac'],
  'VERIFIED', 'tenant', 'public', 'published', 1, now()
),
-- Service information (source_status=DEMO)
(
  '11111111-demo-hvac-kb00-000000000003',
  '11111111-demo-hvac-0000-000000000001',
  '[SERVICE] Summit Comfort Service Hours',
  'general',
  E'# Summit Comfort HVAC — Service Hours\n**Standard hours:** Monday–Friday 8am–6pm, Saturday 9am–3pm\n**Emergency service:** 24/7 for gas leaks, CO, and no-heat calls below 50°F.\n**Scheduling:** Call (702) 935-1414 or use our online portal.',
  ARRAY['demo','service-hours','hvac','summit-comfort'],
  'DEMO', 'tenant', 'staff', 'published', 1, now()
),
(
  '11111111-demo-hvac-kb00-000000000004',
  '11111111-demo-hvac-0000-000000000001',
  '[SERVICE] Approved Basic HVAC Checks — Observational Only',
  'scripts',
  E'# Approved Basic Observational Checks\nThese are safe, observational checks the agent may suggest to customers.\n**Thermostat:** Confirm it is set to HEAT/COOL and the target temperature is higher/lower than current room temperature.\n**Filter:** Check if the filter is visibly clogged or grey — a clogged filter restricts airflow.\n**Circuit breaker:** Check if the HVAC breaker is in the ON position (do not reset repeatedly).\n**Vents:** Confirm supply and return vents are not blocked by furniture.\n\n## Prohibited Instructions\nDo NOT instruct the customer to: open the unit, touch refrigerant lines, reset breakers more than once, inspect electrical connections, or attempt repairs.',
  ARRAY['demo','approved-checks','hvac','safety-policy'],
  'DEMO', 'tenant', 'staff', 'published', 1, now()
)
ON CONFLICT (id) DO NOTHING;
