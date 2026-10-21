# STELLAR UC — UNCERTAIN COMMIT & DATABASE CONNECTION-LOSS ACCEPTANCE

October 19, 2026 (PDT). **Overall: PASS for U01–U04. Production: NO-GO.**

## Execution

[Protected manual run #8](https://github.com/Aproposchpt2/ai4-contact-center/actions/runs/39345200998), job 118376010743: SUCCESS.
Workflow revision: `f26443b141fa3de27e16ebffcf6f2aa8801a0e15`.
Pinned source: `5b2ca183e2a0e66eccea59dfbee9d9728e3aa07c`.

Project `hvzauakkhlivzeqatfqm`; tenant `5885a020-d363-4c27-910a-c035eda132f5`.
Execution 2026-10-20T00:20:23.074Z–2026-10-20T00:20:37.652Z, **14.578 seconds** (October 19 17:20:23–17:20:37 PDT).
Prior recovery, dispatcher and contention suites were not repeated.

[Full redacted process/SQL evidence](./evidence/stellar-dispatcher-network-run8-2026-10-19.json).
[Independent cleanup/security query and response](./evidence/stellar-dispatcher-network-independent-2026-10-19.json).
Artifact 12231645987; ZIP SHA-256 `f714f72e933a514c2527f5e1e15797bfd1e630123c09cf8259a7d0b8ad46c10d`.

## Actual results

| Test | Result | Evidence |
|---|---|---|
| U01 — lost claim-COMMIT response | PASS | Worker PID 2380, backend 2647730, transaction 1819. COMMIT sent 00:20:24.175Z. Proxy discarded 40 encrypted downstream bytes; worker reported commitAcknowledged=false / UNKNOWN_TO_WORKER. Independent connection observed committed LEASED/attempt 1. Early reclaim returned NULL. After database-clock lease expiry, claim attempt 2 delivered original event 87 with one receipt/effect. |
| U02 — lost acknowledgement-COMMIT response | PASS | PID 2397, backend 2647730, transaction 1830. Receiver receipt/effect already committed. COMMIT sent 00:20:31.791Z; 40 encrypted response bytes discarded. Worker reported UNKNOWN_TO_WORKER; independent connection observed DELIVERED. Normal dispatcher repeat returned IDLE; case/event/receipt/effect unchanged. |
| U03 — actual database acknowledgement timeout | PASS | Backend 2647730, transaction 1838. Coordinator held the synthetic event row lock; service-role acknowledgement used statement_timeout 250 ms and returned SQLSTATE 57014 at 00:20:33.879Z. Failed transaction rolled back. Event stayed LEASED with its single committed receipt/effect; subsequent valid acknowledgement delivered event 93 without re-sending or creating a case. |
| U04 — connection lost before COMMIT | PASS | PID 2409, backend 2647730, transaction 1842. Real proxy connection dropped after claim RPC but before commit. Worker could not confirm commit. Independent connection verified rollback to PENDING/attempts 0. Fresh claim attempt 1 delivered original event 96 with one receipt/effect. |

All timestamps in the table are UTC on October 20, equivalent to October 19 PDT. Reuse of a pooled backend between sequential operations is expected; this run does not claim simultaneous database contention (separately verified in run #7).

The proxy was bound only to 127.0.0.1 and forwarded encrypted PostgreSQL traffic to the already-authorized staging pooler. It did not terminate TLS, decrypt, log credentials or change network permissions. TLS certificate/hostname verification stayed enabled; fault workers verified the actual remote TLS peer. This is real connection/response loss, not an injected exception replacing a database operation.

## Authoritative case verification

| Test | Workflow | Original case | Completion event |
|---|---|---|---|
| U01 | 701b4b01-d751-41a6-ac6c-d25f4f37b00f | c03bff7a-819d-4a2c-aa40-14ab1f2bc814 | 87 |
| U02 | f7da5dae-2237-4e17-b18e-e407819a5b44 | b38f930f-9c8f-4134-b857-a86c7788dbe6 | 90 |
| U03 | d9724588-c202-4b55-9dfa-abd4bcb2f809 | ded88bdf-4462-40dd-959b-eefd853ca3ee | 93 |
| U04 | e63daf6e-1a1a-4afc-b1d4-1f3d8cd37871 | f7d1d5e1-8a6e-46c7-b882-f96387486319 | 96 |

All workflows remained COMPLETED, version 3, with their original tenant, intake session, business-operation ID and case. Each had exactly one completion event and one transactional receiver receipt/effect after recovery. Ticket creation was confined to fixture setup; no uncertain operation blindly retried ticket creation.

## Cleanup and security

| Table | Fresh baseline | Runner final | Independent final |
|---|---:|---:|---:|
| Support cases | 20 | 20 | 20 |
| Contacts | 13 | 13 | 13 |
| Workflows | 0 | 0 | 0 |
| Outbox events | 0 | 0 | 0 |
| Receipts | 0 | 0 | 0 |
| Synthetic effects | 0 | 0 | 0 |

All four fixture sets removed. All six row fingerprints match before/after and independent readback at 2026-10-20T00:21:17.126072+00:00.
Cases: `ddeb4729999cd8a90965ab2197b4355c`; contacts: `a67f355fc8bc1a3e258ab772b308c485`; empty tables: `d41d8cd98f00b204e9800998ecf8427e`. Identity sequences advanced and were not reset.

RLS remains enabled on all six tables. Original security snapshots and all five dispatcher function hashes/privileges match. RPC worker transactions used service_role; existing postgres access only coordinated synthetic fixtures, row locks, observations and exact cleanup. No grants, schema, policies, authentication or tenant restrictions changed. Tokens were redacted from evidence; no credentials disclosed.

No production writes/deployments, Railway changes, phone routing, customer outreach, real notifications, PR merge or approved Support Specialist changes occurred.

## Findings, limits and recommendation

No duplicate case, completion event or transactional synthetic effect; no false delivery; no cleanup/security defect observed. No database/application correction was required.

Recovery was explicitly coordinated by this acceptance harness using independent authoritative database reads and existing claim/verify/ack RPCs. This does not prove that a deployed worker automatically classifies an ambiguous COMMIT, or that the voice application has integrated recovery. The general adapter currently surfaces a generic unavailable error on unknown transport failures; production orchestration must reconcile by stable event identity or conservatively wait/reclaim an expired lease, without treating an uncertain response as verified success. A narrow worker-facing outcome lookup may be appropriate during integration; it has not been added or authorized by this test.

U03 covers acknowledgement timeout, not a claim-RPC timeout or full database outage. An infrastructure-loss failover, receiver database-commit response loss, final-attempt crash, real quarantine/malformed-ack scenarios, external-provider idempotency, sustained load, security review and real-call integration remain separate unexecuted gates.

**GO** for the next isolated staging milestone: final-attempt crash and negative-delivery/quarantine acceptance, then review a durable external-provider delivery integration plan and automated ambiguous-outcome handling. No external notifications or voice deployment are authorized by this report.

**Production remains NO-GO. PR #77 remains draft/unmerged. Approved Support Specialist unchanged.**
