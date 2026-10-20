# STELLAR INTELLIGENT TECHNOLOGIES — Gateway process runner review
Operated by Apropos Group LLC

October20,2026. Isolated staging only. Production NO-GO.

## Implemented and validated
Reviewed source revision c84b3f537f1771edd4552a503936826a5c8b7da4 contains:
- twilio-bridge/tests/staging-runner/gateway-process-acceptance.cjs
- twilio-bridge/tests/staging-runner/gateway-process-acceptance.test.cjs
- secret-free CI additions to .github/workflows/stellar-gateway-contracts.yml.

Local suite53/53PASS (46existing gateway/harness plus7new process-runner safeguards). Pinned runner dependencies installed through npm ci --ignore-scripts --no-fund --no-audit. No lockfile modification. Actual GitHub contracts check succeeded: run39417928662/job118611395225. Existing gateway-contract check succeeded: run39417928686/job118611395433.

This is preparation/safety validation, NOT real G04/G05 acceptance. New credentialed workflow has not been activated. No secrets copied from Netlify, Railway or browser. Local availability check returned false for STAGING_DATABASE_URL,STAGING_SUPABASE_SERVICE_ROLE_KEY,NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,STAGING_GATEWAY_TEST_BEARER. Existing protected GitHub environment credentials are not presumed to be available in this workspace.

## Runner behavior
The manual entry point requires STAGING_GATEWAY_PROCESS_AUTHORIZED=G04_G05, real staging-user bearer authentication, a publishable key and existing staging credentials before connecting. It enforces project hvzauakkhlivzeqatfqm,tenant5885a020-d363-4c27-910a-c035eda132f5,TLSverification and exact private PR77 origin. No listener or voice-bridge import. No auth-user/account/membership creation in current source.

G04 creates a sanitized manifest before any ticket submission, launches two distinct OS processes and fresh read-only observer DBconnections, and pauses both after real initial canonical lookup returns absent. Parent releases both; exactly one case write and one completion event required. A fresh status process must confirm the original case. Observer DBconnection IDs are explicitly separate from PostgREST RPCbackend IDs, which are not exposed; the runner cannot prove Netlify's own worker process identity.

G05 pauses a local test adapter after real case-RPCresponse/COMMIT and before reconciliation. Parent independently confirms RUNNING and the original case, SIGKILLs workerA, then launches workerB to invoke status only. Requires distinct OS/backend observer IDs, one completion event, same case/session/tenant and zero recovery case-write calls. Repeated recovery must preserve stored state.

The runner records only sanitized RPCname/correlation/phase/timestamp information. It never puts bearer,operation capability,database URL,key or password in reports. Child environment excludes unrelated OpenAI/Resend/GitHub credentials and NODE_OPTIONS. Every started RPC must have a settled response before automatic cleanup. Any uncertain/in-flight RPC or unexpected dispatch state blocks cleanup for review; no blind retry or broad deletion. Manifest-bound cleanup reuses existing base testing guards and compares six-table counts/fingerprints and security snapshots. Any live FAIL or blocked cleanup is not PASS.

## Proposed owner action — authentication fixtures (DESIGN ONLY)
To avoid extracting the owner's browser session or asking the owner to handle bearer tokens, propose the following separately authorized mechanism, to be implemented/reviewed before activation:
1. Reuse existing protected GitHub environment stellar-staging-access; no new paid service, production change or persistent credential.
2. Use existing staging AuthAdmin capability to create exactly two uniquely tagged synthetic users at @example.invalid, with random in-memory passwords. Do not send email or SMS. Do not alter owner account/membership. Do not record passwords/tokens.
3. Positive user receives one temporary ADMIN membership only in approved DEVELOPMENT/TEST tenant5885a020-d363-4c27-910a-c035eda132f5. Negative user receives NO tenant membership. No new foreign business tenant, SQL grants, RLSchanges or globalAuthsetting changes.
4. Sign the positive/negative identities in against real staging Auth using their generated passwords. Retain access tokens only in the protected runner process memory. G02 attempts must reject the authenticated nonmember without disclosing any support data; this proves real nonmember denial, not an invented foreign-customer tenancy.
5. Run G04/G05 with the positive identity and original signed operation capability. No production/voice/notification/routing/deployment step.
6. On every exit: quiesce workers; revoke temporary sessions using supported AuthAdmin mechanisms; delete exact temporary membership and exact synthetic Authusers; remove manifest-bound ticket/workflow/outbox fixtures only after confirmed quiescence. Verify original business memberships,Authuser counts and session cleanup as well as six application table counts/fingerprints. If control fails, stop and retain sanitized exact fixture identifiers for owner review.
7. Activate only after the immutable final code revision, cleanup behavior and protected manual workflow are reviewed under this authorization. No credentialed workflow or Authfixture has been run by this proposal.

Approval requested specifically covers creating/removing these two temporary staging Authusers and the one test-only ADMIN membership, plus executing the reviewed protected manual runner using existing staging credentials. This is outside the previously used rollback-only SQL/fictional-ticket fixture mechanism; the original owner directive requires separate authorization for a new mechanism. Approval does not authorize permanent accounts,additional tenant access,broader database privileges,production changes,PRmerge or Railway deployment.

## Still outside this runner's accepted scope
- G06 deliberately invalid committed case association through real HTTP: separately reviewed fixture mechanism still required.
- Simultaneous missing-case gateway recovery,crash while holding SQLlock,networktimeout/fullNetlify worker termination must retain distinct evidence. Prior C1/R1/V5/headless results remain separate.
- No model,voice,greeting,persona,instructions or live telephone tests.

Owner confirms sole business tenancy is DEVELOPMENT AND TESTING and there are no external clients. Primary WorkAgent active; fallback standby until platform/chat termination. Approved agent unchanged.
