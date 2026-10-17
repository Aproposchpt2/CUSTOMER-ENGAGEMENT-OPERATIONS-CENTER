# Support greeting startup acceptance — 2026-10-17

## Owner-approved conversational baseline
Jeffery Mitchell confirmed during the protected Support Specialist preview conversation: “This is the Agent I must have.” Preserve this experience while repairing telephone startup. This approval is for conversational quality; it is not evidence of complete transaction acceptance or authorization to deploy to production.

- Protected preview: https://deploy-preview-73--stellaruc-private-voice-poc.netlify.app/experimental-support-voice
- Verified deployed source baseline: b8ce29ad04261134e45491c85a42acb0ce038f27 (PR #73).
- Session configuration source: pages/api/experimental-support-voice-session.ts at that commit.
- Configured voice model: gpt-live-1; delegated reasoning: gpt-5.6-terra.
- No explicit voice identifier is set in that session source; the selected runtime voice remains unverified. Do not invent or substitute one.
- Source instructions and tools must be preserved and compared when integrating the telephone path. The browser path uses WebRTC; telephone uses WebSocket/PCMU, so matching model IDs does not establish matching behavior.
- Owner transcript: stellaruc-css-transcript-1792255476296.json; SHA-256 c81b2d03efbf1522542952dc96cd0a2466df196a36020b1b15fe9498c4ebb573.
- Exported 2026-10-17 16:44:36 UTC. Transcript fragments span 16:39:09–16:44:31 UTC. These are transcript delivery timestamps, not measured call-connect or audible latency.
- Voice transcript ends with the representative stating that the record was not confirmed and no case number was available. Do not mark voice-to-case persistence PASS.
- Separate no-voice staging write verified case 825a7024-8eaf-419b-87f4-2e63f69b5b2a, linked contact b0964f1c-7384-4ff5-9c75-9069cd61a485, exactly one case for its session, test_only=true, no notification sent.

## Startup defect and isolated change
Owner reports having to speak repeatedly before the telephone agent responds. The inspected bridge at 15248e6 releases buffered caller audio before requesting the greeting; speech detection then cancels output and clears telephone audio. This is a reproducible ordering risk, not a claim that historical production logs have proven the exact cause.

Draft PR #75, repair/support-greeting-startup-20261017, is stacked on PR #74's isolated repair branch. No production merge or deployment is authorized.

1. Request the greeting exactly once on session.started without requiring caller input.
2. Hold caller input until Twilio acknowledges playback of the first greeting audio chunk. A mark is sent directly after that first chunk. Ignore unsolicited, other-stream and duplicate marks.
3. Before playback acknowledgement, speech events cannot cancel/clear the opening greeting. After acknowledgement, replay buffered input in order and restore normal interruption.
4. Fail startup after ten seconds without playback acknowledgement; stop instead of silently dropping audio when the bounded startup queue exceeds capacity.
5. Ignore late messages after disconnect and avoid restarting on duplicate stream/session starts.
6. Log stream-to-session, first output and first-chunk playback timings without logging audio or credentials. This does not measure the earlier dial/answer/webhook portion of the call.

Twilio mark semantics: https://www.twilio.com/docs/voice/media-streams/websocket-messages
A mark normally acknowledges preceding audio playback; clear also returns pending marks. This implementation does not send clear before the opening mark is acknowledged.

Model constants, prompts, tool schemas, voice selection, authentication and routing are unchanged by this startup patch. Restoring the approved browser persona to the telephone path remains a separate integration/acceptance task; this patch alone does not claim equivalence.

## Verification
- All 96 local regression tests PASS.
- Nine mocked bridge runtime tests PASS, covering silent caller on warm/cold sockets, early speech, ordered replay, interruption after playback starts, invalid/duplicate marks, missing audio/acknowledgement, bounded-buffer overflow and disconnect before session readiness.
- TypeScript compilation PASS.
- Bridge JavaScript syntax and diff whitespace checks PASS.
- Next.js optimized build PASS locally. GitHub did not return a pull-request workflow run for this stacked branch at the time checked; do not imply remote CI has passed.
- No live telephone test, production write, production routing change, or paid infrastructure provisioning performed for this patch.

## Remaining acceptance and hosting blocker
Only the production Fly app stellar-twilio-bridge was identified in the inspected account. Netlify cannot run this persistent telephone WebSocket bridge as a normal function. Use an existing owner-authorized isolated WebSocket staging host, or obtain explicit owner approval for infrastructure that may incur charges. Never replace the production bridge to bypass this blocker.

On the isolated host, use staging-only database/API targets and nonproduction credentials; disable real transfers/outreach/notifications. Verify deployed SHA and sanitized runtime configuration. Execute silent-caller and immediate-speech tests on cold and warm sockets; measure connect/session/first-audio/playback times, interruption and disconnect behavior. Then confirm real tool results and exactly-once linked staging persistence. Test failures and tenant isolation before production recommendation.

Rollback: before any authorized staging deployment, record that staging host's current image/release and environment-name inventory (no values). Restore that prior staging image/release if checks fail. Existing production remains untouched.

Recommendation: NO-GO for production until isolated telephone and transaction acceptance passes and the owner explicitly authorizes launch.
