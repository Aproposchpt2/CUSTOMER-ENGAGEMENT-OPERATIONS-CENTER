# STELLAR-PMA-005-R4 — independent review and staging release readiness

October 23, 2026, Pacific. Reviewer: Agent 05. Recipient: STELLAR-PMA-ORCHESTRATOR.

## Decision and exact source

CONDITIONAL GO for preparation of a paired, read-only staging candidate. NO GO for deployment, merge, voice-write activation or production under this assignment. The original repair is not accepted unchanged: the independent review reproduced additional privacy defects and found a missing PMA tool-dispatch boundary. Corrective source is published separately for renewed review; its exact SHA is recorded in the corrective PR/publication receipt. Agent 05 reviewed Agent 06's repair independently but authored these corrections; another reviewer must accept the corrections.

- PR #101 reviewed HEAD: `6833df46067e5bf54e53964412f8f3f6e78f66d0`.
- Independently matched Git tree: `063322d5affa88cad5e6fc7842d14ae2067983e8`.
- Agent 05 base of PR #101: `3167e04f4fe2d3666a995c6bdc806eded5c5707c`.
- Published repair ancestry: `2d25df5` → `92dc6b9` → `b437061` → `6833df4`.
- Corrective branch: `review/pma-005-r4-agent05-20261023`, directly based on the reviewed HEAD.
- Tracking: issue #102. Corrective PR targets PR #101's repair branch, never main.

## Audit findings and resolution

| Area | Independent result |
| --- | --- |
| Bedroom matching | Database equality, snapshot recheck and bridge recheck enforce exact requested bedrooms. Unit 415/one bedroom and 301/three bedrooms cannot satisfy two bedrooms. |
| Studio/any size | Zero is an explicit studio filter; omitted bedrooms is any size. Signed payload and endpoint tests reproduce both. Model compliance still requires telephone acceptance. |
| Freshness | Strictly newer than 24 hours; future/invalid timestamps rejected. Invalid calendar dates, null payloads and >200-row incomplete queries fail safely. Valid vacancies in mixed data establish those records only, not complete inventory. |
| Failure classification | Available, no verified match, occupied/unavailable, stale, invalid inventory and transport/contract failure remain distinct. Bridge creates safe speech locally and strips arbitrary upstream reply. |
| Trusted binding | Signed transport, staging URL/project gates, persisted call/session equality, active route, lifetime, configured tenant/property and property eligibility reviewed. Existing identity/consent/safety/request-only tests pass. No resident voice authorization is newly established. |
| Privacy defect — fixed | PMA lifecycle model/status/item fields, tool error/name, session-open and phone transport error paths still allowed free-form data into logs. The added runtime test failed at original HEAD and passed after PMA-only metadata/error redaction. stdout and stderr are both captured. No raw provider tool ID is logged: SHA-256 correlation is deterministic; original ID remains in the protocol response. PMA stream events omit arbitrary stream SID. |
| Dispatch boundary — fixed | PMA tool execution shared dispatch branches with Sales/Support. Hidden model tool names could reach Support intake logic despite not being advertised. PMA now accepts only its two advertised tools before dispatch. Regression attempts Support intake, Sales submission, transfer and end-call; no request/save/timer executes. Sales/Support dispatch remains unchanged. |
| Publication safety — fixed | Added review-branch Netlify cancellation and regression. Added optimized application build to review CI and enabled the same nondeploy workflow for the corrective branch/PR base. No deployment commands or credentials are added. |

## Independent validation evidence

| Check | Original reviewed source | Corrected source |
| --- | --- | --- |
| Complete `npm test` | 264 pass, 0 fail/skip | 266 pass, 0 fail/skip |
| Complete bridge suite | 55 pass, 0 fail/skip | 55 pass, 0 fail/skip |
| TypeScript | Pass | Pass |
| Optimized Next.js build | Pass, 72 static pages | Pass, 72 static pages |
| Whitespace | Pass | Pass |
| Privacy reproduction | New regression fails with synthetic private metadata | Pass; stdout/stderr contain no sentinel |

GitHub jobs for original push run `40046050548` and PR run `40046054099` were independently read: dependency install, application/bridge suites, TypeScript, Docker build, OCI revision check, runtime embedded revision and rejection of a missing source revision all succeeded. The original workflow did not run the Next.js build; the reviewer reproduced it locally and added it to corrective CI. A PR run may check a synthetic merge commit; do not call that the source HEAD. Record the actual checkout SHA, image label and health SHA together. Docker is unavailable locally; original CI image evidence does not attest a future corrective image or the deployed historical machine.

No local `psql`, `postgres`, `initdb` or Docker executable was available. Attempted package-manager preparation failed with setgroups/seteuid permission restrictions; no escalation or alternative credential access was attempted. Therefore true independently connected, overlapping PostgreSQL concurrency tests were NOT run. The complete suite's isolated PGlite SQL/authorization/idempotency acceptance passed, but is not a substitute for that gate. No remote database, schema, migration or configuration was changed.

## Paired source/configuration staging plan — NOT EXECUTED

1. Obtain a separate review of the corrective exact HEAD and its CI. Freeze that full SHA for BOTH Netlify application and Fly image. Build in a clean checkout with locked dependencies; record tree, build log and immutable artifact/deploy identifiers. Never silently replace the approved SHA with main or a moving branch.
2. Recheck current provider state: all Fly machines (including stopped), image digests, versions, pending secrets, effective environment and active Netlify alias/deploy. Existing report references are historical, not independently refreshed by this review. Do not start/scale the stopped machine. Resolve pending configuration before approval, without copying secrets into evidence.
3. Review paired staging configuration: Fly `ai4-pma-bridge-staging`, `twilio-bridge/fly.pma-staging.toml`, staging-only Dockerfile and `PMA_SOURCE_SHA=<approved SHA>`; application alias `https://pma-validation--ai4cc-staging.netlify.app`; Supabase `hvzauakkhlivzeqatfqm`; approved synthetic tenant/property/contact/test caller and dedicated DID. Compare both ends of HMAC configuration without exposing values.
4. Keep Fly `STAGING_VOICE_ORCHESTRATION_ENABLED=false` and `STAGING_SUPPORT_WRITES_ENABLED=false`; keep server `PMA_VOICE_INTEGRATION_ENABLED=false`, disabled private PMA voice configuration, and synthetic tours OFF. Review the existing gateway read-enabling `VOICE_DEMO_WORKFLOWS_ENABLED` separately: it also gates Sales/Support gateway operations, and is NOT proof that all writes are disabled. Do not change it or any binding under this assignment. Preserve existing routes/prompts/voices.
5. After separate approval only, release both components during a controlled synthetic-call window. Netlify repair/review builds are intentionally canceled; a release operator must use the approved staging release workflow/branch or approved immutable artifact, never remove the guard to bypass review. Run the read-only preparation script from a clean checkout. The returned prior targets must be freshly reviewed; new registry/deploy digests stay unknown until built.
6. Smoke checks: exact health source revision versus OCI label/build checkout; active Netlify alias versus pinned source deploy; private endpoint rejects unsigned requests; wrong/closed/expired/cross-session requests deny before inventory; studio/any-size wire scope; every response state; no sensitive telemetry; no new contacts/requests/bookings/notifications; IVR/Sales/Support unchanged. Never refresh timestamps solely to make stale inventory pass.

## Telephone acceptance — after separate reviewed release gate

Use only the approved synthetic caller/DID. Independently verify tool request, returned state and spoken answer together. Cover two bedrooms against incident inventory; fresh one/three-bedroom-only data; fresh occupied-only data; empty inventory; stale/invalid data; explicit studio; any-size omitted filter; a verified fresh synthetic two-bedroom; HTTP/DB failure/timeout; repeated tool envelopes; interruption and disconnect; emergency precedence; denied resident maintenance/status; IVR and Sales/Support smoke calls.

For each test retain approved source SHA, Netlify deploy ID, Fly release/machine/image digest, call/session IDs, requested and returned bedroom counts, state, timing and redacted actual speech. Tool IDs in PMA logs are `sha256:<digest>`; hash the original provider ID to join it. Existing authorized recording/transcript sources may supply speech evidence; do not re-enable raw text logs or provision recordings without authorization. Local mocks are not telephone evidence. Acceptance fails on wrong-bedroom claims, stale-as-current claims, empty/failure confusion, incorrect studio scope, private log content, writes or changed departmental behavior.

## Rollback — NOT EXECUTED

Before release capture and approve BOTH current staging artifacts and complete effective configuration. Historical Fly reference: release v4 `rel_95o6zr7vox4m2g08`, machine `820e3eb7206d78`, version `01M5NEZPBJCBZAE0KY84PGGV1J`, image digest `sha256:1955bbc2558e3a25a5848a4079b05e090ee81dee0b65c296b0990814250d2647`. Historical Netlify: deploy `6adae7c95030f9ac2280a356`, server-function digest `34d77a6e71bf9a1d791f636e5c479ea7e4149c1f6fc5cb6d216ea9f35d52a533`. These are retained evidence, not freshly verified rollback authorization or proof of historical source SHA.

On failed provenance, health, binding, privacy, inventory or routing acceptance: stop synthetic calls, preserve evidence, and have the separately authorized operator restore the approved matching image/configuration and application alias pair. Verify all machines, source/artifact identities, disabled write/tour flags and departmental routes again. Prefer suspending the PMA test to continuing known incorrect answers. Restoring an older known-defective pair does not grant readiness. No database rollback is needed: this patch adds no migration/data writes.

## Outstanding release blockers

Fresh corrective-source review and CI; provider-backed paired source/configuration and rollback approval; independent telephone QA; true separate-connection PostgreSQL race evidence; resident identity integration before voice maintenance/status; owner calendar/policy/emergency-contact decisions; and independent deployed-routing verification. Historical original audio/full tool payloads/source attestation remain bounded evidence gaps. This report makes no claim that the current deployment contains these repairs.
