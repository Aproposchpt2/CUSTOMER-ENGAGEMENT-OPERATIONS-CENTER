# PMA voice repair — 2026-10-22

## Verified call failure
Twilio Console error NOd0f79c6527cd3489fa8b8d1a84ae0754, call CA2798e4b5dc4142ac16b6636c913db700, 2026-10-22 07:11:08 UTC (12:11 AM Pacific), error 11200. Twilio POST received HTTP 404 from https://pma-validation--stellaruc-private-voice-poc.netlify.app/api/twilio/pma-voice-staging. The dedicated DID +17029351414 still points to that wrong host. Its caller matches the configured staging caller allowlist. No production number configuration changed.

## Prepared repair
Application commit: 5626f35abac3c36d7d47f675e5da94de529d4347, feature/property-management-assistant-mvp, PR #91 remains draft/unmerged. Dedicated Railway release branch: release/pma-voice-repair-20261022 at the same commit.
- Corrected TwiML stream path to /ws/pma, matching the bridge upgrade handler.
- Added current Support voice orchestration adapter, integration and Docker assets to PMA source, retained its trusted-call, confirmed-write and exact-ID verification.
- Added non-secret PMA readiness metadata to health output.
- Added signed webhook tests covering stream path/token, signature failure, foreign caller/account, production DID and disabled gate.
- Validation: 198 regression tests pass; three Support orchestration tests pass; TypeScript and Next.js production build pass.

## Synthetic fixture
Created a separately labelled Synthetic PMA Voice Test unit 7e5d9c7a-d372-4b06-bcf6-8a1523abb11a under the existing staging property. Active occupancy 51c60a57-e2f4-4758-aef6-3f818516ab8b links the existing synthetic contact. Existing residents/occupancies were not changed. Netlify PMA_STAGING_UNIT_ID updated for deploy-preview only.

## Deployment state
Railway staging patch d75dcc28-371c-464c-b186-b8ec24ac155e changes only the existing staging bridge source to the dedicated release branch and pinned repair commit. Reviewed get-staged-changes reports destructive=false. accept-deploy returned: "Cancelled — the user did not approve this action. No changes were made." Do not report the repaired bridge as deployed. Running bridge remains 063d8ea32df59814b010e417cf32607ae561f426 until this approval is resolved.

Netlify release workflow updated on release/pma-staging-validation at 40af3e23d5f1c78683f1fc0aaf47487924db5950 to pin repaired application 5626f35. Run https://github.com/Aproposchpt2/ai4-contact-center/actions/runs/39742555296 was in progress at last read. Alias only; no --prod. PMA_CHANNELS_ENABLED remains absent/disabled on Netlify.

## Remaining sequence
1. Obtain deployment approval, then apply only the reviewed Railway staging patch. Verify deployment SUCCESS, health commit and PMA enabled state. If disabled, set only the non-secret staging PMA flags/base URL and redeploy. Never recreate sealed/masked credentials.
2. Verify successful preview build and synthetic binding. Enable Netlify PMA_CHANNELS_ENABLED for deploy-preview and redeploy the isolated alias. Verify Twilio signature, DID, caller and account guards stay active.
3. Change only PN9774db9ada62033917f7ff2586d6b8c4 (+17029351414) voice POST URL to https://pma-validation--ai4cc-staging.netlify.app/api/twilio/pma-voice-staging. The current browser tab is on this number's Configure page. No edits made.
4. Verify signed webhook/bridge HMAC end to end and actual inbound call audio/tool persistence. Never claim calls work based solely on build/mock/health checks. Preserve production Sales/Support/IVR and other staging Support work.

Approved stack: OpenAI + Twilio + Railway. ElevenLabs is not used. Knowledge publication metadata inconsistency remains for review as documented in the earlier config audit; no broad content reapproval was performed.
