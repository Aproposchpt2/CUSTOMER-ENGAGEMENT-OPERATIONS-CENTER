# STELLAR-PMA-005 — Agent 06 incident assessment

Date: October 23, 2026. Recipient: STELLAR-PMA-ORCHESTRATOR.
Recommendation: **NO GO for staging release/activation. Local remediation passes; incident attribution and telephone verification remain incomplete.**

## Scope and versions

Call `CA39dcce1023b07fad877f2230132da7cf`; interaction `fbeff9ff-ceb1-2007-f73d-ecf668611622`.
The database records 2026-10-23 22:56:49.547936–23:01:29.046610 UTC (3:56:49–4:01:29 PM Pacific), completed, route `property-management-assistant`.
Tenant `5885a020-d363-4c27-910a-c035eda132f5`; property `eead9ac5-b28b-4594-b75b-a9e9bbbd111f`.

Local repair branch: `repair/pma-005-availability-incident-20261023`.
Exact parent: `3167e04f4fe2d3666a995c6bdc806eded5c5707c`.
The evidence packet receipt identifies the final local commit. No remote publication, merge, deployment, activation, database mutation, or migration was performed.

| Component | Evidence | Qualification |
| --- | --- | --- |
| Fly live health | `stagingOnly:true`, `commit:null`, PMA enabled, IVR entry `/api/ivr/main`, all three departmental routes present, support writes disabled | Health cannot establish the exact deployed application SHA or immutable image |
| Fly operator report | v3, source `3167e04f4fe2d3666a995c6bdc806eded5c5707c`, image tag `deployment-01M5NBR3PVK7G7R59MF7SVHQCC`, digest `sha256:1955bbc2558e3a25a5848a4079b05e090ee81dee0b65c296b0990814250d2647`, machine `820e3eb7206d78` | Reported by the separate deployment operator, not independently recovered from current Fly provider inventory |
| Netlify provider | Ready deployment `6adae7c95030f9ac2280a356`, branch `pma-validation`, title `PMA staging validation 40b306cfaa25eae1d332a60140e50412de74580f`, `commit_ref:null` | Source is identified in the deployment title, not an independently signed build attestation; observed SQL matches this older source |
| Netlify server function | ID `37ffa587267987bcc5e07baca36f36441c14bab4af492e780e50e376720eb300`; digest `34d77a6e71bf9a1d791f636e5c479ea7e4149c1f6fc5cb6d216ea9f35d52a533` | Provider-backed immutable deployment metadata |

Deployment control/workflow SHA `5f803c645588f1424e4993291df55d3ec8b0a5e2` is not the historical application source SHA. Do not conflate these identifiers.

## Before evidence and bounded root-cause finding

The provider database edge logs contain these successful HTTP requests within the call window, scoped to the same tenant/property:

| UTC timestamp | Query | HTTP |
| --- | --- | --- |
| 22:57:35.325000 | `pm_units`, `status=vacant`, non-null availability date, `bedrooms=2`, limit 20 | 200 |
| 22:59:34.707000 | Same query, `bedrooms=0` | 200 |

Both select `label,bedrooms,bathrooms,status,availability_date`. Neither selects `updated_at` nor applies the 24-hour rule. This matches the older Netlify source, not corrected parent source. Session RPC HTTP 200 events appear at 22:56:50.256, 22:57:01.639, 22:57:02.083, 22:57:34.696, 22:59:34.186 and 23:01:28.654 UTC.

These prove inventory HTTP requests executed successfully in the relevant scope/window. They do **not** contain the call SID, model tool-call ID, request/response payload, or spoken transcript. Therefore they cannot conclusively attribute each request to this call or prove which tool response was spoken. HTTP 200 does not prove a nonempty response. The second `bedrooms=0` request could be a studio inquiry; without transcript it does not establish a classification error.

Independent current database read confirms:

| Unit | Bedrooms | Status | Recorded date | Updated UTC |
| --- | --- | --- | --- | --- |
| 415 | 1 | vacant | October 25 | October 22 04:52:24.747669 |
| 301 | 3 | vacant | November 1 | October 22 04:52:24.747669 |
| 101 | 2 | occupied | null | October 22 04:52:24.747669 |
| 205 | 2 | occupied | October 22 | October 22 06:50:08.670571 |

All exceed 24 hours at the call. No verified two-bedroom vacancy exists in these records. A correctly filtered two-bedroom vacant lookup is consistent with an empty result, not a technical failure. This is an inference from the supplied incident facts and current database, **not** an observed historical response body. Unit 415 must never be offered as a two-bedroom, and neither vacancy can be advertised as fresh.

Confirmed defects: older deployed Netlify availability code omits freshness enforcement; the existing response contract lacks explicit empty/stale/failed states and the bridge relays upstream results without verifying bedroom count or freshness. These defects permit ambiguous spoken handling and exposure of stale or wrong-bedroom upstream results. The exact causal chain behind the reported earlier Unit 415 offer and the call's precise spoken wording remains **unproven** without original recording/transcript and model tool events.

No transcript rows, call-record rows, or intent-event rows were found for this exact interaction/call. The three private PMA voice tables each contain zero rows. Those tables belong to the trusted write orchestration path; their emptiness does **not** prove that the separate read-only availability gateway never ran. Availability invokes the dedicated signed `pma_availability` action; it need not invoke the 25-intent write classifier. An exact historical intent label cannot be recovered from the available rows.

A targeted read of currently approved, published, public, verified property-level knowledge found no availability/bedroom/415 content. This is not a reconstruction of the historical model prompt.

## Local repair

- Server snapshot returns `AVAILABLE`, `NO_VERIFIED_MATCH`, or `INVENTORY_STALE` with `requestedBedrooms` and explicit safe reply. An empty result does not assert that no apartments exist. Stale records cannot establish current availability.
- Query retains trusted tenant/property binding and exact database bedroom equality, then independently rechecks bedroom equality in the snapshot. Matching stale/occupied records are inspected internally; only fresh vacant dated records are exposed. A bounded query fetches up to 201 records and fails if over 200, rather than treating truncation as a complete negative result.
- Bridge independently checks contract version fields, requested count, every returned bedroom count, calendar date and 24-hour timestamps. Legacy, malformed, wrong-bedroom, stale, HTTP-error and timeout results fail closed as `LOOKUP_FAILED`; no units are announced. Speech guidance distinguishes successful negative lookup from unknown/failed lookup. Zero means studio, never unknown.
- PMA-only availability start/completion events correlate call SID, session, model tool-call ID, requested count, state, returned counts and duration. They exclude caller number, raw transcript, names, credentials and arbitrary tool text. They are stdout/ring events, not a newly provisioned durable log pipeline; retention must be confirmed during release review.
- Bridge Dockerfile includes the new verifier module. Session authorization/lifetime checks and Agent 05 hazard/confirmation fixes remain intact. No IVR routing, Sales/Support behavior, secrets or external settings were changed.

## After evidence and tests

`after-synthetic-protocol-replay.log` contains actual local bridge protocol outputs and correlated structured events for all three nonpositive outcomes. Every record is labeled `SYNTHETIC_LOCAL_PROTOCOL_REPLAY_NOT_TELEPHONE`; fixture SIDs are not the incident call. This is not an actual call recording, telephone retest, or deployed after-log.

| Validation | Result |
| --- | --- |
| `npm test` | 259 passed; zero failures/cancellations/skips |
| `node --test twilio-bridge/tests/*.test.cjs` | 53 passed; zero failures/cancellations/skips |
| `npx tsc --noEmit` | Exit 0 |
| `git diff --check` | Passed |

Coverage includes the exact incident inventory fixture; fresh matching vacancy; occupied exclusion; strict rejection of 415/one-bedroom and 301/three-bedroom results; stale/future/exact-24-hour-boundary timestamps; invalid dates; empty versus stale versus failure; upstream speech injection; HTTP failure/timeout/invalid JSON/legacy response; incomplete queries; trusted scope; closed/expired/foreign-route sessions; correlated PMA protocol results and no caller/secret leakage in new telemetry. Existing safety, identity, consent, request-only tour, disconnect, IVR, Sales and Support tests remain passing.

## Open gates and required next handoff

1. Recover the original provider recording/transcript, call resource and request-level events for the exact SID; recover Fly bridge stdout and OpenAI tool arguments/output/item IDs for 22:56:49–23:01:30 UTC. No authenticated Twilio or Fly log interface is available in this session. Application-table absence is not proof the provider recording does not exist. Follow provider access controls; do not extract cookies/tokens or start new recording without review.
2. Independently inventory all Fly machines and release/image/config identifiers, including stopped machine `83d3d6f733d658`, and establish source-to-image provenance for the incident. Live health reports `commit:null`; the operator's SHA alone cannot close this gate. Also reconfirm the active Netlify alias resolves to its intended immutable deploy, not merely that a historical deploy exists.
3. Independently review this local patch, publish only through an approved nonactivating source handoff, and approve a paired staging-only Netlify/Fly release. New bridge intentionally rejects the old Netlify response contract. Do not deploy only one side and declare readiness. Review immutable rollback targets and bindings first. Do not refresh inventory timestamps merely to bypass the freshness gate; only an owner-authorized verified refresh can make inventory current.
4. After a separate reviewed staging gate, run telephone QA: exact two-bedroom inquiry must never offer 415/301; stale fixture must say no current verified availability and request staff confirmation; a fresh occupied-only or empty fixture must distinguish successful no verified match; an injected backend failure must say unknown/lookup failed; a fresh synthetic two-bedroom vacancy may be described only as fictional recorded availability. Capture call SID, transcript/audio, tool arguments/result, scope, before/after image/deploy IDs, and safe logs. No live telephone retest of this repair was performed.
5. Genuine overlapping independently connected PostgreSQL transaction proof remains a separate open gate. Passing isolated PGlite tests is not evidence of that test. Preserve resident-identity integration, owner calendar/policy/emergency decisions, independent deployed-routing checks, binding review, and synthetic-tour controls. Current read-only health does not expose all binding/write/tour flags; do not claim they were freshly provider-verified here.

## Rollback plan — not executed

Before any authorized staging release, capture every machine ID/version/config/image digest and the active Netlify alias mapping, with provider-backed immutable references and approver. Retain write gates disabled and synthetic tours off. Verify a matched rollback pair; restoring a previous deployment does not resolve its known availability defects.

Known Netlify retained reference: `https://6adae7c95030f9ac2280a356--ai4cc-staging.netlify.app` (deploy/function digests above). Reported Fly v3 image: `registry.fly.io/ai4-pma-bridge-staging@sha256:1955bbc2558e3a25a5848a4079b05e090ee81dee0b65c296b0990814250d2647` (must independently verify). Earlier independently recovered staging image: `registry.fly.io/ai4-pma-bridge-staging@sha256:cf93e04d3c322de2b842308821126a5a4cc8107d14b304a515d76e73c0372968`, historical application source `0c7074d` (not the current machine state and not automatically an approved rollback target).

On an approved test failure, stop the PMA test, preserve evidence, request the reviewed rollback, restore only the preapproved staging pair, and verify health/provenance, disabled write/tour gates and unaffected routes. Do not restart or alter a machine, change an alias, toggle a binding or modify production under this incident investigation authority. No database rollback is needed for this patch because it adds no migration or data writes.

Return to STELLAR-PMA-ORCHESTRATOR for evidence access, independent review and the separate release decision. No GO recommendation is made for deployment or activation.
