# PMA Fly.io staging migration

Target app: `ai4-pma-bridge-staging` (name reservation still requires authenticated Fly access).
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

`--ha=false` prevents the initial deploy creating a second staging machine. Inspect Fly deployment, health, PMA enabled state and approved models before activation. No machine or app has been created by preparation alone.

## Activation

1. Release the gateway version that allows the exact Fly host. Existing Twilio signature, test DID, account and caller checks remain mandatory; foreign Fly/Railway hosts are rejected.
2. Verify the synthetic resident binding uses unit `7e5d9c7a-d372-4b06-bcf6-8a1523abb11a` and contact `a0a9111d-2e22-46ad-bd1a-3f7256d52bd5`. Do not substitute another occupant.
3. Set Netlify deploy-preview `PMA_STAGING_BRIDGE_WS_URL=wss://ai4-pma-bridge-staging.fly.dev` and `PMA_CHANNELS_ENABLED=true`, then redeploy the isolated PMA alias using the protected release workflow. Preserve production deploy context.
4. Change only PMA DID +17029351414 / PN9774db9ada62033917f7ff2586d6b8c4 Voice POST URL to the PMA gateway `/api/twilio/pma-voice-staging`. Its old `stellaruc-private-voice-poc` URL caused verified HTTP 404 / Twilio 11200.
5. Verify actual signed stream, audio, interruptions, structured intent and persisted IDs, emergency guidance, knowledge boundaries and failure behavior. Notifications remain simulated/blocked. Do not announce dispatch or saved records without verified tool results.

The existing Railway staging repair was queued as f933b9fe-e5cf-4904-817b-850df742179a during the provider outage. Do not assume it is absent or create repeated deployments. Inspect it separately before any cleanup; no Railway deletion is authorized by this migration.

At preparation: Fly account sign-in and deployment credentials remain required. No Fly deployment or successful call is claimed.
