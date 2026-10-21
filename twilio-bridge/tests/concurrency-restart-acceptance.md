# STELLAR UC — Staging Concurrency & Restart Acceptance Gate

Status: **NOT YET EXECUTED**. This is the test specification, not evidence of a pass.

## Preconditions
- Confirm staging project `hvzauakkhlivzeqatfqm`; never point test credentials at production.
- PR #77 stays draft/unmerged. Do not modify Railway, phone routing, or the approved voice agent.
- Record pre-test counts and fingerprints. Use only approved synthetic fixtures; no privilege escalation.
- V5 association-integrity RPC definitions must match the deployed SQL.

## Test C1 — Concurrent reconciliation (real database)
1. Establish exactly one test-only persisted case matched to a RUNNING workflow, through an approved fixture mechanism.
2. Open TWO INDEPENDENT database connections, each with a separate transaction.
3. Gate both workers at a barrier, then invoke `stellar_orch_reconcile_case_staging(workflow_id)` concurrently.
4. Record both responses, transaction timing, workflow version and case ID.
5. Assert workflow COMPLETED with the authoritative case and **exactly one** COMPLETED event; no duplicate case.
6. Repeat with an UNKNOWN workflow that has no case; assert zero COMPLETED events.
7. Test lock contention/timeouts and worker cancellation. Clean up and verify baseline counts.

## Test R1 — Committed process-restart recovery (real worker)
1. Establish a committed, authorized workflow in RUNNING state and a matching preexisting test-only support case.
2. Terminate worker process A while workflow remains committed. Do not call ticket creation again.
3. Start a distinct worker process B with a fresh process and DB client.
4. B must read the existing workflow, use the original tenant/session, reconcile authoritative persisted case, and emit a single COMPLETED event.
5. Repeat B's reconciliation; it must not emit another completion event.
6. Verify case ID and original operation identity. Log worker PID, timestamps, DB transaction IDs and outbox evidence.
7. Separately test absent-case RUNNING -> UNKNOWN without a blind retry.

## Required security and reporting
- No permanent fixture changes, expanded grants, bypassed RLS, customer notifications or production access.
- Capture both database connections and real worker process lifecycle; mocks or sequential statements alone are insufficient.
- Mark each test PASS/FAIL/BLOCKED. Compare baseline and final counts/fingerprints.
- No declaration of concurrency or restart acceptance without execution evidence.

## Open architecture issue
The existing durable gateway adapter is not yet an executable restartable worker; implementing and safely provisioning a controlled test worker is part of the R1 prerequisite. Outbox dispatcher delivery and receiver deduplication are separate gates.
