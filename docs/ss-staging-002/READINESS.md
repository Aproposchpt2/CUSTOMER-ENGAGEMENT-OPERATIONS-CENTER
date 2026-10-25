# STELLAR-SS-STAGING-002 — controlled integration evidence

STELLAR INTELLIGENT TECHNOLOGIES — Operated by Apropos Group LLC.
Date: 2026-10-24 Pacific. Sales telephone UAT: **NO GO**. Summit Support telephone UAT: **NO GO**.

## Source preservation

Started from PRs 125/126/127. Main remained 9483f6b3b1ad945f8d6918a5458d09189f91f62a. Live inspection then established newer shared IVR deployment code. The deliverable is based on the newer staging release branch `release/pma-emergency-staging-20261024`, SHA `916cadb50bf8f2e71ec717b7446a55398bbf0501`, rather than overwriting its IVR/PMA with main's older server. No branches were merged or deployed.

PR125's packaging and server-owned request-field corrections are selectively incorporated; the newer release already resolves bridge-relative test imports. PR126's complete approved-knowledge date/publication predicate is reused in `staging-knowledge-policy.cjs`. PR127's corrected Support projection and supplemental HVAC catalog are retained. No comprehensive KB or legacy intent file is replaced by a short prompt.

## Verified infrastructure — read-only

Fresh browser tabs resolved the earlier browser connection failures.

Twilio Apropos Group LLC active numbers all showed Voice Webhook POST to:
`https://ai4-pma-bridge-staging.fly.dev/api/ivr/main`

- +17029351414
- +17253305102
- +17252010584
- +17027102622

The Fly dashboard lists two apps: `ai4-pma-bridge-staging` and `stellar-twilio-bridge`. No dedicated Sales-only or Support-only app was listed in this organization.

Shared staging app:
- Latest release v32, completed 2026-10-24 18:05 UTC.
- Image `registry.fly.io/ai4-pma-bridge-staging:deployment-01M5QHC0YYV0R52WESH68JV95T`.
- Release machine `820e3eb7206d78`, LAX, shared-cpu-1x, 512 MB.
- GET `/health` reported stagingOnly=true, commit `12c54995fb746e9d8d3937a240031aa58bad9da5`, enabled IVR, Sales/Support/PMA routes, Support writes disabled.
- Signed route source at that reported commit maps menu 1 to Support `/support-stream`, menu 2 to Sales `/sales-stream`, menu 3 to PMA `/pma-stream`, all on the shared staging origin. WebSocket source validates signed route/call/account context. No call was placed and no signed provider webhook was replayed.
- The health SHA is a self-reported configuration value, not independently verified OCI source provenance for every machine. Fly showed seven secrets pending synchronization; none were deployed.
- Secret names inspected only: BRIDGE_HMAC_SECRET, BRIDGE_RELEASE_SHA, IVR_VOICE, OPENAI_API_KEY, PMA_VOICE, STAGING_VOICE_ORCHESTRATION_ENABLED, VOICE_DEMO_WORKFLOWS_ENABLED. No values were retrieved or changed.

Older app:
- `stellar-twilio-bridge` latest release v28, 2026-10-17 18:39 UTC.
- Image `registry.fly.io/stellar-twilio-bridge:deployment-01M55JHYKG0168S72GAF1M749N`.
- Machine `6835512a537238`, LAX, 256 MB; no Git SHA in displayed metadata.
- Its health previously reported stagingOnly=false and commit=null. Do not treat this as the Sales/Support staging release target.

The shared staging app is the observed current route target. A future release must preserve its IVR/PMA and reconcile newer source and per-machine configuration; deployment remains unauthorized.

## HVAC persistence — correction prepared, not applied

Read-only hosted checks on `hvzauakkhlivzeqatfqm` established:
- HVAC function owner postgres; SECURITY DEFINER=true; current_user service_role guard therefore fails.
- service_role has BYPASSRLS, SELECT on tenants and SELECT/INSERT on ai4cc_contacts and stellar_support_cases.
- All three tables have RLS enabled; member policies exist. No non-internal triggers were found on the contact/case tables.
- anon/authenticated currently have EXECUTE. Their calls are blocked by the function guard, but grants should be narrowed.
- Catalog dependencies list PL/pgSQL and public schema; dynamic PL/pgSQL relation references were inspected in the function source.

`hvac-authorization-proposal.sql` proposes only SECURITY INVOKER plus per-function EXECUTE removal from PUBLIC/anon/authenticated, retaining service_role EXECUTE. The original exact Summit UUID, ACTIVE/demo/test_only/notifications_disabled checks and function body remain unchanged.

**Owner approval is required before applying this authorization change, per assignment Priority 1.4. No hosted ALTER/GRANT/REVOKE was executed.**

Isolated real PostgreSQL validation uses PGlite 0.5.11, with the original function and a minimal schema matching the relevant columns, grants and RLS/service-role behavior. It reproduced baseline 42501, applied the proposal locally, created a fictional case, proved same-session idempotency, foreign-tenant rejection and anon/authenticated denial. The new runtime then executed through the same local SQL function and verified the returned case by a second SELECT. No hosted correction or hosted positive HVAC write is claimed. This is not a full Supabase clone or a separate-connection concurrency test.

## Existing Sales persistence — hosted transaction verified

The running staging source already implements `stellar_voice_demo_sales_submit_staging`, reached through the signed voice gateway. It reuses the canonical CRM lead function, synthetic fixture checks, a persisted call session and actor membership. It marks contacts/leads synthetic and notificationsDisabled and records the lead on the parent session for idempotency. This work is preserved and reused; no second CRM implementation was built.

A controlled hosted BEGIN / SET LOCAL ROLE service_role / existing synthetic session and Sales RPC test / ROLLBACK succeeded:
- First result: lead `3665d22d-f9a4-45f8-86cb-5f415fd99ed4`, persisted=true, testOnly=true, notificationSent=false, deduplicated=false.
- Second submission returned the same lead and deduplicated=true.
- A post-rollback query returned zero rows for that lead.
- Attempting to submit a STELLAR session under the Summit tenant failed with 42501 Sales session rejected.
- No non-internal triggers were found on the involved interaction/lead/activity/audit tables. No notification was sent, and no durable test lead remains.

These are database transaction tests, not proof of a live phone-to-gateway-to-database conversation.

## Intelligence integration delivered behind a disabled-by-default switch

`specialist-staging.cjs` is called from actual bridge session creation, tool dispatch, caller transcript handling and cleanup when enabled. It requires signed gateway session identity, exact call/agent route, explicit staging project, and separate exact tenant mappings:
- Sales: 5885a020-d363-4c27-910a-c035eda132f5.
- Summit Support: d7e80001-0000-4000-b000-000000000001.

Runtime behavior:
1. Full 283-definition expanded catalog is stored separately as `voice-agent-catalog-expanded.json`. Existing `voice-agent-catalog.json`, including legacy SLS references and IVR consumers, is preserved byte-for-byte.
2. Each specialist receives its complete authorized profile taxonomy plus universal/control/safety definitions. `assess_specialist_intent` validates references/confidence and rejects the other product's intents. Tests exercise every expanded reference for both profiles. This tests classification policy, not live model recognition accuracy.
3. Deterministic safety scans actual caller transcript deltas before routine tools, including split fragments. Safety blocks routine writes and lookup. Emergency scripts are inherited from Ruflo's scanner; its unconscious spelling defect is corrected.
4. `search_specialist_knowledge` queries the exact server-owned tenant, requires approved/published/public visibility/public audience, checks source and effective/expiry/valid_until metadata, bounds returned text, and never falls back across tenants. Summit uses its corrected projection; Sales uses the repaired Sales predicate.
5. The 148-record candidate KB is retained and used for lineage metadata only. Its DRAFT-STAGING-CANDIDATE answers are never promoted into caller facts. Existing hosted approval gates still determine factual availability. Prior verified Summit caller-eligible count was zero; this assignment publishes nothing.
6. Existing approved Sales/persona and Support intake instructions are preserved alongside the complete taxonomy. The new mode skips the old gateway's legacy knowledge injection, preventing that path from bypassing the stricter tenant/public predicates.
7. Support dispatch authorizes only SUP-049; Sales lead dispatch authorizes only SAL-033. Both require prepared summary, a subsequent observed caller confirmation, matching details, current intent, and explicit write switch. Model-supplied confirmed=true is insufficient. Transcript-delta confirmations require an exact affirmative and at least 1.2 seconds without another delta; corrections invalidate consent.
8. Support calls the existing Summit HVAC RPC; Sales calls the existing signed gateway Sales writer. Both verify database readback under exact tenant/session before confirming success. Stable operation identity, RUNNING/UNKNOWN states, deduplication and read-only UNKNOWN reconciliation prevent automatic repeated writes.
9. Session close suppresses later voice output; no notification or transfer activation is added. PMA/IVR source is preserved outside the specialist opt-in path.

Configuration names prepared (not set on any live app): SS_STAGING_INTELLIGENCE_ENABLED, STELLAR_BRIDGE_STAGING, STAGING_SUPABASE_URL, SS_STAGING_SALES_TENANT_ID, SS_STAGING_SUPPORT_TENANT_ID, STAGING_SUPABASE_SERVICE_ROLE_KEY, SS_STAGING_HVAC_WRITES_ENABLED, SS_STAGING_SALES_WRITES_ENABLED. Direct verified KB/readback needs an approved staging server credential; no credential was provisioned. These names are not deployment authorization.

## Voice preparation

The newer deployed source already sets Echo for Sales and Cedar for Support and contains the owner-approved reception handoff greetings. Official OpenAI documentation confirms `audio.output.voice` as the startup field and lists both voices:
https://developers.openai.com/api/reference/resources/live/methods/create
https://developers.openai.com/api/docs/guides/live-conversations

The opt-in path keeps those voice choices and explicitly delivers:
- Sales: “You have reached the Sales Department at Stellar Intelligent Technologies. How can I help you?”
- Support: “You have reached Summit Comfort Heating & Air. How can I help you?”

Tests inspect startup payloads and full backend instructions. No live audio call or pronunciation/energy acceptance was performed. Caller transcript deltas follow the documented Live event, not an assumed transcript.done event.

## Validation and limits

Commands:
- `npm ci --ignore-scripts`
- `npm test`: 293 tests, 291 PASS, 2 FAIL.
- Untouched release baseline: 280 tests, 278 PASS, the same 2 FAIL.
- `node --test tests/specialistStaging.test.mts tests/voiceBridgeRuntime.test.mts tests/voiceBridgeSafety.test.mts`: 43 PASS, 0 FAIL.
- `npm ci --prefix tests/ss-staging-002 --ignore-scripts`
- `node tests/ss-staging-002/postgres.mjs`: PASS, real isolated PostgreSQL transactions plus runtime-to-SQL readback.
- `node --check twilio-bridge/server.js` and specialist module: PASS.
- `npm run build`: optimized build/type validation PASS, 72 pages (see final build result).

Inherited failures, reproduced before this integration and left untouched to preserve PMA:
- pmaEmergencyPermissionRepair: permission errors / logged email dispatch assertion.
- propertyManagementTransport: production-disabled expectation gets UNKNOWN instead of DISABLED.

Docker engine unavailable. Required local module COPY inputs are updated, including two pre-existing logger dependencies missing from this release Dockerfile; no Docker image execution/provenance claim. No paid live OpenAI inference was performed. Model classification accuracy, call quality, hosted HVAC persistence, and full live E2E remain unverified.

## Remaining gates and telephone acceptance

Sales: NO GO for telephone UAT until reviewed integration is released under separate approval, per-machine runtime/secret state is resolved, approved product KB is reachable and a controlled phone call proves the existing gateway/write/readback path.

Support: NO GO for telephone UAT until the HVAC authorization proposal is approved/applied/tested on hosted staging, reviewed Summit KB is caller-eligible, then separately approved runtime release and phone verification are completed.

Use the prior SS001 telephone scripts after those gates. Record the actual DID, machine/release SHA, signed session, tenant, classification, KB IDs, operation ID and persisted reference. Sales scenarios: product questions, objections/private pricing, qualification, consent/correction, duplicate save and UNKNOWN reconciliation. Support scenarios: no-heat/no-cooling, gas/CO priority, safe request-only scheduling, verified ticket readback, corrections, duplicate submission, outage and tenant injection. No dispatch or appointment confirmation without an implemented verified result.

No production changes, merges, Fly deployment, webhook updates, notification activation, KB publication or hosted database authorization changes were made.
