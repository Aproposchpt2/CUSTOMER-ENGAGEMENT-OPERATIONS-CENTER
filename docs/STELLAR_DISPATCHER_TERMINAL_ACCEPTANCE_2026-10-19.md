# STELLAR UC — FINAL-ATTEMPT CRASH & INVALID-DELIVERY ACCEPTANCE

October 19, 2026 (PDT). **Overall: PASS, T01–T05. Production: NO-GO.**

## Verified execution

[Protected manual run #9](https://github.com/Aproposchpt2/ai4-contact-center/actions/runs/39347540424), job 118383670243: SUCCESS.
Workflow revision `a88213e9db76f5b8cd988604b7b7e45aaad45826`; actual pinned source `432422e3835c7f1a7ab701989ef430a5d0ab459f`.

Staging project `hvzauakkhlivzeqatfqm`; tenant `5885a020-d363-4c27-910a-c035eda132f5`.
Suite executed 2026-10-20T00:47:07.198Z–2026-10-20T00:47:53.084Z, **45.886 seconds** (October 19, 17:47:07–17:47:53 PDT).
Previously completed acceptance suites were not repeated. All 32 local dispatcher/adapter/guard tests passed before execution.

Artifact 12232124602; ZIP SHA-256 `4f4830bebcf845f59ccf1fb1d71f975fd9aea0f75f7f50a027321c1b419c58be`.
[Full SQL/process/HTTP evidence](./evidence/stellar-dispatcher-terminal-run9-2026-10-19.json).
[Independent cleanup and security query/response](./evidence/stellar-dispatcher-terminal-independent-2026-10-19.json).

## Actual results

| Test | Result | Evidence |
|---|---|---|
| T01 — worker crash on final claim | PASS | Four real HTTP 503 attempts persisted retries/backoff. Worker PID 2376 committed claim attempt 5, then was SIGKILLed at 00:47:30.446Z before send. After database-clock lease expiry, fresh process PID 2387 claimed no event; database transitioned event 99 to FAILED/attempts 5/ATTEMPTS_EXHAUSTED. Repeat worker IDLE. Zero receiver receipts/effects; no sixth attempt. |
| T02 — invalid session in returned claim | PASS | Controlled corruption of the returned claim's session left persisted workflow/case associations intact. Authoritative verification rejected it before HTTP transmission (sends=0). Event 102 QUARANTINED/AUTHORITATIVE_ASSOCIATION_INVALID; repeat IDLE; zero receipt/effect. |
| T03 — wrong case in real HTTP acknowledgement | PASS | Receiver committed one valid receipt/effect, then returned an incorrect case ID over HTTP. Dispatcher refused delivery confirmation: event 105 QUARANTINED/ACK_MISMATCH; repeat IDLE; existing effect not duplicated. |
| T04 — malformed JSON acknowledgement | PASS | Actual authenticated loopback request received malformed JSON, producing DELIVERY_UNCERTAIN/RETRY_PENDING and no receipt/effect. After durable retry time, normal receiver delivered original event 108 on attempt 2 with one receipt/effect. |
| T05 — forged durable success without database receipt | PASS | Actual HTTP response had exact event/case/key/hash and durable=true but performed no receipt transaction. Database acknowledgement rejected event 111 with DURABLE_RECEIPT_REQUIRED at 00:47:49.027Z. Corrected dispatcher persisted QUARANTINED/ACK_MISMATCH; repeat IDLE; zero receipt/effect. |

Table times are UTC on October 20, equivalent to October 19 PDT. Worker connection/transaction IDs and full observations are preserved in the JSON evidence.

All five workflows remained COMPLETED, version 3, with their original support case, staging tenant, intake session and business-operation ID, and exactly one completion event. A FAILED or QUARANTINED delivery did not invalidate or recreate the already-persisted ticket. No worker invoked ticket creation again.

## Defect corrected and validated

The isolated staging dispatcher previously forwarded database error DURABLE_RECEIPT_REQUIRED to its fail RPC. That code was not supported by the failure RPC, causing the error path itself to reject instead of recording quarantine.

A new local regression test first failed with that unsupported code. The staging core now maps DURABLE_RECEIPT_REQUIRED to its existing ACK_MISMATCH quarantine path. The regression and all 32 local dispatcher tests then passed. T05 verified the full corrected database/HTTP path, including the actual database rejection code and committed terminal state.

Changed files: `twilio-bridge/tests/staging-runner/dispatcher.staging.cjs` and `dispatcher.staging.test.cjs`; new test harness/guards and opt-in manual workflow. No database function, permission or schema change was needed. The module remains isolated from the approved voice bridge; no application was deployed. To undo the source correction, revert the isolated core/test commits a85bce4e90714cc05d09d3f19e0c77be9d1a641a and 1cbe040dbdc17428bd3ab8907d1ede47df36bd25 on the repair branch; this would restore the known error-handling defect and must not be promoted.

## Fixture identities

| Test | Workflow | Original persisted case | Event |
|---|---|---|---|
| T01 | d6e146b8-12dd-4e6d-b832-ceb75799185a | 05abcc38-ad61-4c4b-b055-84bbf73d940b | 99 |
| T02 | f96124bf-ce1a-4377-bcc7-557adcfa5696 | 94ebb373-e8b4-4180-b6b1-0da5f94d4350 | 102 |
| T03 | b1e9dcfd-c445-4869-be69-09c7079cd05a | 020cfbf0-6509-4695-a2ca-8dff857ccc09 | 105 |
| T04 | e3e655f8-8912-44f1-8342-b0bb9e034b38 | a99557e1-064f-47f5-9c40-45dd83e4ce3a | 108 |
| T05 | 5886ed74-4833-45f8-80e8-61850131c8be | c99915b1-3b30-47f1-8400-a683c35d241d | 111 |

## Cleanup and security

| Table | Baseline | Runner final | Independent final |
|---|---:|---:|---:|
| Support cases | 20 | 20 | 20 |
| Contacts | 13 | 13 | 13 |
| Workflows | 0 | 0 | 0 |
| Outbox events | 0 | 0 | 0 |
| Receipts | 0 | 0 | 0 |
| Synthetic effects | 0 | 0 | 0 |

All five fixture sets were deterministically removed. All six before/after/independent fingerprints match at 2026-10-20T00:48:30.37768+00:00.
Cases: `ddeb4729999cd8a90965ab2197b4355c`; contacts: `a67f355fc8bc1a3e258ab772b308c485`; empty tables: `d41d8cd98f00b204e9800998ecf8427e`. Sequences advanced and were not reset.

RLS is enabled on all six tables. ACLs, policies, original function/security snapshots and all five dispatcher function hashes/privileges remain unchanged. RPC workers used service_role; existing administrative access only coordinated authorized synthetic fixtures, observations and exact cleanup. TLS validation and staging tenant checks were preserved. Tokens are redacted and credentials absent from evidence.

No production writes/deployments, Railway changes, live telephone routing, customer outreach, real notifications, PR merge or approved Support Specialist changes occurred.

## Interpretation and next engineering gate

These are successful negative acceptance tests: terminal delivery failure and quarantine are the expected safe outcomes. T03 intentionally has a valid committed receiver effect but an untrusted response, so automatic resend is blocked. Operator reconciliation/promotion of quarantined records is not implemented or accepted here.

No additional runtime integrity defect was observed beyond the corrected unsupported-error mapping. T02 is a returned-message fault injection against real staging state; it is not a fabricated invalid persisted workflow fixture. No database security controls were bypassed.

**GO** for a staging integration design review: define the actual worker lifecycle, automatic ambiguous-outcome reconciliation, terminal/quarantine operator handling and a durable receiver/provider contract. The bounded database recovery and dispatcher fault suites are now evidenced; this does not establish the deployed product's end-to-end behavior.

Still unexecuted: external-provider idempotency and delivery, receiver database-COMMIT response loss, full database/infrastructure outage/failover, claim-RPC timeout, sustained concurrency/load and performance, security review, and separately authorized real-call/voice integration. Review existing credential-rotation and advisory follow-ups before production or wider access.

**Production remains NO-GO. PR #77 remains draft and unmerged. Approved Support Specialist unchanged.**
