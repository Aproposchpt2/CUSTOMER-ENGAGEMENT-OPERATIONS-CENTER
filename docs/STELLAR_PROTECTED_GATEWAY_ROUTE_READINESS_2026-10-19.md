# STELLAR INTELLIGENT TECHNOLOGIES — PROTECTED GATEWAY ROUTE READINESS
Operated by Apropos Group LLC

October 19, 2026 (America/Los_Angeles).

**Preparation result: PASS. Actual authenticated Netlify gateway acceptance: NOT EXECUTED. Production remains NO-GO.**

## Reviewed build

Repository Aproposchpt2/ai4-contact-center; branch feature/staging-orchestrator-trigger-gateway; draft PR #77 remains unmerged.

Application source pin: `8815638dd674488165c19b2c06df8a4828ba30d5`.
The same source plus the credential-free CI definition is pinned at `169d2d64db4ed8448141073d288d42428c2e250d`. Later evidence/report commits do not change application code.

Prepared:
- `pages/api/staging-orchestration/[action].ts`
- `pages/experimental-staging-orchestration-test.tsx`
- Node HTTP/cookie-session adapter, browser test coordinator and tests under `twilio-bridge/tests/staging-runner`.
- Gateway update for exact approved preview origin and origin-bound capability audience.
- `.github/workflows/stellar-gateway-contracts.yml`: credential-free contract tests for PR #77's branch; no database, install or deployment steps. Its first GitHub execution is not claimed. Commits deliberately contain skip-ci/skip-netlify/skip-deploy markers to avoid unsolicited deployment.

No middleware, existing application route, voice bridge, model, greeting, persona, prompt, production branch, dependency version or package lock was modified.

## Actual local verification

| Check | Result |
|---|---|
| Pinned root dependencies via npm ci --ignore-scripts --no-fund --no-audit | PASS |
| Gateway contracts | 25/25 PASS |
| Node adapter, including real loopback TCP HTTP streaming | 10/10 PASS |
| Browser acceptance coordinator guards | 8/8 PASS |
| Existing repository regression tests | 110/110 PASS |
| Full Next.js build, including TypeScript checking and both new routes | PASS |
| Built Next.js unauthenticated runtime smoke | API 401; test page 307 to login; original middleware remains enforced |
| Test page client-bundle inspection | Server gateway/signing/RPC markers absent |
| Live Supabase-authenticated gateway/Netlify runtime | NOT EXECUTED |

Evidence:
- [43 gateway/adapter/harness tests](evidence/stellar-gateway-route-contracts-2026-10-19.tap)
- [110 repository tests](evidence/stellar-gateway-route-regression-2026-10-19.txt)
- [full build output](evidence/stellar-gateway-route-build-2026-10-19.txt)
- [built runtime smoke](evidence/stellar-gateway-route-smoke-2026-10-19.json)
- [redacted existing preview configuration audit](evidence/stellar-gateway-preview-config-audit-2026-10-19.json)

The final build/smoke used the approved staging URL and a fictional build/runtime publishable-key placeholder; no real credential or database fixture was used. Initial runtime smoke attempts lacked complete local public configuration/compatible loopback client transport and were inconclusive. The final same-process Node HTTP smoke produced the actual 401/307 evidence above. It does not demonstrate successful login.

Supabase responses in the contract suites remain injected doubles; the loopback adapter tests use actual local HTTP sockets, not a real Supabase connection or TLS session. Gateway instance recreation in unit tests is not OS-process restart acceptance. No real database concurrency or fault-injection acceptance is claimed for this route.

During local implementation, corrected a URL-constant/constructor naming collision in the adapter and used native Node HTTP requests to test an explicit Host header. Final tests/build include the correction. Original Host validation was preserved.

## Existing private staging project verified

Site: stellaruc-private-voice-poc; ID `a98fcd5a-893e-4eb7-835b-146f516ff47d`.
Current published deploy recorded before any deployment action: `6ad2f281dee36c05b86ec0b8` (ready/current).

Read the Netlify dashboard's Visitor access → Project visibility section:
- Production visibility: **Private**
- Deploy Preview visibility: **Private**

No visitor-access setting was edited. Existing team protection must stay enabled for all deployments. No assumption is made that Netlify team login authenticates an application user: the preview also retains existing application middleware and online Supabase user/membership authorization.

Proposed isolated URL (NOT DEPLOYED):
`https://deploy-preview-77--stellaruc-private-voice-poc.netlify.app/experimental-staging-orchestration-test`

The current published private staging deployment must remain untouched. No Railway deployment is proposed.

## Route and authentication controls

- Adapter only accepts the exact PR77 preview hostname, exact origin, fixed site ID, fixed staging Supabase URL in both server/public configuration, approved tenant and explicit staging/write/enable flags.
- Netlify CONTEXT/REVIEW_ID, when present, must indicate deploy-preview/77.
- The default disabled route cannot create a fixture. No flags were enabled by this task.
- Existing application middleware still protects these routes. Browser cookies are required to pass that middleware. Standalone bearer-only access is not promised even though the isolated adapter supports a bearer.
- The cookie helper retrieves a session bearer only; remote getUser and fresh RLS-scoped OWNER/ADMIN membership in the gateway remain authoritative. No locally decoded JWT metadata authorizes an operation.
- Raw request streaming preserves the gateway's body limit. Cookie retrieval is bounded separately; gateway request budget is five seconds.
- Capabilities are bound to the preview origin as well as user/tenant/original operation/session/confirmed intake/expiry. A base-host capability cannot be replayed on the preview, or vice versa.
- No new RPC, table access, RLS policy, elevated function, authentication bypass or notification integration was added.

## Existing credentials and missing nonsecret settings

Existing Netlify Deploy Preview metadata shows configured SUPABASE_SERVICE_ROLE_KEY, SUPABASE_URL and NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY. NEXT_PUBLIC_SUPABASE_URL matches the approved staging project. SUPABASE_URL is marked secret and its private preview value was omitted by the connector; its exact value cannot be certified from that read. An initial equality comparison against unavailable/redacted data was corrected to UNVERIFIED, not a claimed mismatch. Runtime rejects any URL other than the approved staging URL before privileged operations.

No secret values were displayed, exported, committed, copied to another runtime, or modified. Credential presence does not establish successful authentication.

These **nonsecret** settings are currently absent and are proposed for **Deploy Preview context only**, with Builds/Functions/Runtime scopes:

| Variable | Proposed value |
|---|---|
| STELLAR_BRIDGE_STAGING | true |
| CSS_TENANT_ID | 5885a020-d363-4c27-910a-c035eda132f5 |
| STAGING_ORCHESTRATION_GATEWAY_ENABLED | true |
| STAGING_SUPPORT_WRITES_ENABLED | true |
| STAGING_ORCHESTRATION_SITE_ID | a98fcd5a-893e-4eb7-835b-146f516ff47d |
| STAGING_ORCHESTRATION_ORIGIN | https://deploy-preview-77--stellaruc-private-voice-poc.netlify.app |

Leave production/branch/all-context settings and the existing STELLAR_SUPPORT_TEST_WRITES_ENABLED variable unchanged. Do not rename the approved voice application's environment keys. STAGING_DATABASE_URL is not needed in Netlify; it remains the runner-only PostgreSQL credential.

These settings and any preview deployment are pending owner authorization. The route will stay disabled elsewhere even if the settings are scoped to all previews because the hostname/site/context checks are exact. Runtime values still require a new build to take effect.

## Finite browser harness and honest acceptance boundaries

The new private test page uses the owner's existing application sign-in; no copy/paste JWT, database password or service key is requested. It offers:
1. Prepare one fictional fixture with unique @example.invalid contact and a run marker.
2. Save its sanitized cleanup manifest before the initial submission.
3. Submit once; on an uncertain response, disable initial resubmission and retain the original operation.
4. Check the original operation and repeat the same already-confirmed request.
5. Exercise forged identity, changed intake, tampered capability and an absent operation.

Operation capability and login tokens stay out of exported evidence. The manifest contains only synthetic intake, operation/session IDs and returned case/contact IDs when confirmed. Preparing a capability does not create a workflow/case.

The harness deliberately reports HTTP observations with databaseVerified=false and cleanupVerified=false until independent coordinator verification. It cannot certify the entire G01–G07 suite automatically.

| Live gate | What remains to execute |
|---|---|
| G01 | Actual login → fictional submit; independently verify exactly one case/contact/workflow/completion event and exact tenant/session linkage. |
| G02 | Invalid session can be tested without creating another account. Real foreign/inactive-user denial requires a separately available authorized test identity; do not create users or change membership to manufacture PASS. |
| G03 | Live malformed token/forged identity/changed intake are prepared; genuine signed-token expiry still requires a controlled expiry scenario. |
| G04 | Sequential reconnect/duplicate checks are prepared. Two distinct gateway processes concurrently attempting the first write are NOT implemented by clicking the repeat button and remain pending. |
| G05 | A real committed write plus controlled worker/process interruption and fresh gateway recovery remains pending; do not add a public fault-injection endpoint or simulate this as PASS. Prior headless restart results remain separate. |
| G06 | Absent-operation UNKNOWN is prepared. Invalid persisted association needs the reviewed rollback fixture mechanism and is not manufactured through this page. |
| G07 | Coordinator must independently verify baseline/final counts/fingerprints, function/permission/RLS preservation, and deterministic cleanup. |

## Coordinator evidence and cleanup requirements

Before enabling writes, capture a fresh six-table baseline/fingerprint and security snapshot using the existing authorized staging coordinator. Do not reuse the old 20/13/0 baseline without querying.

Before the submit button is used, retain the displayed/downloaded manifest in the controlled evidence record. Resolve workflow by exact approved tenant + manifest operation + original session, and case/contact by original session, test_only metadata and unique synthetic email. Do not delete records simply because a UUID or email was supplied by a client.

After the observations, stop test submissions and resolve any uncertain writes authoritatively before cleanup. Do not clean up while a ticket transaction may still be in flight. Use the existing reviewed base cleanup mechanism only after exact workflow/case/contact linkage and disabled-notification metadata checks pass. Remove only manifest-bound test receipts/effects first if present; then exact outbox/workflow/case/contact fixtures. Do not broaden direct table permissions or create an elevated cleanup RPC.

Independently compare final row counts/fingerprints and security with the fresh baseline. A timeout, association mismatch, unresolved write or unverified cleanup is BLOCKED/FAIL, never PASS. Preserve manifest evidence and report any intentionally retained fixture needed for recovery.

This preparation created **zero live database fixtures** and performed **no database mutation**, so no database fixture cleanup was required in this step.

## Build warnings and production follow-ups

Pinned Next.js remains 14.2.5. Installation emitted a deprecation/security warning. The [official December 11 advisory](https://nextjs.org/blog/security-update-2025-12-11) states that the particular RSC vulnerabilities affect App Router and that Pages Router applications are not affected, while recommending a patched release. This repository builds Pages Router routes. Do not treat that narrow statement as a complete dependency-security audit. A framework security update and current full dependency review remain required before production; no dependency was silently upgraded here.

The full build also retains the existing Supabase process.version/Edge Runtime warning from the middleware helper. It compiled successfully; successful authenticated deployed behavior remains unverified.

Previously recorded credential rotation, security advisories, capability expiry/renewal and dedicated-key lifecycle, distributed limits, supervision, provider delivery, real voice/security/load/performance/cost acceptance remain outstanding.

## Owner decision and rollback

The preparation/review milestone is complete. The next concrete action is to authorize:
- adding only the six nonsecret Deploy Preview settings above to the existing private project;
- deploying the reviewed code as an isolated **PR77 Deploy Preview**, preserving the currently published deployment;
- verifying deployed commit, team protection and application authentication before fictional gateway writes;
- running the prepared bounded browser observations and independent staging database verification/cleanup.

This does not authorize PR merge, production deployment, Railway changes, telephone routing, customer outreach or any approved agent changes. Wider G01–G07 scenarios stay pending unless actually executed.

Rollback: stop submissions, preserve/resolve the manifest and clean up exact fixtures; keep private protection active. Disable only the preview gateway enable flag and rebuild/withdraw that preview as needed. Netlify environment changes do not modify an already deployed function without a build. Do not republish or alter the existing private staging deploy or production.

**Recommendation: GO for owner review of this narrowly scoped private Netlify preview deployment and bounded authenticated staging test. NO-GO for claiming live gateway acceptance or production readiness.**
