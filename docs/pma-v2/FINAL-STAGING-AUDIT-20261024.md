# STELLAR PMA v2 — independent final staging audit

Decision: **NO GO for the three-recipient T-027 test.** Existing owner notification remains working. This audit sent no SMS, activated no recipient, changed no Twilio configuration, applied no database/configuration changes and made no deployment.

Audit performed October 24, 2026, Pacific time (evidence timestamps below use UTC). All credentials are omitted. The additional destination numbers are owner-approved owned test DIDs, not verified human vendor/tenant handsets.

## A. Netlify status

- Site `ai4cc-staging`, ID `06deb5c7-83b8-401c-bdc5-745d802e3f26` currently publishes deployment `6add7de18ee5dfde2b9d78fe`, commit `916cadb50bf8f2e71ec717b7446a55398bbf0501`, release branch `release/pma-emergency-staging-20261024` (PR #122). Ready, published at 2026-10-25T03:57:08Z; build/deploy log stages complete, 49-second build, Next.js server and middleware functions deployed. No deployment error reported.
- The actual Fly gateway still targets `https://pma-validation--ai4cc-staging.netlify.app`. Its ready branch deployment is `6add77a3bdcaab1bff7a9717`, commit `0fdcfe99df08cdd5e51bfa90c864c520eae490bc` (PR #121). Both commits have identical source trees: `4a611ca939ac779921833a95504dc8dbf9d4957f`; both emergency dispatcher blobs are `1cf7b96669ff95beaede5bbb3b36d46d4a3bd290`. The runtime provenance therefore includes the role-aware dispatcher. No new post-release SMS execution is claimed.
- Branch configuration has the approved tenant/property, staging Supabase URL, PMA channels, voice integration, IVR/workflow/reusable-DID flags, SMS sender `+17252010584`, and present Twilio/Supabase/HMAC secrets with Functions scope. Masked credentials cannot independently prove their values; authenticated read-only verification returns HTTP 200 and Twilio message records, supporting validity of the branch credentials.
- The published operator URL uses Netlify's `production` context **within this staging site**, not the business production site. It lacks the branch-specific tenant/IVR/workflow flags and the branch-deploy-only voice integration/SMS-sender/reusable-DID values; PMA_CHANNELS_ENABLED is blank. Its bridge URL points to the older Railway bridge; its HMAC context differs from the branch key. Do not copy masked secrets or blindly enable that context.
- Runtime checks: GET `/api/intake/pma-staging` gives 405 at the branch gateway and 404 at `admin-staging.stellaruc.com`; GET `/api/staging/emergency-test` gives 405 at both (no sending). Authenticated GET `/api/staging/emergency-verify` gives 200 on the branch and 401 on the operator host with the branch test credential. The operator 404 is confirmed by request detail `01M5RKNCS6PT4SD7E1Y8M8CNJ4`: only middleware executed, no server handler. This is host policy/context separation, not evidence that the active branch call path failed.
- Netlify request logs after publication contained audit GET probes, not a new emergency dispatch. Relevant Supabase PostgreSQL logs in the same window showed no matching emergency/permission errors. Absence of traffic is not an end-to-end pass.
- Fly `/health`: healthy, stagingOnly=true, PMA and IVR enabled, unchanged image commit `12c54995fb746e9d8d3937a240031aa58bad9da5`, no active call at inspection. Its catalog still reports v1.0; this release does not establish complete v2 KB/orchestration functionality.

## B. Supabase status

Authorized project `hvzauakkhlivzeqatfqm`; tenant `5885a020-d363-4c27-910a-c035eda132f5`; Desert Ridge Apartments property `eead9ac5-b28b-4594-b75b-a9e9bbbd111f`.

| Event | Destination | Active | Staging override |
|---|---|---|---|
| emergency_escalation | Existing owner mobile ending 8039 | true | true |
| pma_v2_maintenance_vendor_test | +17253305102 | false | true |
| pma_v2_tenant_test | +17027102622 | false | true |
| pma_v2_owner_backup_test | +17029351414 | false | true |

All records are scoped to the exact staging property. The existing emergency email preference remains active, but no email transport is implemented.

Migration `20261025032117`, `pma_v2_staging_recipient_routing_gated`, is applied. Live function definition recognizes the exact three event/destination pairs plus the preserved original owner; inactive records are excluded. It retains service_role claim validation, fixed tenant/property, active-call/session binding, two-hour lifetime, canonical emergency allowlist, advisory locking and incident deduplication. Both public/private prepare functions permit service_role execution and deny anon/authenticated execution. RLS remains enabled; service_role has no raw SELECT/INSERT grants on incident/preferences tables.

The live PostgreSQL rollback test passed incident creation, repeat-call/intent deduplication, current owner-only active SMS selection, foreign-tenant denial and unbound-call denial. It invoked no SMS transport and left the incident count unchanged at three. No preference activation occurred, even temporarily.

There are two vendor records but **zero property-to-vendor assignments** for Desert Ridge. A role-specific preference is not an authorized vendor assignment. Do not choose between vendor records without an authoritative mapping.

Latest real-call incident: `15b7b93f-77ef-41a6-8ed3-5c618df4b6eb`, call `CAedd491addcc410b26c9f5a5dd5f640e7`, opened 2026-10-25T01:29:37Z, SEV2, test_mode=false. It still has notification_state=ATTEMPT_PENDING. Attempts returned by the current dispatcher are not persisted independently; MessageSid, per-role delivery transitions and vendor acknowledgment are not stored by this emergency path. Existing generic stellar_dispatch_* tables are not wired into this dispatcher. A durable attempt/status/acknowledgment integration remains required; no schema/grant changes were made by this audit.

## C. Twilio status

Read using the connected Apropos Group LLC Console. All four numbers are owned and SMS capable. Main IVR voice webhook remains `https://ai4-pma-bridge-staging.fly.dev/api/ivr/main`; it was not edited.

| Role / number | Inbound SMS configuration | Messaging Service |
|---|---|---|
| Main / sender +17252010584 | https://api.us.elevenlabs.io/twilio/inbound-sms | MG76357144f5aaa458dec415dbc9a3d806 |
| Vendor +17253305102 | https://stellaruc.com/api/twilio/twiml?profile=sales | Same service |
| Tenant +17027102622 | https://demo.twilio.com/welcome/sms/reply | Same service |
| Backup owner +17029351414 | Blank SMS URL | None |

Service integration is **Defer to sender's webhook**. Delivery Status Callback URL is blank. The dispatcher specifies neither MessagingServiceSid nor StatusCallback; it submits using the configured From number. It does not retain Twilio's response MessageSid or error code. Two-way PMA receiving, forwarding, vendor acknowledgment and application delivery events are therefore not verified. The tenant demo handler can auto-reply; do not use it for the controlled alert workflow until a receiving-only path is reviewed. A Twilio DID receiving into Console logs is not proof that a human vendor or tenant saw or accepted an assignment.

The main sender/vendor/tenant numbers are in the service sender pool with SMS/MMS capability. Connected campaign `CMac988c88001689cbffd9b40f010cfe7b` is Verified, Low Volume Mixed, still describing FlowDesk Pro owner call alerts. The backup number has no Messaging Service assignment; its earlier outbound message had error 30034. Registration for outbound sending is distinct from ability to receive SMS. Broader STELLAR program alignment remains deferred, not certified by this audit.

Read-only Twilio API evidence via the existing protected verification endpoint:

- `SMc4c41778a01413d0c31e1293bfc41387`, From ending 0584 to owner ending 8039, sent 2026-10-25T01:29:38Z, **delivered**, no error. Its timing aligns with the real-call incident above, but the backend does not persist a durable incident-to-MessageSid association.
- `SM724b372a41c72500e03bcd8bb4976748`, earlier API test, delivered.
- `SM8eaada6e2cf73e42b3b10ece0cf13028`, earlier From ending 1414, undelivered, 30034.

No new message was sent and no new delivery or vendor acknowledgment is claimed.

## D. Corrective work prepared

Isolated branch `audit/pma-final-release-20261025`, based exactly on the published release:

1. Restore the existing STELLAR_BRIDGE_STAGING=true requirement in the PMA adapter. The published source omitted it; the production-isolation test failed and could attempt transport when that bridge flag was false. This is preparation only: the Fly image is unchanged.
2. Correct the older emergency test to expect email NOT_CONFIGURED and no email submission channel, matching PR #121's implemented behavior. No email functionality was removed by this audit.
3. Add authenticated GET-only `/api/staging/pma-emergency-readiness`, with configuration-only diagnostics, compiled revision/context/deploy metadata when available, no secret values, no database/Twilio clients and no dispatch path. It explicitly does not claim an overall release GO. It is not deployed yet.

No existing architecture was replaced. No recipient activation, live Twilio change, runtime environment mutation, production action, database migration or permission change was performed.

## E. Tests

| Check | Result |
|---|---|
| Published release provenance and branch-tree equivalence | PASS |
| Protected branch runtime verification / historical owner delivery | PASS |
| Live SQL incident selection/deduplication/authorization (rollback) | PASS |
| Three recipient roles/destinations inactive and correctly mapped | PASS |
| Published baseline application suite | FAIL: 278/280; outdated email expectation and missing staging bridge guard |
| Corrective application suite | PASS: 282/282 |
| Corrective bridge suite | PASS: 57/57 |
| Corrective TypeScript / optimized build / diff check | PASS (existing Supabase Edge Runtime warning) |
| Main IVR voice configuration unchanged | PASS |
| Three recipients receiving through the PMA workflow | BLOCKED |
| Durable per-recipient delivery and vendor acknowledgment | BLOCKED |
| New controlled live SMS / T-027 call | NOT RUN; requires receiving readiness and owner authorization |

## F. Outstanding actions and ownership

1. **Twilio + application:** Prepare authenticated receiving-only handling for the three owned recipient DIDs, with Console/application visibility and no demo auto-reply/retired agent behavior. Keep main IVR voice untouched. Do not enable unreviewed acknowledgment automation or forward alerts to new parties.
2. **PMA data/configuration:** Provision the authoritative synthetic vendor/property assignment. Preserve separate tenant and owner roles; caller ID or a preference row is not identity authorization.
3. **PMA dispatcher + database:** Add independent persisted attempt records correlated to incident, recipient role and Twilio MessageSid; retain provider submission, delivery/failure and vendor acknowledgment as separate states. A signed status callback and scoped persistence migration are required; preserve current grants, call binding and deduplication. Do not treat a provider timeout as proof nothing was sent, or blindly replay a completed incident.
4. **Netlify release:** Review corrective source and the readiness diagnostic before any staging deployment. Keep the established branch gateway authoritative unless a separately reviewed migration deliberately changes ingress; the operator host is not a drop-in gateway. Do not overwrite HMAC secrets or open generic operator-host APIs to fix a 404.
5. **Project owner:** Only after items 1–4 are verified, explicitly authorize activation of the three exact preferences and one controlled sending test. They remain inactive now.

Pre-existing Supabase advisories about unrelated Support demo RPC execution and Auth settings were observed but not modified, preserving the assignment's Sales/Support boundary. This audit does not certify those unrelated surfaces.

## G. Release decision

**NO GO for three-recipient T-027.** Existing owner-only emergency functionality is preserved and historically delivered. A successful Netlify build and passing role-content unit tests do not resolve receiving, assignment, durable delivery correlation or acknowledgment gaps.

Automatic approval review blocked a malformed authenticated POST probe because the test credential was unavailable to that probe and it could not be certified non-sending. The probe result is not used as evidence. No workaround POST was attempted; verification continued through GET-only reads, local mocks and the SQL rollback test.
