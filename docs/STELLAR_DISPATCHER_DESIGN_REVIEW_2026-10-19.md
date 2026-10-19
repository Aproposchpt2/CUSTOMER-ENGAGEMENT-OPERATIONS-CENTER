# STELLAR UC — DURABLE EVENT DISPATCHER DESIGN REVIEW

Date: October 19, 2026. Status: PROTOTYPE REVIEW COMPLETE; DATABASE ACCEPTANCE NOT EXECUTED.

## Scope and verified baseline

C1/R1 passed in GitHub run 39326526474. Independent cleanup verified 20 cases, 13 contacts, zero workflows/events, and unchanged row fingerprints/security. Those results remain separate from dispatcher acceptance.

Repository inspection found no durable outbox dispatcher. The earlier in-memory gateway uses a process-local Map and a deliveryPending flag; neither survives process loss. The database outbox has event_id, workflow/tenant/session/case linkage, delivered_at, attempts, next_attempt_at, and last_error, plus a pending-event index. It has no durable claim token, lease expiry, or receiver receipt. Current pending-event count: zero.

## Proposed delivery semantics

Delivery is at least once. Exactly-once customer notification is NOT promised. A receiver must durably deduplicate the stable event identity and apply its own business effect in the same transaction; external providers require their own idempotency support or reconciliation.

1. Claim one eligible COMPLETED event in a short database transaction using FOR UPDATE SKIP LOCKED. Scope to the approved staging tenant and an exact allowlist of this test run's workflow IDs. Never scan arbitrary customer records.
2. Atomically increment attempts, persist worker identity, a new random claim token, and a bounded lease. Return the claimed event after COMMIT. Network calls occur outside the database transaction.
3. Re-read the authoritative workflow and test-only case. Require COMPLETED state, exact case ID, tenant and original intake-session linkage. Invalid associations are quarantined without transmission.
4. Produce a fixed payload containing identifiers and event creation time only; no customer name, phone, email, issue text, credentials, or raw errors.
5. Send to an approved loopback-only test receiver using a stable idempotency key and canonical payload SHA-256. The prototype transport permits only http://127.0.0.1:<port>/test-event, rejects redirects and uses a bounded timeout and an ephemeral HMAC key. This HTTP transport must never be used for an external receiver.
6. Receiver transaction: insert receipt keyed by idempotency key, reject the same key with a different payload hash, and apply one test-only effect. Only after durable COMMIT return accepted/durable acknowledgement with exact event/case/key/hash correlation. A repeated matching delivery returns the original durable acknowledgement and creates no additional effect.
7. Dispatcher completion is a compare-and-set UPDATE requiring event ID, current claim token and unexpired lease. Update outbox delivery only; never rewrite ticket/workflow completion because notification delivery failed.
8. Persist safe failure code and bounded exponential retry. Stop after five claims; exhausted deliveries enter FAILED, suspicious associations/acknowledgements enter QUARANTINED. Terminal states require operator review. A stale worker cannot acknowledge, release or overwrite a newer claim.
9. If a worker dies after receiver COMMIT but before outbox acknowledgement, its lease expires; a fresh worker resends the same key/hash; receiver deduplication prevents a second effect.

## Prepared prototype and actual tests

Files in twilio-bridge/tests/staging-runner:

- dispatcher.staging.cjs — staging dispatcher core and loopback-only transport. Not imported by the voice bridge.
- dispatcher.staging.test.cjs — thirteen tests; all passed locally with node --test. These tests use injected store/transport doubles. They are NOT evidence of database durability, real concurrent dispatch, real network delivery or process-restart acceptance.

Passed: staging/scope guards; stable idempotency and no PII; loopback-only endpoint and redirect-rejection configuration; exact durable acknowledgement correlation; wrong tenant quarantine; wrong session rejection; mismatched acknowledgement rejection; timeout retry/redacted errors; retry exhaustion; expired lease rejection; stale-token fencing result; empty queue behavior; noncompletion-event rejection.

The database adapter and durable receiver remain unimplemented. The prototype expects the contracts below; a mocked durable=true acknowledgement does not prove persistence.

## Database adapter contract for review

claim({tenantId,workflowIds,workerId,leaseMs,now}) returns null or {token,event,attempt,leaseUntil}. The database clock must determine eligibility/expiry. Lease duration 5–30 seconds; receiver timeout at most 2 seconds. Attempts increment durably during claim, including recovery after a process crash. Reclaim expired leases with a NEW token.

verifyAssociation(claim) authoritatively reads workflow/case and returns {verified,tenantId,workflowId,sessionId,caseId}. Do not trust caller/model payloads as identity evidence.

complete({eventId,token,payloadSha256,now}) returns true only if the claim remains current and unexpired; records delivered_at and clears the lease in a short transaction. An uncertain COMMIT must be reconciled by event identity before any retry decision.

fail({eventId,token,code,nextAttemptAt,state,now}) applies the same token/expiry fencing and cannot change an already delivered record. It persists only enumerated safe error codes; no raw errors. Terminal states have no next retry, and claim queries must explicitly exclude them.

Use PostgreSQL clock_timestamp() for adapter decisions. The injected JavaScript clock is only a prototype test aid. Receiver payload hashing and claim fencing must not depend on unstable worker timestamps or claim tokens.

## Proposed schema delta — NOT APPLIED

Add delivery_state (PENDING/LEASED/DELIVERED/FAILED/QUARANTINED), claim_token, claim_owner, lease_until, and payload_sha256 to the staging outbox. Ensure DELIVERED agrees with delivered_at, lease fields are all present only for LEASED rows, and hashes are valid SHA-256 values. Revise pending indexes to distinguish due retries and expired leases.

Add staging-only receiver receipt and test-effect tables with unique idempotency keys and payload hashes. They must have RLS enabled and no anon/authenticated/public access. Receipt and effect writes must share a transaction. Synthetic cleanup must remove test effects before receipts, then existing outbox/workflow/case/contact fixtures, guarded by exact run identifiers.

No schema migration, role, grant, policy or RPC was applied or broadened. An executable migration must be generated with Supabase migration tooling after approval; do not reapply V5.

Before a credentialed dispatcher acceptance run, agree the adapter's privilege model. Existing service_role has no direct SELECT/UPDATE privileges on the orchestration tables. Do not resolve that by broadening its table grants. Proposed dedicated claim/verify/ack/fail RPCs must be reviewed for narrow access, tenant/session validation, fixed search_path and explicit EXECUTE revocations; any new execution privileges require separate approval. The privileged staging fixture coordinator is not a production worker architecture.

## Required staging acceptance cases — ALL PENDING

| ID | Actual scenario and acceptance condition |
|---|---|
| D01 | Persisted COMPLETED event delivered once to durable local sink; exact case/tenant/session; one receipt and one effect. |
| D02 | Two actual dispatcher processes contend; one valid claim; no duplicate receiver effect. |
| D03 | Kill worker after durable claim and before send; lease expires; fresh process recovers committed state. |
| D04 | Kill worker after receiver COMMIT but before outbox acknowledgement; resend same identity; one durable receipt/effect. |
| D05 | Restart receiver process; its persisted receipts survive; duplicate delivery still produces one effect. |
| D06 | Actual receiver timeout, dropped response and non-2xx failure; durable attempts/backoff; ticket/workflow remain COMPLETED. |
| D07 | Exhaust retries; terminal failure persists and cannot be automatically reclaimed. |
| D08 | Expired worker supplies old claim token after another worker reclaims; acknowledgement/failure rejected. |
| D09 | Wrong tenant, session, case, workflow and conflicting payload hash rejected without dispatch or false delivery. |
| D10 | Completed delivery repeated after worker restart is a no-op; no additional case, completion event or receiver effect. |
| D11 | Capture counts/fingerprints/ACLs/policies before and after; deterministic cleanup independently verified; no real outreach. |

PASS requires actual database/process/receiver persistence evidence. Unit tests alone are insufficient. A test sink in a temporary runner directory proves only bounded worker/receiver restart durability within that runtime; it does not prove survival of infrastructure loss.

## Recommendation and owner review boundary

GO for review of the schema/adapter proposal. NO-GO for dispatcher database acceptance until the schema and restricted privilege model are approved and implemented. Production remains NO-GO. Rotate the database password disclosed earlier and update the protected GitHub secret before production or wider access.

The owner directive states: “If new elevated permissions, persistent fixtures outside approved mechanisms, or additional infrastructure changes are required, request separate authorization before proceeding.” The existing acceptance mechanism can create/reconcile/clean up ticket fixtures; it does not grant a dispatcher permission to claim or acknowledge outbox rows. Do not silently expand that mechanism.

No application deployment, Railway changes, PR #77 merge, real customer notification, or change to the approved Support Specialist's voice/model/greeting/persona/instructions is included.
