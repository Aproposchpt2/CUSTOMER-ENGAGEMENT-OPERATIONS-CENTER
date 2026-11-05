# STELLAR Sales and HVAC Support — Implementation-Ready Documentation Handoff

**Status:** RESEARCH/ENGINEERING SPECIFICATION ONLY — not activated, tested, or approved for production.  
**Source:** `AI4Businesses_Master_Intent_Catalog_Sales_Support_HVAC_v1.0.docx`; Sales v1.1; HVAC Demo v1.1; Ruflo Implementation Backlog v1.0; October 2026.

## Scope and inventory

The full Master Intent Catalog defines **105 items** across seven groups: **universal 16**, **conversation_control 9**, **sales 25**, **support 13**, **hvac 22**, **safety 8**, **backend_workflow 12**. It contains **85** primary test-matrix rows. The abbreviated 16-item list is NOT the entire catalog; retain earlier IDs as historical names, not a substitute for this catalog.

- `master_intent_registry_v1.0.json`: source fields transcribed from seven tables, with original `UNI-/CTL-/SLS-/SUP-/HVC-/SAFE-/WF-` identifiers intact.
- `master_intent_registry_v1.0.csv`: import/review table; not a database migration.
- `master_intent_test_matrix_v1.0.csv`: extracted source test matrix; expected conditions are source language, not passing test results.
- `README.md`: this handoff and release restrictions.

## Required implementation separation

1. **Deterministic safety scan** before ordinary intent detection. Critical hazards interrupt routine HVAC triage. Do not depend solely on a model's confidence.
2. **Conversation controller** handles barge-in, correction, cancellation, resume and pending business operation without losing persisted state.
3. **Intent classifier** returns canonical ID, confidence, relevant entities, eligible workflow and version. Source confidence: >=0.90 eligible for bounded reversible execution *only after entity, authorization and policy validation*; 0.70–0.89 clarification; below 0.70 fallback. A classifier score does not authorize business mutation.
4. **Backend actions** must be server-authorized, tenant-scoped and idempotent. `ACCEPTED`/`RUNNING` are not success. `UNKNOWN` calls the reconciliation path rather than blindly retrying; `COMPLETED` is reported only after verified persistence and response delivery.
5. **Retrieval** uses only approved, audience/tenant-scoped knowledge; staff-only research drafts must not be caller-visible.
6. **Sales and HVAC** keep separate role policies and call-flow state while reusing shared controls.

## Source conflicts and release blockers

- HVAC is a **synthetic Summit Comfort demo**. Its hours, pricing, service areas and dispatch policy must never be represented as Stellar or a real customer's approved facts.
- The demo describes conditional breaker reset; existing phase-one researched safety rules are stricter. **Preserve the no-breaker-reset coaching restriction** pending qualified owner review.
- Sales and HVAC documents are labeled v1.1 in filenames/footers but some covers say v1.0. Do not silently rewrite provenance.
- The short catalog has `GAS_ODOR` / `CO_ALARM`; detailed safety set contains `EMERGENCY_GAS_LEAK` / `EMERGENCY_CO_ALARM`. Implement an explicit alias map only following code inventory and acceptance; do not silently rename caller intents.
- Do not equate KB storage with deployed runtime retrieval or voice training.
- No production routing, merges, notifications or telephony changes under this handoff.

## Acceptance priorities

- Verify all 7 catalog groups route correctly; perform test matrix and role-specific voice tests.
- Prove urgent gas/CO/fire/smoke/electricity detection with ambiguous phrases, interrupted turns and cross-intent collisions.
- Prove durable case/lead operation state and no duplicate record on reconnect/timeout/UNKNOWN.
- Prove caller hears exact verified case/lead reference and conversation resumes after interruptions.
- Verify anonymous, staff, tenant, customer ownership, audience and approval boundaries with negative tests.
- Attach staging logs, DB IDs, correlation IDs, sanitized transcripts, commits and rollback steps; require separate owner approval for production.

## Source traceability and status

The registry is transcription, not implementation, and no runtime behavior is certified. There are no inferred completion statuses for Ruflo backlog tasks. Existing 12 HVAC research entries and 8 gap entries should remain unchanged until source-reviewed approval. The full 22-page catalog contains many more entries than the earlier 16-item summary. Keep versioned docs in GitHub once the documentation commit is verified.