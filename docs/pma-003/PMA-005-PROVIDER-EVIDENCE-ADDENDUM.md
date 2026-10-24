# STELLAR-PMA-005 — recovered provider evidence, revision 2

October 23, 2026 (Pacific). Recipient: STELLAR-PMA-ORCHESTRATOR.
Recommendation remains **NO GO for staging release/activation**. This addendum supersedes the earlier assessment's statement that Fly log access was unavailable, its transcript-unavailable statement insofar as fragments have now been recovered, and its operator-reported v3 description of the current deployment. Original recording/audio, complete tool payloads and exact image-to-source SHA attribution remain outstanding.

## Actual call evidence recovered

Read-only access to the owner's authenticated Chrome Fly dashboard and Fly Grafana succeeded. The query used app `ai4-pma-bridge-staging`, SID `CA39dcce1023b07fad877f2230132da7cf`, and Pacific time range 2026-10-23 15:56:49–16:01:30. The dashboard returned 657 SID-matching rows, spanning 15:56:51.601–16:01:27.775. The redacted evidence file reconstructs caller/agent transcript fragments from `session.input_transcript.delta` and `session.output_transcript.delta`. The bridge truncates original event JSON to 120 characters; this is partial transcript evidence, not a verified complete recording. Contact collection/readback turns are redacted.

| Pacific time | Observed evidence and implication |
| --- | --- |
| 15:57:01.939–.940 | Reception handoff confirmed PMA; bridge logged this exact SID, session `fbeff9ff-ceb1-2007-f73d-ecf668611622`, route `property-management-assistant` |
| 15:57:03.529 | Provider session model `gpt-live-1` |
| 15:57:11–31 | Caller asks about a two-bedroom and next month; agent explicitly recognizes two bedrooms and requests clarification |
| 15:57:35.325 | Separately recovered database edge log: matching tenant/property vacant inventory request with `bedrooms=2`, HTTP 200 |
| 15:57:32–51 transcript fragments | Agent checks next month, then says it is not seeing two-bedrooms in fictional staging inventory, qualifies availability/move-in, and offers staff review |
| 15:59:07–15 | Agent later says it could not verify two-bedroom availability and again offers staff review. This explains the owner's impression of an unknown lookup despite the earlier successful-negative wording |
| 15:59:19–31 | Caller broadens request to anything available now |
| 15:59:34.707 | Database edge log: same scoped inventory query, now `bedrooms=0`, HTTP 200 |
| 15:59:35–51 | Model text says it checked any apartment size; spoken transcript says it is not seeing any units. A studio-only database filter cannot substantiate an all-size inventory claim |
| 16:01:05–16 | Agent says the staff-review request could not be submitted, nothing was saved, and a text cannot be arranged |
| 16:01:27.733 / .775 | `cleanup: TWILIO_STOP`, followed by OpenAI WebSocket close 1005 |

This evidence supports an executed successful-negative availability path with high confidence. It does not expose the exact original `pma_check_availability` tool ID/arguments/output, nor historical HTTP response bodies. The database requests have tenant/property/time correlation, while bridge transcript/lifecycle rows have exact SID/session correlation. These are distinct evidence sources; do not upgrade them to a fully recovered tool transaction.

Source inspection explains the tool evidence gap: the bridge intentionally excludes `response.function_call_arguments.*` and `response.output_item.*` from generic event logging and formerly logged no availability execution start/result. The local repair adds safe correlation telemetry. No exact persisted 25-intent classification label was recovered; the dedicated availability tool does not require the write classifier.

## Refined diagnosis

1. The agent recognized the requested two-bedroom count and initially expressed a successful negative staging result. The later switch to generic inability-to-verify wording made this ambiguous. The previous report's inference about the spoken answer is now replaced by actual logged transcript fragments.
2. There is a concrete scope mismatch between the second lookup's studio filter and its all-size claim. Zero means a studio. An all-size request must omit `bedrooms`; model instructions now make that explicit, and a bridge regression verifies omitted versus zero arguments remain distinct. The exact original model arguments are still unavailable.
3. The Netlify query observed during the call lacks `updated_at` selection and freshness filtering. This matches older deployment source `40b306cfaa25eae1d332a60140e50412de74580f`; it is deployment drift relative to corrected source `3167e04f4fe2d3666a995c6bdc806eded5c5707c`. The local repair enforces freshness at snapshot and bridge boundaries and distinguishes empty/stale/failed results.
4. The private tables' zero rows are not proof the inventory read path is absent. The active machine independently shows voice orchestration writes disabled. The failed staff-review persistence statement is consistent with existing inactive write bindings/gates; no saved request or text delivery is established. This investigation does not authorize enabling those writes.
5. No Unit 415 offer was found in this call's recovered transcript fragments. The reported earlier one-bedroom-as-two-bedroom statement remains unresolved without that earlier call's evidence. New local validation rejects Unit 415/one-bedroom and Unit 301/three-bedroom results for `bedrooms=2`.

## Provider-verified Fly inventory and rollback references

All regions/all states inventory: exactly two machines, page 1, Next disabled.

| Machine | State/process | Version / image | Relevant settings |
| --- | --- | --- | --- |
| `820e3eb7206d78` | Started, app, lax, shared CPU 1 / 512 MB, checks 1/1 | Machine version `01M5NEZPBJCBZAE0KY84PGGV1J`; release v4, ID `rel_95o6zr7vox4m2g08`; tag `deployment-01M5NBR3PVK7G7R59MF7SVHQCC` | `STELLAR_BRIDGE_STAGING=true`, `STAGING_VOICE_ORCHESTRATION_ENABLED=false`, `STAGING_SUPPORT_WRITES_ENABLED=false`, `PMA_CHANNELS_ENABLED=true`, `VOICE_DEMO_IVR_ENABLED=true`; Netlify/PMA base both `https://pma-validation--ai4cc-staging.netlify.app`; max concurrent calls 3; max duration 2700000 ms |
| `83d3d6f733d658` | Stopped, no process group, lax, shared CPU 1 / 512 MB, checks 0/1 | Machine version `01M5JN3A5KF2WFWQVF30MMNZTZ`; `registry.fly.io/stellar-twilio-bridge@sha256:0e6d717297f5abb01f284bd14a3573939eb61adb52e0f56e0da56e589274bd1f` | Observed `BRIDGE_RELEASE_SHA=786d90df8ba4bf86f8941423663066b9526cac74`; staging flags true, orchestration/Support writes false; same staging Netlify base. This stopped machine's SHA is not the active machine's SHA |

The release v4 provider page is Complete, created/updated October 23 22:44 UTC, with machine `820e3eb7206d78` and version above. This predates the call. Registry image v4 independently resolves the active tag to:

`registry.fly.io/ai4-pma-bridge-staging@sha256:1955bbc2558e3a25a5848a4079b05e090ee81dee0b65c296b0990814250d2647`

Registry image ID `43914963`, version 4, linux/amd64, created October 23 21:48 UTC. It matches the operator's reported digest. The provider's actual release is v4, correcting the operator report's v3 reference. Neither active machine environment nor visible registry layers supplies a source revision. Public health previously returned `commit:null`. Therefore exact corrected source SHA remains operator-reported until a build attestation or authorized image-content comparison establishes it. A verified image digest is not itself proof of its source SHA.

The dashboard warns that this app has multiple images. Do not scale, start the stopped machine, or use it automatically as rollback. Three pending secrets are indicated by the UI; no secret values were accessed, applied or changed. A reviewed release must resolve which staged configuration applies before activation. Synthetic-tour gates are not established by these Fly flags alone and remain part of the separate binding review.

The verified v4 digest/release/machine version can now be retained as an immutable prechange rollback reference, subject to independent source/configuration review. Pair it with the captured Netlify deployment `6adae7c95030f9ac2280a356` only after confirming the active alias mapping. Restoration retains the known older Netlify availability defect; it is not a readiness approval. No rollback action was executed.

## Repair and validation update

The original local repair commit is `a62b48568a60fb3b6c1ad0c51365e55ac8e4c0b2`, on corrected base `3167e04f4fe2d3666a995c6bdc806eded5c5707c`. This follow-up clarifies any-size versus studio tool instructions and verifies both signed request bodies remain distinct. The revision-2 receipt identifies the new exact final local HEAD.

Root regression: 259 passed. Bridge regression: 54 passed. Zero failures/cancellations/skips. TypeScript and diff checks passed. No deployment or telephone retest of this repair occurred. The previously captured after-log remains a local protocol simulation. A model can still ignore tool guidance, so independently captured telephone arguments/results and spoken output remain required acceptance evidence.

## Remaining blockers and next handoff

Twilio console was opened read-only and presents its sign-in page. Owner sign-in in that Chrome tab is needed to inspect the original call resource, recording and request events; no credentials were entered or extracted. Original audio and full model tool events remain unavailable. Fly historical transcript fragments, lifecycle, complete machine list, active release and digest blockers are now partially resolved as detailed above; exact application source provenance remains open.

Return this addendum and refreshed source/evidence packet to STELLAR-PMA-ORCHESTRATOR. Next actions are original recording/tool evidence recovery; source attestation; paired Netlify/Fly release and rollback review; separate independently connected PostgreSQL overlapping-transaction proof; remaining identity/owner/binding/routing gates; and a separately approved staging release followed by independent telephone QA. No merge, push, machine/configuration action, deployment, database mutation, PMA write activation, IVR/Support/Sales change or production change was performed.
