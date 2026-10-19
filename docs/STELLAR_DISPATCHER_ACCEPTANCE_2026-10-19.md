# STELLAR UC — DURABLE DISPATCHER STAGING ACCEPTANCE REPORT

Date: October 19, 2026. Overall result: **PASS for the executed D01–D11 scenarios, with the concurrency boundary below. Production: NO-GO.**

## Execution and evidence

- [Protected manual run #6](https://github.com/Aproposchpt2/ai4-contact-center/actions/runs/39332899201), job 118335190432: SUCCESS.
- Workflow revision: `39ce47def015bf223037e33ca336037215aec3a2`.
- Actual pinned test source checked out: `1ffa50c0adb7d198576054c7c3fb0ad6098fcbe0`.
- Staging project: `hvzauakkhlivzeqatfqm`; tenant: `5885a020-d363-4c27-910a-c035eda132f5`.
- Dispatcher suite: 2026-10-19T22:11:12.049Z through 2026-10-19T22:12:52.278Z, **100.229 seconds**.
- [Full redacted database/process evidence](./evidence/stellar-dispatcher-run6-2026-10-19.json).
- [Independent cleanup SQL and responses](./evidence/stellar-dispatcher-independent-2026-10-19.json).
- Artifact 12224919030, ZIP SHA-256 `c5feb30138af621af8930ab0e0afe4d9e6d7e8e001175685ee7a9c14a4870633`.
- Automated guards passed: 9 access, 5 C1/R1 evidence guards, 20 dispatcher/adapter/acceptance guards. Pinned dependency installation audited 15 packages with zero reported vulnerabilities.
- Prior C1/R1 database acceptance was intentionally not repeated. Its evidence remains in the separate C1/R1 report.

## Results

| Test | Scenario | Result and actual evidence |
|---|---|---|
| D01 | Durable delivery | **PASS** — One committed receipt/effect; event 57 DELIVERED. |
| D02 | Overlapping dispatcher workers | **PASS** — PIDs 2597 and 2613 overlapped; first DELIVERED, second IDLE; one claim/effect. SQL claim calls themselves were sequential. |
| D03 | Crash before send | **PASS** — PID 2624 SIGKILL at 22:11:26.809Z; PID 2637 recovered original case after lease expiry; event 63 DELIVERED on attempt 2. |
| D04 | Crash after receiver commit | **PASS** — PID 2655 SIGKILL at 22:11:38.148Z after receiver receipt/effect committed; PID 2670 redelivered event 66 on attempt 2; still one receipt/effect. |
| D05 | Receiver restart | **PASS** — Receiver PID 2547 killed; fresh PID 2683 returned original acknowledgement for event 57; database state/effect unchanged. |
| D06 | Timeout and retry | **PASS** — Actual 2-second transport timeout: RETRY_PENDING / TRANSPORT_TIMEOUT; durable PENDING and next_attempt_at; fresh worker delivered event 69 on attempt 2. Dropped acknowledgement is covered by D04; HTTP 503 by D07. |
| D07 | Retry exhaustion | **PASS** — Real HTTP 503 across five claims, durable backoff; event 72 FAILED, attempts 5; subsequent worker IDLE; no receiver effect. Ticket remains COMPLETED. |
| D08 | Lease fencing | **PASS** — Old PID 2803 lease expired; PID 2816 delivered event 75. Old-token ack=false and fail=false. |
| D09 | Security/identity negatives | **PASS** — Foreign tenant DISPATCH_SCOPE_REJECTED; wrong workflow/session/case RECEIVER_ASSOCIATION_REJECTED; hash conflict RECEIVER_PAYLOAD_CONFLICT; anon/authenticated SQLSTATE 42501; state unchanged. |
| D10 | Repeat after completion | **PASS** — Fresh worker IDLE; no change to case, completion event, receipt or effect. |
| D11 | Cleanup/security | **PASS** — Seven fixture sets removed. All six table counts/fingerprints restored; security snapshot unchanged; independent Supabase SQL confirmation at 23:27:15Z. |

## Evidence boundary

D02 establishes two real operating-system workers overlapping while the first delivery remained unacknowledged. The first claim committed before the second claim began. Both claim traces report pooled PostgreSQL backend 2638109 in separate transactions (1714 and 1717); this is not evidence of simultaneous claim transactions or two distinct database backends contending on the same row. A barrier-controlled SQL claim collision, including SKIP LOCKED behavior and simultaneous expired-lease reclaim, remains a separate pending hardening test. It must not be represented as passed.

All delivery was real local HTTP to an authenticated loopback receiver, backed by committed staging PostgreSQL receipts/effects. “Effect” means a synthetic database marker. Delivery is at least once; one transactional marker per tested event was observed. This does not establish exactly-once external email/SMS delivery, external-provider durability, infrastructure-loss recovery, or production acceptance.

D06's timeout, D04's lost acknowledgement, and D07's non-2xx responses jointly cover the failure classes in the design. No additional independent socket-reset scenario was executed. D08 checked stale tokens after the replacement worker completed; a stale-token attempt while the replacement lease is actively held remains untested.

## Fixture identities

Each workflow remained COMPLETED with its original tenant, original intake session and exact case. Each had exactly one completion event. Worker code never invokes case creation; fixture coordinator alone created seven test-only cases and contacts using existing staging RPCs.

| Fixture | Workflow ID | Original authoritative case ID | Completion event |
|---|---|---|---|
| normal | 69b1d78d-8319-478c-9452-b267af543753 | 68f92f44-9736-4a71-8331-ab45cf653128 | 57 |
| concurrent | 9d1eaa7c-cf22-4725-a197-8c5ecbfd2d0d | 12e2fa43-a13f-4f7e-896f-4054531411b9 | 60 |
| claim-crash | d42b11c3-2bf9-40fb-ac43-8bc62aa7f3ea | f198f02e-8d89-4198-9294-d0a7bf467307 | 63 |
| receipt-crash | 0328d577-3da7-447d-9e5f-2e0fd6bd60c9 | 655fa04f-28c2-4b21-8388-5bf09c1be76d | 66 |
| timeout | b5d31f60-a227-4b4c-960f-bae0948e430b | 6de28859-10c7-4d2f-821f-e9d0c3ceec05 | 69 |
| exhaust | 73171be1-53c1-4708-8640-9d6973c37b59 | 8647bc7a-8a51-431f-a89d-c60ea56099fe | 72 |
| fence | d384b258-4e1b-4865-847d-c0e39752af76 | 3ee913aa-0f64-4a3c-a2ab-05c1c0e110c4 | 75 |

Business-operation IDs, original sessions, committed timestamps, worker PIDs, SQL transaction IDs and RPC timestamps are preserved in the evidence JSON. Claim tokens and credentials are not included.

## Baseline, cleanup and independent verification

| Table | Before | After runner cleanup | Independent later check |
|---|---:|---:|---:|
| Support cases | 20 | 20 | 20 |
| Contacts | 13 | 13 | 13 |
| Workflows | 0 | 0 | 0 |
| Outbox events | 0 | 0 | 0 |
| Receiver receipts | 0 | 0 | 0 |
| Test effects | 0 | 0 | 0 |

Case row fingerprint: `ddeb4729999cd8a90965ab2197b4355c`.
Contact row fingerprint: `a67f355fc8bc1a3e258ab772b308c485`.
Each empty table fingerprint: `d41d8cd98f00b204e9800998ecf8427e`.

All six before/after fingerprints match. Independent SQL at 2026-10-19T23:27:15.315585+00:00 confirms original case/contact fingerprints and zero workflow/event/receipt/effect rows. Identity sequences advanced during disposable fixture testing and were not reset. No synthetic rows remain from this run.

## Security and isolation

TLS client certificate and hostname verification remained enabled (`verify-full` in independent psql). The pooler-to-database TLS diagnostic is separate from client TLS and was not used as client TLS evidence.

The runner used existing protected staging credentials. RPC transactions explicitly used service_role; existing postgres administrative access was limited to fixture coordination, observation and exact cleanup. No roles, permissions, policies or schema were changed during this acceptance run.

RLS remains enabled on all six tables. All five dispatcher RPCs retain service_role EXECUTE with anon/authenticated denied, independently rechecked against unchanged function-body hashes. The full before/after snapshot includes original orchestration ACLs, policies and body hashes. No direct service-role workflow mutation grants were added.

The previously applied staging migration remains in place; it was not reapplied. No production database, Railway service, routing, application deployment, real notification, PR merge, or approved Support Specialist change was performed.

## Issues and corrective recommendations

No duplicate case, duplicate completion event, duplicate transactional test effect, false ticket completion, identity mismatch acceptance, or cleanup defect was observed in these scenarios. No application/database correction was required during this run.

The acceptance harness needs additional collision barriers and transaction/connection assertions before claiming simultaneous database claim/reclaim coverage. This is a coverage limitation, not a demonstrated runtime integrity failure.

Before production or wider credential access, rotate the database password disclosed earlier and update the protected secret. Existing implementation-report security advisories remain outside this test's remediation scope. Runner logs also contain Node 20/action deprecation warnings; review runtime upgrades in a separate change.

## Recommendation and next engineering gate

**GO** to the next isolated staging engineering milestone: barrier-controlled simultaneous claim/reclaim tests, stale-token attempts while a new lease is active, and uncertain claim/ack COMMIT reconciliation. Preserve current fixture safeguards and cleanup.

Still pending before production: database-lock crash during dispatcher claim, database timeout/connection loss during claim/ack, final-attempt crash recovery, quarantine paths against real staging state, malformed/forged HTTP acknowledgements, external-provider idempotency/reconciliation, sustained load/latency, security review, and separately authorized voice integration/real-call testing.

**Production remains NO-GO. PR #77 remains unmerged. No new owner action is needed to review this completed report.**
