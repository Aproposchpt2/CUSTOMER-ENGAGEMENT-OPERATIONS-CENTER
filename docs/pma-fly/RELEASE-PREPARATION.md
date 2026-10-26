# Fly PMA joint candidate — engineering handoff

Staging only. No deployment authorization. Do not run release/rollback commands until separately authorized. No Twilio settings, knowledge publication, machine changes or live notifications are included.

## Source and incorporation

PR #140 is the authoritative joint candidate. PR #141's missing specialist dependency correction was independently checked and is already merged by the integration owner. The integration head observed during this work was `acf62316945a95cf1f08ae4b3171f6a9c638bc9f`, including its new image-build CI gate. This corrective PR preserves that update and extends the same dependency chain. Do not independently remerge PRs #129/#136/#139. Integrate this PR through the integration owner; do not merge a deployment branch without owner release authorization.

Changes: Node 24 Alpine instead of Node 20; recursive local-require closure over the Docker COPY destinations; real isolated Docker build, provenance label, module initialization and HTTP health tests; compatible bridge body-parser 1.20.9 lock repair; Next.js 15.5.28 and PostCSS 8.5.31 application security candidate. The Next.js change is outside the dedicated bridge image and still needs Netlify adapter/runtime acceptance before gateway release. Existing bridge business logic, prompts, tools, session authorization, tenant policies, IVR routing and Fly configuration are unchanged.

## Actual infrastructure evidence and access limit

Read-only GET `https://ai4-pma-bridge-staging.fly.dev/health` returned HTTP 200 on October 25, 2026, reporting `stagingOnly:true`, commit `12c54995fb746e9d8d3937a240031aa58bad9da5`, PMA enabled and the three expected routes. This is self-reported process metadata, not OCI provenance or proof of every machine's configuration.

The available browser redirected the app URL to Fly's sign-in page. No Fly API credential or authenticated CLI configuration was available in this workspace. Therefore current organization, release/image digest, machine state/restart history, runtime Node version, per-machine env/secret availability and rollback permissions remain unverified. Historical v32/image/machine references in older reports are not fresh confirmations. Repository TOML proposes LAX, 512 MB, GET /health every 30 seconds, 15-second grace, 5-second timeout, dedicated gateway URLs; these values are not claimed as deployed facts.

No Railway service was inspected, configured or deployed.

## Tests and interpretation

- Application suite: 305/305 PASS, including emergency persistence/evidence, authorization, callback signatures, duplicate and UNKNOWN-state handling.
- Bridge suite: 59/59 PASS, including PR #136's two emergency-tool invocation/tracing regressions and signed IVR handoffs.
- Specialist/shared subset: 44/44 PASS (included in application total), validating Echo/Cedar greetings, Sales category isolation, Summit tenant binding, confirmation, persistence/readback, safety and UNKNOWN reconciliation.
- Isolated PostgreSQL HVAC: PASS; no hosted write or SMS.
- TypeScript and Next.js 15.5.28 optimized build: PASS; existing Supabase Edge Runtime process.version warning remains.
- Root application and production bridge npm audit: zero advisories after remediation, based on the registry snapshot captured in dependency-audit.json. This is not an OS-image CVE scan.
- Actual Docker execution evidence is produced by `.github/workflows/pma-fly-image-validation.yml` and `scripts/pma-fly/image-smoke.mjs`. The disposable container has `--network none`, fake credentials, writes disabled and no published ports. Tests assert /health, exact image revision, PMA and IVR enabled, Echo/Cedar module initialization, tenant isolation and no missing-module/startup exceptions. Do not call the container gate passed until its run and image-smoke.json are inspected.

Neither mocked provider success nor synthetic test ACK is handset delivery/vendor acceptance. No real emergency workflow was invoked. Caller-public KB publication and telephone UAT remain separate gates.

## Read-only Fly preflight after access is restored

Run from a trusted authenticated terminal, after checking `fly version` and relevant `--help`. Retain evidence privately; redact secrets and caller data. Never paste secret values into reports.

```sh
fly status --app ai4-pma-bridge-staging --json
fly releases --app ai4-pma-bridge-staging --image --json
fly machine list --app ai4-pma-bridge-staging --json
fly checks list --app ai4-pma-bridge-staging
fly secrets list --app ai4-pma-bridge-staging
```

Inspect each actual machine's image, config, health and event history through the authenticated Console or documented read-only CLI. Compare names/presence only for secrets. Confirm organization/account and permissions, pending versus deployed secrets and an exact usable prior image digest. Do not restart or synchronize secrets as an audit action.

Expected public config: dedicated app, staging true, PMA channels true, IVR true, exact PMA_STAGING_BASE_URL and NETLIFY_BASE_URL `https://pma-validation--ai4cc-staging.netlify.app`. OPENAI_API_KEY and BRIDGE_HMAC_SECRET must exist. Existing Twilio credentials and approved PMA voice must remain. Specialist activation additionally requires SS_STAGING_INTELLIGENCE_ENABLED, exact staging Supabase URL, Sales/Support tenant mappings and a backend-only staging credential. HVAC/Sales write switches must follow explicit owner approval; image support does not grant activation authority. Do not print any credential values.

## Release commands — prepared, NOT EXECUTED

Only after integration-owner incorporation, all gates and explicit owner release approval. Use a clean checkout of the exact approved SHA, not a moving branch. Record the current image digest and configuration before deployment. Avoid an old BRIDGE_RELEASE_SHA secret overriding the baked image SHA; resolve that under authorized release control and verify the observed revision afterward.

```sh
# From the repository root, after checking out the approved revision:
PMA_RELEASE_SHA=$(git rev-parse HEAD)
cd twilio-bridge
fly deploy . --config fly.pma-staging.toml --app ai4-pma-bridge-staging \
  --build-arg PMA_SOURCE_SHA="$PMA_RELEASE_SHA" --strategy rolling
```

This affects the existing shared call bridge and requires a quiet approved window even though it is staging. Do not change voice webhooks or the call tree. Validate every machine's image/Node/env, health and source revision, then perform only separately authorized controlled phone tests. Stop on unexpected revision, signature errors, missing modules, health failure or safety/evidence regressions.

Rollback preparation: retain the exact previous immutable image reference and prior configuration snapshot. After rollback authorization, use the documented `fly deploy --image` path with that captured image and matching config, rather than guessing a release/version. This command is deliberately a template until authenticated preflight supplies the real image:

```sh
# PREVIOUS_VERIFIED_IMAGE must be the captured immutable registry reference.
fly deploy . --config fly.pma-staging.toml --app ai4-pma-bridge-staging \
  --image "$PREVIOUS_VERIFIED_IMAGE" --strategy rolling
```

No source-only rollback reverses database/preferences or secret changes. This work makes none of those changes. Preserve notification evidence and the owner destination ending 8039.

Official references: https://docs.fly.io/flyctl/cmd/fly_deploy ; https://docs.fly.io/flyctl/cmd/fly_releases ; https://docs.fly.io/flyctl/cmd/fly_status ; https://nextjs.org/docs/app/guides/upgrading/version-15 . Advisory identifiers/ranges are recorded in dependency-audit.json. Next.js is absent from the Fly image's separate production package manifest; body-parser is present and fixed.

## Executed image gate

GitHub Actions run https://github.com/Aproposchpt2/CUSTOMER-ENGAGEMENT-OPERATIONS-CENTER/actions/runs/40201512936 completed successfully. It checked out exact source `2800f3620f61e9922bbeda05e4b80337c32f95cc`, built the dedicated Dockerfile and started the actual resulting image `sha256:92bcd903843bb306dd82114dbcef299b0c966cfd95f4c063e2a1f37ef21ab689` with network disabled. Node v24.22.1, /health, exact revision, PMA and IVR flags, Echo/Cedar initialization and tenant separation passed. `image-smoke-initial.json` records the extracted run evidence; artifact ID 12601918105 is retained on that run. This was actual Docker execution, not only static assertions. No image was pushed or released to Fly.

Engineering recommendation: CONDITIONAL GO for the isolated image candidate; NO release execution until authenticated Fly preflight and explicit owner authorization. The integration owner must incorporate this corrective PR. Netlify gateway release/adapter validation is separate from the Fly image, and caller-public knowledge/live telephone quality remain unverified. No live SMS delivery or vendor acceptance is claimed.
