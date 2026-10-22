# PMA Fly.io staging migration

Target app: `ai4-pma-bridge-staging` (deployed).
Gateway: `https://pma-validation--ai4cc-staging.netlify.app`.
Bridge: `wss://ai4-pma-bridge-staging.fly.dev/ws/pma`.

The dedicated `twilio-bridge/fly.pma-staging.toml` reuses the existing Node/Docker voice engine. It configures LAX, one shared CPU, 512 MB, port 8080, HTTPS, `/health`, no idle stop, three application-level concurrent calls, and a 45-minute call cap. Existing `fly.toml` and shared Railway Support service are preserved. No accounting, authentication, tenant, knowledge or communication system is duplicated.

## Deployment

Use a separate staging release branch containing the reviewed PMA source; never deploy the implementation branch directly. Authenticate Fly CLI to the intended organization, inspect existing apps before creating anything, then reserve the target app if absent. Resolve any app-name conflict by reviewing the exact hostname allowlist and tests before deployment.

Configure these secrets privately in Fly: `OPENAI_API_KEY`, `BRIDGE_HMAC_SECRET`. Preserve approved `OPENAI_LIVE_MODEL` and `OPENAI_REASONING_MODEL` values where explicitly configured; runtime defaults match the current bridge. The Fly HMAC must match Netlify `BRIDGE_HMAC_SECRET_STAGING`. Masked credentials are not retrievable credentials: do not scrape, reconstruct, print or commit them. If a new HMAC is necessary, set it only on the PMA Fly app and PMA gateway, preserving the separate shared Support bridge secret. Never set live Twilio credentials or production intake keys on this PMA-only app.

From the `twilio-bridge` directory, deploy the release checkout with:

```sh
fly deploy --config fly.pma-staging.toml --ha=false --env BRIDGE_RELEASE_SHA=<reviewed-release-commit>
```

`--ha=false` prevents the initial deploy creating a second staging machine. Inspect Fly deployment, health, PMA enabled state and approved models before activation. For the actual deployed runtime, see the evidence below.

## Activation

1. Release the gateway version that allows the exact Fly host. Existing Twilio signature, test DID, account and caller checks remain mandatory; foreign Fly/Railway hosts are rejected.
2. Verify the synthetic resident binding uses unit `7e5d9c7a-d372-4b06-bcf6-8a1523abb11a` and contact `a0a9111d-2e22-46ad-bd1a-3f7256d52bd5`. Do not substitute another occupant.
3. Set Netlify deploy-preview `PMA_STAGING_BRIDGE_WS_URL=wss://ai4-pma-bridge-staging.fly.dev` and `PMA_CHANNELS_ENABLED=true`, then redeploy the isolated PMA alias using the protected release workflow. Preserve production deploy context.
4. Change only PMA DID +17029351414 / PN9774db9ada62033917f7ff2586d6b8c4 Voice POST URL to the PMA gateway `/api/twilio/pma-voice-staging`. Its old `stellaruc-private-voice-poc` URL caused verified HTTP 404 / Twilio 11200.
5. Verify actual signed stream, audio, interruptions, structured intent and persisted IDs, emergency guidance, knowledge boundaries and failure behavior. Notifications remain simulated/blocked. Do not announce dispatch or saved records without verified tool results.

The existing Railway staging repair was queued as f933b9fe-e5cf-4904-817b-850df742179a during the provider outage. Do not assume it is absent or create repeated deployments. Inspect it separately before any cleanup; no Railway deletion is authorized by this migration.

## Verified deployment and repair evidence — 2026-10-22

- Reviewed runtime source: `5b2a48dfd6846fcd14eb7ad37b936d7cfe22493e`, release branch `release/pma-fly-staging-20261022`.
- App deployed in personal organization, LAX machine `83d3d6f733d658`, one shared CPU / 512 MB; shared IPv4 allocated.
- Remote builder networking failed. Deployment used Fly Machines file injection of the reviewed bridge source into existing immutable image `registry.fly.io/stellar-twilio-bridge@sha256:0e6d717297f5abb01f284bd14a3573939eb61adb52e0f56e0da56e589274bd1f`, command `node /app/server.js`. The existing bridge was not modified.
- Source files, package lock, adapters, knowledge and intent catalog were included. Live dependencies: Node 20.20.2, express 4.22.3, ws 8.22.0. Temporary builder machine was stopped.
- Public `/health` returned `ok:true`, `stagingOnly:true`, correct release SHA, PMA enabled at `/ws/pma`, catalog 1.0, support writes disabled.
- Authenticated synthetic WebSocket probe returned `authenticatedAudioProbe:true`, one media packet and one mark, `received_openai_audio`. This does not establish a successful telephone call.
- New inbound failure at 16:36:11 UTC: call `CA00ee4da0280cd6234cd3ed1cd52e311c`, Twilio 11200, HTTP 404 from the old private-voice-poc hostname. Confirmed in Twilio request inspector.
- Dedicated PMA DID Voice POST URL was corrected and saved to `https://pma-validation--ai4cc-staging.netlify.app/api/twilio/pma-voice-staging`. No production DID, IVR or SMS routing changed.
- Preview-only `PMA_CHANNELS_ENABLED=true` configured. Earlier successful gateway release 39814226139 captured the disabled flag; replacement run `39814792785`, release commit `c0b5336eb8c0a07cd8e3a035d11da0662c4f5dd3`, is queued for an ubuntu-latest runner. No pending environment approvals.
- Gateway unsigned POST still returns HTTP 503 (channels disabled) while rebuild is queued. Do not request another phone test yet.

Remaining: complete queued gateway release; expect unauthorized probes to reach signature/HMAC guards rather than 503; verify synthetic adapter-to-Supabase persistence; then repeat the real inbound phone acceptance test. Never disable signature, account, DID, caller or HMAC checks to make a test pass.
