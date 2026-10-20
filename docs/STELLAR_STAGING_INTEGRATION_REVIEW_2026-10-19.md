# STELLAR UC — STAGING INTEGRATION REVIEW & IMPLEMENTATION PLAN

October 19, 2026 (PDT). **Review complete. GO for the scoped headless integration milestone below; NO-GO for voice deployment or production.**

## What is verified and what remains disconnected

Protected runs #5–#9 established bounded recovery, concurrent reconciliation, durable local delivery, process restart, SQL claim/reclaim contention, lease fencing, uncertain COMMIT behavior, database timeout/connection loss, final-attempt crash and invalid-delivery rejection. See the linked acceptance reports; no completed suite was rerun during this review.

Source review at repair branch after run #9 found:

| Component | Actual current behavior | Integration consequence |
|---|---|---|
| twilio-bridge/server.js | Imports staging-support-intake.cjs; submit_support_intake directly calls submitStagingSupport(args, callSid) in staging. No import/call of either orchestrator gateway or test dispatcher. | Current voice success is not proof that PR #77 orchestration runs. Preserve this approved path during headless integration. |
| staging-support-intake.cjs | Calls the staging intake RPC; derives intake session as phone-staging:<callSid>; returns validated customer/case UUIDs. | A new callSid creates a new session identity. Do not use the reconnecting call's session for a prior business operation. |
| orchestrator-durable.staging.cjs | Exposes accept/process with injected RPC, executeTicket and verifyTicket dependencies; not wired into server.js. Existing duplicate acceptance never executes another ticket write. | Needs real staging dependencies, canonical original context and supervised recovery; existing unit tests use doubles. |
| stellar_orch_accept_staging | Unique tenant/tool_call_id business-operation deduplication; returns workflow ID/state/deduplicated, but not original session or original case. | Duplicate acceptance can identify a workflow across reconnects but does not supply canonical original identity to a new worker. |
| stellar_create_phone_support_test_intake | Actual definition verifies service_role and fixed staging tenant, serializes tenant test writes, finds an existing test case by tenant+intake_session_id, then creates contact/case if absent. No business-operation parameter. | Case-level idempotency is session-bound. Cross-session operation acceptance alone does not establish case-level reconnect safety. |
| V5 transition/reconcile | COMPLETED requires a real test-only case with workflow's exact tenant/original session. Recovery reuses that persisted case. | Preserve these checks. An absent/ambiguous case remains UNKNOWN and must not trigger blind resubmission. |
| Dispatcher core/adapter | Staging-only, fixture-scoped modules in tests/staging-runner; receiver is authenticated loopback with committed synthetic effects. | Not a deployed worker service or actual notification provider. No external customer delivery has been accepted. |

These observations are source/definition review, not a fresh deployed runtime audit. The staging intake and accept function definitions were read from staging; no database mutation or deployment occurred.

## Required corrections before wiring

1. Canonical identity: tenant, business-operation ID and original session must come from trusted authenticated application context and persisted workflow, never model arguments. On reconnect, bind to the existing workflow's original session; do not manufacture another operation/session merely because the transport changed. Authentication must authorize access to that operation before the lookup is called.
2. Concrete intake adapter: translate the canonical original phone-staging:CA... session into the existing staging intake RPC's parameters. Validate original session format and input fields. Do not call the current helper with the new transport's callSid for a recovered operation. A genuinely new support request needs its own trusted operation, not automatic reuse of an existing ticket.
3. Verification contract: the durable gateway's JavaScript verifier checks tenant/workflow/operation but does not currently require sessionId, customerId or testOnly. V5 still prevents invalid database completion. Add explicit original-session/test-only verification and a verified customerId contract before mapping to the existing voice tool success shape. Keep database checks authoritative.
4. Unknown outcomes: process currently catches execution/verification/completion errors and attempts RUNNING→UNKNOWN/FAILED. If completion actually committed but its response was lost, that fallback can conflict and throw. Reconcile the existing workflow first; report verified COMPLETED only when V5 returns the actual case; otherwise return UNKNOWN safely. Never resubmit ticket creation after an uncertain write.
5. Recovery lifecycle: accepted/running/unknown operations require a supervised worker or explicit recovery job. Never process a deduplicated acceptance through the new-write path. ACCEPTED may have no ticket write; recovery must distinguish a safe first start from uncertain RUNNING state. Existing V5 reconciliation does not create missing cases.
6. Terminal delivery: FAILED/QUARANTINED is operator work, not an automatic retry bypass. Wrong response after receiver COMMIT can leave one real effect with outbox quarantined (run #9 T03); reconcile stable identity and receipt before any controlled release. No release/reset RPC is proposed for this first milestone.
7. Notification boundary: verified ticket creation is independent of delivery status. Ticket success must not imply message delivery or technician follow-up. Preserve existing agent instructions and result fields that keep outreach disabled.
8. Privileges/runtime: the harness's administrative fixture coordinator is not a production worker permission model. Workers use existing scoped RPCs and service-role access only; no direct orchestration table writes/reads may be added as a shortcut.

## One proposed new access surface — review before implementation

Propose a read-only, staging-only RPC:
stellar_orch_lookup_staging(p_tenant_id uuid, p_operation_id text).

It would require the exact approved tenant, resolve the unique trusted business operation, and return only canonical workflow ID, original intake session, workflow state and authoritative case verification/customer ID when applicable. No contact name, telephone, email, issue text, tokens, unrelated tenant rows or unrestricted workflow lists. For a COMPLETED row, independently validate exact case/tenant/session/test-only association before marking any returned case verified; invalid association fails closed. A missing operation returns an explicit not-found result with no write.

Implementation contract: fixed/empty search_path, fully qualified objects, SECURITY DEFINER only if required by existing denied table access, exact tenant/input checks, explicit PUBLIC/anon/authenticated EXECUTE revocation and narrowly scoped service_role EXECUTE. Existing table grants/RLS remain unchanged. Resolve operation ownership at the authenticated gateway; knowledge of an operation identifier is not authorization.

This is a proposal, not an installed function or granted permission. It adds a new executable privileged database surface. The owner's directive requires separate approval for new elevated permissions. Approval is needed before creating/granting this RPC; no such change was made during review. Alternatively, the architect can identify an existing reviewed RPC that returns the same canonical binding and verification without broader access. Do not broaden table grants to avoid this review.

## Next finite milestone: headless orchestration integration

Use the existing protected GitHub staging runner, approved tenant, synthetic data and deterministic cleanup. No Railway hosting or voice application change is needed.

Implementation files should remain under isolated staging modules/tests. Keep server.js, approved prompts, greeting, voice and models untouched. Proposed integration API:
- accept trusted confirmed intake and canonical operation identity;
- first-write path invokes existing intake once with the original session;
- duplicate/reconnect path loads canonical identity and reconciles only;
- status returns the verified original case/customer result or explicit pending/unknown;
- completion produces one outbox event; dispatcher delivers only to the existing local durable receiver.

Acceptance gate:

| ID | Required actual staging evidence |
|---|---|
| I01 | Confirmed synthetic request → durable acceptance → RUNNING → exactly one case/customer linkage → V5 COMPLETED → one outbox completion → one local receipt/effect. |
| I02 | Same operation reconnects under a distinct synthetic transport session; resolves original workflow/session/case; ticket creation call count remains one. |
| I03 | Worker/process loss after ticket COMMIT but before workflow completion; fresh process uses canonical lookup and V5 recovery; no repeated intake write. |
| I04 | Lost completion response: independent canonical outcome lookup recovers verified completion without invalid fallback transitions or fabricated success. |
| I05 | Missing case or uncertain write returns UNKNOWN with no success ticket; no automatic new-write retry; wrong tenant/session/operation rejected. |
| I06 | Receiver failure leaves verified ticket COMPLETED while delivery is pending/terminal; tool result cannot assert notification or technician follow-up. |
| I07 | Exact before/after counts/fingerprints, unchanged privileges/RLS except separately approved lookup definition/EXECUTE, all fixture cleanup independently confirmed. |

Pass requires real database and process evidence, not only injected tests. Extend existing evidence/reporting rather than repeating all previous tests. Stop on a security/authorization control failure. Apply a migration only after approval, through reviewed staging tooling, then verify exact definitions, privileges and advisors.

## Following milestones and boundaries

After headless I01–I07 passes, prepare a separate protected voice-integration proposal with model/voice/persona fingerprints preserved and a rollback switch. Any Railway deployment or voice bridge wiring needs explicit authorization because current directives prohibit it. Then execute separately authorized real calls, load/performance and security acceptance.

Actual external-provider delivery needs a selected authorized test recipient, reviewed provider idempotency/reconciliation behavior, credential scope, durable receipt semantics and explicit outreach authorization. None is implied by passing the loopback receiver tests. No paid infrastructure should be provisioned.

Credential rotation and previously recorded security advisories remain production follow-ups. No production launch or PR merge is authorized.

## Decision

**GO for review/approval of the canonical lookup and headless integration implementation. NO-GO for deploying PR #77, production, Railway, real notifications or changing the approved Support Specialist.**

No new database functions, grants, schema, fixtures or application deployment were created during this review. The immediate owner decision is narrowly scoped approval of the lookup RPC contract above (or selection of an equivalent existing reviewed mechanism); implementation and I01–I07 can then proceed in staging without touching the voice agent.
