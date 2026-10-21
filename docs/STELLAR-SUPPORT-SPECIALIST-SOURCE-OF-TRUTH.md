# STELLAR INTELLIGENT TECHNOLOGIES — SUPPORT SPECIALIST SOURCE OF TRUTH
**Operated by Apropos Group LLC**  
**Baseline:** 2026-10-21 UTC | **Version:** 1.0 | **Classification:** Engineering continuity; credentials excluded  
**Canonical repository:** https://github.com/Aproposchpt2/ai4-contact-center  
**Living Drive record:** https://docs.google.com/document/d/1yEDCHJuUNCC_eNmvHURV5unRRZHcbuwznXZXRIkwcyQ/edit  
**Status:** Staging phone-to-database ticket creation verified; independent durable workflow completion/dispatch acceptance outstanding.

## 0. Evidence standard and freeze rules
- **VERIFIED** = observed deployment, source, log, or DB record. **IMPLEMENTED** = code present, not necessarily runtime exercised. **PENDING** = not established. No inference that a deployment, AI statement, or simulated test alone proves database persistence.
- Preserve the staging voice persona/voice model, approved one-question-at-a-time dialog, greeting, live interruption handling, ticket writer, tenant isolation, and phone connectivity until a change is separately tested. No broad rewrites.
- Never commit keys, JWTs, email/telephone contact information from customer intake, raw transcripts, or model tokens. Logs should use correlation IDs, event kinds, timing and safe outcome codes.
- Production main IVR **(702) 935-1414** and inbound SMS endpoint `/api/sms/webhook` must not change. Support DID **(702) 710-2622** remains production. Sales DID **(725) 330-5102** is **temporarily used as staging Support acceptance route**; restore after tests.
- Ticket-number delivery enhancement **REQUESTED, NOT DEPLOYED**: spell four hexadecimal characters at a time, pause, wait for caller confirmation, and repeat only requested group. Do not present this as implemented.
- PR #77 remains draft and unmerged. Staging deployment points to a **pinned prior commit**; newer CI-only test fixes on the branch are not deployed automatically.

## 1. Architecture / control plane
```text
Caller -> Twilio Sales DID (temporary acceptance only)
 -> https://stellaruc.com/api/twilio/twiml?profile=sales [Twilio-signed POST]
 -> number-scoped Netlify feature flag SALES_ORCHESTRATION_TEST_ROUTE
 -> TwiML <Connect><Stream> staging /ws/support with short-lived HMAC bridge_token
 -> Railway staging twilio-bridge/server.js :8080 (Twilio Media Streams <-> OpenAI Live WS)
 -> GPT-Live-1 + delegated reasoning model gpt-5.6-terra, Support persona
 -> model function submit_support_intake, only after explicit confirmation
 -> executeTool -> buildStagingOrchestrator -> createVoiceOrchestrationAdapter.submit
 -> createSupportIntegration.submit -> allowlisted Supabase RPC calls
 -> trusted operation lookup/accept -> RUNNING -> test-only ticket RPC
 -> reconcile verified persisted case -> VERIFIED result (customerId, caseId)
 -> Live response continuation -> voice announces ticket and remains on call
```
The *actual* business write is by Supabase `stellar_create_phone_support_test_intake`, **not** by the voice model. The model initiates a structured request. The integration coordinates identity, workflow lifecycle, validation, recovery, and verified response. Unknown outcomes MUST NOT be claimed as success. The separate `orchestrator-durable.staging.cjs` and `orchestrator-gateway.staging.cjs` are engineering modules; do not confuse their presence with proof the deployed voice session directly uses them: the voice bridge currently imports `orchestrator-voice-adapter.staging.cjs`, which calls `support-orchestration-integration.staging.cjs`.

## 2. Verified milestone / evidence pointers
- Staging Railway deployment `ecaf85bd-d2f1-4a30-8e95-602af3ebe5a5` SUCCESS, Git commit `063d8ea32df59814b010e417cf32607ae561f426`, branch `feature/staging-orchestrator-trigger-gateway`. Runtime logged port 8080 startup and Live WebSocket pool ready.
- Netlify public site route: PR #90 squash commit `32714f3263787765959e31593ac81688961c79cd`; site deploy `6ad8515c1014bc9a923db340` ready, same commit, published 2026-10-21T05:45:53Z.
- Staging call SID `CA4ba6d5310dc60e6c39af9dace1aa94b7`; bridge logged `support save started` 05:55:50.900Z and `support save confirmed elapsedMs=2519` 05:55:53.564Z; voice transcripts continued after save; session ended via TWILIO_STOP ~05:58:20Z.
- **Authoritative Supabase** `public.stellar_support_cases`: `id=44e0cdef-3399-465b-a603-4f4b20a8be1e`, `intake_session_id=phone-staging:CA4ba6d5310dc60e6c39af9dace1aa94b7`, `created_at=2026-10-21T05:55:52.627482Z`. Fictional staging data; NOT a live client support guarantee.
- Caller reported excellent conversation, immediate ticket creation, multiple repeats, but difficulty accurately copying the long case ID. Full UUID comes from database, not reconstructed speech.
- **PENDING**: independent SELECT for matching `stellar_orchestrator_workflows_staging` row and terminal COMPLETED event; outbox/dispatcher delivery; accurate full-ID voice readback acceptance; sustained staging call/reconnect testing; production release. Do not claim these passed.
- CI: after correcting missing test import and disabled staging test fixture, commit `33365faaf4a5425d3e060e13f815dc586b9ff6ef` had both GitHub workflows succeed. Test doubles verify adapter contracts, not production call audio.

## 3. Vendor integration registry
| Vendor | Exact role | Connection / control | Current state | Operational safety |
|---|---|---|---|---|
| Twilio | Owns DID, inbound webhook request, CallSid, media streaming | Sales DID +17253305102 -> public `/api/twilio/twiml?profile=sales`; temporary number-scoped routing emits `wss://stellaruc-voice-bridge-staging-staging.up.railway.app/ws/support` | Staging call observed | Validate X-Twilio-Signature before routing; short-lived signed stream token; avoid modifying IVR/SMS/Support DID |
| Netlify | Hosts Next.js TwiML routes / feature flags | `stellar-intelligent-technologies`, site `1677a6f8-1eac-49d8-a963-7b4e35512f8e`, `stellaruc.com` | Route deployed at PR #90 | `SALES_ORCHESTRATION_TEST_ROUTE=true` is temporary; rollback to false and publish as necessary |
| Railway | Runs long-lived WebSocket relay | Project `stellaruc-voice-bridge` `1d66a7cf-3cb9-4032-958b-c897137fcece`; staging service `6bda5718-49a2-4524-8b4d-af906c3be2f0`; env `95040de1-e96f-43d5-b5fa-39e8c0911e9e`; port 8080 | Deployed SUCCESS | GitHub pinned commit; preserve separate production service, never print secret values |
| OpenAI | Real-time voice and reasoning/function requests | `OPENAI_LIVE_MODEL=gpt-live-1`, `OPENAI_REASONING_MODEL=gpt-5.6-terra` observed in startup logs | Voice works; function invocation on staging call observed via save log | Agent does not own DB write or invent case number |
| Supabase | Workflow identity/state, test-only ticket write, authoritative record verification | Project `hvzauakkhlivzeqatfqm`; fixed staging tenant `5885a020-d363-4c27-910a-c035eda132f5` | Ticket persisted and queried | Scoped allowlisted RPC, private service role, compare tenant/session/workflow/case; no blind retries |
| GitHub | Source control, tests, rollback | `Aproposchpt2/ai4-contact-center`; staging orchestration PR #77, routing PR #90 | Versioned evidence | Keep original design/docs/test artifacts and exact commit pointers |
| Google Drive | Living blueprint and status history | `STELLAR UC — Orchestrator Engineering Blueprint & Live Status Report` | Historical document exists; append new baseline | Append dated records; do not delete earlier status or imply historical acceptance was production |
| Resend | Optional notification in production support intake API | `pages/api/twilio/phone-support-intake.ts` | NOT part of staging ticket creation | `notificationSent:false` and `technicianFollowupConfirmed:false` in staging; never promise outreach |
| ElevenLabs | Legacy/adjacent voice provider in broader platform | Not in deployed staging Support audio path described here | Not a dependency of this milestone | Do not attribute the OpenAI voice session to ElevenLabs |

## 4. Environment and deployment settings (names only; never values)
**Railway staging confirmed variable names:** `BRIDGE_HMAC_SECRET`, `CSS_TENANT_ID`, `MAX_CALL_DURATION_MS`, `MAX_CONCURRENT_CALLS`, `NETLIFY_BASE_URL`, `NODE_ENV`, `OPENAI_API_KEY`, `OPENAI_LIVE_MODEL`, `OPENAI_REASONING_MODEL`, `STAGING_SUPABASE_SERVICE_ROLE_KEY`, `STAGING_SUPABASE_URL`, `STAGING_SUPPORT_WRITES_ENABLED`, `STAGING_VOICE_ORCHESTRATION_ENABLED`, `STELLAR_BRIDGE_STAGING`. Staging-only switches must be true and target URL + tenant match compiled allowlists.
**Netlify main site:** `BRIDGE_HMAC_SECRET_STAGING`, `BRIDGE_HMAC_SECRET`, `TWILIO_BRIDGE_WS_URL`, `TWILIO_ACCOUNT_SID`, `SALES_ORCHESTRATION_TEST_ROUTE` (the last is temporary). `TWILIO_AUTH_TOKEN` is optional in route source, and its actual deployment value was NOT audited; require signed request verification for any public release.
**Separate Railway production bridge:** project `ai4-contact-center` `6cbf1f8e-b4d1-4c4a-aa8d-5fec591f7917`, service `1eac6cdc-a5be-4adf-991d-e273e61bd8a3`; this deployment is NOT the test bridge.

## 5. Exact function-level inventory and purpose
### `twilio-bridge/server.js` — deployed WebSocket and voice runtime
| Function | Responsibility |
|---|---|
| `buildStagingOrchestrator` | Check staging switches/URL/tenant/key, construct RPC allowlist client with deadlines, create durable voice adapter |
| `logEvent` | Emit bridge lifecycle/diagnostic events (ensure no PII leakage in future audits) |
| `openPoolWs` | Open/warm a WebSocket to OpenAI for the connection pool |
| `fillPool` | Keep configured number of prefetched OpenAI sockets ready |
| `claimPooled` | Assign available pooled socket to an incoming call |
| `validateBridgeToken` | Authenticate short-lived HMAC bridge token carried in Twilio Stream parameters |
| `twilioUpdateCall` | Update an active Twilio call via its REST integration for supported call actions |
| `makeBridgeSignature` | Sign authenticated backend requests from the bridge |
| `callSalesIntakeStart` | Establish Sales interaction with backend API |
| `callSalesIntakeSubmit` | Persist Sales lead after structured collection |
| `callSupportIntake` | Production-path authenticated support intake HTTP submission (distinct from staging orchestrator) |
| `salesTools` | Construct exposed Sales tool schemas and capabilities |
| `handleCall` | Own call-scoped Twilio/OpenAI connections, state, tool dispatch, audio and cleanup |
| `cleanup` | Idempotently shut down call, sockets, deadlines and timers |
| `sendToTwilio` | Send media/stream protocol frames to Twilio |
| `sendToOpenAI` | Send events and responses to OpenAI Live session |
| `scheduleSupportReview` | Schedule staging Support conversation review/recovery prompting when needed |
| `clearTwilioAudio` | Clear buffered audio for caller interruption and synchronization |
| `startSession` | Initialize model/voice instructions, tools and greeting for the profile |
| `executeTool` | Parse/validate dispatched function call, execute Sales or Support backend action, return real function output to OpenAI |
| `attachOpenAIHandlers` | Consume real-time OpenAI messages and dispatch function/event/audio lifecycle |
| `start` | Start the HTTP/WebSocket server and readiness pool |

### `twilio-bridge/orchestrator-voice-adapter.staging.cjs` — deployed staging integration
| Function | Responsibility |
|---|---|
| `authorize` | Fail closed without trusted authenticated staging Support call, tenant and proper CallSid; derive stable SHA256 business operation ID from CallSid/toolCallId |
| `createVoiceOrchestrationAdapter` | Instantiate approved staging-only adapter and service RPC dependency |
| `bounded` | Limit waiting; return UNKNOWN without fabricating a case when backend response is late |
| `submit` | Validate confirmed intake, call durable integration exactly once, project verified status and IDs |
| `recover` | Look up/reconcile existing operation without reissuing business write |
| `projection` (local arrow) | Strip unverified details and only expose authoritative COMPLETED case/customer IDs |

### `twilio-bridge/tests/staging-runner/support-orchestration-integration.staging.cjs` — imported into deployed image
| Function | Responsibility |
|---|---|
| `uuid`, `session`, `need` (helpers) | Validate identifiers and guard invariants |
| `context` | Require trusted operation authorization, fixed tenant and original session |
| `intake` | Validate supported fields, lengths, date, priority, identity/contact minimums |
| `canonical` | Validate durable lookup belongs to correct tenant, operation, original session and allowed state |
| `outcome` | Release success only for COMPLETED + verified + testOnly + valid IDs |
| `createSupportIntegration` | Compose allowlisted RPC-backed staging workflow service |
| `invoke` (local arrow) | Surface Supabase RPC errors as failure, no speculative success |
| `lookup` (local arrow) | Lookup the persisted canonical workflow by operation ID |
| `recover` | Reconcile RUNNING/UNKNOWN and return authoritative persisted outcome |
| `submit` | Lookup/accept idempotent operation, transition ACCEPTED->RUNNING, create test intake once, reconcile; no blind retry |

### `twilio-bridge/orchestrator-durable.staging.cjs` — independent staging engineering module, not directly imported by deployed bridge
`str`: constrained string validation; `createDurableGateway`: create RPC executor; `invoke`: typed RPC call wrapper; `transition`: durable CAS workflow state update; `accept`: idempotent workflow acceptance; `process`: first-acceptance-only business execution and verification, returning COMPLETED/FAILED/UNKNOWN.

### `twilio-bridge/staging-support-intake.cjs` — legacy staging fallback path still packaged
`readiness`: staging-only target/key preflight; `submitStagingSupport`: direct staging intake RPC, validate returned UUID IDs. **When orchestration flag is enabled, `executeTool` selects the orchestrated adapter instead.** This fallback is present and must not be mistaken for orchestration acceptance.

### Netlify Twilio routes
`pages/api/twilio/twiml.ts` (live): `makeSay` TwiML spoken failure; `mintToken` 120s bridge HMAC; `parseBody` handle signed form parameters; `validateTwilioSignature` check signature; `handler` validate request/profile, temporary exact Sales DID route with flag, otherwise normal production bridge routing.
`pages/api/twilio/twiml-staging.ts`: same five helper/handler names but isolated staging TwiML endpoint; uses staging WS URL and HMAC secret. **This alternate endpoint was not the observed Sales DID entry point**; PR #90 changed live TwiML route for the test.

### Production support endpoint (separate)
`pages/api/twilio/phone-support-intake.ts`: `admin` service-role Supabase client, `validateBridgeToken` verify bridge HMAC, `clean` sanitize input fields, `sendNotification` optional Resend activity, `handler` validate/execute production support intake RPC and report real IDs. Not the verified **staging** ticket write.

## 6. Supabase RPC / database contract
- Tables: `public.stellar_support_cases` (persisted support cases); `public.stellar_orchestrator_workflows_staging` (trusted operation/workflow identity/state); `public.stellar_orchestrator_events_staging` (event/outbox); staging contacts, dispatch receipts/effects where migration exists.
- RPC allowlist inside staging bridge: `stellar_orch_lookup_staging` (read canonical operation/status/verification); `stellar_orch_accept_staging` (deduplicated acceptance); `stellar_orch_transition_staging` (CAS lifecycle); `stellar_orch_reconcile_case_staging` (recover persisted case after uncertain write); `stellar_create_phone_support_test_intake` (actual test-only case/contact creation).
- Lifecycle: `ACCEPTED` -> `RUNNING` -> `COMPLETED`, or `UNKNOWN` / `FAILED`. Never generate/speak ticket number before authoritative success. If timeout is uncertain, recover by original operation/session, not a fresh write.
- G01 authenticated private gateway subset passed in PR #77 historical report; remaining conditions documented in `docs/STELLAR_GATEWAY_REMAINING_ACCEPTANCE_DESIGN_2026-10-20.md`. Historical tests are not evidence that every scenario was exercised in this deployed telephone call.

## 7. Telephony / audio protocol
- Twilio webhook receives signed form and selects a profile. PR #90 exact `To=+17253305102` plus profile `sales` and `SALES_ORCHESTRATION_TEST_ROUTE=true` temporarily issues staging `/ws/support` stream token; otherwise normal original Sales route.
- Bridge verifies HMAC stream token and correlates `CallSid`, `StreamSid`; negotiates OpenAI Live WebSocket and PCMU streaming. Handles audio deltas, speech interruption, function calls, response events, cleanup and max call duration.
- Preferred Support agent: calm, confident, interruption-tolerant, single question at a time, confirm details then say “Please give me a moment while I create your support ticket.” Wait for verified return, pause for caller readiness, speak exact case ID. No invented ticket/callback/notification.
- **Pending readback specification:** split 32 hexadecimal characters into 8 groups of 4, articulate each character (e.g. “four, four, E, zero”), ask “Did you get those four characters?”, wait, repeat requested group, proceed only when acknowledged; confirm after complete identifier and offer overall repeat. Requires separate scoped implementation and real-call acceptance.

## 8. Runbook, rollback, and proof gates
**Inspection:** GitHub PR #77 for staging orchestration, PR #90 for temporary Sales DID flag routing; Railway staging service for deploy/logs; Netlify site for public route published commit; Supabase exact CallSid/session row and workflow state. Avoid copying raw personal details into reports.
**Rollback staging DID:** change `SALES_ORCHESTRATION_TEST_ROUTE` to `false` on Netlify and ensure effective runtime configuration; keep PR #90 historical for audit. If needed revert PR #90 code and deploy. Restore normal Sales specialist behavior before reusing the number publicly. Do not repurpose production Support/main IVR/SMS.
**Rollback staging orchestration:** set `STAGING_VOICE_ORCHESTRATION_ENABLED=false` only with conscious acceptance that it falls back to legacy direct staging intake; safer response to a fault is isolate staging test and preserve evidence.
**Acceptance:** A) Caller enters staging bridge (CallSid, profile, verified stream); B) confirmed-intake tool emitted; C) trusted operation accepted, started; D) exactly one persisted staging case tied to original session; E) matching workflow COMPLETED verified; F) exact caseId returned to voice model; G) voice reads all 32 characters in caller-confirmed groups and continues; H) replay/reconnect does not duplicate case; I) no unverified success, exposed secrets or unexpected production effects.
**Open engineering checks:** query persisted workflow/event for the milestone call; confirm whether `createdNew` or duplicate state is authoritative; test multiple call-recovery boundaries; validate production-only behavior independently; implement four-character speech pacing.

## 9. Change governance / document maintenance
For every subsequent code or vendor change record: timestamp in UTC, reason, affected file/function/vendor, pre-change commit/deploy, exact new commit/deploy, environment, config keys changed (never values), CI tests, real call SID, DB workflow/case verification, rollback plan, owner signoff and known unresolved items. Append a dated section to the Drive living blueprint. This file is the **Support Specialist Source of Truth**; the Drive doc is its human-readable continuity ledger. Source and currently deployed commit may differ; always audit both before asserting live state.
