# OpenAI conversational receptionist — staging

Owner confirmed the preceding three-agent telephone call completed and routed, then requested a conversational OpenAI entry agent with the Stellar Intelligent Technologies welcome and rejected Twilio Polly. Callers can speak or press 1 Support, 2 Sales, 3 PMA; 0 repeats.

## Implementation

The existing Fly bridge's pooled OpenAI Live transport powers a short receptionist session with the Marin voice. It has only select_agent, whose enum is the three existing agent IDs. An ambiguous request prompts a brief clarification. It has no CRM, private knowledge or specialist tools. Instructions specify warm, calm, natural delivery and the exact brand greeting. The greeting identifies it as an AI receptionist.

The validated main webhook opens /ivr-stream directly, without Say, Polly or a recorded announcement. An ivr0 HMAC token binds an unselected session, caller, account, call and expiry; it cannot authorize specialist streams. The existing Netlify signature/HMAC gateway and caller/DID restrictions still apply. No credential is copied into code or the browser.

Spoken select_agent and DTMF share one serialized selection handler. The gateway persists the choice through the existing transactional call-log RPC before the specialist starts. Another choice cannot overwrite that route. The OpenAI receptionist then closes and the existing specialist handler takes over the same Twilio WebSocket. There is no intermediate Twilio stream stop, external transfer or premature parent-call completion. Specialist prompt, KB and catalog loading remain unchanged. Only receptionist handoffs skip the duplicate company welcome.

Pre-start DTMF waits for validated session lookup. Startup has a 12-second deadline; receptionist sessions are capped at two minutes. Hangup/error records an end through the existing gateway and provider callback can reconcile. Production Sales/Support DIDs are outside this change. Existing sealed OpenAI credentials are reused.

## Verification

27 local focused tests passed before release, including token scope, three keypad paths, completed spoken tool calls, duplicate/racing selection, no premature parent-call end, invalid destinations, zero repeat, foreign stream rejection and authorization failure. Protected CI must also run actual Twilio SDK tests and the production build. Live OpenAI greeting and spoken/keypad handoff probes plus a new owner phone call remain release acceptance checks until recorded below.

The previous owner-reported successful call validates the former DTMF IVR; it does not establish acceptance of this new conversational entry.

## Deployed evidence — 2026-10-22

- Source fbfc21adbb65e0bed73ba587fcc585e011252d0c on feature/property-management-assistant-mvp; reviewed release/voice-receptionist-staging-20261022. PR #91 remains draft and unmerged.
- Protected release 39835717943 succeeded on workflow commit a46def635fd23181799a99570cc25359a0629e14; ready Netlify deployment 6ada5c76ca5471f175f93d08. Its guard uses the stable exact repository ID after the owner renamed the repository.
- All 29 focused tests passed in protected CI, including two actual Twilio SDK tests. Full CI 39835679055 and browser validations 39835678751 / 39835666394 succeeded. Optimized build and anonymous HTTP guards passed.
- Fly machine 83d3d6f733d658 is healthy on this source and reports receptionist=openai-live-marin. Existing environment, sealed secrets, CPU/memory and the complete file manifest were preserved.
- Synthetic audio phrase "I would like to speak with the sales specialist, please" passed through the real deployed receptionist: 287 receptionist audio packets, confirmed Sales handoff, three specialist audio packets, first-playback mark echoed. This was audio input, not injected transcript text or a forged provider webhook.
- Keypad 1 and 3 from the real receptionist each handed off and returned specialist audio. Unit tests also cover keypad 2, duplicate/racing choices, invalid destinations and repeats.
- Independent SQL verified selected_route=selected_agent, status=completed and non-null start/end timestamps for synthetic fixtures ending 21 (Sales, session 7d4025ba-85c8-5d15-af08-3e68a8eecde4), 22 (Support, ffe1c9af-7948-ba17-1fef-7957bed845aa), and 23 (PMA, 3d99ae71-e543-5e14-cdcb-71e99f13574d).
- The dedicated test number's already saved main webhook is unchanged. No production DID migration, outbound telephone traffic, SMS/email, new database table, RLS grant or new OpenAI key was introduced.
- A real phone listening test of this new conversational voice remains pending; the owner's earlier success report was for the preceding DTMF entry.
