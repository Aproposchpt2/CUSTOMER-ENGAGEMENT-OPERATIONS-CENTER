# Carol direct Realtime SIP intake
STELLAR INTELLIGENT TECHNOLOGIES · Operated by Apropos Group LLC
October 26, 2026 · staging candidate, not live

## Approved path
Twilio Elastic SIP → OpenAI Realtime SIP → Carol → create_incident → verified incident number → contact preference → close.
Audio travels directly from Twilio to OpenAI. The existing Netlify staging deployment receives the signed OpenAI webhook and runs a bounded background sideband controller; it never handles audio. No Fly service, Railway service, IVR, transfer tree, Responses delegation, Media Streams, audio forwarding or connection pool runs on this path. Existing Sales/Support/IVR remain available on their existing routes.

## Code and database authority
- `twilio-bridge/carol-sip-server.cjs`: raw signed OpenAI webhook, trunk/caller admission, accept, Realtime sideband tools, greeting, turn detection, farewell playback and hangup.
- `pages/api/intake/carol-sip-openai.ts`: synchronous signed OpenAI webhook endpoint; accepts only after durable session binding and successful background-control dispatch.
- `netlify/functions/carol-sip-control-background.mts`: existing-site background function that attaches the outbound Realtime sideband for at most 14 minutes. It is control-only and cannot relay call audio.
- `pages/api/intake/pma-sip-staging.ts`: existing timestamped HMAC transport and staging gates, database client, atomic compare-and-set call claim.
- `lib/pmaSip/intake.cjs`: immutable scope, session lifetime, allowed operations, verbatim evidence and verified receipts.
- `create_incident` calls only existing `pma_voice_incident_create_v1`. The returned CONFIRMED persistence receipt with requestId, operationId and generated PMA caseNumber is the authority. The database already serializes the call operation: identical retries replay the same incident; changed facts conflict. No second ticket-creation implementation, intent classifier or dispatcher is introduced.
- `record_contact_preference` calls existing `pma_voice_incident_preference_v1`. The server resolves the case from the bound call; the model cannot choose a request, tenant, property, actor or operation ID. Explicit permission and valid destination are required. It records the preference, not a notification.
- `end_call` is a telephone control, not a business workflow. It waits for the farewell response and matching SIP audio-buffer-drained event. An interruption cancels pending close; a bounded timeout prevents orphaned calls.
- Existing `ai4cc_interactions` stores the durable `pma_sip_call_id` claim. Conditional update prevents concurrent claims across processes. A duplicate webhook never creates a second session, greeting or accept. An ambiguous setup/crashed claim fails closed and requires operator reconciliation; do not automatically clear or reassign it.

No schema migration was added. Existing staging incident migration `20261026100000_pma_voice_incident_intake_v1.sql` and voice-session functions must already be installed and their execution privileges verified. No hosted database changes were made during implementation.

## Environment
The Netlify control functions require server-side secrets (reuse deployed key; never copy to browser code):
- OPENAI_API_KEY (existing approved project key)
- OPENAI_WEBHOOK_SECRET (signing secret for this new endpoint)
- BRIDGE_HMAC_SECRET_STAGING (must match the backend)
- PMA_SIP_TRUNK_SECRET (new random secret, at least 32 characters; configured on the dedicated trunk)
- PMA_SIP_CONTROL_SECRET (separate random secret, at least 32 characters; signs the one-time Netlify background invocation)

Control-service configuration:
- PMA_SIP_ENABLED=true only when ready for staging activation
- STELLAR_BRIDGE_STAGING=true; PMA_ENVIRONMENT=staging
- PMA_STAGING_BASE_URL=https://pma-validation--ai4cc-staging.netlify.app
- PMA_STAGING_DID: exact isolated test DID; PMA_STAGING_TEST_CALLER: owner test caller
- OPENAI_REALTIME_SIP_MODEL=gpt-realtime-2 (configurable)
- PMA_VOICE=verse unless the owner selects another Realtime-supported voice

The staging backend requires its existing PMA/transport/tenant/property/contact/actor settings, service-role secret and PMA_SIP_ENABLED=true. It is pinned to `https://hvzauakkhlivzeqatfqm.supabase.co`. Caller identity is reported, never proof of occupancy. Admission is limited to the configured test caller and trunk; production is rejected.

## Activation steps requiring account access
1. Review and release the exact tested source to the staging backend. Verify the new endpoint is present and its SIP flag is enabled in staging context only.
2. Deploy the tested source only to the existing `pma-validation` Netlify branch context with `PMA_SIP_ENABLED=false`. Confirm both `/api/intake/carol-sip-openai` and the background control function are present. Do not change the production deploy context.
3. In the SAME OpenAI project as that key, register `https://pma-validation--ai4cc-staging.netlify.app/api/intake/carol-sip-openai` for `realtime.call.incoming`; place its signing secret in OPENAI_WEBHOOK_SECRET. Obtain the actual `proj_...` project ID; do not infer it from Supabase or a key.
4. Create a dedicated Twilio Elastic SIP trunk. Enable secure signaling/media as supported by both parties and configure this origination URI (substitute actual values privately):

   `sip:<OPENAI_PROJECT_ID>@sip.api.openai.com;transport=tls?X-Stellar-Trunk-Token=<TRUNK_SECRET>&X-Stellar-DID=<URL_ENCODED_TEST_DID>`

   Twilio documents custom X-headers on the origination URI. The control service also requires exactly one `X-Twilio-CallSid` in the received invite, with a real CA-prefixed Twilio SID. Validate its presence during the first staging invite; if absent, fail closed and reconcile provider metadata before proceeding. SIP metadata alone never authorizes writes: the signed OpenAI webhook, private trunk token, caller allowlist, HMAC transport and persisted scoped session are all required. Treat the token-bearing URI as a credential; do not put it in logs or shared reports.
5. Associate only the approved isolated staging number. Snapshot the existing number/trunk mapping first. No production number is authorized for reassignment by this implementation.
6. Enable PMA_SIP_ENABLED on both staging services, make an owner test call and capture provider call SID ↔ OpenAI call ID ↔ persisted session ↔ operation ↔ request ID ↔ PMA case number.
7. Verify routine creation, unchanged retry, changed-facts conflict, outage/UNKNOWN, explicit preference consent, interrupted speech/farewell, gas safety before intake, and graceful end. Run the owner's unchanged PMA v2.0 baseline; mark unavailable broader features blocked, never passed. Owner voice acceptance remains required.

## Failure and rollback
On unverified webhook/trunk/session, reject without database writes. On unknown persistence, no success or number is issued. Sideband failure terminates the SIP leg and closes the session; seamless reconnect is not implemented. The Netlify background controller ends the call before its fixed 15-minute platform limit by enforcing a maximum 14-minute call. Validate plan eligibility and one-call execution before expansion.

Rollback: disable the new trunk origination or restore the saved staging number mapping and disable both SIP flags. Existing incident records remain authoritative; do not delete cases during transport rollback. There are no new schema changes to reverse, and neither Fly nor Railway is part of this release or rollback.

## Boundaries and current status
Source and automated tests are implemented. The dedicated Twilio trunk has been created with Secure Trunking enabled, but no Origination URI or number association is authorized until the controller is healthy. OpenAI webhook registration, Netlify staging deployment, live SIP/media tests and hosted database receipts have NOT been completed. The actual OpenAI project ID, webhook signing secret and trunk secret are not stored in source. Existing deployed OpenAI credentials were approved for reuse, but were not retrieved or exposed.

Read-only Railway inspection performed during design found an unrelated failed service and older staged changes. No Railway mutation was made, and the final Carol design does not use that project or service.

This route is intake only. It does not send update messages, notify vendors/managers, authenticate tenants for private lookups, provide a tenant portal, dispatch emergency services or promise repairs. Serious safety advice precedes intake; the report is recorded only once safe minimum details exist. The source candidate does not establish end-to-end PMA v2.0 acceptance or production readiness.

## Official implementation references
- https://developers.openai.com/api/docs/guides/voice-sip
- https://developers.openai.com/api/docs/guides/webhooks
- https://developers.openai.com/api/reference/resources/realtime/server-events
- https://www.twilio.com/docs/sip-trunking (origination X-headers and TLS)
