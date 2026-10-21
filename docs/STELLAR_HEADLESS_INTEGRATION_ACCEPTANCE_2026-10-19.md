# STELLAR UC — HEADLESS STAGING ORCHESTRATION ACCEPTANCE REPORT

Date: October 19, 2026 (America/Los_Angeles; execution October 20 UTC).
Result: **PASS — I01–I07 within the headless integration scope. Production remains NO-GO.**

## Provenance and scope

- Protected [GitHub Actions run #10](https://github.com/Aproposchpt2/ai4-contact-center/actions/runs/39350800287), job 118394260709, successful after owner approval.
- Tested source: `46c82b6efecc844bbac426e46c6f4e3f5e815a6c`; dispatch workflow revision: `bf9058a225110577accbe3d7675887102b3cf795`.
- Staging project: `hvzauakkhlivzeqatfqm`; tenant: `5885a020-d363-4c27-910a-c035eda132f5`.
- Executed 2026-10-20T01:11:33.292Z–01:11:54.265Z (20.973 seconds total suite runtime, not voice latency).
- Artifact 12233851516; SHA-256 `b3d0ccc35b06c63feb76ad1f042932cda97254518848d5cac27839366b2b56ad`.
- Original evidence: [run10 JSON](evidence/stellar-headless-run10-2026-10-19.json). Independent SQL and results: [verification JSON](evidence/stellar-headless-run10-independent-2026-10-19.json).
- Approved canonical lookup migration was already installed and was not reapplied. No application deployment was performed. PR #77 verified open, draft and unmerged.

## Actual acceptance results

| Test | Result | Database/process evidence |
|---|---|---|
| I01 — submit, verify and synthetic dispatch | PASS | Workflow `7c5bee43-499b-4b6a-8216-ca7002cefde2` COMPLETED; case `12b62b8a-eb3b-4daf-8414-fc53225220d7`; original tenant/session match; exactly one completion event (114), one receipt and one synthetic effect; DELIVERED. |
| I02 — reconnect using same trusted operation | PASS | Different transport session recovered the original workflow/session/case; full inspected state unchanged; zero additional ticket writes. |
| I03 — committed case plus actual worker restart | PASS | Worker A PID 2600 committed case `5f454a58-4531-4e72-8a83-702f8f0db26c` at 01:11:41.243Z while workflow `56757e21-f956-4d5a-9a2d-89d7cac5c6a3` remained RUNNING. SIGKILL confirmed 01:11:41.331Z. Fresh worker B PID 2611 recovered the exact original case by 01:11:42.493Z; COMPLETED, one completion event (117), zero additional ticket writes. |
| I04 — lost completion response | PASS | Actual reconciliation COMMIT completed, then adapter deliberately suppressed the response. Canonical lookup recovered verified COMPLETED case `7d684549-e4e5-46a7-9f13-f8dd0a20228b`, with one completion event (120). Application-boundary fault injection; this test did not introduce TCP loss. |
| I05 — missing case and security negatives | PASS | Missing case returned UNKNOWN without a case ID and with zero completion events. Wrong association rejected with CASE_ASSOCIATION_REJECTED; foreign context STAGING_TENANT_REJECTED; foreign lookup STAGING_LOOKUP_REJECTED; anon/authenticated calls SQLSTATE 42501. Negative workflow remained unchanged after rejected operations. |
| I06 — delivery failure separate from ticket success | PASS, assertions inspected | Case `76b81d3b-3cdd-40c9-9480-840f9fb2b48f` remained verified COMPLETED with one completion event (126), despite real local receiver HTTP 503 and RETRY_PENDING/PENDING delivery. No receipt or effect. Recovery still returned the original ticket; notificationSent and technicianFollowupConfirmed remained false. |
| I07 — cleanup and unchanged security | PASS | All five workflow fixtures removed, including four synthetic cases/contacts and 15 workflow events; synthetic receipt/effect removed. Baseline/final fingerprints identical; function definitions, ACLs and RLS unchanged. Independently confirmed after the run. |

Operation identifier for I03: `headless:crash:9b90052e-eff1-4f4e-944f-cb6d595f7db7`. Its original session was `phone-staging:CAf34af5d792cd469885a18a52c8b05a64`. Full identifiers, RPC backend PIDs, transaction IDs and timestamps are retained in the original JSON.

## Engineering checks and reporting correction

GitHub completed 9 access guard tests, 5 acceptance guard tests, and 41 dispatcher/integration guard tests: **55 tests passed, zero failed**. The other live acceptance suites were intentionally skipped in this run; their earlier evidence remains separate.

The original I06 evidence has a serialization field collision: its returned `status` object overwrote the test wrapper's `status: "PASS"`. Inspection of the executed assertions, actual result/state, final suite PASS and successful GitHub step establishes the bounded I06 result above. The original artifact is preserved without rewriting. Corrected the harness to name this ticket result `recoveredStatus` in commit `60a7e0e9ee7d4fd8bb5a9e3773eccd370d5216b2`; nine relevant local tests then passed with pinned repository dependencies. The first scratch invocation lacked the pg module and could not run the harness test; rerunning from the existing pinned-dependency review directory resolved that environment issue. No staging database tests were repeated for this label-only correction. This correction is not the code revision tested by run #10.

## Independent cleanup and security verification

Independent read-only SQL at **2026-10-20T01:14:12.036755Z** confirmed:

| Table | Fresh baseline | Runner final | Independent final | Row fingerprint |
|---|---:|---:|---:|---|
| Support cases | 20 | 20 | 20 | ddeb4729999cd8a90965ab2197b4355c |
| Contacts | 13 | 13 | 13 | a67f355fc8bc1a3e258ab772b308c485 |
| Workflows | 0 | 0 | 0 | d41d8cd98f00b204e9800998ecf8427e |
| Outbox events | 0 | 0 | 0 | d41d8cd98f00b204e9800998ecf8427e |
| Synthetic receipts | 0 | 0 | 0 | d41d8cd98f00b204e9800998ecf8427e |
| Synthetic effects | 0 | 0 | 0 | d41d8cd98f00b204e9800998ecf8427e |

All six tables retain RLS. All nine relevant orchestration/dispatcher RPC definitions and ACLs match the fresh pretest snapshot. The canonical lookup is STABLE, SECURITY DEFINER with empty search_path; service_role EXECUTE only among application roles. Its body hash remains `83b86abef8590434d473c32ee9284460`. No additional grants or permanent test fixtures remain. Existing sequence values may advance during committed synthetic testing and were not reset.

Access evidence separately records two OS processes (2565, 2566), database backend PIDs (2651517, 2651521), and overlapping read-only probes. Client-to-pooler TLS certificate verification passed in verify-full mode. The psql evidence reports databaseBackendTls=false; do not interpret client TLS verification as proof of TLS on the pooler-to-database leg.

Existing security advisory findings from lookup installation remain unresolved: older authenticated execution on stellar_create_support_test_intake, and disabled leaked-password protection. No credential values are recorded here. Previously disclosed credentials still require rotation before wider access or production.

## Limits and next engineering gate

This is a headless staging service result, not real-call or deployed voice acceptance. The injected authenticated/operationAuthorized flags are trusted test context; they do not demonstrate a real gateway's authentication or authorization. The local receiver writes only synthetic receipts/effects; no notifications or customer outreach occurred. I06 proves separation from synthetic event delivery, not a real notification provider.

Next gate: prepare and review a feature-gated authenticated staging gateway integration using the accepted service adapter, server-derived tenant/session/operation identity, canonical-operation authorization on reconnect, strict input/result contracts, and recovery without resubmitting uncertain writes. Validate duplicate first submissions, crashes before case persistence, fail-closed response mapping, timeout/polling bounds and gateway authorization negatives before any separately approved staging voice wiring.

Still pending: deployed worker lifecycle/restart supervision, real authenticated voice integration, notification-provider delivery policy and operational redrive, broader outages and receiver-commit response loss, load/latency/cost measurements, complete security review and production authorization. Prior C1/R1, collision, network and terminal suites retain their explicitly bounded results; this run does not expand them.

**Recommendation: GO for design/review of the next isolated authenticated staging integration milestone. NO-GO for production and no authorization implied for Railway deployment, PR merge, routing changes or approved voice-agent modifications.**
