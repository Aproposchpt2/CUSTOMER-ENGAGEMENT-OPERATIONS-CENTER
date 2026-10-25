# PMA Fly authenticated preflight — October 25, 2026

Supersedes the signed-out-access limitation in RELEASE-PREPARATION.md. Owner completed secure browser sign-in. All console actions were read-only. No secret value was opened, copied or edited. No deployment, restart, start, stop, scale, secret synchronization, destructive cleanup or Twilio action occurred.

## Confirmed console facts

- Organization breadcrumb: Personal; dashboard slug jeffrey-mitchell. App ai4-pma-bridge-staging is deployed.
- Release v32: Complete, ROLLING, initiated by Jeffrey Mitchell; created October 24 18:04 UTC, updated 18:05 UTC.
- Active machine 820e3eb7206d78 (long-pond-2285): Started, LAX, shared-cpu-1x@512MB, process group app, uncordoned, no active lease. Version 01M5QHCTMP67CZHVCZ4K2WY6RJ; release metadata v32 / rel_krm823dxg1m9yxw4. Listed events show launch and successful start at 18:05 UTC; no repeated crash loop is visible in the displayed events. This is not an unlimited historical-log assertion.
- Active image: registry.fly.io/ai4-pma-bridge-staging:deployment-01M5QHC0YYV0R52WESH68JV95T.
- Registry v32 immutable digest: sha256:a07062f86d5c24b691fcd7f1dae368c668eeb439becf567eba57f09bb3d967b3, linux/amd64.
- Its image layers declare NODE_VERSION=20.20.2 and OCI revision/BRIDGE_RELEASE_SHA=9905d810954ccd688661f51605a7899be5effcce. This establishes image metadata, not an executed `node --version` or cryptographic source-to-file attestation.
- Public /health reports commit 12c54995fb746e9d8d3937a240031aa58bad9da5. This differs from the baked image revision. Mutable release metadata can override the Docker ENV; the existing BRIDGE_RELEASE_SHA secret is consistent with that mechanism, but its value was not revealed. Do not present health.commit as independently verified image source.
- Stopped machine 83d3d6f733d658 (pma-staging-1): Stopped, LAX, shared-cpu-1x@512MB, process group None, uncordoned, no lease. Image registry.fly.io/stellar-twilio-bridge@sha256:0e6d717297f5abb01f284bd14a3573939eb61adb52e0f56e0da56e589274bd1f. Environment includes BRIDGE_RELEASE_SHA=786d90df8ba4bf86f8941423663066b9526cac74. Last updated October 24 16:35 UTC. Events show user stop/exit130; earlier proxy-initiated starts are visible at 16:30 and 03:51 UTC. Do not assume a stopped machine can never auto-start. It was not started or destroyed.
- Fly explicitly warns that the two different images make app scaling unsafe until reconciled.

## Deployed configuration

The console fly.toml matches the dedicated repository TOML: Node environment production within the staging app; STELLAR_BRIDGE_STAGING=true, PMA_CHANNELS_ENABLED=true, VOICE_DEMO_IVR_ENABLED=true; both gateway URLs target https://pma-validation--ai4cc-staging.netlify.app; port8080, max3 calls, duration2700000ms; legacy Support writes/orchestration env flags false. Health check GET /health, 15s grace, 30s interval, 5s timeout. HTTP auto-start true, auto-stop false, minimum1 machine, concurrency soft3/hard6; VM512MB shared1x. Active machine's displayed non-secret environment matches these values.

## Secret status and specialist activation

All seven listed secrets are **partially deployed**, not necessarily missing:
BRIDGE_HMAC_SECRET; BRIDGE_RELEASE_SHA; IVR_VOICE; OPENAI_API_KEY; PMA_VOICE; STAGING_VOICE_ORCHESTRATION_ENABLED; VOICE_DEMO_WORKFLOWS_ENABLED.

Do not press Deploy Secrets indiscriminately; that changes running machine configuration. The Console did not establish which version each machine has. Also note the orchestration flag exists in both TOML and secrets; its effective value cannot be inferred from TOML alone.

The inspected environment/secret lists do not contain the new SS_STAGING_INTELLIGENCE_ENABLED, STAGING_SUPABASE_URL, SS_STAGING_SALES_TENANT_ID, SS_STAGING_SUPPORT_TENANT_ID or STAGING_SUPABASE_SERVICE_ROLE_KEY names. The isolated Docker smoke supplies synthetic values for those bindings; it does not prove that the deployed image has the new specialists activated. Backend-only credentials and write switches must be configured through a separately authorized staging release, never guessed or copied into code.

## Health, logs and rollback evidence

Public HTTP200 /health with PMA/IVR enabled is positive process evidence; the console confirms the configured health-check policy. The inspected machine page did not display a current per-check pass/fail result. Live machine log pane waited for new logs; Previous Starts reported no previous starts in recent logs. No runtime Node execution, full historical errors or per-machine secret version attestation was obtained.

Registry supplies this exact **current known-running image** as a future rollback reference:
registry.fly.io/ai4-pma-bridge-staging@sha256:a07062f86d5c24b691fcd7f1dae368c668eeb439becf567eba57f09bb3d967b3

It is a captured image reference, not proof that rollback permission, image pull or rollback execution has been tested. Preserve the matching current configuration and secret state before any approved release. No rollback was executed.

## Corrective source preparation

The prepared candidate now adds a read-only build revision file to the dedicated image. /health retains its legacy commit field and adds imageRevision, nodeVersion and revisionMismatch. Missing/malformed build metadata yields null rather than falsely treating an environment SHA as baked provenance. A stale secret is explicitly tested in the actual network-none Docker startup test; imageRevision must still match the OCI label and tested source. This does not fix or alter the currently serving image.

## Release actions requiring explicit owner authorization

1. Integrate the reviewed corrective candidate through the joint integration owner.
2. Reconcile the stopped legacy-image machine before scaling/releasing. Review its actual service/autostart configuration and intended retention; do not assume destruction is approved or that a generic deploy will exclude process group None.
3. Resolve per-machine pending secret versions, stale release metadata and specialist staging bindings as one controlled release plan. Never globally synchronize unreviewed pending values.
4. Deploy only the approved dedicated image to the intended machine(s), with no IVR/Twilio voice configuration change. Compare OCI revision, new health.imageRevision, runtime Node and configured release metadata.
5. Verify actual per-machine checks, then perform only separately authorized telephone/SMS tests. Existing owner alerts and three-recipient activation gates remain.

Decision: image candidate may earn CONDITIONAL GO after its new regression run. Live release remains gated by owner authorization and controlled machine/secret reconciliation. No infrastructure mutation was authorized by the current preparation directive.

Observed pages:
https://fly.io/apps/ai4-pma-bridge-staging/releases/32
https://fly.io/apps/ai4-pma-bridge-staging/machines/820e3eb7206d78
https://fly.io/apps/ai4-pma-bridge-staging/machines/83d3d6f733d658
https://fly.io/apps/ai4-pma-bridge-staging/configuration
https://fly.io/apps/ai4-pma-bridge-staging/secrets
https://fly.io/apps/ai4-pma-bridge-staging/registry/image/44008455/version/32/tag
