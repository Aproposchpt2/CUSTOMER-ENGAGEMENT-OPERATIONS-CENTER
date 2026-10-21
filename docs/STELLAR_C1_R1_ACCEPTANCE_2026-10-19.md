# STELLAR UC — CONCURRENT RECONCILIATION & WORKER-RESTART ACCEPTANCE REPORT

**Overall result: PASS for C1 and R1. Production remains NO-GO.**

Date: October 19, 2026. Isolated staging only.
Project: `hvzauakkhlivzeqatfqm`; authorized tenant: `5885a020-d363-4c27-910a-c035eda132f5`.
Repository: Aproposchpt2/ai4-contact-center; branch: `feature/staging-orchestrator-trigger-gateway`.
Draft PR #77 remains unmerged.

## Execution and evidence

- [Successful GitHub run #5](https://github.com/Aproposchpt2/ai4-contact-center/actions/runs/39326526474).
- Workflow revision: `db387bdc13fb173a73d60cebcbfb2a528623b6d0`.
- Pinned executed code revision: `385c2986325fd58258b4be655c4580fd2b1086b2`.
- Actual staging execution: **2026-10-19T21:48:32.584Z–2026-10-19T21:48:34.760Z UTC** (14:48:32–14:48:34 PDT).
- Full database/process evidence: [C1/R1 JSON](./evidence/stellar-c1-r1-2026-10-19.json).
- GitHub artifact ID: `12224865037`; artifact ZIP SHA-256: `d0abfdaad533939fbe954352ab3e5b72402fb0f6d4f1e9ad26dcb385896476c2`. The original GitHub artifact expires October 26; this JSON preserves the evidence.
- Guard tests: **9/9 PASS**. Acceptance-evidence rejection tests: **5/5 PASS**.
- Live V5 transition and reconciliation function bodies matched the repository migration before fixtures were created. No migration was reapplied.

## Results

| Test | Result | Actual evidence |
|---|---|---|
| C1: matching persisted case, concurrent reconciliation | PASS | Two Node processes and two PostgreSQL connections were simultaneously blocked on the same fixture; both returned the original case; one state transition and one completion event. |
| C1: concurrent reconciliation with no case | PASS | Both workers returned UNKNOWN/null; zero cases and zero completion events; exactly one UNKNOWN event. |
| Database timeout | PASS | Actual statement timeout returned SQLSTATE 57014 while waiting for the fixture lock; workflow and event history unchanged. |
| R1: committed workflow, actual process kill and restart | PASS | Worker A was terminated using SIGKILL while holding a row lock. Committed workflow and case survived. Worker B ran as a distinct OS process with a fresh connection and recovered the original case. |
| Repeated recovery after completion | PASS | A further fresh worker returned the original case; version, case count, and event history remained unchanged. |
| Crash while holding a lock | PASS | Worker A exit signal recorded; its database connection disappeared and the lock was released. |
| Cleanup and unchanged security | PASS | Two cases, two contacts, three workflows, and nine events removed. Counts/fingerprints restored; independent post-run queries confirmed zero fixture records and RLS/privileges intact. |

## C1 — authoritative concurrency evidence

Workflow: `3a20fe48-742d-404e-8dfc-e86118d4c1e7`.
Original case: `449449b3-1936-489d-ab5c-a30efe9eff50`.
Original session: `phone-staging:CA7ccf6db481dc4e0cb7bddf3bed9ac4b3`.
Business operation: `c1r1:c1r1-39326526474-concurrent:c2fc52ff-41a1-4dfd-89c6-889bd9b18361`.

| Worker | OS PID | PostgreSQL PID | Transaction | Reconciliation start UTC | Reconciliation finish UTC |
|---|---:|---:|---|---|---|
| A | 2529 | 2636517 | 1686 | 21:48:33.051 | 21:48:33.118 |
| B | 2530 | 2636521 | 1687 | 21:48:33.051 | 21:48:33.109 |

Both requests overlapped for approximately **58 ms**. The coordinator (PostgreSQL PID 2636520) held a row lock until 21:48:33.099 UTC. Actual `pg_stat_activity` wait-event/blocker evidence for both connections is preserved in the JSON. Its cached `state` field reads “idle in transaction”; the live Lock wait events, transaction identifiers, and overlapping worker timestamps establish contention.

The workflow changed **RUNNING/version 2 → COMPLETED/version 3**. Both RPC responses were:

```json
{"workflow_state":"COMPLETED","verified_case_id":"449449b3-1936-489d-ab5c-a30efe9eff50"}
```

Exactly one matching support case remained. COMPLETED events changed **0 → 1**, event ID **46**, referencing the exact case, tenant, and original intake session. No duplicate ticket or completion event was created.

The missing-case workflow `8f181683-675a-41d5-8439-023297483776` used OS PIDs **2551/2552**, database PIDs **2636521/2636517**, transactions **1690/1689**. Both requests began at **21:48:33.326 UTC**, overlapped under the coordinator lock, and returned:

```json
{"workflow_state":"UNKNOWN","verified_case_id":null}
```

It ended at UNKNOWN/version 3, with zero cases, zero COMPLETED events, and one UNKNOWN event (ID 47).

## R1 — committed worker-restart evidence

Workflow: `4da4d91c-4a48-4abb-8684-43b2bb538c24`.
Original case: `b25d29b7-fd5b-49cc-b650-64bf06236978`.
Original session: `phone-staging:CA8220df1ab3c64cd98409b42f921389bb`.
Business operation: `c1r1:c1r1-39326526474-restart:f563c585-98db-4acb-89e8-a7d3433db6f5`.
Fixture committed at **21:48:32.855 UTC**, before either restart worker started.

| Process | OS PID | PostgreSQL PID | Transaction | Evidence |
|---|---:|---:|---|---|
| Worker A, controlled pre-reconciliation lock holder | 2573 | 2636521 | 1691 | Started 21:48:33.563; killed 21:48:34.008; SIGKILL exit recorded 21:48:34.010 UTC. |
| Timeout worker | 2584 | 2636517 | 1692 | Actual 250 ms database statement timeout; returned DATABASE_57014; no persisted mutation. |
| Worker B, recovery | 2595 | 2636517 | 1693 | Fresh process/connection; began reconciliation 21:48:34.168; committed 21:48:34.179 UTC. |
| Repeat recovery worker | 2606 | 2636517 | 1694 | Separate process; reconciled 21:48:34.352–.359; committed .362 UTC without changing state/history. |

The matching case and RUNNING workflow were independently read while worker A held the lock and again after its actual termination. Worker B returned:

```json
{"workflow_state":"COMPLETED","verified_case_id":"b25d29b7-fd5b-49cc-b650-64bf06236978"}
```

The workflow became COMPLETED/version 3. COMPLETED events changed **0 → 1**, event ID **48**. After repeated reconciliation the count remained **1**, the case count remained **1**, and the complete workflow/event snapshots were unchanged.

Worker B's code path performs reconciliation only. Ticket creation occurred only in the coordinator's initial fixture setup; recovery worker ticket-creation calls: **0**. Pooler backend PIDs may be reused across sequential connections; distinct OS processes, fresh clients, and distinct transactions are recorded.

Worker A's artificial row lock used the existing owner-authorized `postgres` connection. Reconciliation workers used `SET LOCAL ROLE service_role`. No role privileges were expanded and no RLS/authentication/tenant checks were disabled. This tests the controlled staging harness, not a deployed production worker.

## Database baseline, cleanup, and independent verification

| Table | Before | Peak fixture count | Final | Original/final row fingerprint |
|---|---:|---:|---:|---|
| Support cases | 20 | 22 | 20 | ddeb4729999cd8a90965ab2197b4355c |
| Contacts | 13 | 15 | 13 | a67f355fc8bc1a3e258ab772b308c485 |
| Workflows | 0 | 3 | 0 | d41d8cd98f00b204e9800998ecf8427e |
| Outbox events | 0 | 9 | 0 | d41d8cd98f00b204e9800998ecf8427e |

Cleanup used a transaction and exact workflow IDs, tenant, original session, operation ID, test-only case/contact IDs, and uniquely generated fictional `example.invalid` addresses. It removed **2 cases, 2 contacts, 3 workflows, 9 events**. No notification dispatcher ran; all fixture events had `delivered_at=null` and `attempts=0`.

After the GitHub job completed, a separate Supabase SQL connection independently verified all four final counts/fingerprints and found **zero** records for every fixture ID. Independent security query returned:

```json
{"rls_enabled_tables":4,"rpc_privileges_preserved":true,"remaining_run_cases":0,"remaining_run_contacts":0,"remaining_run_workflows":0,"remaining_run_events":0}
```

The evidence JSON captures before/after RLS flags, table ACLs, policies, function-body hashes, and RPC privileges. They were identical. `anon`/`authenticated` cannot execute the three orchestration RPCs; `service_role` can execute them but cannot directly INSERT, UPDATE, or DELETE workflows. Fixture creation used the existing staging intake/accept/transition RPCs.

Row fingerprints cover records, not sequence positions. The outbox event sequence advanced during these committed tests and was intentionally not reset.

## Actual SQL used

```sql
-- Per-worker transaction, with existing service_role privileges:
BEGIN;
SET LOCAL ROLE service_role;
SELECT pg_backend_pid(), current_user, clock_timestamp(), txid_current();
SELECT * FROM public.stellar_orch_reconcile_case_staging($1::uuid);
COMMIT;

-- Coordinator forces overlapping reconciliation attempts:
BEGIN;
SELECT workflow_id FROM public.stellar_orchestrator_workflows_staging
WHERE workflow_id=$1 FOR UPDATE;
SELECT pid,xact_start,query_start,state,wait_event_type,wait_event,
       pg_blocking_pids(pid)
FROM pg_stat_activity
WHERE pid=ANY($1::int[]) AND wait_event_type='Lock';
COMMIT;

-- Fingerprints, repeated independently after cleanup for each table:
SELECT count(*),
       md5(coalesce(string_agg(to_jsonb(t)::text,'' ORDER BY id),''))
FROM public.stellar_support_cases t;
```

All actual parameter identifiers, returned workflow states, event rows, process/connection IDs, transaction IDs, and timestamps are preserved in the JSON.

## Defects and remaining limitations

No V5 database integrity defect was observed in these scenarios. No database function was changed. The staging harness and explicit opt-in acceptance mode were added to run these tests; earlier access-workflow error propagation and client-versus-pooler TLS diagnostic defects were corrected before this acceptance run.

This run did not re-execute the full prior 10-test V5 suite. Wrong-tenant, invalid-workflow, and incorrect-session negative tests are not newly claimed as passed here. The existing V5 function bodies and privileges were checked, and valid associations were verified in every recovery result.

Pending before production: durable dispatcher/receiver idempotency and delivery retries; crash after dispatcher send but before delivery acknowledgement; process death during completion commit; recovery under a real database/network outage; sustained contention/load and performance; actual long-running worker deployment/restart; fresh end-to-end security negatives and real-call acceptance. No live voice test or application deployment occurred.

The database credential previously disclosed in chat still requires rotation and corresponding GitHub secret update before production or broader access. Do not restore the disclosed value. No secret values appear in this report or the evidence.

## Recommendation

**GO for the next isolated staging milestone: design/review and acceptance of durable event dispatch with an approved test-only recipient or sink.** Preserve the approved Support Specialist unchanged. **NO-GO for production** until the pending delivery, deployed-worker, security, performance, real-call, and credential-remediation requirements are satisfied.

No production database changes, PR merge, Railway deployment, telephone-routing changes, real customer outreach, or approved voice/model/persona/greeting modifications were performed.
