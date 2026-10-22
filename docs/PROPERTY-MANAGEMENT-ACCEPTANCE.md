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
- Local browser installation failed because the downloaded archive was invalid. Browser validation instead runs in GitHub Actions with synthetic mocked sessions and responses. The first screenshot review found inherited global-theme contrast defects; the workspace now scopes its theme colors and the browser check asserts readable dashboard metric color.
- Supabase security advisor after private-wrapper hardening reported no PMA-specific findings. Unrelated existing support-test-function and leaked-password-protection warnings remain outside this change.

## Release gates still requiring evidence
1. Browser screenshot gate passed for implementation commit 738865330cbe941b5d612d137d49d0084d9dcac8: GitHub Actions run 39695554781 completed successfully. Owner desktop and maintenance desktop/mobile screenshots were inspected after the contrast fix. This verifies mocked interface behavior only.
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

## Final automated evidence
Implementation commit 738865330cbe941b5d612d137d49d0084d9dcac8 passed standard CI (39695554800) and browser validation (39695554781), including TypeScript, 124 tests, optimized build, form save/refresh and desktop/mobile layout checks. Twelve PMA migrations are applied to the staging project; read-only policy inspection confirmed four explicit command policies on each of the thirteen domain/shared-knowledge tables. No staging web release, real provider delivery or production release is claimed.

## Knowledge Base v1.0 integration
The owner-supplied 18-section model is implemented in `twilio-bridge/pma-knowledge-v1.json` and documented in `PROPERTY-MANAGEMENT-AGENT-KNOWLEDGE-v1.md`. Shared runtime instructions enforce its principles and role restrictions. The existing Knowledge Vault gains unit scope, structured reference fields, expiry, private templates and conservative owner/property/unit answer precedence. Unknown or ambiguous answers require review; drafts and expired records cannot supply agent answers. Unit records require a verified active resident/contact association. Owner/vendor preference sections cannot be public.

Local validation after this change: TypeScript and all 127 tests passed, including isolated PostgreSQL hierarchy/disclosure/expiry/conflict checks. Live migration status is not inferred from local validation: a read-only check confirmed the knowledge migration was absent, and the next apply attempt failed with `Invalid or expired requestState`. Do not enable the new UI against staging until that migration is successfully applied and verified. No successful live knowledge migration or production deployment is claimed.

Knowledge integration final CI evidence: implementation commit `2d0cadaa64567c5b952e9738c46708a79f8afcd8` passed standard CI run `39700448994` and PMA Browser Validation run `39700449022`. The latter passed TypeScript, all 127 tests, optimized build, dashboard/property/maintenance checks and private knowledge draft creation. The knowledge mobile screenshot was visually inspected. These browser sessions and API responses are mocked. A final read-only staging query confirmed `model_values` is absent and there are zero `pma_agent_model_v1` references; the new knowledge migration is pending, not partially claimed as complete. Prior twelve PMA migrations remain separate from this pending thirteenth migration.

## Intent Catalog v1.0 extension
The full 25-intent catalog, shared runtime/model validation and canonical SQL routing are implemented. Local validation passed 192 tests, TypeScript and the optimized Next.js build. New database cases cover every route, thresholds, identity/scope gates, stale versions, replay and audit correlations. Voice adapter tests confirm safety is not delayed for confirmation, model proposals are bounded and forged authority is rejected. Browser validation adds the emergency intent and confidence display. See PROPERTY-MANAGEMENT-INTENT-CATALOG-v1.md for mappings, behavior and limitations. The knowledge and catalog migrations remain pending live application; no ElevenLabs agent or live voice route was created.
