# Stellar UC — GPT-Live isolated proof of concept

Status: EXPERIMENTAL. Branch: experiment/gpt-live-voice-poc. Do not merge or deploy to production without explicit owner approval.

## Objective
Provide a private browser-based voice test using `gpt-live-1` with a reasoning backend, then compare against `gpt-realtime-2.1` in a separate test. Preserve existing ElevenLabs, Twilio, tenant records, routes, and public website.

## Access and security
- Use a dedicated OpenAI project API key configured only as a server-side environment secret `OPENAI_API_KEY`. Never commit the key or send it to a browser.
- Generate short-lived client/session credentials on a server route with authenticated access and request limits. Follow the current OpenAI GPT-Live getting-started and session docs rather than assuming the Realtime API handshake is identical.
- Keep the test endpoint private and separate from production. Do not create or mutate production customer records.
- Set budget/usage alerts and a hard maximum session duration where supported.

## Acceptance tests
1. Two-way spoken dialogue, interruptions and barge-in.
2. Unexpected customer requests and clarification questions.
3. Multi-step sales qualification and objection handling.
4. Reasoning delegation for a complicated customer scenario.
5. Honest admission of uncertainty and correct human handoff recommendation.
6. Accurate structured lead summary (in test memory only).
7. Session termination, error recovery, and no leaked credentials.
8. Record latency, reasoning accuracy, task completion, and actual OpenAI usage costs.

## Test persona
Stellar UC Intelligent Sales Specialist. Professional, concise, friendly. Do not invent pricing, availability, or business facts. Ask permission before collecting personal information. No live business actions in this experiment.

## Next implementation
After the owner completes the OpenAI API key setup, add a server-side authenticated session route and an isolated browser voice UI to this branch; then deploy a private preview, verify connection, and provide the preview URL for acceptance testing.

References:
https://developers.openai.com/api/docs/models/gpt-live-1
https://developers.openai.com/api/docs/guides/live
https://developers.openai.com/api/docs/guides/live-delegation
https://developers.openai.com/api/docs/guides/live-partner-integrations
