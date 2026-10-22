# PMA test call failure — current diagnosis

Observed: 2026-10-22 approximately 12:05 AM Pacific. Test DID: (702) 935-1414. Owner reports a recorded error message.

## Verified current state
- The staging web deployment has now succeeded. Run 39732617103 completed successfully on its later attempt; the previous missing-token failure is superseded. `/property-management` returns HTTP 200 and the voice endpoint exists (GET returns 405).
- POST probes to both `/api/twilio/pma-voice-staging` and `/api/intake/pma-staging` return HTTP **503** with `{"error":"PMA staging channels are disabled"}`. These unsigned empty probes cannot create a request or place a call. The gate fails before signature verification.
- Netlify's `PMA_CHANNELS_ENABLED` is absent, so the reviewed deployed code defaults channels off.
- Railway staging is reachable and still runs commit `063d8ea32df59814b010e417cf32607ae561f426` from `feature/staging-orchestrator-trigger-gateway`. That repository revision does not include the PMA adapter. Do not simply enable the Netlify gate before installing and verifying the bridge integration.
- A bounded recent Railway log read returned no matching PMA HTTP/runtime entries. This does not identify the Twilio number's actual webhook URL or the exact failed call.
- No Twilio account credentials or direct Twilio connector are available in this execution environment. Netlify's stored Twilio credentials are masked; do not extract or reconstruct them. Exact Call SID, provider error code and inbound DID routing remain unverified.

The recorded error is consistent with a webhook failure, but its exact Twilio cause is not confirmed without the call/debugger record. The 503 endpoint response is independently confirmed.

## Targeted handoff for an agent with Twilio access
1. Read the latest inbound call to this DID and its Debugger event. Record Call SID, VoiceUrl, HTTP method, actual From value, provider error code and webhook response. Do not infer the code from the recording.
2. Preserve existing staging Support/orchestration changes while integrating the validated OpenAI PMA profile into the Railway staging release. Do not blindly repoint the shared service to a branch lacking its current orchestration adapters. Verify deployment SUCCESS and profile support.
3. Verify the staging HMAC matches across gateway and bridge without displaying credentials. Verify synthetic resident/contact/unit and actor bindings. Prior audit found the configured synthetic contact is not the selected unit's resident; do not modify the existing occupant's records as a shortcut.
4. After bridge readiness, set PMA_CHANNELS_ENABLED=true for the appropriate Netlify preview context and rebuild/redeploy only the PMA draft alias. Confirm signed webhook handling and a signed bridge request; do not disable signature checks or caller/DID allowlists.
5. Verify only the dedicated test DID points by POST to https://pma-validation--ai4cc-staging.netlify.app/api/twilio/pma-voice-staging. Confirm the actual caller matches the staging allowlist. Leave production Sales, Support and IVR untouched.
6. Ask the owner to retry only after the complete route is verified. Check real audio, structured intent persistence, saved IDs and failure/reconnect behavior. No production outbound calls/SMS/emails.

Approved runtime: OpenAI + Twilio + Railway. ElevenLabs is not used.

Evidence:
https://github.com/Aproposchpt2/ai4-contact-center/actions/runs/39732617103
