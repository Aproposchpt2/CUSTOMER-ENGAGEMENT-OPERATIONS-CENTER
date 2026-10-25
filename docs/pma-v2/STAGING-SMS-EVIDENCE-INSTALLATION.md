# PMA staging SMS evidence — preparation only

Extends the existing emergency dispatcher. It does not replace the IVR, orchestration, incident creation, preference routing or deduplication. Based on draft PR #124, commit 9abff4a35afdcc2e261c273daa7cfb3ffad6a6af. This package is **not deployed or applied** and has sent no live SMS.

## What is implemented

- Optional per-incident/per-recipient attempt ledger claimed before the Twilio request. Duplicate claims cannot send twice. The existing SQL incident deduplication remains unchanged.
- Twilio MessageSid and initial API status, HTTP/transport ambiguity, separate signed delivery events, monotonic delivery projection and independent test acknowledgment. A timeout or server error is UNKNOWN, not proof that nothing was sent; this does not introduce retries.
- Signature verification uses the official Twilio SDK over the canonical public URL, query parameters and every provider parameter. Account, sender, destination, project and feature flags are checked before any DB client is created.
- A receiving-only webhook records owned test-number inbox evidence and returns empty TwiML. It has no reply/forwarding/message-sending code. Body text is not persisted by the application; only SHA-256, controlled addresses and provider reference are stored. Twilio itself still retains its normal message logs.
- Vendor `ACK <random token>` is accepted only from the exact approved owned vendor DID to the staging sender, for a fresh correlated submitted vendor test notification, with an existing verified vendor/property binding. It records **vendor test ACK received**, always `vendorAcceptedAssignment:false`. It does not create/accept a work order, dispatch a technician, verify human identity or prove arrival.
- Protected GET-only status projection masks destinations, omits ACK tokens and message content, and does not send messages.

## Default and rollout boundaries

`PMA_STAGING_NOTIFICATION_EVIDENCE_ENABLED` must remain absent/false until a separately authorized installation. The default path preserves the working owner SMS behavior. New callbacks require this explicit flag, PMA_CHANNELS_ENABLED=true, staging project/environment, the exact tenant/property, and PMA_STAGING_SMS_FROM=+17252010584.

Do not set it in a business production environment. Do not change the main IVR **voice** configuration. Do not activate the three preferences as part of this installation.

## Required review and installation order

1. Review PR #124 and this stacked source change; verify CI and source revisions. No merge/release was performed by the work agent.
2. Review `sql/staging-sms-evidence-review-only.sql`, then create a tracked migration using the repository's migration workflow before applying it **only** to hvzauakkhlivzeqatfqm. The SQL was executed only in isolated local PostgreSQL tests. It adds four private RLS tables and one scoped service-role RPC, with no raw table grants to service_role, anon or authenticated. It preserves all existing emergency functions/permissions.
3. Verify the authoritative vendor record and its pm_property_vendors assignment for Desert Ridge. The audit found two vendors but no assignment. Do not guess the ID or grant new staff rights. Provision the private staging-only vendor binding to that independently verified vendor and +17253305102 through authorized administration. Without it, vendor attempt creation fails closed before sending.
4. Deploy the approved source to the established `pma-validation` staging gateway, keeping the evidence flag false initially. Keep the existing owner preference and PMA_STAGING_SMS_FROM unchanged. The operator host admin-staging.stellaruc.com is not a drop-in substitute for the canonical gateway; no host-policy bypass or HMAC changes are included.
5. With separate installation authorization, set the evidence flag true only for the actual staging branch's Functions runtime and redeploy it. Verify the protected readiness and evidence GET endpoints before any new controlled call. This enables evidence for existing owner alerts too, so the migration must already be applied. The three extra preferences must still be inactive.
6. Review/apply the **SMS-only** webhook settings below. Inspect and preserve each voice URL/method and fallback. Do not change the Messaging Service globally; it already defers incoming messages to each sender's own webhook.
7. Verify receiving endpoints and visibility, then obtain explicit owner authorization for activation of the three exact preferences and one controlled T-027 call. No sending/activation is authorized by this preparation itself.

## Exact proposed SMS webhook settings (not applied)

All use HTTP POST to:

`https://pma-validation--ai4cc-staging.netlify.app/api/twilio/pma-sms-receive-staging`

| Owned test DID | Purpose | Replaces |
|---|---|---|
| +17253305102 | Vendor test inbox | Retired Sales voice handler |
| +17027102622 | Tenant test inbox | Twilio demo auto-reply |
| +17029351414 | Backup-owner test inbox | Blank SMS URL |
| +17252010584 | Receive vendor test replies | Retired ElevenLabs SMS handler |

The last row changes **SMS receiving only**, not main IVR voice. Changing any of these settings still requires the reviewed staging installation. No setting was changed by this work.

Delivery callback is attached per outbound message by the application:

`https://pma-validation--ai4cc-staging.netlify.app/api/twilio/pma-sms-status-staging?attempt_id=<opaque UUID>`

Do not configure a fixed attempt ID in Console. Do not change a shared global Messaging Service callback; this package supplies the correct callback for each newly claimed notification attempt.

## Evidence and tests

- Existing owner path is tested with the feature disabled through the existing dispatch tests.
- New tests exercise actual Twilio SDK signatures, altered query/parameters/account/destinations, disabled/production/channel gates, receiving with no reply, read API authentication, persisted attempt-before-send ordering, duplicate claims and ambiguous submission without retry.
- Isolated PostgreSQL tests execute the exact review SQL under service_role and anon: raw table access denial, inactive preference denial, missing vendor assignment denial, scoped claim deduplication, callback before submission completion, out-of-order/duplicate callbacks, wrong SID/destination denial, independent vendor ACK, immutable inbox replay, and privacy-safe read projection.
- These tests use mocks and a local database only. No new remote tables/functions, vendor assignment, recipient activation, SMS or callback is claimed.

## Controlled acceptance after installation and authorization

Use a **new** caller-initiated T-027 call. Do not replay a completed call or retry an uncertain send. Correlate each role's attempt to its incident and MessageSid; inspect the authenticated GET `/api/staging/pma-sms-evidence` with the existing staging read credential in `x-test-key` (never in the URL). Inspect Twilio logs separately.

Required distinctions:

1. SUBMITTED: Twilio accepted the create request and returned a MessageSid.
2. Delivery status: signed provider event, separate from API submission. Provider-delivered is not proof a person read a message.
3. Owned inbox received: the test Twilio DID's receiving webhook was invoked. No automatic reply is generated.
4. Vendor test acknowledgment: a fresh correlated test ACK arrived from the approved owned vendor DID. Actual assignment acceptance and real vendor authentication remain outside this synthetic test feature.

Never treat a missing callback, UNKNOWN submission, or merely created incident as delivery. The existing emergency SQL deliberately prevents blind duplicate notifications. Uncertain submissions require read-only provider verification and an authorized reconciliation decision, not automatic resend.

## Rollback

Turn the evidence flag off and redeploy the prior validated staging source; restore prior SMS receiving URLs from the audit if a receiving rollback is authorized. Keep all evidence rows for review; do not drop tables or remove historical incident references. Keep the owner preference active and three additional preferences inactive unless separately approved. Production, IVR voice, Sales and Support are outside this rollout.

Official provider references: https://www.twilio.com/docs/messaging/guides/track-outbound-message-status and https://www.twilio.com/docs/messaging/api/message-resource. Twilio documents that callbacks may arrive out of order and recommends the official SDK for signature verification.
