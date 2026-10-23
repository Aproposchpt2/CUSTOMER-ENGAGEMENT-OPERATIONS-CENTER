# HVAC-KB-RECOVERY-001 — Verified staging recovery
Date: 2026-10-22
Status: PARTIAL — 16 recovered research drafts staged, complete Co-Pilot v1.1 not yet installed as approved caller-facing KB

## Canonical tenant
Name: Summit Comfort Heating & Air
Tenant UUID: d7e80001-0000-4000-b000-000000000001
Staging Supabase: hvzauakkhlivzeqatfqm
OpenAI Support voice: cedar
Synthetic demonstration only; notifications disabled.

## Verified recovery action
- 12 records from `hvac_research_draft` under main STELLAR tenant, plus 4 HVAC-focused records from `specialist_gap_research_draft`, **copied**, not moved, to Summit Comfort tenant.
- New category `hvac_recovery_review_draft`, `approved=false`, `visibility=staff`, `audience_scope=staff`, `publication_state=draft`, `source_status=UNKNOWN`.
- Each recovered entry has provenance tags `HVAC-KB-RECOVERY-001` and `origin:<original_uuid>`; copy query deduplicates by source UUID.
- Verified result: Summit Comfort 21 KB entries total, 16 recovery drafts and **zero approved entries**.
- The pre-existing 5 records include 1 misplaced PMA draft; do not delete it before forensic classification, but do not expose it to HVAC agent.
- Existing SQL trigger `private.pm_knowledge_guard()` rejects unrecognized `model_section` and structured metadata keys. It was left unchanged. Recovery provenance is recorded in tags, not unsupported model fields.
- No deployed bridge change, KB approval, notification, production change or real call was executed.

## Full Co-Pilot source
User-provided source file:
`HVAC_Support_Specialist_Knowledge_Base_Voice_Call_Flows_Demo_v1.1 (1).docx`
Content: comprehensive synthetic Summit Comfort company profile, service categories, safety, intake, customer Q&A, HVAC intent catalog, emergency scripts, voice prompt, call flows, voice acceptance tests. Preserve *complete* source and original company identity. A full ~23KB Markdown transcription was prepared separately from the attached DOCX, not yet committed to this branch. Use the user-provided DOCX as source of truth for any table formatting discrepancy.

Master Intent Catalog: `docs/stellar-agent-knowledge/2026-10-21/master_intent_registry_v1.0.json` in PR #92 documentation branch, including 13 Support and 22 HVAC intents plus safety, universal and conversation control categories.

## Required next gates
1. Preserve full Co-Pilot v1.1 as a versioned repo file in this branch; build source-to-KB section crosswalk. Do not reduce it to 5 or 12 notes.
2. Compare every source article and FAQ to recovered 12+4 drafts; identify duplicates, omissions, unsupported fictional claims. Maintain synthetic labels on pricing, hours, service territory, appointment and dispatch behavior.
3. Resolve the **safety conflict**: conditional breaker reset coaching in some demo content vs no-breaker-reset restriction in research. Maintain more conservative no-reset guidance until explicit qualified approval.
4. Approve only individually reviewed, correctly tenant-scoped safe entries through owner gate. Never flip 21 records en masse.
5. Implement and test approved-only Summit Comfort knowledge retrieval, all 22 HVC and 13 SUP intents, safe precedence and backend orchestration.
6. Confirm corrected Cedar greeting against owner-approved exact wording: “You have reached Summit Comfort Heating & Air. How can I help you?” Existing Ruflo handoff reported a **different** greeting; reconcile before staging voice UAT.
7. Verify returned support case and contact tenant UUID match Summit Comfort and no actual notifications, then demonstrate live staging call.

No production merge/deployment. No PMA modifications or ElevenLabs.
