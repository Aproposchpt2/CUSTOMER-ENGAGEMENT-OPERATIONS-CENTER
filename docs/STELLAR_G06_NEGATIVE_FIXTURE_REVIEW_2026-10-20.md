# STELLAR INTELLIGENT TECHNOLOGIES — G06 negative-fixture procedure for review
Operated by Apropos Group LLC

October 20,2026. DESIGN/REVIEW ONLY. No fixture executed by this document. Production NO-GO. PR77 remains draft/unmerged.

## Objective and existing evidence
Verify the protected PR77 HTTP status route never confirms a COMPLETED workflow whose stored case belongs to a different original intake session. Run14 already passed G02/G04/G05; do not repeat them. G06 remains unexecuted.

Repository Aproposchpt2/ai4-contact-center; branch feature/staging-orchestrator-trigger-gateway. Only Supabase project hvzauakkhlivzeqatfqm,tenant5885a020-d363-4c27-910a-c035eda132f5. Protected preview https://deploy-preview-77--stellaruc-private-voice-poc.netlify.app, deployed application commitec9f9a0edf3cf9f73a72dd193641b21d33abe7c4 last verified. Reverify deploy commit/protection before execution.

Read-only current database inspection confirmed:
- stellar_orch_lookup_staging(uuid,text) checks completed case tenant,original session,test_only and linked test-only contact; it raises COMPLETED_ASSOCIATION_INVALID on mismatch.
- Workflow table has a COMPLETED⇒non-null case check but no tenant/session/case association constraint. No noninternal INSERT triggers exist on this table.
- A rollback-only invalid row cannot be observed through another HTTP connection.
- Existing administrative testing role can construct a narrowly scoped row without new grants or disabling controls; execution requires the separate committed-negative-fixture authorization already specified in the remaining acceptance design.

## Exact proposed fixture
Use the existing protected browser test page and the owner's existing staging login. No new Auth account or owner membership change is needed.
1. Choose unique UUID-based G06 labels and fictional @example.invalid intake. Use Prepare only, never Submit, to issue one original signed capability. Keep capability and bearer in browser memory only.
2. Capture only the capability's nonsecret operation ID,original session/call ID,expiry and confirmed fictional intake manifest. Do not export the signed token,JWT,cookies,keys or password.
3. Generate a DIFFERENT synthetic phone-staging:CA session for the persisted fictional case.
4. In one existing-admin staging transaction, invoke the approved test-only case creation RPC exactly once for that different session; verify its returned case/contact are new,test-only,tenant-scoped and notifications-disabled.
5. Insert exactly one workflow directly as COMPLETED,using the browser capability's ORIGINAL tenant/session/call/operation and the new case ID from the DIFFERENT session. Generate workflow UUID before any write and persist the sanitized cleanup manifest first.
6. Insert NO orchestration event. Do not call accept,transition,dispatcher,notification or delivery RPCs. There is no completion event for a dispatcher to claim.
7. Assert exact fixture counts and zero outbox/receipt/effect records before COMMIT. Retain exact IDs and commit timestamp.

This intentionally commits one invalid association solely in the authorized staging test. It does not repair or mutate existing records. It does not authorize broad INSERT access for service_role,authenticated or anon.

## SQL preparation and guards
All dynamic values must be bound pg parameters or validated typed UUID/string values; no concatenated untrusted SQL. These are review templates, not execution evidence.

Read-only baseline: six-table counts/whole-row fingerprints; original Auth/membership fingerprint if browser login changes sessions,record expected login effects separately; RLS/policies/ACLs/function body hashes. Record current_user; require existing authorized postgres testing role,correct staging target and verified client TLS. Do not change role grants.

Transaction case creation,using approved RPC:
```sql
BEGIN;
SET LOCAL ROLE service_role;
SELECT * FROM public.stellar_create_phone_support_test_intake(
 $1::uuid,$2::text,$3::text,$4::text,$5::text,$6::text,
 $7::date,$8::text,$9::text,$10::text,$11::text
);
RESET ROLE;
```
$1=fixed approved tenant;$2=DIFFERENT case session;$3..$11=validated fictional intake. Require exactly one result,created_new=true,valid case/customer UUIDs. Inspect real RPC signature before binding; the date cast must match its current signature. Query exact case/contact metadata before progressing. No retry after an uncertain write/COMMIT.

Existing-admin INSERT:
```sql
INSERT INTO public.stellar_orchestrator_workflows_staging
(workflow_id,tenant_id,session_id,call_id,tool_call_id,workflow_type,state,case_id,version)
VALUES($1::uuid,$2::uuid,$3::text,$4::text,$5::text,
 'support_ticket_creation','COMPLETED',$6::uuid,1);
```
Bind pre-generated workflow UUID,fixed tenant,ORIGINAL capability session/call/operation,new wrong-session case UUID. Assert inserted row count1 and original operation did not previously exist.

Before COMMIT,verify:
- Exactly one fixture workflow with exact tenant,session,operation,case,state/version.
- Exactly one new fixture case at the DIFFERENT session; zero cases under ORIGINAL session.
- Case/contact tenant and test-only/notifications-disabled metadata match manifest.
- Zero events by fixture workflow ID; zero dispatcher receipts/effects for any such event.
- Existing application records unchanged excluding these exact fixture IDs.
Then COMMIT once; independently inspect from a fresh connection. On any blocked control,ROLLBACK where possible and report BLOCKED. No disabling constraints/RLS/triggers/authentication.

## Actual HTTP test
Within the unchanged900-second capability expiry, use the existing protected browser status/recovery action. Existing Netlify SSO and application authentication must remain in force. No deployment or new public endpoint.
- Invoke STATUS only through /api/staging-orchestration/status with original signed capability held in browser.
- Expected current behavior: HTTP202,success=false,state=UNKNOWN,no caseId/customerId/ticket number,notificationSent=false,technicianFollowupConfirmed=false. No raw SQL error or unrelated record disclosure.
- Confirm real upstream lookup rejected COMPLETED_ASSOCIATION_INVALID using an independently scoped read-only/savepoint SQL call if needed. Do not invent a visible error code if gateway intentionally returns sanitized UNKNOWN.
- Repeat STATUS once with the SAME original capability. No Submit or ticket retry.
- Independently verify workflow/case/contact row fingerprints unchanged from committed fixture; zero new cases/events/receipts/effects.
- Record timestamps,exact route/HTTPresponse,sanitized workflow/case/operation/session IDs and per-fixture counts. A mocked request adapter does not close this HTTP gate.

## Deterministic cleanup
A generic cleanup routine that assumes the case shares the workflow session is unsuitable for this deliberately mismatched fixture. Use a separately reviewed exact-ID cleanup transaction.
1. Ensure browser requests finished and no worker/RPC is uncertain. Stop on any ambiguous mutation or unexpected delivery.
2. Recheck exact workflow ID,approved tenant,original session/call/operation,COMPLETED state,wrong-session case ID and unchanged version.
3. Recheck exact new case ID,DIFFERENT session,test_only=true,approved tenant,exact synthetic contact and email; contact metadata test_only=true,notifications_disabled=true.
4. Require zero events/receipts/effects for this workflow and no other workflow or case references to its synthetic case/contact.
5. DELETE exact workflow with all manifest predicates; require1row.
6. DELETE exact synthetic case with tenant/different-session/test_only/contact predicates; require1row.
7. DELETE exact synthetic contact with tenant/email/test-only/notifications-disabled predicates; require1row.
8. COMMIT once. Independently verify the six-table original counts/fingerprints and security snapshot. No Authuser/membership cleanup necessary because none are created. Discard browser capability by reloading after evidence is saved.
No broad prefix deletes,no cascade assumptions,no removal of security audit records.

## Acceptance, rollback and authorization boundary
PASS requires actual protected HTTP results,no verified wrong ticket,unchanged fixture records,zero new ticket/event writes and independently verified cleanup. Any mismatched count or security/authorization block is FAIL/BLOCKED; no production progression.

Before fixture COMMIT,rollback removes all synthetic state. After COMMIT,use only exact reviewed cleanup above. If browser/capability expires,do not claim HTTP PASS; clean up deterministically and report unexecuted. Do not leave invalid rows unintentionally.

OWNER APPROVAL REQUESTED: create and remove exactly one new fictional staging case/contact and exactly one deliberately invalid COMPLETED workflow with a DIFFERENT-session association,without outbox events; use existing admin testing role and existing protected browser login; execute the described STATUS checks and independent cleanup. No grants,permanent elevated functions,global security changes,customer outreach,production writes,PRmerge,Railway deployment or approved-agent changes.

Current blockers: no usable local execution environment for runnable harness verification or detailed run14 artifact unpacking; protected browser connectivity/deploy identity still need fresh verification. This document is a concrete review procedure,not a claim that code was built or G06 executed. Full run14 artifact12280931998 expiresOctober27 and still needs durable detailed archive/review when execution access returns.
