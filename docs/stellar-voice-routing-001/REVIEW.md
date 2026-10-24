# STELLAR-VOICE-ROUTING-001 — staging repair review

Status: PARTIAL / NOT READY FOR END-TO-END ACCEPTANCE. No deployment, merge, telephone-number change, database change, or new permissions performed.

## Revisions and live observations

- Owner snapshot: bc37c4208f98f9070623a694ab094a708dc0a6cb.
- Source branch inspected: fix/pma-upbeat-male-voice-20261023 at 8db412ffe5bca29ea30e637978852bc0cf0b35cf. This newer branch selects PMA Verse, not the owner's Alloy snapshot. Preserved the newer voice work; did not silently revert it.
- Read-only staging /health: ok=true, stagingOnly=true, release=bc37c4208f98f9070623a694ab094a708dc0a6cb, pma.enabled=true, voiceDemo.enabled=true, Support voice Cedar. Thus PMA_CHANNELS_ENABLED is not missing on the observed running process: adapter.enabled requires that flag. This does not prove the gateway configuration or every machine is correct.
- Read-only stellar-twilio-bridge.fly.dev/health: ok=true, stagingOnly=false, commit=null. Production source provenance cannot be established from that response.
- No authenticated Twilio/Fly credentials or service-specific read tools were available. Actual number webhooks, deployed gateway environment, runtime logs, approved KB row counts and real telephone responses remain unverified. Reference numbers are not treated as verified destinations.

## Confirmed source defects repaired

1. Early DTMF queued during reception authorization skipped Live initialization. A failed destination request then had no voice transport to explain failure or accept a spoken retry. Initialize the receptionist transport before dispatching the queued digit. A regression injects the gateway failure and proves a subsequent keypad retry succeeds without ending the parent call.
2. A disabled PMA adapter could fall through to Support initialization on an in-process receptionist handoff. Reject unavailable PMA before immutable selection; add a defensive guard in the specialist handler. No feature flag or permission is enabled.
3. Stream asset opening checked the agent but did not compare the returned session ID, call SID, account SID and caller to the signed call identity. Require all fields to match before accepting assets. Regression tests reject each mismatch independently.

These are reproduced defects, not a confirmed root cause for the owner's specific live option 2/3 failures. PMA_CHANNELS_ENABLED alone is disproved for the observed bridge; gateway rejection, asset loading and provider startup require authenticated correlated logs.

## Source wiring matrix (not live acceptance)

| Choice | Agent / stream | Voice in inspected source | Runtime prompt | Knowledge / intents | Authorized workflow |
| --- | --- | --- | --- | --- | --- |
| IVR | receptionist / /ivr-stream | Marin, unchanged | voice-receptionist.cjs INSTRUCTIONS, unchanged | no specialist knowledge | select_agent only |
| 1 | support-specialist / /support-stream | Cedar, unchanged | embedded APPROVED_SUPPORT_INSTRUCTIONS + ticket flow | signed openSession; approved public Support-tagged entries; Support/universal/control/safety catalog | route-bound support_rpc orchestration adapter; gateway RPC allowlist and ownership checks |
| 2 | sales-specialist / /sales-stream | Echo, unchanged | voice-system-prompts.json sales-specialist | signed openSession; approved public Sales-tagged entries; Sales/universal/control/safety catalog | route-bound sales_submit; staged lead RPC; no real outreach |
| 3 | property-management-assistant / /pma-stream | Verse inherited from newer branch | pma-adapter + pma-profile + PMA knowledge runtime instructions | signed openSession; property-scoped approved public KB RPC; dedicated 25-intent catalog | pma_property_workflow and pma_check_availability; trusted gateway/domain validation |

Gateway: https://pma-validation--ai4cc-staging.netlify.app. Bridge: https://ai4-pma-bridge-staging.fly.dev. Staging storage is explicitly restricted by endpoint code to hvzauakkhlivzeqatfqm. Tenant/property/contact IDs are selected by server configuration and persisted session fixtures, not caller instructions. Their deployed values have NOT been authenticated/verified here.

## Remaining integration gaps

- Support System Prompt and PMA Orchestrator Prompt are routing labels; they are not fetched as separately managed prompt assets. Support uses embedded instructions; PMA uses its domain adapter. Do not claim external prompt synchronization.
- Sales uses its staged lead RPC, not the Support orchestration state machine. Do not claim one common orchestration implementation governs all three products.
- Approved KB filtering and intent scoping are present in source and covered with synthetic fixtures. Actual approved/published KB contents and exact live tenant/product mappings need read-only database verification.
- The legacy non-route-bound Support orchestration flags are false in staging Fly config. Route-bound Support sessions separately use the signed gateway adapter; those legacy flags alone do not describe whether the route-bound gateway can write. No flags or permissions changed.
- Confirm PMA voice choice against newer Verse work before releasing a deployment; Alloy was in the supplied snapshot.

## Verification

- npm ci --ignore-scripts --no-audit --no-fund completed.
- npm test: 269 passed, zero failures.
- node --test twilio-bridge/tests/*.test.cjs twilio-bridge/voice-orchestrator-adapter.staging.test.cjs: 66 passed, zero failures.
- Includes all three keypad branches, spoken routing, invalid destinations, signature checks, cross-call/account token denial, cross-agent workflow denial, unpublished/private knowledge exclusion, PMA availability outcomes, and the new retry/disabled-route/identity regressions.
- These are local synthetic tests, not real telephone calls or proof that deployed database migrations exist.
- TypeScript/build results recorded in the PR after completion.

## Next controlled verification

1. Read actual Twilio IncomingPhoneNumber voice/status URLs and methods for the three owner-supplied numbers; verify account and staging gateway mapping without reconfiguration.
2. Read Fly release/machine environment readiness and safe call-correlated failure logs for options 2/3; read gateway feature configuration and tenant/property fixtures without exposing secrets.
3. Reconcile deployed KB/publication/version and product prompt sources; approve exact runtime mappings before changing managed prompts.
4. Review this PR, then separately authorize staging deployment of an exact revision. No production deployment implied.
5. Place owner-authorized staging calls using options 1/2/3 and spoken choices; verify correct departmental greeting, distinct voice, relevant approved knowledge, permitted tools, failure/retry behavior and terminal call status. Use fictional data for any write scenarios and retain existing permissions.
6. Report exact call/release evidence. Production remains unchanged pending separate release authorization.
