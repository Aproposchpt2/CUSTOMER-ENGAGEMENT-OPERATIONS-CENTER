# HVAC-KB-RECOVERY-001 — Source-to-tenant reconciliation findings
Date: 2026-10-22
Environment: staging Supabase hvzauakkhlivzeqatfqm
Tenant: Summit Comfort Heating & Air (d7e80001-0000-4000-b000-000000000001)
Source: Co-Pilot HVAC Support v1.1, 24 sections, original text in `source/CoPilot-HVAC-Support-v1.1-complete-extracted.md`.

## Audit outcome
- Tenant has **21 entries**: 5 pre-existing and 16 recovered source-linked copies (12 HVAC research + 4 HVAC support gap items).
- **Zero approved entries.** The 16 recovered entries are staff-only, draft, and source_status UNKNOWN. Do not publish or bulk-approve.
- Existing source contains 24 sections including intake, safety, scripts, FAQ, priority, ticket lifecycle, RLS, call flows, voice recovery and acceptance cases. The 21 database records **do not** represent a complete section-for-section implementation.
- Catalog source preserves SUP 13 + HVC 22 + SAFE 8 (plus universal, conversation controls and backend workflows). This is documentation only, not executable intent handling.

## Concrete inconsistencies requiring owner review
| ID | Source | Existing tenant entry | Decision |
|---|---|---|---|
| HVAC-KB-C01 | Co-Pilot §2 fictional regular hours: Monday–Friday 8:00 AM–5:00 PM | `[SERVICE] Summit Comfort Service Hours`: Mon–Fri 8am–6pm, Sat 9am–3pm, emergency 24/7 | **CONFLICT.** Do not approve hours/coverage entry; use Co-Pilot as approved design baseline but require owner review before publishing any operational schedule |
| HVAC-KB-C02 | Co-Pilot §7 describes certain conditional basic checks; prior safety research explicitly prohibits coaching breaker reset | `[SERVICE] Approved Basic HVAC Checks` says breaker ON only | **SAFETY HOLD.** Do not coach breaker operations or resets; no hazardous troubleshooting pending qualified review |
| HVAC-KB-C03 | Co-Pilot Support service scope and Safety §4–5 | Three pre-existing general entries labeled publication_state=published but approved=false and visibility=staff | **NOT PUBLIC.** Publication flag alone is insufficient; approval and audience gating still mandatory |
| HVAC-KB-C04 | Co-Pilot HVAC Support v1.1 | `PMA Agent Knowledge Base v1.0` wrongly stored in Summit Comfort tenant | **WRONG TENANT CONTENT.** Quarantine from HVAC retrieval; do not delete/move without provenance audit |
| HVAC-KB-C05 | Owner-approved Cedar greeting: “You have reached Summit Comfort Heating & Air. How can I help you?” | Ruflo handoff reports “Thank you for calling Summit Comfort Heating and Air. This is the Summit Comfort Support Desk.” | **VOICE MISMATCH.** Correct source voice greeting under separate staging-only runtime change and verify speech |
| HVAC-KB-C06 | Complete Co-Pilot source: 24 sections and 35 SUP/HVC intents | 16 short recovered research drafts + 5 mixed original entries | **COVERAGE GAP.** Build complete reviewed FAQ, policy, call flow, intent/workflow, safe procedure and escalation corpus; avoid labeling 21 entries comprehensive |

## Implementation/review work order
1. Preserve all 24 Co-Pilot sections and do a **clause-level** mapping of approved demo facts, FAQs, safety instructions and workflow requirements to a candidate tenant article; do not silently summarize away details.
2. Create separate articles for synthetic tenant policy, Support intake, service categories, appointment requests, priority, equipment Q&A, call scripts, case confirmation, escalation, interruption recovery and unknown answers. Attribute `SOURCE_DEMO` versus externally verified safety guidance.
3. Keep `approved=false`, `visibility=staff`, `audience_scope=staff`, `publication_state=draft` until owner review. Apply `source_status=DEMO` to fictional facts, not VERIFIED.
4. Do not make pricing, hours, service guarantees, technician availability or service-area promises from inconsistent synthetic records.
5. Implement tenant-scoped retrieval only for approved and public content and negative cross-tenant tests. Preserve deterministic emergency detection before ordinary intent routing.
6. Implement all 13 SUP and 22 HVC intents with actual classifier behavior/clarification and server-side workflow authorization. No intent registry presence counts as implementation.
7. Verify test-only case creation on Summit Comfort UUID, exactly delivered ID, dedupe on replay, notification suppression, and Cedar greeting via staging phone UAT.

## Gate
**HOLD CALLER-FACING KNOWLEDGE RELEASE.** No production, no deployment, no approval bulk flip, no real notifications. Evidence must include per-entry review outcome, test logs, tenant IDs and an explicit approval record.
