# STELLAR-PMA-005-R3 — source publication and staging release plan

Date: October 23, 2026, Pacific. Author: Agent 06. Review recipient: STELLAR-PMA-ORCHESTRATOR / independent reviewer.

This document supersedes the earlier recommendation-only handoffs for source completion. Repairs are to be published for independent review. Deployment, merging, voice writes, tour activation, and production changes require the separate approved release gate. Agent 06 authored these repairs and cannot independently approve them.

## Recovered baseline and corrective engineering

Recovered clean branch `repair/pma-005-availability-incident-20261023` at `50f901d7ba68f6a5cf675cc20fe9f2f78ac4b472`. It includes repair `a62b48568a60fb3b6c1ad0c51365e55ac8e4c0b2` on corrected Agent 05 base `3167e04f4fe2d3666a995c6bdc806eded5c5707c`. The final publication receipt identifies the exact new source SHA and remote review URL. The PR targets `repair/pma-003-agent05-qa-20261023` to isolate these repairs from all unmerged PMA implementation history. It is not a production merge request.

R3 repairs the remaining cases rather than merely listing them: missing/null/non-array database payloads now fail instead of becoming empty inventory; missing labels/bedrooms/status/timestamps and invalid vacancy dates classify as invalid inventory when no valid vacancy can be established; fresh occupied/unavailable matching rows have their own truthful result; PMA session ID must equal the requested ID before inventory or knowledge access; malformed/unauthorized adapter requests return safe explicit speech. Any-size omits the filter, studio uses zero, and exact two-bedroom matching is enforced at query, snapshot, and bridge layers.

| Result | Meaning | Spoken-response requirement |
| --- | --- | --- |
| `AVAILABLE` | At least one exact-bedroom, fresh, vacant, valid dated record | Describe only returned fictional staging units and recorded dates; no booking/move-in guarantee |
| `NO_VERIFIED_MATCH` | Successful lookup with no matching eligible record | Say the lookup completed and no verified match was found; do not assert none exist |
| `UNAVAILABLE_UNITS` | Matching fresh records are occupied/unavailable, with no verified vacancy | Explain recorded unavailable status; offer staff review, without naming resident/occupied unit details |
| `INVENTORY_STALE` | No verified vacancy and matching records exceed 24 hours | Say records are out of date and current availability cannot be confirmed |
| `INVALID_INVENTORY` | No verified vacancy and necessary inventory fields are missing/invalid | Say data is missing/invalid; availability remains unknown |
| `LOOKUP_FAILED` | Transport/database failure, timeout, missing/legacy/malformed tool contract | Explain verification failed; do not call this a successful empty result |
| `INVALID_FILTER` / `UNAVAILABLE` | Invalid arguments or failed authorization/staging gates | Clarify the count or state the lookup cannot be verified; no unit claims |

Fresh means a finite timestamp newer than the strict 24-hour boundary and no later than lookup time. SQL DATE remains a calendar label. Stale, invalid or occupied records are not emitted as vacant units. Mixed records may return independently valid vacancies; this never establishes completeness of all inventory. A bounded database response beyond 200 rows fails for human review rather than presenting a truncated negative result. The legacy backend contract fails closed at the bridge; both application components must be released together.

## Call evidence and provenance

The provider addendum records the original call evidence: 657 SID-matching Fly/Grafana rows, partial reconstructed transcript, exact PMA session binding, model `gpt-live-1`, and TWILIO_STOP disconnect. Correlated database requests returned HTTP 200 for bedrooms 2 and 0. The agent initially reported no two-bedrooms, later used unknown wording, and claimed an any-size search while the corresponding request filtered studios. Historic full tool arguments/output were excluded from generic bridge logs. The earlier Unit 415 claim is not present in this call's recovered fragments and remains historically unresolved.

R3 adds safe availability tool start/completion telemetry without caller number, name, transcript, credentials, raw arguments, raw result, or occupied-unit details. Correlation fields are the provider call SID, trusted session ID and tool-call ID, plus requested/returned bedroom counts, classified outcome and duration. Retention is supplied by provider stdout logging; no new recording or logging service is provisioned.

Final privacy hardening suppresses PMA transcript/text payload logs and replaces other generic PMA provider/delegation/error details with safe event metadata. The historical transcript evidence predates this change. Sales and Support logger behavior is retained. Future telephone acceptance must use an independently authorized recording/transcript source; do not re-enable raw customer text logging to obtain it.

`Dockerfile.pma-staging` now rejects a missing/invalid `PMA_SOURCE_SHA`, embeds `BRIDGE_RELEASE_SHA`, and writes OCI label `org.opencontainers.image.revision`. The dedicated Fly configuration selects that Dockerfile. The shared bridge Dockerfile, deployed IVR routes and Sales/Support prompts remain unchanged by R3. The existing health endpoint exposes the embedded revision. Release review must compare the health SHA, immutable registry image label, build log source, and approved Git SHA; any mismatch blocks acceptance.

Netlify repair-branch and PR builds are cancelled by the existing build guard using either HEAD or BRANCH. Other release and production branch behavior is preserved. A separate CI workflow performs regression and a local-only image build/provenance check; it contains no deployment, image push, Fly credentials or Netlify credentials. CI also requires image creation without a revision to fail. Docker is unavailable in the local workspace; image execution verification is assigned to this nondeploy CI job and its actual result must be inspected.

## Prepare an exact release manifest

After the final commit and clean worktree, run this read-only command from the repository:

```sh
node scripts/pma-prepare-availability-release.cjs
```

It prints the exact HEAD, staging app/configuration, required build argument, disabled gates and retained rollback references. It never invokes a provider or deploys. The final publication packet contains this output. A new registry digest stays null until an approved image build/publish produces it; no future digest is invented.

## Separate reviewed staging release — instructions only

Before approval, the independent reviewer must inspect the complete diff from Agent 05 base, reproduce application/bridge/TypeScript results, and review the workflow, Dockerfile and query scope. They must review source publication at the exact remote HEAD and ensure no author self-approval is counted. The Orchestrator assigns an independent engineer or available repository reviewer and retains their review evidence. A PR alone is not an approved QA gate.

Capture fresh Fly all-machine inventory, versions, full effective configuration and pending-secret state. The last provider inventory contained active machine `820e3eb7206d78` and stopped `83d3d6f733d658`, with a multiple-image warning and pending secrets. Do not scale or start the stopped machine. Read current Netlify alias mapping and capture it before any release. Review all effective environment gates, including server binding and synthetic tours; Fly write flags alone do not prove server binding status. Use only the staging Supabase project `hvzauakkhlivzeqatfqm` and approved synthetic property/tenant/caller.

After explicit release approval, a release operator checks out the approved SHA detached in a clean isolated checkout, builds the Netlify application and Fly image from that same SHA, and records their digests and deployment/release IDs. The Fly deployment command below is an operator template, not executed by this assignment:

```sh
# APPROVED_SOURCE_SHA is the reviewed full Git SHA from the publication receipt.
git switch --detach "$APPROVED_SOURCE_SHA"
test "$(git rev-parse HEAD)" = "$APPROVED_SOURCE_SHA"
test -z "$(git status --porcelain)"
cd twilio-bridge
fly deploy --app ai4-pma-bridge-staging --config fly.pma-staging.toml --build-arg "PMA_SOURCE_SHA=$APPROVED_SOURCE_SHA"
```

The operator must apply the separately reviewed configuration and must not enable writes to make availability work. Netlify's matching staging alias must use the same approved source; this document does not authorize changing the alias. Preserve `STAGING_VOICE_ORCHESTRATION_ENABLED=false`, `STAGING_SUPPORT_WRITES_ENABLED=false`, synthetic tours OFF and reviewed disabled bindings. No secret values belong in logs or this packet. Inventory may be refreshed only from owner-verified facts; do not bump timestamps to bypass freshness enforcement.

## Independent telephone acceptance after the release gate

| Scenario | Expected tool/speech proof |
| --- | --- |
| Two-bedroom inquiry against incident facts | bedrooms=2; no Unit 415/301; stale result and explanation of unverifiable current inventory |
| Fresh one-bedroom 415 and three-bedroom 301 only | Neither can satisfy bedrooms=2; successful no verified match |
| Fresh occupied/unavailable two-bedroom records | `UNAVAILABLE_UNITS`; no claim a vacancy exists; no occupied-unit/resident details |
| Fresh vacant synthetic two-bedroom with valid date | `AVAILABLE`; exact returned record/date; fictional staging and no guarantee |
| Studio versus any size | Studio body contains bedrooms=0; any-size body omits bedrooms; spoken scope matches actual query |
| Empty list versus stale list | Distinct completed no-match and stale-data replies |
| Database error/timeout and missing payload | `LOOKUP_FAILED`; no false successful-negative reply |
| Missing/invalid date, bedroom, timestamp or label | `INVALID_INVENTORY` or safe contract rejection; no unit claim |
| Cross-call/session/tenant/property, closed or expired session | Denied before inventory; no retrieved unit details |
| Interruption/disconnect and repeated tool envelope | No stale spoken success after disconnect or duplicate request execution |
| IVR, Sales and Support smoke checks | Existing routing/voices/prompts remain as approved; write gates stay disabled |

For each call save SID, redacted transcript/audio if already permitted, exact safe tool correlation, requested count, classification, returned counts, query scope, source SHA and deployment/image IDs. Compare the actual spoken answer to the returned classification. Scripted local protocol assertions are not telephone acceptance. Independently connected PostgreSQL overlapping-transaction proof, resident-identity integration and owner calendar/policy/emergency decisions remain separate gates; this availability patch does not claim they passed.

## Rollback — instructions only

Retained provider-verified prechange Fly reference: release v4 `rel_95o6zr7vox4m2g08`, machine `820e3eb7206d78`, version `01M5NEZPBJCBZAE0KY84PGGV1J`, image `registry.fly.io/ai4-pma-bridge-staging@sha256:1955bbc2558e3a25a5848a4079b05e090ee81dee0b65c296b0990814250d2647`. This image's source SHA was not independently attested during the incident. Retained Netlify deploy `6adae7c95030f9ac2280a356`, permalink `https://6adae7c95030f9ac2280a356--ai4cc-staging.netlify.app`, function digest `34d77a6e71bf9a1d791f636e5c479ea7e4149c1f6fc5cb6d216ea9f35d52a533`. Refresh and approve both targets before use.

Trigger rollback review on mismatched source/image/health revision, wrong tenant/bedroom, unverified availability claim, incorrect empty/stale/error speech, changed departmental routing, unhealthy bridge, accidental write activation or failed telephone acceptance. Stop the synthetic test, preserve evidence and use the separately approved operator plan to restore the captured matching staging image/configuration and Netlify alias pair. Recheck disabled gates, all machines, health, routes and provider IDs. Historical targets retain known availability defects, so restoring them does not grant readiness. Do not use a stopped machine automatically as rollback or change production.

There are no new migrations or persistent database changes to reverse. Source publication, independent review, staging release approval and telephone acceptance are separate milestones. This assignment completes and publishes engineering; the final receipt must describe the actual review/CI state without declaring an independent QA pass prematurely.
