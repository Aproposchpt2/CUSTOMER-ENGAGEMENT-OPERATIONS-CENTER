# Live call workflow gate repair — 2026-10-24

Call CA0b491e385a71eae7ed1b566ef0e0744b reached the PMA route at 21:42:10Z and completed at 21:44:05Z. No saved transcript exists for its interaction df2a6a53-d5d1-49fb-1564-ee7bde7ea2c8. The user reports the agent advised leaving the apartment and contacting 911; that spoken wording is not independently verified by a stored transcript.

Both POST /api/intake/pma-staging requests during the call returned HTTP 503, at 21:42:48Z and 21:43:12Z. No incident exists for the call. The prior delivered SMS belonged to the separate 21:37:45Z API test.

A signed request against this ended call returned HTTP 503 with error PMA integration disabled. Netlify had no PMA_VOICE_INTEGRATION_ENABLED variable. The deployed application checks it before invoking pm_voice_turn_v1 or emergency dispatch.

Set PMA_VOICE_INTEGRATION_ENABLED=true only for staging branch-deploy functions. No production activation, database grants or function changes. The existing database RPC remains bound to enabled tenant/property config, authorized actor, active synthetic PMA call/session, call lifetime and property state. Completed calls must still be rejected after this gate is enabled. This commit triggers a branch deployment to load the variable.

Pending: verify corrected deployment, confirm ended-call rejection rather than disabled error, and perform a new real telephone call. Do not reopen or replay the completed call to force an incident, and do not claim live-call SMS success until a new call has a correlated incident and delivery receipt.
