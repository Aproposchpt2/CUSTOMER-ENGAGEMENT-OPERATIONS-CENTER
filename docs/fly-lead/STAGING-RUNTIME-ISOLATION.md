# Fly bridge staging isolation repair

Owner assigned this work agent responsibility for Fly connections and orchestration/KB/intent validation across PMA and Sales/Support, including future production release preparation. Production release, staging deployment, webhook changes, recipient activation and live SMS remain separately controlled. No infrastructure setting is changed by this PR.

## Confirmed defect and correction

Shared server startup previously accepted a staging environment while NETLIFY_BASE_URL was absent; its default was the business origin https://stellaruc.com. The configuration-only guard now rejects staging startup unless NETLIFY_BASE_URL explicitly names the authorized pma-validation gateway. PMA channels additionally require the exact PMA gateway binding. This happens before provider pool creation or listener startup, avoiding a seemingly healthy staging process that could later use production intake.

Enabled specialist intelligence now requires explicit STELLAR_BRIDGE_STAGING=true, the exact staging Supabase project, separate Sales/Summit tenant mappings and a backend credential. Specialist write flags require that mode and explicit staging; they cannot silently activate a different path. Existing per-call signed session, intent, confirmation, write/readback and authorization checks remain authoritative. Presence of a credential does not certify its value or grant new access.

The guard performs no network or DB operation, does not log values and is packaged in BOTH Dockerfiles. Non-staging legacy startup remains outside this guard; it must never be labeled staging merely because its app is informally called a test bridge. No production behavior is activated or changed on a running system.

## Observed app mapping

- ai4-pma-bridge-staging: active v32 machine820e3eb7206d78; configured PMA and Netlify URLs are the exact pma-validation staging alias. Its separate stopped older-image machine83d3d6f733d658 is not the Sales/Support app. Seven partially deployed secrets and OCI/health revision mismatch remain controlled release tasks, documented in docs/pma-fly/AUTHENTICATED-PREFLIGHT-20261025.md.
- stellar-twilio-bridge: separate app, v28 machine6835512a537238 already Started. Public health returns ok=true, stagingOnly=false, commit=null. Its visible machine env contains only FLY_PROCESS_GROUP/PRIMARY_REGION; secret names are AI4CC_INTAKE_KEY, BRIDGE_HMAC_SECRET, OPENAI_API_KEY, OPENAI_REALTIME_MODEL, TWILIO_ACCOUNT_SID and TWILIO_AUTH_TOKEN. Its TOML has no staging env or explicit gateway. No secret values were read. The current gateway cannot be proved from Console config; the matching source's default is business production. Do not send synthetic intake or flip staging flags on that old runtime.
- Netlify discovery found ai4cc-staging, ai4cc-backend-staging and ai4-template-staging. Their existence does not authorize choosing a different voice gateway. The established signed voice path uses pma-validation--ai4cc-staging.netlify.app; no new URL has been guessed or configured.

## Orchestration / KB / intent bindings

PMA: signed call identity -> voice-entry -> scoped gateway assets -> pma adapter -> pma_property_workflow -> Netlify executePmaVoice -> restricted pm_voice_turn_v1 / emergency dispatcher. Knowledge is loaded via pm_public_voice_knowledge_v1 and filtered before prompt injection; the live read-only function returned42 VERIFIED property-public records. Current source selects25v1 intents. The v2.0 operational reference remains distinct from executable bindings and is not automatically published or enabled by its presence in Git.

New specialist mode: signed session -> createSpecialistSession -> authorized profile taxonomy -> assess_specialist_intent and search_specialist_knowledge -> confirmation -> exact tenant writer/readback. Expanded v2 catalog has283 definitions:100Sales,150Support,33shared. The legacy Support orchestrator is a separate path; setting its flag does not enable this taxonomy or every PMA workflow.

Hosted read-only predicates currently return0caller-eligible Sales records and0Summit Support records. Draft source JSON does not authorize caller-facing facts. This PR publishes no KB, changes no audience permissions and never treats an empty KB as ready. The new runtime configuration guard verifies bindings, not content availability or real model recognition.

## Validation and release boundary

Tests cover missing/malicious/production gateway, wrong project, swapped tenants, missing credential, write switches, credential-safe failures and startup order. Docker smoke runs both the dedicated PMA and existing shared Dockerfiles with network disabled and synthetic credentials. Each actual container must reject a production gateway, foreign Support tenant and missing backend credential, then start on the correct configuration and serve /health. Dedicated PMA image retains Node24/baked provenance; legacy shared image remains Node20 with unknown baked provenance. That legacy runtime/provenance upgrade requires a separately reviewed Sales/Support image release; this PR does not certify it as production-ready.

The complete application/bridge suites, isolated HVAC PostgreSQL regression, dependency audits, types/build and actual image smoke are enforced by the isolated CI. The PR is stacked on142 so neither development nor runtime evidence is discarded. No deployment branch merge is performed.

Before any specialist activation, the joint integration owner must incorporate validated changes and the owner must authorize an exact staging release/configuration plan. Resolve the currently deployed version, gateway/signature/session audience, backend credentials, approved KB and independent write switches together. Existing IVR routes allthree products through the PMA staging origin; starting the separate bridge alone does not move signed IVR handoffs there. Do not change that call tree as an incidental setup action.
