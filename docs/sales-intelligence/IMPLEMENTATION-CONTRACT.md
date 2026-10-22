# STELLAR Sales Intelligence — Owner-Directed Implementation Contract
Status: IMPLEMENTATION SPECIFICATION — NOT LIVE, NOT APPROVED FOR CUSTOMER RETRIEVAL
Source: Co-Pilot Sales Specialist v1.1; AI4Businesses Master Intent Catalog v1.0; owner architecture directive (22 October 2026).

## Non-negotiable architecture
Twilio working main IVR (702) 935-1414 → existing Fly.io bridge → OpenAI Realtime voice agent → Sales Orchestration Coordinator → specialized orchestration responsibilities → authorized Supabase/business tools → verified spoken result.
Do not add ElevenLabs, repurpose the PMA, modify routing, or migrate hosting. A separate model is not required for each responsibility; existing reliable code/services may perform them.

## The foundational inputs in this branch
- `docs/sales-intelligence/source/sales-specialist-full-v1.1.md`: **complete** Co-Pilot v1.1 Sales specification, including sections 1–23; not a 24-line condensation.
- `config/sales-intelligence/master-intent-registry-v1.0.json`: full source-defined 105-item intent/workflow registry, of which 25 IDs are Sales-specific. Keep universal, control, safety, and backend items distinct.
- `tests/fixtures/sales-intelligence/master-intent-test-matrix-v1.0.csv`: source-defined intent test matrix. These are fixtures, not evidence of a passing runtime.

## Logical coordinator and specialists (NOT yet implemented)
1. **Sales Orchestration Coordinator**: server-derived tenant+session identity, multi-intent state, intent routing, authoritative completion state, history of selected KB IDs, consent and follow-up.
2. **Product Knowledge Specialist**: retrieve *approved*, in-scope, fresh tenant-scoped facts covering CEOC, Sales Specialist, Support Specialist, PMA, and combined offerings. Apply truth classes VERIFIED/PROPOSED/PLANNED/DEMO/UNKNOWN separately from publication approval. Unavailable facts become gaps, never promises.
3. **Intent Intelligence Specialist**: classify SLS-001..025 plus shared UNI/CTL and SAFE items; extract requested fields; assess confidence with explicit threshold behavior; preserve secondary_intents; ask a focused clarification if unresolved. Server enforces tool preconditions; the LLM is not the authority.
4. **Sales Discovery & Qualification Specialist**: collect contact_name, business_name, product_interest, business_problem; conditionally coverage_need, current_process, urgency, contact method, follow_up_preference; one question at a time; corrections update state.
5. **Commercial / Objection Specialist**: use full approved FAQ/objection copy and source facts, reconcile terms against actual approved product policy; never invent rates, guarantees, integrations, savings, concurrency, setup commitments, compatibility, or deployment status.
6. **Business Workflow Specialist**: lead creation, demo and consultation requests, staff follow-up, transfer decisions; schema validation, consent, idempotency, durable workflow ledger, retry reconciliation, verified IDs and notification outbox guardrails.
7. **Quality / Recovery Specialist**: barge-in, silence, interrupted workflow, timeout, unconfirmed write, escalation; monitor in-call experience and evidence; do not mistake generated synthetic ID for persisted lead.

## Required execution contract
`caller utterance → deterministic SAFE scan → intent+entities → confidence/clarification → tenant+identity+scope authorization → approved KB retrieval with cited knowledge IDs → coordinator chooses authorized workflow → server validates inputs+consent → durable idempotent backend action → authoritative result check → spoken outcome → append-only audit and metrics`.

Outcome states: ACCEPTED/RUNNING are pending; COMPLETED requires record verification; UNKNOWN requires reconciliation using stable operation_id and no blind duplicate; FAILED must be stated as unconfirmed. Voice delivery of exact result and persistent DB write are separate gates.

## Source/implementation separation
The source Sales v1.1 identifies five portfolio choices, eight named sales call flows, ten voice acceptance cases, Q&A, objection handling and professional standards. These are product *specifications*; do not claim deployment from their presence in GitHub.
Read current repo, deployed Fly.io image/revision and Supabase permissions first. Current staging Sales KB 24 entries are `approved=false`, `visibility=staff`; do not publish these to customer retrieval until owner approval. Source status VERIFIED does not equal publication approval. Existing bridge prompt has legacy naming; reconcile against present approved owner brand STELLAR INTELLIGENT TECHNOLOGIES (operated by Apropos Group LLC).

## Acceptance gates before marking READY
A. **Full source fidelity:** line/section crosswalk for Sales v1.1 sections 1–23, no silent omissions; product-line claims checked against real, owner-approved product evidence.
B. **KB retrieval:** tenant and audience-scoped; publish gate tested; unknown/expired/proposed information not stated as verified; corpus coverage for all defined products, Q&A and objections.
C. **Intent:** all 25 SLS IDs exercised, together with shared controls and safety overrides; confidence thresholds enforced in actual orchestration, not only prompt words; demonstrate mixed intents and recovery.
D. **Backend team:** working tool dispatch and state contracts; persistent lead ID plus cross-call idempotency and UNKNOWN reconciliation; no invented transaction numbers or real notifications in staging.
E. **Voice:** demonstrate all source VOICE-SLS-001..010 scenarios plus interruptions, topic switches, delayed backend, and confirmed ID delivery on a live staging call.
F. **Security:** deny cross-tenant reads and writes; server-derived tenant; secret isolation; verified human handoff policies.
G. **Release:** evidence (files, commit, deployed revision, sanitized logs, tests), owner review; no production or IVR change.

## Ruflo execution order
(1) Preserve & map complete approved source; (2) read-only runtime architecture verification; (3) create full product/knowledge inventory and explicit gap table; (4) implement tenant-scoped retrieval and orchestration contract on an isolated staging branch; (5) implement intent router and business actions with durable server control; (6) run detailed automated and live staging tests; (7) present owner acceptance report. Only current owner's scope-specific authorization permits runtime staging changes. No production merge or publication of draft knowledge without further owner authorization.

## Known blocking unknowns
- Full up-to-date STELLAR product facts may reside outside Co-Pilot v1.1. Each missing feature, price or integration must be checked against product source and owner policy; never fabricate.
- Current deployed Fly.io commit, applied environment and actual knowledge-retrieval wiring have not been demonstrated by this document.
- The existing 24 condensed KB records and Sales intent-ID validator are not the complete implementation.
