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
