# Live PMA emergency wiring repair

Call CA0b491e385a71eae7ed1b566ef0e0744b reached PMA, 21:42:10–21:44:05Z. No transcript was persisted. User reports advice to leave the apartment and contact 911; exact wording cannot be independently verified. Both PMA workflow requests returned 503. No incident was created for this call. Earlier SMS delivery came from the API harness, not this telephone call.

Confirmed defects:
1. PMA_VOICE_INTEGRATION_ENABLED was absent; a signed request returned 503 PMA integration disabled.
2. private.pm_voice_config_v1 had no binding for staging tenant 5885a020-d363-4c27-910a-c035eda132f5 / property eead9ac5-b28b-4594-b75b-a9e9bbbd111f.
3. The live classifier and SQL catalog use SUSPECTED_GAS_LEAK, FIRE_OR_SMOKE, MAJOR_FLOODING and ELECTRICAL_HAZARD, while dispatch previously accepted only newer names. The gas API harness used GAS_EMERGENCY directly and missed this live-path mismatch.

Repairs:
- Set PMA_VOICE_INTEGRATION_ENABLED=true only for ai4cc-staging branch-deploy functions. Documentation commit 179f8ef11dc6f6f39cc8ac35d0a6598a5436dcf7 triggered deployment.
- Reviewed live private.pm_voice_turn_v1 and existing property staff assignment. Actor c6891f06-521d-4740-b293-b877df2bd612 already had can_write=true for this exact property. Inserted only the missing private voice binding, conditional on that existing assignment and active eligible property. No new staff assignment, can_write grant, table privilege, RPC privilege or RLS change.
- Preserve live catalog names for SQL validation. Translate only dispatcher input: SUSPECTED_GAS_LEAK→GAS_EMERGENCY; FIRE_OR_SMOKE→FIRE_EMERGENCY; MAJOR_FLOODING→FLOOD_EMERGENCY; ELECTRICAL_HAZARD→PERSONAL_SAFETY_THREAT (the dispatcher's general immediate-safety category). Retain original intent label in SMS text and original concern in incident summary. Existing canonical names remain accepted.

Verification before publication:
- Five emergency tests passed. New regression exercises the actual live classifier→executePmaVoice→voice RPC→restricted prepare RPC→SMS chain for gas, fire, flooding, electrical hazard and personal safety, with live-call test_mode=false and unchanged call/session binding. Closed/cross-call authorization errors and disabled integration reach no dispatch. Unknown/prototype names rejected.
- TypeScript passed.
- Live PostgreSQL rollback-only test using the existing authorized actor and synthetic active call successfully returned safety guidance through pm_voice_turn_v1 and an incident/preference receipt through restricted emergency prepare. Original SUSPECTED_GAS_LEAK is required by the deployed SQL catalog; GAS_EMERGENCY there correctly failed catalog validation. All synthetic test writes rolled back, with no external SMS sent by SQL.
- Completed user call was not reopened or replayed to manufacture success.

Pending after this publication: verify deployed revision, verify completed-call denial, then a new telephone call with correlated non-test incident and Twilio delivery receipt. No claim of live-call dispatch success yet. Outbound SMS sender remains +17252010584; destination remains the owner-designated mobile ending 8039. Email is logged only. Full v2 operational tools and two-way SMS remain separate incomplete work.
