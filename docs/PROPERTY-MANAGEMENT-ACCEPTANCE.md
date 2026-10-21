# Property Management Implementation and Acceptance

## Implemented scope
The branch implements a staging-only property operations MVP with properties, units, existing-contact occupancy, property grants, resident/vendor portal, prospective resident inquiry/showing capture, human-recorded move-in conversion, maintenance lifecycle, vendor coordination, shared persistent Knowledge Vault, private attachments, exact dashboard counts and an automation-backed sandbox notification queue.

Voice, SMS and chat share the canonical transactional workflow. The voice adapter extends the existing Railway engine with a separately gated PMA profile. Dedicated staging Twilio routes validate SDK signatures and exact test caller/DID bindings. SMS records inbound inquiries but returns empty TwiML to prevent outbound testing messages. The voice gateway accepts short-lived body-signed existing bridge credentials. Model outputs never select trusted workspace/contact bindings.

## Verification evidence
- The initial transactional Supabase acceptance suite passed on the authorized staging project, and its fixtures rolled back. Later extended SQL requests returned an expired request-state error; no success is inferred from those calls.
- The extended suite runs in isolated PostgreSQL through pinned PGlite. Its baseline is a read-only snapshot of relevant staging columns/checks/policies, with minimal Auth/Storage fixtures and no real user data. It is not a full Supabase stack or provider acceptance test.
- The extended suite verifies tenant/property scope, unauthorized writes, resident/vendor/prospect permissions, relational integrity, maintenance lifecycle, atomic assignment/showing replay, knowledge visibility, audit, simulated notifications, all three canonical channel records/transcripts, exact dashboard counts, human conversion, rate limits and attachment path restrictions.
- Existing Sales/Support regression tests and added PMA domain/transport tests are included in npm test. Voice runtime tests use mocked provider sockets and backend responses; no real telephone audio or SMS delivery is asserted.
- TypeScript and optimized Next.js build are required. The PMA Browser Validation workflow additionally tests hydration, property creation/refresh, maintenance display, mobile overflow and screenshots using synthetic mocked sessions/API responses.
- Local browser installation failed because the downloaded archive was invalid. No local visual QA pass is claimed. CI screenshots must be inspected when available.
- Supabase security advisor after private-wrapper hardening reported no PMA-specific findings. Unrelated existing support-test-function and leaked-password-protection warnings remain outside this change.

## Release gates still requiring evidence
1. Inspect CI browser screenshots and resolve any UI failures.
2. Validate a separate staging release commit with real Supabase authentication and private storage operations. The available off-platform Netlify connection masks the service-role secret; it has not been exported or reconstructed.
3. Configure the dedicated staging voice profile, gateway HMAC, synthetic property/contact/actor bindings and a dedicated test DID/caller allowlist. Do not change the Sales DID, Support DID or main IVR.
4. Run real inbound voice and SMS acceptance and confirm persisted IDs, interruption/reconnect behavior and signed webhook handling. No production outbound messages are permitted in staging.
5. Replace simulated notification evidence with approved sandbox-provider delivery/receipt evidence before claiming real delivery. The queue intentionally remains BLOCKED until a safe delivery contract is configured.
6. Review operational emergency escalation, property content and human access assignments with the owner.
7. Production release requires separate owner authorization and a reviewed production configuration/migration plan. The current code intentionally rejects PMA production enablement.

## Security boundaries
All PMA tables have explicit SELECT/INSERT/UPDATE/DELETE policies. Hard DELETE is denied to preserve history; archive/end/withdraw statuses are used instead. Owners/admins control workspace properties; other existing staff need property grants for PMA domain records. Existing non-PMA CRM membership policies were not broadened or replaced. Residents/vendors/prospects receive no staff memberships.

Private SECURITY DEFINER functions have explicit verified-user checks and narrow operations. Exposed RPCs are invoker wrappers; service-only bridge and simulated-notification functions revoke public/anonymous/authenticated execution as appropriate. File downloads require scoped metadata visibility and expire after 60 seconds. Uploads validate file signatures/type/size and enforce workspace/property/request/object identity.

## Continuation authority
Implementation and staging authorization remain valid. Continue failed checks and staging configuration within that scope without asking for implementation approval again. Never merge to main, change production routing or publish a production release under this authorization.

## Upstream integration
During implementation main advanced to 891f194c583467616b868e82d2a535fa65ab5f45 with a Support voice behavior promotion. The PMA branch incorporates that commit, preserves its support prompts/tools/save behavior, and adds the separately gated PMA profile. The persona regression comparison permits the explicit call-context prefix introduced upstream while still requiring the unchanged approved persona and workflow suffix.
