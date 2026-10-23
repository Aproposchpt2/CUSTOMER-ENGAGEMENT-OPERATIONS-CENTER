# HVAC SUPPORT FULL PACKAGE — INTEGRATION GATE
Date: 2026-10-22
Status: COMPLETE SOURCE STAGED; OPERATIONAL RUNTIME NOT YET VERIFIED
Tenant: Summit Comfort Heating & Air `d7e80001-0000-4000-b000-000000000001`
Staging database: `hvzauakkhlivzeqatfqm`

## Confirmed staging work
- All **24 full Co-Pilot HVAC Support v1.1 sections** inserted as individually reviewable `hvac_copilot_source_review_draft` entries with trace tags `section:1` through `section:24`.
- Existing 16 HVAC research/relevant-support drafts preserved; five earlier tenant records remain untouched.
- Total **45** Summit tenant KB entries, **zero approved**, no caller-facing publication.
- Full source committed in `docs/hvac-knowledge/source/CoPilot-HVAC-Support-v1.1-complete-extracted.md`.
- Master source catalog in `docs/hvac-knowledge/source/HVAC-SUPPORT-master-intents-source.json`: SUP 13, HVC 22, SAFE 8, UNI 16, CTL 9, WF 12.
- `twilio-bridge/hvac-support-intent-policy.cjs` + `tests/hvacSupportIntentPolicy.test.cjs` added: source-backed ID/threshold/tenant gate. **Not yet wired to OpenAI voice session, not an actual transcript classifier and not capable of executing workflows.** Test file not executed.

## P0 integration order for Ruflo
1. Verify source equivalence and section review: preserve exact original sections and separate synthetic demo information from safety guidance; resolve policy conflicts noted in `HVAC-KB-RECONCILIATION-FINDINGS.md`.
2. Build a **reviewed caller-answer knowledge layer**, rather than reading full unreviewed sections to callers. Approval requires human source review. Do not bulk flip `approved`, `visibility` or `publication_state`.
3. Implement tenant-scoped authorized KB retrieval in Cedar's OpenAI Support delegation; enforce tenant+approval+public-audience+truth-classification on both query and returned content. Never fall back to the main STELLAR tenant. The PMA draft is excluded.
4. Complete actual classification and workflow orchestration for 13 SUP and 22 HVC intents; bind 8 deterministic safety overrides before routine classification. The newly added `hvac-support-intent-policy.cjs` is only a policy component.
5. Map intents to full source sections, answer excerpts, entities, confidence, safety and backend tools. Server-owned authorization, immutable tenant ID, and durable work states are required.
6. Preserve exact owner-approved greeting **“You have reached Summit Comfort Heating & Air. How can I help you?”** with OpenAI voice **Cedar**; correct Ruflo's conflicting greeting only in isolated staging, not IVR.
7. Execute existing and new unit/integration tests; then real staging Support UAT with verified Summit tenant case ID and no outbound notifications.

## Explicit holds
- No caller-facing release of the 45 records.
- Fictional schedules and service offers are not real operating policies.
- Do not guide breaker reset / electrical work pending safety reconciliation.
- No production merge/deploy, no IVR change, no ElevenLabs.
- Stop readiness declaration until authenticated tenant retrieval, complete classified scenarios, confirmed persistence and exact voice greeting are demonstrated with evidence.
