# STELLAR-PMA-005-R5 — independent review and corrective execution

October 23, 2026, Pacific. Agent 06, for STELLAR-PMA-ORCHESTRATOR.

Reviewed PR #103 exact source `a8eddd6eced144815f3e847f271feeac7d97faf3`, tree `c4f61b0216e4e2ba16fda253f69387fc6c597de2`, parent `6833df46067e5bf54e53964412f8f3f6e78f66d0`. The prior workspace and original repair history are preserved. This review uses an isolated worktree and corrective branch `review/pma-005-r5-agent06-20261023`. The authoritative R5 assignment was read from Google Doc `1PDc81JAEwTDfARr8p4Zu-gyMlcR_W2MGLPRsQCXUFgA`.

## Findings and corrective scope

Agent 05's bounded PMA dispatch, lifecycle/error redaction and hashed tool correlation pass the existing independent tests and source audit. Availability equality, freshness, studio/any-size scope, failure classification, consent, resident authorization and request-only tours remain enforced. Two additional entry-path defects were reproduced at the exact reviewed source:

1. Recognized PMA pre-authentication upgrades logged arbitrary URL path, network address and raw first-message event fields. A synthetic private sentinel reaches logs before token validation. Corrective PMA-only metadata logging removes those values.
2. `/ws/pma` accepted the older HMAC profile-only token without requiring a route/session-bound `ivr1` token. This opened the PMA model without immutable session context; it does not establish a demonstrated database-write bypass, since downstream adapter/server gates remain. Corrective entry requires the trusted route-bound session on both `/ws/pma` and `/pma-stream`. The genuine token path remains usable; Sales/Support legacy paths retain their existing behavior.

The new three-case security regression produced 2 failures and 1 passing control before the fixes, then 3 passes afterward. No production routing, voice, Sales/Support dispatch or existing IVR selection was changed. Original PR #103 is not accepted unchanged; the final PR review identifies the corrective source and exact additional-review requirement.

## Independent execution evidence

| Check | Original a8eddd6 | Corrected source |
| --- | --- | --- |
| Complete application suite | 266 pass, zero fail/skip | 269 pass, zero fail/skip |
| Bridge suite | 55 pass, zero fail/skip | 55 pass, zero fail/skip |
| TypeScript | Pass | Pass |
| Optimized Next.js build | Pass, 72 static pages | Pass, 72 static pages |
| New pre-auth privacy and route-binding cases | 2 fail / 1 pass | 3 pass |
| Whitespace and Python compilation | Reviewed / pass | Pass |

Docker is unavailable in the local workspace. A new nondeploy CI workflow independently checks out the exact original SHA a8eddd6 (not synthetic merge f9197c4), reproduces application/bridge/TypeScript/build checks and actually builds/runs its Docker provenance and missing-SHA rejection tests. Corrective CI checks out the exact PR head SHA explicitly as well. The final receipt/review records actual run IDs, outcomes and source SHAs; no future run is declared passed by this committed plan.

## Real PostgreSQL attempt

Local postgres/initdb/psql/Docker executables and psycopg are unavailable. No package-manager privilege escalation or live DSN discovery is attempted. Instead, a separate authorized CI job provisions only an ephemeral PostgreSQL 17.6 test service, loads the synthetic baseline and repository PMA migrations, and executes `scripts/pma-real-postgres-races.py`. This is a test container, not a deployed application or live binding.

The runner refuses any target unless it is a GitHub CI job with an explicit ephemeral marker, loopback port 55432, dedicated database `pma005_r5_qa`, dedicated test user, and initially empty fixture schemas. The driver is pinned to psycopg 3.2.10. It uses independently connected left, right and observer PostgreSQL backends, transaction IDs, server clock timestamps, `pg_stat_activity`, `pg_blocking_pids` and an observed Lock wait before releasing the left transaction. Domain assertions cover duplicate consented capture, committed-response recovery, rollback/retry, request-only showing deduplication, changed-fact conflict, and capacity-one synthetic slot competition. Real role/cross-call denials are checked. Only disposable fixtures have writes/tours enabled; no actual staging gate is toggled.

The JSON evidence includes per-scenario lock/timing/outcome witnesses and actual PostgreSQL version. Guarded cleanup removes all fixture schemas and checks zero remaining fixture tables; the CI service is destroyed at job teardown. The final receipt must distinguish PASS, FAIL or access blockage based on the actual job/artifact. No PGlite result is substituted for this test. An ephemeral pass cannot establish deployed database connectivity or staging provider configuration.

## Staging release and review boundaries

Retain the paired-source release preparation and rollback instructions in `PMA-005-R4-INDEPENDENT-REVIEW.md` and `PMA-005-R3-RELEASE-PLAN.md`, replacing candidate SHA with the separately reviewed final corrective SHA when preparing a release. New source must receive independent review because Agent 06 authored these R5 fixes. A GitHub CI pass is not that approval. Preserve strict bedroom/freshness states, requested-only tours, disabled write bindings, resident portal authorization, and unchanged departmental routing.

Current read-only provider verification and exact remote publication/review evidence are retained in the final receipt. Historical rollback references remain Fly v4 image `sha256:1955bbc2558e3a25a5848a4079b05e090ee81dee0b65c296b0990814250d2647`, release `rel_95o6zr7vox4m2g08`, machine `820e3eb7206d78`; and Netlify deploy `6adae7c95030f9ac2280a356`. Refresh the complete current inventory, effective server/Fly gates, alias mapping and rollback pair before release. Health `commit:null` cannot prove deployment of the reviewed source. This assignment does not authorize activation, merge, deployment, machine changes, live database writes or production changes.

If the shared GitHub account cannot formally request changes or approve its own PR, record a COMMENT review anchored to a8eddd6 that explicitly states the independent agent's REQUEST_CHANGES disposition and limitations. Do not count it as a formal GitHub approval or change identities to bypass that restriction. The Orchestrator supplies an eligible independent account/reviewer for the final corrective source and the separate release gate.
