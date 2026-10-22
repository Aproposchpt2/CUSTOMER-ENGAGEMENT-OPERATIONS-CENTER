-- RUF-004: Summit Comfort HVAC synthetic demo tenant seed
-- ALL rows are test_only=true. No live notifications. Safe to reset/drop.
-- Target: staging Supabase (hvzauakkhlivzeqatfqm) only.

-- Tenant ID: d7e80001-0000-4000-b000-000000000001
-- KB IDs:    d7e80001-0000-4000-b000-0000000000[11-14]

INSERT INTO public.tenants (id, business_name, tenant_slug, status, metadata, created_at, updated_at)
VALUES (
  'd7e80001-0000-4000-b000-000000000001',
  'Summit Comfort HVAC',
  'summit-comfort-demo',
  'ACTIVE',
  '{"test_only": true, "demo": true, "vertical": "hvac", "notifications_disabled": true}',
  now(), now()
) ON CONFLICT (id) DO NOTHING;

INSERT INTO public.ai4cc_knowledge_entries
  (id, tenant_id, title, category, content, tags, source_status, scope, audience_scope, publication_state, version_num, effective_at)
VALUES
(
  'd7e80001-0000-4000-b000-000000000011',
  'd7e80001-0000-4000-b000-000000000001',
  '[SAFETY] Gas Leak Emergency Protocol',
  'general',
  E'# Gas Leak Emergency\nIf you smell gas:\n1. Do NOT operate any switches or electrical devices.\n2. Leave the building immediately.\n3. Call 911 from outside.\n4. Call your gas provider emergency line.\nDo not re-enter until cleared by emergency services.',
  ARRAY['safety','emergency','gas','hvac'],
  'VERIFIED', 'tenant', 'public', 'published', 1, now()
),
(
  'd7e80001-0000-4000-b000-000000000012',
  'd7e80001-0000-4000-b000-000000000001',
  '[SAFETY] Carbon Monoxide Emergency Protocol',
  'general',
  E'# Carbon Monoxide Emergency\nIf your CO detector sounds or you feel symptoms (headache, dizziness, nausea):\n1. Evacuate immediately — do not stop for belongings.\n2. Call 911 from outside.\n3. Do not re-enter until emergency services clear the building.',
  ARRAY['safety','emergency','co','carbon-monoxide','hvac'],
  'VERIFIED', 'tenant', 'public', 'published', 1, now()
),
(
  'd7e80001-0000-4000-b000-000000000013',
  'd7e80001-0000-4000-b000-000000000001',
  '[SERVICE] Summit Comfort Service Hours',
  'general',
  E'# Summit Comfort HVAC — Service Hours\n**Standard hours:** Monday-Friday 8am-6pm, Saturday 9am-3pm\n**Emergency service:** 24/7 for gas leaks, CO, and no-heat calls below 50°F.\n**Scheduling:** Call (702) 935-1414 or use our online portal.',
  ARRAY['demo','service-hours','hvac','summit-comfort'],
  'DEMO', 'tenant', 'staff', 'published', 1, now()
),
(
  'd7e80001-0000-4000-b000-000000000014',
  'd7e80001-0000-4000-b000-000000000001',
  '[SERVICE] Approved Basic HVAC Checks — Observational Only',
  'scripts',
  E'# Approved Basic Observational Checks\nSafe observational checks the agent may suggest.\n**Thermostat:** Confirm set to HEAT/COOL with correct target temperature.\n**Filter:** Check if visibly clogged or grey — restricts airflow.\n**Circuit breaker:** Check HVAC breaker is ON (do not reset repeatedly).\n**Vents:** Confirm supply and return vents are not blocked.\n\n## Prohibited Instructions\nNever instruct the customer to: open the unit, touch refrigerant lines, reset breakers more than once, inspect electrical connections, or attempt repairs.',
  ARRAY['demo','approved-checks','hvac','safety-policy'],
  'DEMO', 'tenant', 'staff', 'published', 1, now()
)
ON CONFLICT (id) DO NOTHING;
