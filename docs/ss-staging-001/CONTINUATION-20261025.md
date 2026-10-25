# Sales / Support staging continuation — 2026-10-25

## Completed (isolated, not released)
- PR #131: rollback-only staging SQL acceptance verified real service-role Summit HVAC ticket creation, same-session idempotency and foreign-tenant rejection; verification reported 0 retained synthetic records.
- PR #132: disabled-by-default expanded intent-catalog lookup by trusted agent domain.
- PR #133: disabled-by-default published/approved, tenant-bound and domain-bound KB retrieval; denied unrelated PMA content.
- PR #134: disabled-by-default expanded-catalog intent-candidate validation with strict non-executable outcome.
- PR #135 (this branch): repaired **wrong-tenant Support staging adapter** by introducing a separately enabled Summit-only RPC route. The original STELLAR adapter remains the default. Included in Docker and accompanied by CI/test files.
- All PRs remain draft. No merge, Fly release, Twilio modifications, production or notification activation.

## How the guarded Summit adapter is selected
`STELLAR_SUMMIT_HVAC_SUPPORT_MODE=true`
`STELLAR_BRIDGE_STAGING=true`
`STAGING_SUPPORT_WRITES_ENABLED=true`
`STAGING_SUPABASE_URL=https://hvzauakkhlivzeqatfqm.supabase.co`
`CSS_TENANT_ID=d7e80001-0000-4000-b000-000000000001`
`STAGING_SUPABASE_SERVICE_ROLE_KEY` must be configured securely on the server.
These are documented **names only**, not authorization to enable flags. Route isolation, app identity and release provenance must be verified BEFORE configuring any app.

## Tests added
`tests/voiceIntentSearch.test.cjs`
`tests/approvedStagingKnowledge.test.cjs`
`tests/intentCandidateGate.test.cjs`
`tests/summitSupportIntake.test.cjs`
`.github/workflows/ss-staging-integration-validation.yml`
Run `node --test tests/voiceIntentSearch.test.cjs tests/approvedStagingKnowledge.test.cjs tests/intentCandidateGate.test.cjs tests/summitSupportIntake.test.cjs`.
Also run full `npm test` and `npm run build` on a checked-out development branch with dependencies.
GitHub workflow runs were **not yet visible** at head commit `eee2164fae35baf82de8826678f37de4302ed6fc`; therefore no passing CI claim.

## Known NO GO blockers
1. Live Fly/Twilio application routing/commit/voice selection are unverified. Shared `stellar-twilio-bridge` is not proven an isolated Support release.
2. Sales staging bridge currently blocks lead submission in `callSalesIntakeSubmit`; do not claim lead persistence. The staging DB exposes `stellar_voice_demo_sales_submit_staging`, but its required UUID context and authorization must be verified against trusted session state before wiring it.
3. The intent module only validates model-proposed candidates; **not** autonomous recognition, dispatcher, safety scan or end-to-end tool authorization.
4. Domain-scoped KB retrieval does not publish any pending Co-Pilot/Sales drafts and is not proof of conversational answer quality.
5. The owner-approved exact Echo/Cedar voice profiles and greetings have not been proven active on the running bridge.
6. Stage code and Docker image have not been deployed or verified in live telephony.

## Next owner-authorized isolated engineering steps
Run CI and correct any failures; establish Sales staging-only transaction adapter after trustworthy tenant/session evidence; wire reliable source-backed intent dispatch with independently authenticated safety scanner; independently inspect staging Fly/Twilio routing through Work/browser only if connector access insufficient. Obtain owner authorization for any deployment or webhook update.
