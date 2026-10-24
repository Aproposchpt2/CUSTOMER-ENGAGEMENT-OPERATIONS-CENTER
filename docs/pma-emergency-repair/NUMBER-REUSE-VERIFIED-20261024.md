# PMA number reuse and SMS sender verification — 2026-10-24

## Deployed revisions

- PR #114: https://github.com/Aproposchpt2/CUSTOMER-ENGAGEMENT-OPERATIONS-CENTER/pull/114
- IVR allowlist merge: 36c3f2fa96e9527b2dc4b781bd3e9d7537d86f70; Netlify branch deploy 6add23bbbe2cd6add2b36484 (ready).
- PR #115: https://github.com/Aproposchpt2/CUSTOMER-ENGAGEMENT-OPERATIONS-CENTER/pull/115
- Independent SMS sender merge: c23846867cf66b854240c905c654115c025ee063; Netlify branch deploy 6add24e68d7fd629a800a180 (ready).
- Both releases are limited to pma-validation on ai4cc-staging. The business production website and Fly bridge image were not deployed.

## Verified Twilio settings

| Number | Incoming voice (HTTP POST) | Voice status callback (POST) |
|---|---|---|
| +17252010584 | https://ai4-pma-bridge-staging.fly.dev/api/ivr/main | https://ai4-pma-bridge-staging.fly.dev/api/ivr/status |
| +17253305102 | https://ai4-pma-bridge-staging.fly.dev/api/ivr/main | https://ai4-pma-bridge-staging.fly.dev/api/ivr/status |
| +17027102622 | https://ai4-pma-bridge-staging.fly.dev/api/ivr/main | https://ai4-pma-bridge-staging.fly.dev/api/ivr/status |

All three were saved in Twilio and verified on the Active Numbers table. The old ElevenLabs voice fallback on +17252010584 was removed; the other two voice fallback URLs were already blank. Previous primary URLs were stellaruc.com/api/twilio/twiml-staging?profile=support, stellaruc.com/api/twilio/twiml?profile=sales and stellaruc.com/api/twilio/twiml?profile=support, respectively. Prior status callbacks for the first two were https://api.us.elevenlabs.io/twilio/status-callback; the third was blank.

+17029351414 continues pointing to the same staging IVR and remains PMA_STAGING_DID. VOICE_DEMO_REUSABLE_DIDS_ENABLED=true enables exactly the three owner-authorized additional DIDs; it is configured only for staging branch-deploy functions. Caller/account/signature/tenant/session restrictions remain active. This is not public caller activation.

PMA_STAGING_SMS_FROM=+17252010584 is configured only for staging branch-deploy functions. This changes outbound emergency SMS without changing the inbound DID security binding. No Twilio campaigns, Messaging Service memberships, inbound SMS webhooks, database grants or phone-number purchases were changed.

## Live dispatch evidence

One authorized POST /api/staging/emergency-test with scenario gas returned HTTP 200, ok:true, incidentId c785183e-523b-4feb-840a-f06f0ae84aaa, channels email:logged and sms:…8039. Verification independently returned OPEN SEV1 GAS EMERGENCY at Desert Ridge Apartments.

Twilio message SM724b372a41c72500e03bcd8bb4976748:
- From: +17252010584
- To: owner-designated recipient ending 8039
- dateSent: 2026-10-24T21:37:45Z
- status: delivered
- errorCode/errorMessage: null

The earlier message from +17029351414 remains undelivered with error 30034. Email remains logged only, not sent. API acceptance alone is not evidence of delivery; the new result was verified as delivered via Twilio's message API.

## Validation and limits

- 39 IVR/receptionist/official SDK routing and security tests passed, including all three reusable DIDs through all branches, wrong caller/account/signature/number rejection, disabled-switch and production rejection.
- Three emergency permission/dispatch tests passed, including separate sender and legacy fallback.
- Four dedicated PMA voice transport tests passed.
- TypeScript passed. Optimized build passed (existing Supabase Edge Runtime warning).
- Broader bridge tests: 56 passed, one failed. The failing pma-availability test expects UNAVAILABLE but receives LOOKUP_FAILED for an unauthorized request. The identical failure was reproduced on unchanged baseline 895f1e50bf7617f86d9f916fef86a8a5eda742f5. It was not introduced by these changes; the Fly bridge was not deployed.
- Real telephone verification of the newly routed numbers and live-call emergency dispatch remains pending.
- Inbound SMS replies are not rewired to PMA. Existing sender webhooks include retired endpoints; do not claim two-way PMA messaging is operational.

## Registration follow-up

The reusable sender's verified campaign remains the retired FlowDesk Pro operational notification program, campaign CMac988c88001689cbffd9b40f010cfe7b, service MG76357144f5aaa458dec415dbc9a3d806. Verified campaign description/sample/consent fields are disabled in Console. Delivery success is not a claim that STELLAR campaign registration is complete.

A separate STELLAR campaign already exists: CMb42e1090fc79e4ea3ce49506c54fe994, service MG8a01c21cb7004177594d0a108847889c, rejected for provided opt-in information. Its Fix Campaign form is editable, with an attestation and vetting-fee link. No resubmission, fee approval or attestation was made.

The public stellaruc.com/intake consent currently covers inquiries/consultations under the old StellarUC label; it does not document the PMA property-operations alert program. Before resubmission, align actual optional consent collection, SMS terms, sample messages and publicly accessible evidence with STELLAR INTELLIGENT TECHNOLOGIES, operated by Apropos Group LLC. Do not assert dashboard, verbal or tenant opt-in flows that are not implemented. After STELLAR approval, register +17029351414 to the appropriate service and verify delivery separately.
