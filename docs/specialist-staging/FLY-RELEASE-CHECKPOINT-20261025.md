# Fly Sales/Support release checkpoint — October 25, 2026

Owner authorized the Sales/Support staging release and configuration in this conversation after receipt of PR 147. This authorization persists; no repeat release approval is requested. PMA, main IVR/Twilio routing, production and live notifications remain outside this release.

## Exact candidate independently reviewed
PR 147 is open/draft at 9d6b35f4454d92d4223bca75bf72b78d9d2600c5. Source branch integration/specialist-source-staging-ready-20261025. It includes runtime guards and provenance corrections from 142/143 and scoped caller integration from 146. PMA domain and voice-entry files are unchanged relative to d8f68a4.

Fresh isolated bridge/source tests: 80/80 PASS. Exact-source CI 40235091143, job121294838573: every application/bridge/HVAC/types/build/audit/Docker step SUCCESS. Source/readiness CI40235091006 source-inventory SUCCESS; its manual-dispatch caller gate was SKIPPED on this push, not a hosted verification pass.

Actual isolated image evidence from exact-source CI:
- Dockerfile.pma-staging: Node24.22.1; image ID sha256:199fdafdd8cc62706204b82731c29c20e13b5db261c3b80e9edfc97634330acf; baked revision 9d6b35f4454d92d4223bca75bf72b78d9d2600c5; startup/health/scoped-v2 module initialization PASS.
- Generic Dockerfile: Node20.20.2; image ID sha256:e4cdf5cc2149b368b6be7850d9926d2c2f245ae4a60d51ccc887654c3494dcea; startup/health PASS but no baked image revision. Do not call mutable health.commit immutable image provenance.
- Both tests used network none and fake credentials. Image IDs are isolated CI build identities, not proof of pushed registry images.

## Hosted staging data independently checked
Project hvzauakkhlivzeqatfqm.
All 269 exact stable-ID RPC lookups returned the expected UUID and full article content: Sales100, platform Support150, Summit HVAC19.
All are approved/published/test-only/currently eligible scoped-v2 articles.
Actual expiry range: November24,2026 21:10:34.639575Z through21:10:50.409534Z (13:10 Pacific).
Sample retrieved IDs:
- Sales SAL-001: 2b8ff80a-9b4e-5d11-803b-e1489dd49ebf.
- Summit CALLBACK_REQUEST: 57b5f120-237d-5b9f-b2d4-f8f728dcb10a.
- Platform SUP-001: a7669077-6423-5f38-a1b4-43980f43803f.
Wrong tenant/HVAC, Summit/Sales and same-tenant cross-product stable-ID queries all returned zero.
Caller RPC denies anon/authenticated EXECUTE; table has RLS and denies those roles SELECT.
No data was published, modified or activated by this review.

## Target and path gates
Owner identifies stellar-twilio-bridge as the separate Sales/Support staging application. Fresh public health responds ok=true, activeCalls=0, stagingOnly=false, commit=null. This is the old runtime, not scoped-v2 activation.
Historical v28/machine6835512a537238 evidence must be refreshed before deployment or rollback selection.
No current immutable rollback image was captured in this turn.

The current voice-entry ORIGIN and gateway provider-signature origin are ai4-pma-bridge-staging.fly.dev. IVR branches still reach that app. Updating stellar-twilio-bridge alone does not move existing IVR calls.
Keep PMA and IVR unchanged. Signed acceptance on the separate bridge requires established trusted session/HMAC compatibility; direct Twilio entry URLs currently generate PMA-origin streams. Do not silently alter origins, provider signature validation or the call tree.

Required specialist configuration:
SS_STAGING_RETRIEVAL_VERSION=scoped-v2
STELLAR_BRIDGE_STAGING=true
SS_STAGING_INTELLIGENCE_ENABLED=true
STAGING_SUPABASE_URL=https://hvzauakkhlivzeqatfqm.supabase.co
SS_STAGING_SALES_TENANT_ID=5885a020-d363-4c27-910a-c035eda132f5
SS_STAGING_SUPPORT_TENANT_ID=d7e80001-0000-4000-b000-000000000001
NETLIFY_BASE_URL=https://pma-validation--ai4cc-staging.netlify.app
STAGING_SUPABASE_SERVICE_ROLE_KEY: existing authorized staging backend credential, never printed.
Preserve existing HMAC/provider credentials. Write flags remain independent; start with both disabled for retrieval-only validation and enable only the explicitly approved synthetic transaction phase.
Do not assign platform Support articles to Summit. Sales Echo / Summit Cedar and TICKET_CREATION remain the approved bindings.

## Execution blocker and next steps
Chrome extension listed the user's logged-in Fly dashboard, but two documented attempts to claim it timed out in Emulation.setFocusEmulationEnabled (first3s, then10s). Browser troubleshooting guidance was read. No further claim loop or alternate-account workaround was attempted.
Workspace has no Fly CLI and no FLY_API_TOKEN/FLY_ACCESS_TOKEN. No Fly connector or existing Fly deployment workflow is available.
Therefore no actual deployment, secret/config change or telephone acceptance occurred.

Next: restore the local Chrome extension connection and keep the logged-in Fly dashboard available. Then:
1. Reinspect app, current machine/service configuration, running image digest and secret names/status; capture matching rollback state.
2. Select the exact validated provenance-bearing image/build and scoped-v2 configuration for Sales/Support only. Avoid relying on the generic image's absent provenance.
3. Deploy through the authorized process, verify effective running source/Node/config/health, and check logs.
4. Run signed-session non-sending retrieval and isolation acceptance on the actual serving bridge.
5. Establish a reviewed separate specialist call path without changing the existing PMA/IVR; only then perform controlled telephone acceptance and authorized synthetic write/readback tests.
6. Record actual KB UUIDs, session/call references, consent/corrections, deduplication and UNKNOWN recovery. The630 voice scenarios remain NOT EXECUTED.

Decision: candidate/data validation PASS; actual Fly release and telephone acceptance BLOCKED by deployment access and unresolved separate-call path. No new owner release authorization is needed for the already authorized scope.
