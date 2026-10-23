# STELLAR-PMA-003 — Agent 05 / Agent 06 QA handoff

2026-10-23 (America/Los_Angeles). PMA-only source integration implemented. Staging schema installed and rollback-only synthetic SQL acceptance passed. **No application deployment, merge, production change, telephone call, notification or authoritative booking was performed.** Voice writes remain disabled pending review/provisioning. Independent QA is pending; this is not release approval.

## Provenance and source

Repository: https://github.com/Aproposchpt2/CUSTOMER-ENGAGEMENT-OPERATIONS-CENTER

Branch: `implementation/pma-003-agent05-20261023`.

Exact parent: Agent 03 verified remote HEAD `216516135ed9f19629570654b824812381ac779c` (fetched directly and checked out). Earlier audited application base is `0c7074d1b41cd0526bf2f996fc9d4fbebccf9507`; no release-control branch was merged. Existing recovered local Agent 03 checkout was read and cloned without changing it; remote HEAD was then fetched for an exact isolated base. No applicable project AGENTS.md existed outside dependencies.

Remote publication SHA and tree equivalence are recorded in PUBLICATION.md. Changed files are enumerated in CHANGED-FILES.txt. Branch-only publication uses connected GitHub; no deployment tool is involved. Existing implementation-branch Netlify build cancellation remains unchanged and is covered by regression tests.

## Implemented contracts

`POST /api/intake/pma-staging` keeps the existing HMAC, staging-project and transport gates. It now invokes `executePmaVoice`, not the old shared synthetic-contact `trustedPmaTurn`. The PMA adapter supplies the trusted WebSocket session ID/call SID; it sends no operation key, actor, tenant, contact, unit or role from model input. Sales/Support/IVR entry selection and RPC allowlists are unchanged.

The bounded service RPC is `public.pm_voice_turn_v1(t uuid,p uuid,session_id uuid,call_sid text,turn jsonb)`. Public wrapper is SECURITY INVOKER, private implementation is SECURITY DEFINER with empty search_path, EXECUTE service_role only. It has no arbitrary actor/contact/unit input. Configured actor comes exclusively from DBA-provisioned private configuration, is snapshotted into the call binding, and must retain property-write authority on every execution. JWT claims are restored on ordinary completion, replay and errors. No shared-table grants were added.

Private configuration/session/operation tables have RLS and zero direct grants to public, anon, authenticated or service_role. There are intentionally no RLS policies: access is through the guarded private function. Session check requires persisted voice interaction, active/open state, no end, exact configured tenant/property/call/PMA route, synthetic/demo flags, active inquiry-enabled property, Pacific timezone and a nonfuture start within two hours. Call binding snapshots actor/scope and expiration; reconnect cannot change them. PMA inventory/preload gateway also enforces the two-hour session lifetime. Capturing prospect details never authenticates a resident.

### Durable operations and truthful outcomes

The database mints `pma:v1:<UUID>` once, retaining it in `private.pm_voice_operations_v1` atomically with the domain write and result. A row lock on the parent serializes operations for one call. Identity is `(session, kind, revision)`, never wording or model tool-call ID. There is one showing request per call; a second different time conflicts and requires staff. Prospect revision is expectedVersion (0 initially; 1..19 for explicit confirmed corrections). Normalized contact facts must match on replay. Showing facts are captured contact plus requested instant; rephrased notes do not change identity. Errors roll back the entire operation/domain write; a lost response after commit is recovered from the retained result.

Tool `recoverOperation: 'prospect'|'showing'` recovers the latest committed result for the active call, without restating wording or dates and without creating another write. Returned replay is historical, never a fresh maintenance/status claim. Recovery still rejects ended/expired/mismatched calls. No cross-call recovery is provided.

Projection exposes INFORMATION, CLARIFICATION_REQUIRED, AUTHORIZATION_REQUIRED, REQUESTED, CONFIRMED, CONFLICT, UNKNOWN and FAILED vocabulary. `interactionPersisted`, `domainPersisted`, `notificationSent` and `bookingConfirmed` are separate. Only a verified persisted domain reference plus operation ID may confirm a write. Transport/invalid results become UNKNOWN; SQL constraint conflict becomes CONFLICT. No provider delivery is claimed. FAILED is reserved in the contract; transient database/transport failures currently use UNKNOWN conservatively.

### Domain dispatch

- **Prospect:** exact Agent 03 `pm_capture_prospect_v1` signature. Requires explicit consent, spelling/contact readback confirmation, validated name and phone/email, and expectedVersion. Session-specific CRM contact/lead; corrections retain contact. No shared fixture is overwritten and no resident authentication is implied.
- **Tours:** exact `pm_request_or_book_showing_v1` signature with session-derived captured contact, null unit, null slot and null slot version. Explicit offset/timezone/DST validation occurs before SQL. Both fixture settings are forced off in the transaction and there is no slot-selection tool input. Successful persisted showingId is always REQUESTED, bookingConfirmed=false, pending staff review. `listTourSlots` invokes the existing contract but projects REQUESTED_ONLY, slots=[], authoritative=false. Cancel/reschedule is a staff fallback that leaves the original unchanged. A vacancy DATE is never a tour slot.
- **Maintenance and status:** deliberately AUTHORIZATION_REQUIRED on this voice route. Structured category/description/impact/urgency/safety/optional evidence are validated and retained in the latest interaction intake, but **no work order is created**. Neither staff nor resident identity can be established from the existing synthetic caller route. Agent 03's authorized maintenance RPC remains unchanged for authenticated portal use. Voice execution of that RPC requires a separate independently verified contact/unit/session identity flow; this assignment did not invent one. Owner actions stay portal-only; vendor actions require authenticated assignment scope through the existing portal. No fallback impersonates the configured staff actor as the caller.
- **Safety:** all five canonical emergency routes plus medical and carbon-monoxide phrases take precedence over malformed classification proposals and ordinary intake. Split input transcript detection immediately sends safety instructions before tools; the bounded endpoint records the concern on the parent interaction without fabricating a work order, dispatch, delivery or response commitment. Inability to save never blocks safety guidance. The safety wording uses local emergency services, not an invented property emergency number.
- **Knowledge:** voice preload and bounded question answers use Agent 03 `pm_public_voice_knowledge_v1` and its unified eligibility predicate. Only public property-authorized current approved/published/VERIFIED/non-template content enters this unverified caller route. One unambiguous full-text match may be quoted. Conflicts/missing knowledge escalate; unresolved rent/grace/fees, smoking, pet/assistance-animal, screening/credit, notice/deposit/towing topics are withheld for staff policy review. No content/publication state was edited.
- **Availability:** exact YYYY-MM-DD is retained; projected labels use calendarDate without local-midnight conversion. Only vacant, dated inventory updated within 24 hours and not in the future is returned. Existing dedicated availability tool is preserved with persisted session/lifetime verification. Unit 415 stays 2026-10-25; Unit 301 stays 2026-11-01; occupied 205 is excluded. Stale inventory is withheld, not refreshed to pass a test.

All 25 canonical intents, their supplied example utterances, canonical lowercase/hyphen aliases and INT-xxx aliases are covered by bounded dispatch tests. INTENT-MATRIX.md lists outcomes. No new canonical intent numbers were added for medical/CO; these route to the safety override.

## Migration / staging state

`supabase/migrations/20261023182528_pma_003_trusted_voice_orchestration.sql`

Staging project only: `hvzauakkhlivzeqatfqm`. Applied history version `20261023182528`; SQL acceptance PASSED and rolled back. CLI-generated draft filename was renamed to match the migration service's assigned version; SQL content was unchanged. Never apply both versions. New tables: private.pm_voice_config_v1, private.pm_voice_sessions_v1, private.pm_voice_operations_v1. New RPC wrappers: private/public.pm_voice_turn_v1. No existing schema/function was replaced by this migration.

Postflight: config=0, session=0, operation=0, synthetic fixture tenant=0, Desert Ridge synthetic tour gate=false. New wrappers deny anon/authenticated and permit service_role only. The tenant's existing knowledge hash before/after is identical: `d27f82bb6f91a245498e514c5b2c1d33`. This is a different scoped hash from Agent 03's earlier broader hash; do not conflate them. It proves no change in this run, not policy correctness. No live binding was provisioned. `PMA_VOICE_INTEGRATION_ENABLED` was not set in any hosted environment.

Security advisor: no new PMA WARN. Three additional INFO notices are intentional private RLS-with-no-policy default-deny tables; see https://supabase.com/docs/guides/database/database-linter?lint=0008_rls_enabled_no_policy . Existing Support public-definer and Auth password-protection WARN findings were left unchanged/outside PMA scope.

## Verification and evidence

Run `node scripts/verify-pma-003.mjs` (npm test and npx tsc --noEmit). Exact results are in evidence/local-verification.json and logs. Tests include every intent/example/alias, malformed model safety, consent/corrections, session denial, private-table/RPC grants, rephrasing/reconnect replay, after-commit recovery, changed facts conflict, precommit rollback, no duplicate showing, literal DATE/freshness, no resident authority from prospect, and maintenance optional-field validation.

Bridge runtime tests include trusted-session propagation, request-only projection, split CO transcript safety, and late-result suppression after disconnect. Existing Sales/Support/IVR-related regressions remain in the full suite. `supabase/tests/pma_003_acceptance.sql` passed against live staging in one rollback transaction; its evidence reports one synthetic showing and two durable operations before rollback. It is reproducible and uses only synthetic fixtures.

No production build/deploy, CI workflow pass, real telephone call, owner acceptance, real delivery, or truly simultaneous separate-connection lock test is claimed. PGlite is real isolated PostgreSQL execution but not an independent remote-connection race.

## Exact Agent 06 handoff / remaining gates

1. Check out the published branch at the SHA in PUBLICATION.md; verify exact parent/tree and all changed paths. Independently run verification script and rollback-only SQL suite. Review private function privilege/claims restoration, active-call lifetime and disabled configuration. Confirm the existing deployment source separately; this branch is not deployed.
2. Independently test two concurrent connections submitting the same call's capture/showing, changed facts, timeout before commit, response loss after commit, reconnect and `recoverOperation`. Verify exactly one CRM contact per session, one showing per call and stable operation IDs. Execute the existing Agent 03 capacity race only in isolated gated fixtures; no real calendar activation.
3. Review and provision an isolated staging-only `private.pm_voice_config_v1` binding to the approved property writer using the authoritative tenant/property mapping. This requires no arbitrary HTTP actor input and no broad service grants. Keep production bindings absent. Do not enable current deployed PMA adapter with this RPC until source versions are coordinated and reviewed.
4. A later approved staging application release needs server `PMA_VOICE_INTEGRATION_ENABLED=true`, existing PMA staging/HMAC/project/host gates, matching trusted voice session route and the reviewed private binding. No credentials belong in the bridge/model/tool schema. Do not activate a partial source/database combination.
5. Execute actual staged PMA calls: all 25 intents, medical/CO/fire/gas overrides, interruptions during capture/request, readback correction, no-consent, stale/occupied inventory, spoken exact October 25/November 1 dates after legitimate refresh only, no arbitrary resident/unit disclosure, request versus booked language, unknown recovery, and disconnect suppression. Owner telephone acceptance is a separate gate.
6. Voice maintenance creation/status remains blocked until independently authenticated call-contact-unit scope is implemented and audited. Do not weaken this gate. Owner/vendor operations use existing authenticated portals. Record this as incomplete voice capability, not a passed domain action.
7. Owner still must decide calendar/provider/slots, duration/capacity/blackouts, booking/cancellation authority, callback commitments, rent/smoking/pet/housing policies, emergency contacts, and legitimate inventory refresh provenance. No owner decision was invented or silently adopted.

## Rollback

No automatic rollback was applied. To disable a later staging activation: turn the dedicated application gate off and set the reviewed private binding enabled=false through authorized administration. Revoke EXECUTE on public/private.pm_voice_turn_v1 from service_role if needed. Preserve private ledger/session tables and committed domain references for recovery/audit. Do not drop populated structures or remove Agent 03 migrations. Roll back only this isolated source delta to its Agent 03 parent after coordinated review.
