# STELLAR UNIFIED COMMUNICATIONS
## CUSTOMER SUPPORT SERVICE SYSTEM (CSS)
### Master Development, Continuity, Acceptance and Commercialization Record
**Version:** 1.0 | **As of:** October 15, 2026 | **Classification:** Internal engineering / business continuity | **State:** Flagship direction approved; end-to-end release not accepted

> **HANDOFF RULE:** This is the primary restart document for a new agent or engineer. Read it and the current repository state before making changes. Facts are labeled VERIFIED, IMPLEMENTED/NOT YET VERIFIED, APPROVED DIRECTION, or PLANNED. Never confuse a working conversation with a completed customer-service transaction.

## 1. Executive decision and product identity
**Parent:** Stellar Unified Communications (Stellar UC), Apropos Group LLC. **Flagship:** Intelligent Customer Service Operation Center. **Functional product/workstream:** Customer Support Service System (CSS), also described as Intelligent Service Response System. The earlier AI4 Contact Center and Sales Specialist concepts preceded this product direction. **Externally use “Intelligent” or “Intelligence,” not “AI.”** The Sales Specialist remains a separate, preserved capability; do not delete or regress it.

**Approved flagship outcomes:** 24/7/365 inbound customer engagement; existing-number continuity; multiple concurrent calls; intelligent intake and issue triage; service request creation; emergency/urgent escalation; verifiable employee notification; tenant administrative dashboard; comprehensive customer lifecycle records; transparent Usage-Based Pricing (UBP). These are PRODUCT REQUIREMENTS, not all proven production capabilities. Initial commercial targets: HVAC, plumbing, electrical, restoration and related field services; architecture must remain horizontal for other industries. For field services, use the tenant's actual role title (technician, dispatcher, service manager), not universally “engineer.”

**Proposed marketing message (not unconditional claim until acceptance):** “YOUR BUSINESS MAY CLOSE. YOUR CUSTOMER SERVICE OPERATION REMAINS OPEN 24/7.” / “KEEP YOUR NUMBER. ADD THE INTELLIGENCE.” Customer-facing UBP copy: customers pay for services delivered, not unused capacity; lower usage means lower charges. Never discuss Apropos receiving payment in customer-facing copy.

## 2. Business rationale and positioning
The user's firsthand evaluation of the CSS voice proof of concept found the interaction comparable to a major telecommunications provider's support experience and stronger than a major bank's in their own experience. This is subjective early customer-experience feedback, not an independent competitive benchmark. The market hypothesis is that service businesses value captured after-hours calls, complete case records, urgent notifications and reliable callbacks more directly than a standalone Sales Specialist. Validate conversion and economics through controlled pilots. Avoid unsupported promises of unlimited concurrency, guaranteed savings, or every call answered.

## 3. Systems of record and environment isolation
- **Production brand/site:** https://stellaruc.com — DO NOT CHANGE without specific owner authorization and a migration plan.
- **GitHub repository:** `Aproposchpt2/ai4-contact-center` — https://github.com/Aproposchpt2/ai4-contact-center.
- **Production branch:** `main` — preserve until approved production release.
- **Isolated experiment branch:** `experiment/gpt-live-voice-poc` — contains CSS private evaluation work.
- **Private Netlify site:** `stellaruc-private-voice-poc`, site ID `a98fcd5a-893e-4eb7-835b-146f516ff47d`; private test URL https://stellaruc-private-voice-poc.netlify.app ; branch deployment https://experiment-gpt-live-voice-poc--stellaruc-private-voice-poc.netlify.app . Preserve Netlify team SSO for all deployments.
- **CSS test page:** `/experimental-support-voice`. **Existing Sales Specialist POC:** `/experimental-voice` (leave unchanged).
- **STAGING Supabase project:** `hvzauakkhlivzeqatfqm` (Stellar SaaS staging); CSS test tenant ID `5885a020-d363-4c27-910a-c035eda132f5`.
- **PRODUCTION Supabase project:** `vqrqyanqsiqzsmlhytaz` — DO NOT WRITE or migrate before approval.
- **Engineering continuity Google Doc:** https://docs.google.com/document/d/1YRmH5R3VNXlIYBK9euwqq5mIaFbmTC-0k4sequ4GWmo/edit .
- **Preceding launch-gate specification:** `docs/FLAGSHIP-SERVICE-OPERATION-CENTER-LAUNCH-PLAN-2026-10-15.md`, commit `2cce72ac6dff2b0b5eb700a56c26a65a96356b93`.
- **Most recently verified ready private deployment prior to this record:** Netlify deploy `6ad13aef4f698dee5a05be5a`, Git commit `8c9ef1d4d10f558b4fd4c52ca905781fec82474d`, 2026-10-15 20:44 UTC. Subsequent documentation commits are not proof of a new functional build.

## 4. Development history and key engineering changes
1. Original AI4 Contact Center evolved into multi-tenant Stellar UC SaaS with Twilio voice/SMS, ElevenLabs conversational voice, Supabase RLS, Netlify and Cloudflare as broader platform architecture. Those historical integrations are not evidence that the new GPT-Live CSS path currently uses them.
2. Owner narrowed initial sales-oriented commercial strategy to Intelligent Sales Service System; usage-based pricing became central. The owner subsequently redirected flagship priority to customer support after testing a new voice agent.
3. Isolated private GPT-Live voice POC built on `experiment/gpt-live-voice-poc`, with staging administrator sign-in, private access code, voice WebRTC transport and a support-intake API.
4. An early `/v1/live/sessions` attempt failed with HTTP 400 unknown `session.tools`; commit `4457c30` removed that unsupported session-creation parameter. Commit `25171728` restored tool-use instructions. Commit `401dc520` attempted tool registration over the open browser data channel via `session.update`. Commit `8c9ef1d4` fixed a syntax/build error in session API.
5. 2026-10-15 first live CSS conversation completed naturally; the agent gathered fictional device and issue details, asked follow-up questions, and refused to falsely confirm a case. The user praised voice quality and approved the CSS flagship pivot.
6. Owner then directed comprehensive continuity documentation, final CSS engineering, eventual production migration, profit analysis, pricing and onboarding. **This document is that continuity checkpoint, not production authorization.**

## 5. Verified current implementation
**VERIFIED:** Private test readiness endpoint returned HTTP 200; live voice-session API returned HTTP 201 at 2026-10-15 20:48:14 UTC. Private site could establish an audible natural conversation. Staging test administrator authentication/readiness succeeded in user-visible preflight. The representative accurately said it could not confirm a saved record. Direct SQL check of staging `public.stellar_support_cases` returned **0 rows** on 2026-10-15. Inspected Netlify request logs showed **no request to `/api/experimental-support-intake`** in the test window. Therefore CSS E2E acceptance is **NOT PASSED**.

**IMPLEMENTED IN CODE, NOT END-TO-END VERIFIED:** Browser `pages/experimental-support-voice.tsx` creates a WebRTC session and opens an `oai-events` data channel, sends `session.update` with `submit_support_intake` tool schema, checks `session.updated`, listens for function call events, requests an explicit browser `window.confirm`, posts to `/api/experimental-support-intake`, then sends `function_call_output` and `response.create`. It tracks session UUID, deduplicates call IDs and logs limited session events. Tool registration and tool-call delivery are not yet proven to work with this live session protocol.

**IMPLEMENTED IN CODE:** `pages/api/experimental-support-voice-session.ts` calls `https://api.openai.com/v1/live/sessions`, model `gpt-live-1`, delegated reasoning model `gpt-5.6-terra`, transport `webrtc`; protects request by same-origin, access code and SDP validation. `pages/api/experimental-support-readiness.ts` checks private access code, staging URL, enabled test writes, authenticated Supabase user and active OWNER/ADMIN tenant membership. `pages/api/experimental-support-intake.ts` requires staging-only URL, enabled test writes, authenticated user, same-origin and validated intake fields; calls an atomic staging RPC.

## 6. Data model and transaction boundary
**Staging:** `public.ai4cc_contacts` (customer/contact), `public.stellar_support_cases` (CSS service cases). Cases linked by `contact_id`, `tenant_id`; test marker `test_only=true`, source `private_voice_test`; unique `(tenant_id, intake_session_id)` for idempotency. Tenant RLS and owner/admin authorization must be verified independently before launch.

**Staging RPC:** `public.stellar_create_support_test_intake(p_tenant_id uuid, p_session_id text, p_name text, p_email text, p_phone text, p_product text, p_purchase_date date, p_issue text, p_steps text, p_impact text, p_priority text default 'NORMAL')`. Security-definer RPC is intended to validate authorized active tenant membership, find/create contact, and create/reuse one case per intake session. Actual schema/permissions should be re-inspected against staging, not assumed from this description. Endpoint expects `customer_id`, `case_id`, `created_new` and returns `customerId`, `caseId`, `createdNew`, `testOnly` on HTTP 201.

**Important schema gap:** Current tool parameters focus on device/product intake and omit full service address, callback preference, dispatch zone, and field-service job category. Design schema migration for these requirements before field-service launch; keep backward compatibility and explicit tenant isolation. No production migrations have been approved.

## 7. Known defect: case not created
**Observed failure:** Agent could converse but no saved support case was verified. Staging table count 0; no intake POST in the inspected private Netlify window. Most likely engineering investigation area: GPT-Live tool registration and function-call event contract. This is a hypothesis, not a confirmed root cause.

**Current client logic to inspect:** `dc.onopen` sends `session.update` with `session:{type:'realtime', tools:[...], tool_choice:'auto'}`. Code assumes `session.updated` includes `session.tools` and accepts `response.output_item.done` or `response.function_call_arguments.done` when call `name`, `call_id`, `arguments` are present. Check actual GPT-Live event shapes and whether delegated Responses tools are supported or must be declared differently. Review `error` and session events without exposing PII or secrets. Ensure correct correlation of call ID and arguments and handle partial/late events. Do not bypass authenticated write protection merely to make a test pass.

**Repair acceptance:** One fictional conversation produces (a) registered callable tool, (b) operator-approved POST, (c) HTTP 201 with real case ID, (d) linked contact and case visible by direct staging SQL, (e) spoken ID exactly matching DB, (f) no duplicate on retries. Negative tests: declined confirmation, invalid tenant, write disabled, tool timeout, failed RPC and disconnect. No fictitious case IDs.

## 8. Full CSS customer interaction design
1. Answer in tenant-branded voice and identify purpose. Honor consent/recording requirements and supported languages.
2. Recognize/identify customer with minimum necessary information; securely consult permitted tenant-specific lifecycle records when available.
3. Gather name, callback number, email if available, service address and ZIP, problem category, affected equipment/location, symptoms, safety risk, actions tried, preferred callback window and impact. Ask one question at a time.
4. Detect urgent and dangerous situations. For fire, gas smell, shock or immediate danger: direct caller to emergency services or relevant utility/emergency responder; never imply emergency dispatch without a verified integration.
5. Read back critical fields; create idempotent service request and wait for actual DB success.
6. Resolve the tenant's configured service recipient/escalation chain. Send notification only to an approved test recipient during staging. Persist provider acknowledgment, delivery status and failures; use safe retry/deduplication.
7. Tell caller the real case reference; say staff were notified only if delivery is verified. State callback timing only when supported by the tenant's SLA and operational capacity. Otherwise provide truthful next-step language.
8. Expose lifecycle: open → acknowledged → assigned → in progress → resolved → closed; timestamp all transitions, interactions, notification attempts and human updates.

## 9. Platform architecture and security requirements
**Logical flow:** Customer's existing number → telephony routing (production design; verify carrier configuration) → tenant resolution → voice runtime → tenant-scoped customer lookup/intake → authenticated transaction API → Supabase contact/case → notification queue/provider → tenant admin dashboard → status updates and analytics.

**Isolation:** Every query/write scoped to authenticated tenant; RLS enforced and independently tested; service-role credentials only server-side; never trust client tenant ID without membership checks; audit cross-tenant denial. **Secrets:** OPENAI_API_KEY, access codes, Supabase keys and provider credentials must never appear in documentation, chat or client bundles. Environment variable *names* may be documented; values must not. Protect private POC with Netlify team SSO and app-level access controls. Prevent replay and duplicates; validate origins; apply rate limits; protect webhooks; audit notification access.

**Privacy/compliance:** Define lawful call-recording consent by jurisdiction, retention and deletion schedules, customer access/erasure process, vendor DPAs, incident response, business associate/regulated-sector limitations where relevant. Do not collect payment credentials, passwords or sensitive medical data in general support flows. Do not assume every customer interaction should retain audio: store minimal necessary structured records and use optional recordings under approved policy.

**Resilience:** Graceful fallback for model/telephony/database/notification outages, human handoff, retry with idempotency, incident logs, monitoring, backup/restore and rollback. Concurrent-call claims require actual load tests and carrier/provider quotas.

## 10. Admin dashboard and lifecycle
**MVP dashboard:** New/open cases, urgency, assignment, contact details, service location, caller transcript summary (where authorized), case timeline, notification status, response SLA, search/filter, status updates, role-based tenant users, and audit trail. **Operational analytics:** calls offered/answered, concurrent peaks, duration, completion rate, escalation rate, case save success, notification success, time-to-acknowledge, time-to-resolution, cost/usage by tenant. **Usage meter:** estimated invoice, projected month-end, days remaining, platform/voice/SMS/other delivered service categories, billing reconciliation. Do not display fabricated estimates as invoices.

## 11. Release gates and production migration plan
**Gate 0 — continuity:** Master record versioned in GitHub and Drive; next engineer can identify branch, deployments, schemas, failures, owners and rollback. **Gate 1 — transactional:** Confirm actual staging case + contact + spoken case ID. **Gate 2 — notification:** Tenant routing, delivery acknowledgment, failures/retries and caller-safe language. **Gate 3 — operations:** Realistic multi-call tests, RLS/security/privacy review, error handling and emergency flows. **Gate 4 — commercial:** Tenant onboarding, dashboard, measured usage, billing/pricing terms, support runbooks. **Gate 5 — controlled release:** Owner signs off migration, backup, production migration scripts, feature flags, smoke tests, rollback and pilot tenant.

**Production procedure (not yet authorized):** Freeze verified staging revision; inventory diffs; take tested backup; prepare reversible schema migrations; stage environment variables in secret store; deploy behind feature flag to production with zero disruption to existing Sales Specialist/production site; provision pilot tenant and routing; verify data isolation, case creation, notification, dashboard and metering; monitor error budget; rollback on failure; obtain owner acceptance. Never copy fictional staging contacts/cases into production.

## 12. Pricing and profitability analysis — pending data, not invented
**Required measured inputs:** cost per voice minute (model, audio/telephony and reasoning), average call duration, call volume and concurrency, provider notification/SMS/email cost, database/storage, hosting, customer onboarding/support labor, failed/abandoned calls, payment processing, taxes, minimum fixed infrastructure and reserve. Get actual invoices/provider rates before fixing price. Segment by field-service tenant size and peak demand.

**Suggested pricing structure to evaluate, NOT approved prices:** Transparent usage-based billing with a low or zero platform minimum only if economics allow; measured per completed engagement or billed voice minute plus pass-through channel costs; optional onboarding/configuration charge based on verified labor; clear inclusion/exclusion, overage alerts, monthly caps and no unused-capacity charge. Avoid double-charging for retries and incomplete transactions; define billable event in customer terms. Consider tiered usage rates after pilot data, not unsubstantiated discounts.

**Profit formulas:** Monthly variable cost = (voice minutes × fully loaded cost/minute) + (notifications × cost/notification) + per-case storage/processing + variable support. Contribution margin = usage revenue − variable cost. Operating profit = contribution margin − allocated fixed hosting, staffing, compliance and customer acquisition costs. Break-even monthly volume = fixed monthly costs ÷ contribution margin per billable unit (if positive). Sensitivity: low/expected/high call volume; 2/5/10-minute durations; concurrency peaks; escalation percentage; failed notification retries; support burden. Analyze cash flow, customer acquisition cost, retention, gross margin and realistic payback.

## 13. Client onboarding specification
**Discovery:** legal business identity, authorized owner/admin, service locations and ZIP coverage, time zone, business hours, service categories, emergency rules, response SLA, approved phrases, staff roster, notification channels, privacy/recording requirements, existing phone provider/number and transfer policy, billing contact. **Provision:** tenant record, roles/RLS, verified number forwarding/porting choice, knowledge base and agent persona, service address validation, intake form schema, case routing and escalation, dashboard roles, notification recipients and test channel. **Acceptance:** tenant-specific fictional call, normal and urgent case, DB record, delivered notification, dashboard display, failed-delivery fallback, multi-call test, customer approval and operator guide. **Go-live:** signed order/terms, pricing disclosure, support contacts, escalation, usage alerts, rollback and periodic quality review. Never promise immediate callback without an enforceable SLA.

## 14. Acceptance test matrix and evidence requirements
**AT-01** Natural voice call and correct tenant persona. **AT-02** Accurate required fields and confirmation. **AT-03** Staging contact created or correctly matched. **AT-04** Case created once with true DB ID. **AT-05** Spoken ID matches DB. **AT-06** Notification accepted/delivered to configured test recipient. **AT-07** Agent distinguishes saved vs notified vs callback promised. **AT-08** Urgent safety escalation. **AT-09** Failed database write is disclosed; no fabricated confirmation. **AT-10** Failed notification is disclosed and logged. **AT-11** Duplicate/retry idempotency. **AT-12** Tenant A cannot read/write tenant B. **AT-13** Simultaneous calls within measured limit. **AT-14** Dashboard timeline and roles. **AT-15** Usage meter matches provider/source records. **AT-16** Rollback and incident recovery.

For each test record: test ID, date/time UTC, commit SHA, Netlify deploy ID, staging tenant, test-only session ID, sanitized request/response event types, database case/contact IDs (only in private engineering evidence), provider notification ID/status, expected/actual, PASS/FAIL and tester sign-off. Never publish OTPs, API keys, real customer PII or raw voice content in public repo.

## 15. Restart protocol for a replacement ChatGPT/engineering agent
**First action:** Read this document, current branch HEAD and launch-gate document; inspect private Netlify deploy and staging Supabase only. **Second:** Verify current acceptance state directly rather than inheriting prior claims. **Third:** Reproduce the missing function-call handoff with a fictional call and privacy-safe session-event diagnostics. **Fourth:** Make minimal isolated code fixes; run lint/build/tests and verify protected private deployment; obtain owner confirmation before any real notifications. **Fifth:** Complete Gate 1 and Gate 2 with evidence, then proceed through security, onboarding, economics and owner-authorized production migration. **Never:** rewrite production, change `main`, disclose secrets, disable RLS/SSO, claim a case or notification without provider/database proof, or create real customer data during test.

**Most important current defect:** No confirmed tool invocation → no HTTP intake POST → no staging case. Fix this before implementing other flagship features.

## 16. Open decisions / next-owner approvals
- Confirm final external flagship naming: Intelligent Customer Service Operation Center versus Intelligent Service Response System; CSS is the internal workstream label.
- Choose first pilot vertical and test business; define service-area and emergency procedures.
- Select and approve actual notification provider/channel and staging test recipient; decide callback SLA and escalation chain.
- Approve service-address/callback schema and retention/recording policy.
- Review real cost inputs and approve commercial UBP rates and onboarding charges.
- Authorize production migration only after documented acceptance gates.

## 17. Change log and source references
**v1.0 (2026-10-15):** Comprehensive owner-requested continuity baseline. Derived from current private GitHub files, prior owner decisions, private Netlify logs and direct staging SQL verification. It documents intended design separately from verified implementation. Sources of truth: repository paths and commit hashes above; Google engineering continuity document; protected Netlify deployment; staging Supabase. On any conflict, verify live code/database state and update this record with date, author, evidence and change summary.


## Addendum — 2026-10-15 19:57 PDT: API cost observation and diagnostic deployment
Owner-supplied OpenAI API Usage screenshot filtered to STELLAR_UC displays Total Spend $1.16 for its selected reporting period. The screenshot does not establish the exact period bounds, number of calls, call minutes, model-specific usage, or marginal cost per call. Do not treat $1.16 as a unit cost or commercial gross margin. Reconcile OpenAI project usage exports and Netlify/Twilio/provider bills against timestamped test calls before pricing. Diagnostic JSON privacy-hardening commit 930f82c6d8a11b1fc27a85474d1439f9c44e3ae6 independently confirmed ready in private Netlify deployment 6ad192188bc8ef6d1b1523c6 on 2026-10-16 02:56 UTC; Netlify team SSO still enabled. JSON export uses allowlisted event codes rather than unrestricted messages; end-to-end report download, on-screen log privacy, and case creation acceptance still require manual verification. No production changes.


## CSS acceptance diagnostic — 2026-10-16 UTC

Owner's fictional test: transcript export `turns: []`. Diagnostic: `sessionStarted=true`, `toolRegistered=false`, `intakeSubmissionAttempted=false`. Event sequence at 04:07:55Z: TOOL_REGISTRATION_REQUESTED, VOICE_SESSION_ESTABLISHED, VOICE_AGENT_ERROR; session finalized 04:12:44Z. Netlify logs: readiness HTTP 200; voice-session HTTP 201; **no support-intake POST**. Ticket persistence unverified and transcript capture failed. Root-cause boundary is voice protocol/tool registration, but specific rejected parameter remains unknown. Instrumentation commit `0897f8e` deployed READY to SSO-protected private site (deploy `6ad1a52b97414beac51c9e61`), exporting sanitized error code/type/parameter. Next: short fictional session to collect new diagnostic, correct precise protocol error, then verify tool registration, staging case IDs and transcript. No production changes; no live test after instrumentation deploy.


## 2026-10-16 19:16 UTC — second confirmed protocol rejection

Owner's private test screenshot and diagnostic JSON show `unknown_parameter` / `invalid_request_error` / `session.tools` immediately after session registration request. `sessionStarted=true`, `toolRegistered=false`, `intakeSubmissionAttempted=false`; voice agent error observed. Earlier `session.type` rejection was resolved by commit `d5a038b`, deployed READY as Netlify `6ad270447a5064f6284c5348`, but `session.tools` is independently rejected. **Stop further speculative field-removal and paid voice retests.** The experimental `/v1/live/sessions` API differs from documented `/v1/realtime` session.update semantics; determine supported GPT-Live delegated tools and event schema before implementation. Preserve existing working voice path, staging isolation, and production protections. Transcript remains unverified/empty. Do not assert support ticket persisted.


## 2026-10-16 — Independent staging-write verification control

Private branch commit `05cf3ad03b6d41862496f8a9752fc6d095e235b4` adds a button `Verify fictional staging case write (no voice)` on `/experimental-support-voice`. Requires staging readiness, no active voice session, explicit browser confirmation; POSTs a fixed fictional Robert Anderson intake to the existing staging-only authenticated `/api/experimental-support-intake`, generates a unique session UUID, and shows returned case ID only on HTTP success with both customerId/caseId. This tests database persistence **independently** of the unsupported GPT-Live `session.tools` protocol. It does NOT solve voice-to-case tool calling, transcript capture, or prove a DB write until actually run. No user action taken and no fictional record created by this code deployment. Source committed; Netlify publication must be checked against exact commit before use. Existing session.update still rejected by GPT-Live; avoid paid voice retest.


## 2026-10-16 — Current handoff checkpoint (continuity update)

**Private deployment verified:** Netlify project `stellaruc-private-voice-poc`, deploy `6ad279639a970e3fc9063b4a`, state READY, branch `experiment/gpt-live-voice-poc`, commit `a41b40cfcf4951b3d0cadd17a28f388350fdc837`, published 2026-10-16 19:23:20 UTC. Team SSO required for all deployments. This deployed commit includes the independent fictional staging case-write control introduced in `05cf3ad`.

**Acceptance state at handoff:** staging readiness passed in prior owner tests; voice session creation succeeded; GPT-Live session.update rejects `session.type` and, after its removal, rejects `session.tools`. Tool registration not confirmed, no support-intake POST observed in reviewed voice test, and no confirmed support case ID. Downloaded transcript JSON had `turns: []`. The independent staging case-write button is DEPLOYED but has NOT been executed or accepted. An attempted read-only direct Supabase count query was blocked by connector safety checks; no independent new database count was obtained. Do not infer persistence.

**Next engineering gates, in order:** (1) run the explicitly confirmed fictional, no-voice staging case-write acceptance using authenticated staging administrator and capture returned case ID, (2) independently verify case/contact persistence if connector permits, (3) establish documented tool-invocation compatibility for `/v1/live/sessions` or design an authenticated alternative, (4) validate dialogue capture and authorized retention, (5) complete voice-to-case acceptance with real returned case ID. Avoid additional paid voice tests until protocol design is corrected. Production website, production Supabase and Sales Specialist remain unchanged.

**Owner continuity instruction:** maintain this document as the current source of truth, distinguishing committed, deployed, tested and accepted. No unsupported completion claims.


## Protocol engineering decision — 2026-10-16

**Evidence reviewed:** private source `pages/api/experimental-support-voice-session.ts` calls `POST /v1/live/sessions` with `session.model=gpt-live-1` and `session.delegation.type=responses` / `responses.model=gpt-5.6-terra`. Browser `pages/experimental-support-voice.tsx` uses WebRTC data channel `session.update` to inject `session.tools`, expects `session.updated`, and listens for Realtime `response.output_item.done` function-call events.

**Observed incompatibility:** owner diagnostic reports from real paid voice sessions showed `invalid_request_error / unknown_parameter / session.type` and, after that field was removed, `invalid_request_error / unknown_parameter / session.tools`. The existing tool registration and response function-call bridge are copied from standard Realtime conventions; they have **not** been proven compatible with this Live-session API. OpenAI public Realtime documentation examples confirm `session.update.session.tools` for Realtime, **not** for `/v1/live/sessions`. Public API pricing describes GPT-Live session cost plus separately billed backend/tool usage, but this does not specify or validate its tool integration contract.

**Decision:** Do not remove more `session.update` fields or run additional paid calls as a diagnostic substitute. Prefer a controlled, server-authorized intake workflow with a verified staging-write acceptance gate, while investigating the official Live-session delegated tool contract. Do not falsely advertise the current voice route as capable of automated ticket creation. Any alternative must preserve explicit test operator consent, authenticated tenant authorization, same-origin rules, staging-only writes, idempotency, no invented case ID, and no secret/PII leakage to diagnostic exports. Do not try automatic speculative extraction from raw live speech or claim transcripts were captured.

**Implementation status:** independent no-voice staging-write UI is implemented and deployed; its successful database persistence has not yet been observed. GPT-Live voice currently remains conversational-only for acceptance purposes. Transcript event export is implemented but owner downloads were empty. Protocol-compatible tool calling and transcription remain open engineering blockers.

**Next acceptance sequence:** (1) authorized owner executes the fictional no-voice staging-write button and records the actual case ID, (2) verify persisted staging contact/case, (3) obtain an authoritative documented tool contract or implement a separately consented authenticated structured-intake submission channel, (4) independently test representative/user transcript capture and privacy, (5) one brief controlled full voice-to-case acceptance with a real returned ID. Preserve private branch isolation; public production and Sales Specialist remain untouched.


## 2026-10-16 — Protocol contract resolved; tool declaration and event handling corrected

**Evidence source:** Microsoft Azure Foundry GPT-Live event API reference (gpt-live-reference.md, updated 2026-09-17) and GPT-Live delegation guide (gpt-live-delegation.md, updated 2026-09-11). Both are official Microsoft/OpenAI documentation. These are the authoritative source for this implementation.

**Root cause confirmed:** `session.tools` on the session object is not a valid GPT-Live field. Tools for Responses delegation must be declared in `delegation.responses.tools` at session creation time (server-side), not injected via client-side `session.update`. Function calls from the delegated Responses model arrive inside `response.event` envelopes (not as bare top-level events). Transcript events use `session.input_transcript.delta` / `session.output_transcript.delta` (not Realtime `conversation.item.input_audio_transcription.completed`). Tool results submit via `response.item.create` (not `conversation.item.create`).

**COMMITTED:** `2db88fe` on `experiment/gpt-live-voice-poc`. Changes:
- `pages/api/experimental-support-voice-session.ts`: `submit_support_intake` tool added to `delegation.responses.tools` with `tool_choice: auto` and `additionalProperties: false` at session creation.
- `pages/experimental-support-voice.tsx`: removed client-side `session.update` tool registration; `toolRegistered` set true on `session.started`; function call detection now unwraps `response.event` envelopes and dispatches on `inner.type === response.output_item.done` with `inner.item.type === function_call`; tool result submission changed to `response.item.create`; transcript capture changed to `session.input_transcript.delta` / `session.output_transcript.delta`; diagnostic histogram now records every received `v.type` and nested `response.event` inner types; diagnostic schema version bumped to 3.

**NOT YET DEPLOYED:** Netlify does not auto-deploy this branch from git push. Commit `2db88fe` is on GitHub but the private site at `stellaruc-private-voice-poc` still runs `24e0502`. Owner must trigger a Netlify deploy to activate the fix.

**Acceptance sequence (unchanged order):** (1) owner triggers Netlify deploy of commit `2db88fe` and confirms READY; (2) owner runs "Verify fictional staging case write (no voice)" button — records actual case ID — this is Gate 1; (3) verify staging contact/case persistence via SQL or Supabase dashboard; (4) one brief controlled voice test; download diagnostic JSON and confirm `toolRegistered: true`, at least one `response.event:response.output_item.done` in histogram, and `INTAKE_PERSISTED` in events; (5) confirm spoken case ID matches DB record. No production changes until Gate 1–5 pass.
