# STELLAR UC — SQL CLAIM COLLISION & LOCK-CRASH ACCEPTANCE

October 19, 2026. **Overall result: PASS (C01–C04). Production: NO-GO.**

## Verified execution

[Protected GitHub run #7](https://github.com/Aproposchpt2/ai4-contact-center/actions/runs/39342230886), job 118366298471, completed successfully. Workflow revision: `f51f2ff6c0c74950cf2fe4fefceeb0cf05d22a9a`; pinned source: `d57953597c8cb220e0a338e238968542b23a245e`.

Staging Supabase project `hvzauakkhlivzeqatfqm`, approved tenant `5885a020-d363-4c27-910a-c035eda132f5`. Actual acceptance execution: 2026-10-19T23:54:59.812Z–2026-10-19T23:55:06.881Z, 7.069 seconds. Prior C1/R1 and D01–D11 suites were not repeated.

Artifact 12230626319, ZIP SHA-256 `ff795e3204039eb99a34bb93fb3fde7cd5915a1bef83727ad6e30134f030e658`. [Full process/SQL evidence](./evidence/stellar-dispatcher-collision-run7-2026-10-19.json). [Independent verification query and response](./evidence/stellar-dispatcher-collision-independent-2026-10-19.json).

## Actual test results

| Test | Result | Evidence |
|---|---|---|
| C01 — initial claim contention | PASS | OS PIDs 2556/2557, database backends 2646152/2646154, transactions 1791/1792. At 23:55:00.304Z both transactions were open; winner held the uncommitted claim row lock, second RPC returned NULL via SKIP LOCKED. One committed attempt, then one receipt/effect; event 78 DELIVERED. |
| C02 — competing expired-lease reclaim | PASS | Original five-second lease expired on the database clock. OS PIDs 2582/2583, backends 2646152/2646154, transactions 1799/1800. At 23:55:05.877Z both transactions were open. Exactly one replacement token/attempt 2; second claim NULL. No receiver effect before C03. |
| C03 — stale token during active replacement lease | PASS | Event 81 still LEASED with the replacement token and unexpired lease. Old-token ack=false; old-token fail=false; new lease unchanged. Replacement token delivered the original case, producing one receipt/effect. |
| C04 — actual crash holding an uncommitted claim lock | PASS | OS PIDs 2604/2605; backends 2646154/2646152; transactions 1809/1808. Both transactions open at 23:55:06.427Z. Competing claim NULL. PID 2604 terminated by SIGKILL at 23:55:06.440Z. Its transaction/row lock released; uncommitted claim rolled back to PENDING, attempts 0. Fresh RPC connection then claimed attempt 1 and delivered original case, event 84, once. |

The contention tests deliberately order the competing RPC after the first RPC acquires its row lock, while keeping both transactions open. This proves locked-row exclusion and distinct simultaneous transactions; it is not a randomized load race or a throughput benchmark.

C04 checks release of the killed client's transaction, not destruction of a reusable pooler's server backend. Its fresh recovery uses a new service-role RPC connection in the coordinator process. Separate operating-system worker-restart recovery was established in run #6 D03/D04 and earlier C1/R1; it was not reclassified or repeated here.

## Authoritative fixtures

| Scenario | Workflow | Original persisted case | Event |
|---|---|---|---|
| Claim | d34865c4-fc2c-4da9-bff8-e71f64528a6e | ba45c434-0950-4f70-94d6-39780621b45f | 78 |
| Reclaim/fencing | e486a672-0d39-42ce-a02e-05736276c331 | 3e96c466-ea9c-422e-8256-ba8aced413a3 | 81 |
| Lock crash | 123dc9ae-218b-4b3d-97ee-93062255108b | 04b03e11-4119-4107-aecb-834b2f6f6850 | 84 |

Each workflow stayed COMPLETED with its original case, approved tenant, original intake session and business-operation identifier. Each had exactly one completion event. Delivery never invoked ticket creation again. Three synthetic cases/contacts/workflows were created using existing authorized fixture RPCs; all were removed afterward. Full session/operation IDs, timestamps, transaction IDs and receiver acknowledgements are in the evidence JSON.

## Cleanup and security

| Table | Fresh baseline | Runner final | Independent final |
|---|---:|---:|---:|
| Support cases | 20 | 20 | 20 |
| Contacts | 13 | 13 | 13 |
| Workflows | 0 | 0 | 0 |
| Outbox events | 0 | 0 | 0 |
| Receipts | 0 | 0 | 0 |
| Synthetic effects | 0 | 0 | 0 |

All six table fingerprints match before/after and independent readback at 2026-10-19T23:56:00.257038+00:00. Cases: `ddeb4729999cd8a90965ab2197b4355c`; contacts: `a67f355fc8bc1a3e258ab772b308c485`; empty tables: `d41d8cd98f00b204e9800998ecf8427e`. Sequences advanced as expected and were not reset.

RLS remains enabled on all six tables. Function bodies, privileges and original policy/security snapshots are unchanged. Dispatcher EXECUTE remains service_role-only relative to anon/authenticated. Worker transactions used SET LOCAL ROLE service_role. Existing administrative access only coordinated authorized staging fixtures, observations and exact cleanup. TLS verification remained enabled. No schema, grant, policy, authentication or tenant-control changes occurred.

No credentials appear in evidence; claim tokens are redacted. No real notifications, Railway changes, live routing changes, application deployment, production database changes, PR merge, or approved Support Specialist modification occurred.

## Conclusion and remaining gates

The run #6 coverage gaps for SQL claim contention, expired-lease reclaim contention and stale-token rejection during an active replacement lease are now closed by actual staging evidence. No duplicate case/completion/transactional test effect, false delivery, identity violation or cleanup defect was observed. No database/application defect required correction.

**GO** for the next isolated staging milestone: uncertain claim/ack COMMIT recovery and dispatcher database timeout/connection-loss tests, followed by separately reviewed external-provider delivery integration. These tests were not executed in this run.

Also pending: final-attempt crash recovery, real quarantine paths, malformed/forged acknowledgements, external-provider idempotency/reconciliation, infrastructure-loss recovery, sustained load/performance, security review and separately authorized voice/real-call integration. A single synthetic transactional effect does not establish exactly-once customer notifications.

Previously exposed credentials must be rotated before production or wider access. Existing Node/action deprecation notices and previously documented security advisories remain separate follow-up work.

**Production remains NO-GO. PR #77 must remain draft and unmerged. Approved Support Specialist unchanged.**
