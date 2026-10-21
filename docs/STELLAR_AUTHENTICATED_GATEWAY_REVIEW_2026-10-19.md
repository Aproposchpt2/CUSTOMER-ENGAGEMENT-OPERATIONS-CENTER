# STELLAR UC — AUTHENTICATED STAGING GATEWAY IMPLEMENTATION REVIEW

October 19, 2026 (America/Los_Angeles).

**Local gateway contract suite: PASS, 25/25. Live authenticated gateway acceptance: NOT EXECUTED. Production: NO-GO.**

## Completed work and exact boundary

Prepared the isolated gateway and its contract tests under `twilio-bridge/tests/staging-runner`:
- `authenticated-support-gateway.staging.cjs`
- `authenticated-support-gateway.staging.test.cjs`

Source commit: `bf9c8acaa31004373aa9c6e56504d60516e86edb`.
Tests commit: `f6757f6611bb198da1b46e8dfb5f3f848191b5fd`.

The module exports a WHATWG Request → Response handler. It does not start a listener, register a Next.js route, deploy an application, run a worker service, or import/change the approved voice bridge. The existing headless orchestration service is reused unchanged.

No live Auth session, user credential, privileged fixture or staging ticket RPC was used for these local tests. They use fictional users/keys and an injected Supabase HTTP-response double with an in-memory workflow model. This is test-design and implementation evidence, not new real PostgreSQL concurrency/restart or real Supabase authentication evidence. Run #10's previously verified headless database acceptance remains separate.

## Source and database discovery

Reviewed current repair-branch copies of:
- `lib/ai4ccServer.ts`: authenticated user lookup and membership resolution.
- Existing experimental support intake, voice-session and readiness routes.
- The accepted headless service and existing staging intake adapter.

Existing browser readiness restricts active OWNER/ADMIN membership. The new module likewise allows only an authenticated non-anonymous OWNER or ADMIN in tenant `5885a020-d363-4c27-910a-c035eda132f5`.

Read-only SQL on staging `hvzauakkhlivzeqatfqm` at **2026-10-20T02:04:04.235971Z** verified `tenant_users` RLS enabled, authenticated SELECT already permitted, and the existing SELECT policy `private.is_tenant_member(tenant_id)`. Existing admin INSERT/UPDATE/DELETE policies were inspected without alteration. No membership identities, credential values or customer records were fetched.

Actual query/results: [membership review evidence](evidence/stellar-gateway-membership-review-2026-10-19.json). This confirms configuration compatibility, not that a real user's membership request succeeded.

## Gateway contract

The proposed endpoint prefix is `/api/staging-orchestration/`. No such route was deployed or registered by this work.

| Action | Accepted input | Behavior |
|---|---|---|
| POST begin | confirmed=true, nine-field fictional intake | Verify user remotely and active approved-tenant admin membership; validate intake; issue a signed 15-minute operation capability. No database ticket/workflow write. |
| POST submit | operationToken, confirmed=true, same intake | Verify user and membership again; verify signed subject/tenant/original session/expiry/intake digest; call accepted integration service. Only database-verified success returns case/customer UUIDs. |
| POST status | operationToken | Reauthorize and recover the original operation. No new ticket-creation call. UNKNOWN/ACCEPTED/RUNNING returns 202 without a ticket ID; FAILED returns 409; verified COMPLETED returns 200. |

Controls implemented:
1. Exact staging Supabase URL/tenant. Exact private Netlify HTTPS origin; no permissive CORS, wildcard origin, query-string token or forwarded-host trust.
2. Three kill switches must all be true: STELLAR_BRIDGE_STAGING, STAGING_ORCHESTRATION_GATEWAY_ENABLED, STAGING_SUPPORT_WRITES_ENABLED.
3. Online `/auth/v1/user` validation; no local unverified JWT decoding for user authorization and no use of user_metadata for roles.
4. Membership SELECT uses the publishable key and the user's bearer, preserving RLS. The server-only service key is used only for five whitelisted existing staging RPCs after authorization.
5. Server-generated operation ID and synthetic original session/call ID; the request cannot supply tenant, session, operation, workflow, case or trusted authorization flags.
6. Signed capabilities bind the verified user, approved tenant, exact original operation/session, audience, version, expiry and a keyed digest of the normalized confirmed intake. A capability from a different user, changed intake, tampered signature or expired capability is rejected before ticket RPC.
7. Capability signing derives a domain-separated HMAC key from the existing server service-role credential. No credential or intake contents appear in the capability; the capability does contain the user UUID and operation metadata and must be treated as private. It is signed, not encrypted. Database-key rotation invalidates outstanding capabilities. A dedicated signing-key lifecycle is a follow-up before wider access; none was provisioned.
8. Strict 16-KiB body limit, bounded five-second request budget (10-second hard configuration ceiling), request-abort propagation, no HTTP redirect following, no API retry, default TLS verification; explicit TLS-disable configuration is rejected.
9. Per-instance overlapping submits coalesce; database compare-and-swap/idempotency remain authoritative between instances. Invalid duplicate intake is validated before coalescing.
10. Success response fields are whitelisted, original-session verified, no-store, and explicitly notificationSent=false/technicianFollowupConfirmed=false. Raw upstream errors, keys and operation tokens are not logged or echoed in errors.
11. Uncertain writes return UNKNOWN/202 without invented ticket numbers; later status recovery uses the same capability. No new operation or ticket retry is manufactured automatically.

## Configuration prepared, not changed

Use existing server-side names `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY`, plus existing `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` and approved `CSS_TENANT_ID`. The new gateway enable flag defaults to disabled because the handler requires the literal value true. No environment variable was added, read from another platform, or changed during this task.

STAGING_DATABASE_URL is not required by this HTTP gateway. It remains a private PostgreSQL runner credential and must never be replaced by SUPABASE_URL. The gateway makes no direct PostgreSQL connection.

## Actual local validation

Command:
```sh
node --check authenticated-support-gateway.staging.cjs
node --test --test-reporter=tap authenticated-support-gateway.staging.test.cjs
```

**25 tests passed; 0 failed; 0 skipped.** No new package installation/dependency was needed. Exact output: [local TAP evidence](evidence/stellar-gateway-local-tests-2026-10-19.tap).

Coverage includes feature/target/TLS guards; method/origin/path; remote-auth and membership request contract; missing/invalid/anonymous login; metadata escalation; revoked/inactive membership; capability subject/tamper/expiry; body identity spoofing; confirmation and input validation; changed confirmed intake; body bounds; safe success shape; duplicate/status reuse; overlapping requests; invalid duplicate validation; new gateway instance recovery; credential-rotation rejection; lost completion return; uncertain case failure; interrupted ACCEPTED state; wrong canonical session; deadline; request disconnect.

The restart test creates a new gateway object; it is **not a new OS worker-process acceptance test**. Its fake upstream preserves in-memory state. The overlap test uses controlled asynchronous requests against one instance and an in-memory double; it is **not a new simultaneous database-connection test**. Timings in TAP are local test timings, not voice/API production latency or cost.

During review, tightened duplicate-input validation before coalescing, blocked upstream dispatch after deadline, propagated request cancellation, and bound capability to the confirmed intake. These changes are included in the final 25-test result. No production defect or deployed repair is claimed.

## Remaining risks and live acceptance proposal

| Gate | Current status / required evidence |
|---|---|
| Live authenticated Supabase gateway | NOT EXECUTED. Need a separately approved protected route mounting and the owner's existing private sign-in; no tokens pasted into chat. Verify real remote getUser, user-scoped RLS membership and denial with invalid/expired sessions. |
| Committed gateway database writes | NOT EXECUTED. Use manifest-scoped synthetic fixtures and deterministic cleanup on the existing authorized staging project. Capture baseline/final hashes and exact case/operation linkage. |
| Cross-instance first-submit race | NOT EXECUTED through this gateway. Exercise two real gateway processes against staging; prior reconciliation concurrency coverage does not prove this first-submit path. |
| Crash before ticket creation | Local contract remains ACCEPTED/UNKNOWN without resubmission. A supervised, authorized first-start policy is still needed; absence of a case is not permission to retry an uncertain write. |
| Capability expiry/loss and key rotation | Fail closed at 15 minutes or after key rotation. No persistent user-to-operation registry or renewal endpoint exists. Manual authorized recovery design is required; clients must never issue a fresh begin merely because an existing write is uncertain. |
| Abuse/operational controls | Distributed rate/concurrency limits, audit-event redaction, session-revocation policy and real response-size/timeout behavior remain to be accepted before wider exposure. The current admin-only scope is not customer-facing authorization. |
| Real voice transport identity | Synthetic phone-staging:CA... IDs are gateway test identities, not proof of a real Twilio call. Future voice wiring must resolve verified transport/session identity without changing the approved agent. |
| Voice and delivery | No real-call, notification-provider or deployed dispatcher integration was performed. Existing agent, models, greeting, persona and instructions remain untouched. |

Proposed next live test set, after a reviewed protected route is mounted in the existing private staging environment:
- G01: owner/admin sign-in → begin → submit → exact authoritative staging case, one completion event.
- G02: same capability from another user/foreign or inactive membership rejected; zero ticket/workflow mutation.
- G03: tampered/expired token, forged identities and changed intake rejected.
- G04: duplicate/reconnect and two-process first-submit overlap preserve the original workflow/case and one completion event.
- G05: controlled uncertain write/disconnect and fresh-process status recovery; no ticket resubmission.
- G06: missing case, invalid canonical association and absent operation never return a ticket as successful.
- G07: exact fixture cleanup and independent before/after counts/fingerprints/security checks.

No new database grants, migration, fixture mechanism or infrastructure is proposed for G01–G07. The route must remain behind existing Netlify team SSO and application login, with the gateway kill switch and an immediate rollback to the previous protected deploy. No customer notification endpoint is permitted. Actual route code/build, protection verification and pinned preview commit must be reviewed before requesting deployment approval.

## Decision

**GO for review and preparation of the protected staging route adapter and live G01–G07 acceptance harness. NOT YET ACCEPTED for deployment or real authenticated traffic.**

Do not infer deployed gateway readiness from the local PASS. PR #77 remains unmerged; no main-branch source change, Railway/Netlify deployment, production mutation, routing change, notification or approved-agent modification occurred. Production remains NO-GO. The live running Drive document is updated separately with these same boundaries.
