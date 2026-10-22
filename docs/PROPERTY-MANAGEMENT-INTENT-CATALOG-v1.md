# Property Management Assistant — Intent Catalog v1.0

The 25-intent catalog extends the existing AI4Businesses platform. It does not provision or switch to an ElevenLabs Conversational Agent. The current voice path remains the existing OpenAI/Twilio bridge; SMS, chat and authenticated portal entry points use the same transactional catalog router.

## Authoritative assets
- `twilio-bridge/pma-intent-catalog-v1.json`: versioned intent IDs, examples, required entities, agents, workflow mappings, restrictions, confidence thresholds and canonical output fields.
- `twilio-bridge/pma-intents.cjs`: shared deterministic classifier, safety override and validated model proposals. Confidence scores from rules are heuristics, not statistically calibrated probabilities.
- `lib/propertyManagement/intentCatalog.ts`: API validation; model proposals cannot set identity, tenant, roles, record IDs or workflow changes.
- `supabase/functions/pma_catalog_core.sql`: SQL source for bounded workflow routing, authorization, idempotency and correlated audit output.
- `supabase/migrations/20261022053315_pma_intent_catalog_v1.sql`: executable migration, including a configuration snapshot. Regenerate using `python scripts/generate-pma-catalog-migration.py` after changing its sources. Tests detect config drift.

## Catalog
| IDs | Intents |
| --- | --- |
| 001–005 | LEASING_INQUIRY, UNIT_AVAILABILITY, SHOWING_REQUEST, APPLICATION_QUESTION, PROPERTY_POLICY |
| 006–010 | PET_POLICY, PARKING_QUESTION, MOVE_IN, MOVE_OUT, MAINTENANCE_REQUEST |
| 011–015 | MAINTENANCE_STATUS, FIRE_OR_SMOKE, SUSPECTED_GAS_LEAK, ELECTRICAL_HAZARD, MAJOR_FLOODING |
| 016–020 | PERSONAL_SAFETY_THREAT, VENDOR_RESPONSE, VENDOR_STATUS_UPDATE, OWNER_REQUEST, OWNER_OVERRIDE |
| 021–025 | PAYMENT_QUESTION, LEASE_QUESTION, UNKNOWN_QUESTION, HELP_REQUEST, GENERAL_GREETING |

## Routing and authority
Safety patterns override model classification and confidence. A validated model-reported emergency also takes the safety path while preserving the reported confidence and source; it cannot become a routine request merely because confidence is low. High confidence (at least .90) permits only bounded actions after entity validation, authorization and required confirmation. Medium confidence (.70 through below .90) asks one clarification. Low confidence routes UNKNOWN_QUESTION to the existing blocked manual follow-up queue. Greeting/help turns only log the interaction.

All canonical fields from the supplied catalog are stored on the interaction and in the audit event, with workflow, agent, resolution, escalation level, record IDs and workflow duration in milliseconds. `tenant_id` and `platform_tenant_id` both identify the existing platform workspace; residents remain contacts/occupancies, and prospect IDs reference existing leads. No duplicate resident identity or CRM is introduced.

Owner actions require a native authenticated owner session. A trusted voice/SMS actor cannot acquire owner authority. Owner changes require explicit confirmation and a current request version. Vendor updates require the vendor's own assignment; completion reports require staff verification. Native residents can query their own occupancy-bound records. Published availability uses fresh inventory records (24-hour window), never a guarantee for a future date. Missing facts and lease interpretation escalate. Payment questions never assert balances or receipt; only approved process knowledge can be returned.

Existing interactions, transcripts, leads, maintenance, Knowledge Vault, automation tasks and audit tables are reused. Notification delivery stays blocked/simulated in staging. A follow-up task or requires_notification flag is not a provider delivery receipt. No emergency dispatch, vendor arrival or repair completion is claimed.

## Verification and rollout limits
The isolated database tests exercise all 25 routes, confidence gates, cross-owner/property access denial, resident and vendor authority, stale-version rejection, replay conflicts, approved knowledge sources and audit correlations. Runtime tests cover every supplied example and untrusted model fields. These tests use PGlite and a schema fixture, not a complete live Supabase runtime. Browser checks use synthetic sessions and mocked API responses.

Both pending migrations must be applied in order: `20261021235624_pma_knowledge_model_v1.sql`, then `20261022053315_pma_intent_catalog_v1.sql`. The former was absent at the last successful live check; its connector apply failed with `Invalid or expired requestState`. Neither migration is represented as live. Real property policies and facts have not been supplied; templates remain unapproved. Actual staging login/storage, voice/SMS persistence and provider receipts still require validation. No production release is authorized.
