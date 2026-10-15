# Stellar UC — Isolated realtime voice proof of concept
Status: IMPLEMENTED IN SOURCE; NOT BUILT OR DEPLOYED. Branch: `experiment/gpt-live-voice-poc`. Do not merge to `main` or deploy to production without explicit owner approval.

## Delivered
- `pages/experimental-voice.tsx`: browser microphone/WebRTC evaluation interface.
- `pages/api/experimental-voice-session.ts`: protected session broker using existing server-side `OPENAI_API_KEY`.
- Uses `gpt-realtime` as a conservative API model default. `STELLAR_VOICE_POC_MODEL` can override it after model access and the precise supported API model identifier are verified. GPT-Live-1 access and backend reasoning delegation have **not** been confirmed or implemented.
- Agent prompt covers 24/7/365, up to 20 simultaneous conversations (a target pending end-to-end load verification), sales qualification, and usage-based pricing.

## Deployment prerequisites
1. Set a long random secret `STELLAR_VOICE_POC_ACCESS_CODE` only on the isolated preview environment. Do not share it in chat or commit it.
2. Reuse the existing server-side `OPENAI_API_KEY`; verify it belongs to the funded OpenAI project.
3. Deploy only a protected branch preview or separate test Netlify site. Do not deploy this experiment on `stellaruc.com`.
4. Verify the OpenAI realtime session endpoint/model contract against current official documentation; build and run automated tests.
5. Enforce server-side rate limiting, session concurrency/time budget, and appropriate private-site access before making the preview accessible. A static access code alone is not a substitute for robust deployment access control.
6. Confirm real two-way audio, interruptions, browser compatibility, API usage, and cleanup on hangup.

## Acceptance tests
- Spoken dialogue, interruption/barge-in, multi-step qualification, objection handling.
- Explain abandoned calls and measure baseline vs outcomes without promising return.
- Do not invent business facts, integrations, prices, or completed actions.
- No production tenant data, Twilio calls, or ElevenLabs modifications.
- Verify 20-call capacity in a separate end-to-end load test, not this single-browser demonstration.

## Current limitations
This first code slice does not include an admin prompt editor, tenant knowledge retrieval, backend reasoning delegation, session hard caps, rate limiting, build verification, or deployed preview. It must not be represented as a completed demonstration.
