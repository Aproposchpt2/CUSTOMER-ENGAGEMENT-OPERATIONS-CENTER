# PMA configuration audit — current-state reconciliation

Audit window: 2026-10-22 06:21–06:27 UTC. This supersedes earlier handoff assumptions where noted below. Configuration and data were inspected read-only; no deployments, phone routing, agent prompts or database records were changed by this audit.

## Main conclusion
The approved voice architecture is OpenAI + Twilio + Railway, as explicitly reaffirmed by the owner during this audit. The Knowledge Base/catalog foundation is installed and substantial property content has been loaded. End-to-end staging integration is incomplete: the PMA preview is absent, the Railway service runs a different revision, and the channel resident binding is inconsistent. Railway access now works, so the old reconnection blocker is obsolete. An unused ElevenLabs resource was observed but is outside the active architecture and is not a release dependency. No changes were made to it.

## Findings
| Priority | Finding | Evidence and implication |
| --- | --- | --- |
| High | Knowledge has two inconsistent publication states | Desert Ridge has 66 property-scoped entries, all `approved=true`, `source_status=VERIFIED`, but `publication_state=draft`; none has a `model_section` mapping. Current lookup uses `approved` and visibility, not the added publication-state field. A read-only lookup for “satellite antenna” returned knowledge ID `13877c2a-c5e7-48a1-a1f7-2dd6b6a64281`, no human review, while the source row remained draft. Reconcile one publication contract before enabling callers. Flags alone do not establish policy provenance or human review. |
| High | Configured channel contact does not match the selected unit's resident | The configured property/contact/unit are in the same workspace, the contact is synthetic, and the actor has write access. But no active occupancy links that contact to that unit. Another contact occupies the selected unit and is not marked synthetic. Do not reassign that occupancy or expose its data as a shortcut. Use a verified synthetic resident/unit binding for maintenance/status/resident knowledge tests. |
| Blocking | PMA staging web preview is not deployed | Both `/property-management` and `/api/property-management/dashboard` at `pma-validation--ai4cc-staging.netlify.app` returned 404. Last release run 39732617103 failed before build/deploy because the protected `NETLIFY_AUTH_TOKEN` was unavailable to its job. No subsequent successful run was observed. Current GitHub secret availability cannot be read through this connector; do not assume the token remains absent if an administrator has since changed it. |
| Blocking | Railway source differs from validated PMA source | The staging service is healthy but runs `063d8ea32df59814b010e417cf32607ae561f426` from `feature/staging-orchestrator-trigger-gateway`; that repository revision has no `twilio-bridge/pma-adapter.cjs`. Validated PMA application source is `c23b58349af7018e7e0497ae8ec083d3eeb32ada`. Coordinate the voice path and preserve existing Support staging work before deploying. |
| Incomplete | Channel enablement cannot be assumed | Netlify has no `PMA_CHANNELS_ENABLED`, so the reviewed application defaults its channels off. Railway has both PMA variable names, but OAuth returns names only; their values and the HMAC match cannot be verified through this read. Existing sealed/redacted credentials must not be recreated merely because their values are hidden. |
| Incomplete | Telephone routing and end-to-end behavior remain unverified | The actual Twilio DID webhook configuration was not accessible in this audit. Netlify environment settings identify a test DID and caller but do not prove the provider is using those endpoints. Actual login, private storage, voice/SMS workflows and delivery receipts still need evidence after integration. |

## Work already present — do not repeat
- Knowledge migration `pma_knowledge_model_v1`, recorded as 20261022055747; intent catalog migration `pma_intent_catalog_v1`, recorded as 20261022055803.
- Full 18-section canonical model in two eligible workspaces, staff-only and unapproved as caller-facing answer content.
- Exactly 25 canonical intents, catalog version 1.0. Five live private function bodies (`pm_catalog_config`, `pm_catalog_turn`, `pm_knowledge_answer`, `pm_knowledge_guard`, `pm_record_channel_turn`) match the reviewed migration source byte-for-byte by MD5. This is a drift check, not a new behavioral test suite.
- Vault RLS remains enabled; the authenticated legacy public workflow bypass remains revoked.
- Desert Ridge Apartments is active, accepts inquiries and uses America/Los_Angeles. Its 66 entries comprise 42 public, 16 resident and 8 staff entries. Latest observed property-entry updates were at 06:17:06 UTC. Content has been loaded; its provenance/publication consistency and retrieval coverage need validation, not another blind import.
- Railway access is restored. Staging project `1d66a7cf-3cb9-4032-958b-c897137fcece`, environment `95040de1-e96f-43d5-b5fa-39e8c0911e9e`, service `6bda5718-49a2-4524-8b4d-af906c3be2f0`. Deployment `ecaf85bd-d2f1-4a30-8e95-602af3ebe5a5` is SUCCESS; health returns `ok=true`, `stagingOnly=true`. Its creation was 2026-10-21 05:18 UTC, not a new PMA release.
- Netlify staging HMAC is marked secret with dev, branch-deploy, deploy-preview and production values present. Other required protected credentials are present for preview. Secret contents and cross-provider equality were not inspected.
- Source commit c23b583 passed 195 regression tests, build and mocked browser validation, plus both live rolled-back SQL acceptance suites documented earlier. These were not rerun unnecessarily during this audit.

## Repository and release state
Implementation: `feature/property-management-assistant-mvp` at c23b58349af7018e7e0497ae8ec083d3eeb32ada before this documentation commit. PR #91 remains draft, open and unmerged.

Release: `release/pma-staging-validation` at d0605307d931a877bb80b922e244e33e67a4d2c1. The release workflow pins application source c23b583 and targets Netlify site `06deb5c7-83b8-401c-bdc5-745d802e3f26` using protected environment `stellaruc-voice-poc`.

Main is 4c6e04604fc9e3deab6a2e61081aa7d5f5101357, which adds a PMA product card and updates the demo-number label. `pages/api/property-management` is absent on main. A marketing card does not mean the PMA application is deployed.

The published ai4cc-staging deployment remains `6ab6947a115da803fcaf4f54`, created 2026-09-25. Its primary URL is admin-staging.stellaruc.com. Do not replace that published site while creating the separate PMA alias.

## Corrected continuation brief — approved stack only
1. Use restored Railway access; reconnection is no longer a blocker.
2. Continue exclusively with the approved OpenAI/Twilio/Railway runtime. Inspect the current staging bridge revision against the validated PMA source and preserve existing Support orchestration work. Deploy the reviewed PMA profile through the staging release process; do not introduce an ElevenLabs dependency or duplicate platform services. Verify the full 25-intent contract and backend-confirmed action responses.
3. Resolve the draft/approved publication contract and review the 66 loaded entries' sources, scopes, freshness and conflicts. Do not blindly approve, delete or reimport the content.
4. Establish synthetic resident/contact/unit relationships without altering another resident's occupancy. Keep owner/vendor authority bound to verified accounts and assignments.
5. Verify the protected Netlify deployment credential, then rerun only the blocked release job. Preserve environment protections. Verify a ready draft deploy and the actual PMA routes.
6. Verify channel settings, matching secret configuration and provider webhook/DID bindings. Then perform synthetic real login/storage/voice/SMS and sandbox receipt acceptance. Retain failure and replay evidence.
7. Keep PR #91 unmerged, leave production Sales/Support routing untouched and obtain separate authorization for production release.

## Existing security-advisor findings
The same pre-existing items remain: four orchestrator/dispatcher staging tables with RLS and no policies; the existing Support test SECURITY DEFINER warning; leaked-password protection disabled. No new PMA advisor finding was reported. References:
- https://supabase.com/docs/guides/database/database-linter?lint=0008_rls_enabled_no_policy
- https://supabase.com/docs/guides/database/database-linter?lint=0029_authenticated_security_definer_function_executable
- https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection

Evidence:
- https://github.com/Aproposchpt2/ai4-contact-center/pull/91
- https://github.com/Aproposchpt2/ai4-contact-center/actions/runs/39731597426
- https://github.com/Aproposchpt2/ai4-contact-center/actions/runs/39731597423
- https://github.com/Aproposchpt2/ai4-contact-center/actions/runs/39732617103
