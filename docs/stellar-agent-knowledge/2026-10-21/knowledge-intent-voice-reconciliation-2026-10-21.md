# STELLAR INTELLIGENT TECHNOLOGIES — Knowledge, Intent and Voice Reconciliation
**Operated by Apropos Group LLC**  
**Review date:** October 21, 2026  
**Scope:** Sales Specialist v1.1; HVAC Support Specialist Demo v1.1; Master Intent Catalog v1.0; Ruflo Implementation Backlog v1.0; 12 original HVAC research articles and 8 supplementary draft modules.

## Executive decision
Retain the existing tenant-scoped Knowledge Vault and the 12 HVAC research articles. Do not overwrite the eight supplementary drafts or the existing 16-intent index. Add separate **unapproved voice-behavior specification drafts** for Sales and HVAC Support, plus an **unapproved backlog and intent-alignment draft**. These artifacts establish proposed design, not deployment readiness.

## Comparison and source-level findings

| Domain | Existing coverage | New source-backed detail | Reconciliation action |
|---|---|---|---|
| Sales identity, product positioning and qualification | GAP-SLS-01/02/03/04 | v1.1 §§18–23 adds a spoken system prompt, voice personality, 8 call-flow IDs (CF-SLS-001..008), 12 spoken scripts, recovery handling and 10 voice tests (VOICE-SLS-001..010) | Add voice specification, don't duplicate product articles |
| HVAC intake, safety and ticket management | HVAC-A01..A12, GAP-SUP-01..04 | v1.1 §§19–24 adds spoken system prompt, 12 call-flow IDs (CF-HVAC-001..012), spoken safety/ticket scripts, recovery rules and 12 voice tests (VOICE-HVAC-001..012) | Add synthetic-demo voice specification, maintain stricter safety policy |
| Conversation-control intents | Original 16-intent overview | Master Intent Catalog §3 specifies CTL-001..009: confirmation, correction, clarification, repetition, interruption, restart, cancel and resume | Treat as conversation state controls, not new business transactions |
| Deterministic safety | HVAC safety KB and emergency guidance | Intent Catalog §7 specifies SAFE-001..008, must preempt ordinary intent confidence | Preserve emergency-first gate, don't equate classifier confidence with safety |
| Transactions and reconciliation | GAP-SUP-04, original 16-intent overview | Intent Catalog §8 specifies WF-001..012, including idempotency, authoritative IDs, separate notification and reconciliation | Orchestrator owns state; no confirmation from ACCEPTED, RUNNING or UNKNOWN |
| Access and authorization | Existing table RLS; unapproved staff-only drafts | Intent Catalog §12 requires verified tenant context and case ownership, server-side validation | Test before activating any retrieval or action paths |
| Engineering plan | Earlier staging research and test plans | Backlog RUF-001..034 covers discovery, knowledge, voice, APIs, safety, RLS, acceptance and rollback | Treat as a backlog, not proof of completed tasks |

## Controlled discrepancies and cautions
1. **Fictional company scope:** HVAC v1.1 is for *Summit Comfort Heating & Air*, a synthetic tenant. Do not put its company name, hours, fees, geography, dispatch availability or fictional promises into Apropos/Stellar approved answers.
2. **Breaker guidance:** HVAC demo describes conditional reset/observation. Existing Phase 1 safety research excludes breaker-reset coaching. Preserve the stricter boundary pending qualified safety approval.
3. **Version headings:** v1.1 DOCX cover pages sometimes still show `v1.0`, while the page footer identifies `v1.1`. Preserve filename and document-level provenance; flag version normalization rather than silently rewriting originals.
4. **Intent catalog overlap:** A shortened 16-intent catalog exists alongside the detailed catalog's UNI/CTL/SLS/SUP/HVC/SAFE/WF IDs. Maintain original names as aliases or historical references; introduce no invisible renames. An exact runtime migration requires a code inventory.
5. **SLS and HVAC routing:** For cross-service requests, create only authorized lead/case records. A captured appointment *request* is not a confirmed booking.
6. **Unproven capabilities:** Call-flow scripts are proposed expectations. No evidence in these documents proves that interruption recovery, watchdog speech, live Knowledge Vault retrieval or end-to-end call-to-ticket-ID readback has been deployed.
7. **Backlog release gate:** User authorization is required separately before production merge, routing modifications or live notifications.

## Voice behavior contract — shared
- Short, professional, natural responses; one question at a time; respond to interruptions without discarding verified state.
- Acknowledge corrections and reconfirm; request only the missing information; never start intake over by default.
- Maintain operation ID through ambiguous outcomes; ask/reconcile before retrying.
- `ACCEPTED` and `RUNNING`: pending; `COMPLETED`: report success only with verified saved identifier; `UNKNOWN`: explain uncertainty and preserve operation for reconciliation.
- When a caller asks for the agent's name or changes topics, answer honestly and resume the original task; pending transactions remain owned by orchestration.
- Emergency phrase detection interrupts ordinary HVAC conversation and provides immediate appropriate safety direction.
- Separate successful persistence from successful **delivery of the reference to the caller**. No fabricated or truncated IDs.

## Engineering release gates (source backlog)
- RUF-001..005: discover reusable schemas/services; truth states and approved, tenant-safe retrieval.
- RUF-006..014: Sales intents, voice controls, qualification, verified lead save, guardrails and voice acceptance.
- RUF-015..026: HVAC intents, safety, validated intake, orchestrated ticket persistence, verified ownership lookup and voice acceptance.
- RUF-027..034: cross-tenant security tests, evidence, logs, end-to-end voice-to-workflow-to-database-to-voice acceptance, rollback and owner gate.

## Acceptance tests to preserve
- Sales: `VOICE-SLS-001` through `VOICE-SLS-010`; eight flows `CF-SLS-001` through `CF-SLS-008`.
- HVAC: `VOICE-HVAC-001` through `VOICE-HVAC-012`; twelve flows `CF-HVAC-001` through `CF-HVAC-012`.
- HVAC Phase 1 research: 60 existing fictional evaluation scenarios; do not replace with the 12 voice tests.
- High priority additions during implementation: caller asks name while saving; server completes after speech timeout; caller correction during pending mutation; full case ID in spoken chunks with readback; duplicate function call; tenant-crossing case lookup; audio silence watchdog with verified recovery. These are proposed additional acceptance scenarios, not represented as source-listed test IDs.

## Knowledge Vault draft storage conventions
Use existing `public.ai4cc_knowledge_entries`, tenant `5885a020-d363-4c27-910a-c035eda132f5`; `approved=false`, `visibility=staff`, no property ID. Separate `voice_specification_draft` from HVAC technical articles and `engineering_backlog_draft` from product facts. Existing public voice retrieval must not fetch these unapproved records. Do not claim KB publication or agent training from storage alone.

## Completion status
- Source documents: received and reconciled at requirements level.
- New voice-specification / backlog drafts: staged for import separately.
- Detailed runtime implementation, approved publication, live voice acceptance: **not performed** by this review.