# Stellar UC — Staging Acceptance Test Report
**Date:** October 17, 2026  
**Reviewer:** Claude Sonnet 4.6 (Ruflo)  
**Branch:** `repair/support-greeting-startup-20261017`  
**Staging URL:** https://stellaruc-voice-bridge-staging-staging.up.railway.app  
**Deployed commit:** `220028a8c9b309a800e74b06787e814090072503` (matches branch tip)

---

## Summary

The Railway staging environment is live and correctly isolated. Three of nine test categories passed with live verification. Three were verified through code review and the other agent's pre-submitted test results. Three are blocked pending the staging `BRIDGE_HMAC_SECRET` credential, which was generated and stored in Railway but not shared with this reviewer — consistent with the security requirement.

**No production code, telephone routing, or live database was touched.**

---

## Test Results

### 1. Staging Health Endpoint
**Result: ✅ PASS**

```
GET https://stellaruc-voice-bridge-staging-staging.up.railway.app/health
→ HTTP 200
→ {"ok":true,"activeCalls":0,"pool":2,"stagingOnly":true,
   "commit":"220028a8c9b309a800e74b06787e814090072503"}
```

- `stagingOnly: true` confirms the server is running in Railway staging mode
- `commit` matches the tip of `repair/support-greeting-startup-20261017`
- `pool: 2` confirms two WebSocket connection slots were initialized at startup

**Note on pool state:** `/health` reports `wsPool.length` (slots), not `poolReady` count. Whether both slots have successfully connected to `wss://api.openai.com/v1/live/sessions` requires the authenticated `/debug` endpoint. See Test 2.

---

### 2. Debug Endpoint Authentication
**Result: ✅ PASS**

```
GET /debug (no credentials)         → HTTP 401 {"error":"Unauthorized"}
GET /debug (Bearer wrongsecret)     → HTTP 401 {"error":"Unauthorized"}
```

The staging server correctly gates `/debug` behind `Authorization: Bearer {BRIDGE_HMAC_SECRET}` and performs a timing-safe comparison. Neither unauthenticated nor incorrectly authenticated requests are granted access.

**Blocker — full debug access:** The staging `BRIDGE_HMAC_SECRET` was generated and stored in Railway by the previous agent but was not shared ("without disclosure"). Without it, pool ready state, model names, self-mint token validation, and recent event log cannot be verified live.  
→ **Jeff must supply the staging BRIDGE_HMAC_SECRET to complete this test.**

---

### 3. WebSocket Upgrade — Unauthenticated Connection
**Result: ✅ PASS**

```
WS connect to /ws/support (no token)
→ Upgrade accepted → connected event → server closes with code 1005
```

The bridge accepts the WebSocket upgrade (correct — rejection happens at the protocol level after the `start` message is evaluated, not at TLS/HTTP), then closes cleanly when no valid HMAC token is present in the `start` event's `customParameters`. No crash, no hang, no 500.

---

### 4. Authenticated Silent-Caller WebSocket Test (greeting latency, first PCMU audio)
**Result: ⛔ NOT EXECUTED — credential blocker**

This test requires minting a valid HMAC token using `BRIDGE_HMAC_SECRET`:  
`{profile}:{timestamp}:{nonce}:{hmac-sha256-sig}`

Without it, the bridge closes the WebSocket before proceeding to the session start sequence. The reviewer cannot supply staging credentials from the production secret, and manufacturing a fake secret would test nothing real.

**What this test would verify:**
- Agent speaks the opening greeting without the caller saying anything first
- First `session.output_audio.delta` arrives within an acceptable window (~2–5s)
- PCMU audio payload is non-zero bytes (actual voice, not silence)
- Twilio `mark` event triggers caller audio release
- Bridge logs `greeting first chunk played streamElapsedMs=N`

→ **Jeff must supply the staging BRIDGE_HMAC_SECRET to run this test.**

---

### 5. Greeting Startup Logic — Code Review
**Result: ✅ PASS (code review)**

The repair branch fixes the exact defect described in the acceptance doc:

**Root cause (production at `15248e6`):**  
`response.create` was sent immediately after `session.started`, then caller audio was flushed. If the caller said anything before the greeting audio arrived, `session.speech_started` cancelled the greeting. Result: agent went silent, caller had to speak again repeatedly.

**Repair approach (`repair/support-greeting-startup-20261017`):**

| Stage | What happens |
|-------|-------------|
| `session.start` | Session seeded with a `developer` context message: `"Greet the caller now in English. Introduce yourself as the support assistant and ask how you can help. Then pause and listen."` — Live starts generating audio immediately without needing `response.create` |
| `session.started` | Silence interval starts: sends 160-byte PCMU silence frames every 20ms to keep Live's audio clock running; caller audio still held |
| First `session.output_audio.delta` | Audio forwarded to Twilio; immediately followed by a `mark` event named `stellar-greeting-start` |
| Twilio `mark` echo | `greetingPlayed = true`; silence interval cleared; buffered caller audio flushed in order; normal interruption resumes |
| Before `mark` echo | `session.speech_started` does NOT cancel/clear — greeting is protected |
| 10-second timeout | If `mark` echo never arrives → `cleanup('GREETING_START_TIMEOUT')` → clean disconnect |
| Startup audio overflow | If caller sends >80KB before greeting plays → `cleanup('STARTUP_AUDIO_OVERFLOW')` → clean disconnect |

**Critical fix also present:** Tool output now uses `response.item.create` (not `conversation.item.create`), which is the correct event for the Responses delegation pathway.

---

### 6. Staging Isolation Blocks (writes, transfers, notifications)
**Result: ✅ PASS (code review + pre-submitted test results)**

The repair branch enforces the following when `STAGING_ONLY === true`:

```javascript
// External HTTP actions blocked:
if (STAGING_ONLY) return; // twilioUpdateCall (hangup/transfer)
if (STAGING_ONLY) return { interactionId: 'staging:…' }; // callSalesIntakeStart
if (STAGING_ONLY) throw new Error('STAGING_WRITES_DISABLED'); // callSalesIntakeSubmit
if (STAGING_ONLY) throw new Error('STAGING_WRITES_DISABLED'); // callSupportIntake
if (STAGING_ONLY) output = { error: 'STAGING_TRANSFERS_DISABLED' }; // transfer_to_specialist
```

Tools return structured error strings that the agent can speak aloud ("record was not confirmed"), not silent failures. `end_call` is permitted to run in staging (it generates `conversation.item.create` output and calls `response.create`) but the actual Twilio REST `<Hangup>` is skipped.

Verified by: 11 bridge runtime tests PASS (reported by previous agent) including `'Railway staging blocks intake writes, notifications and external transfers'`.

---

### 7. Owner-Approved Instructions Match
**Result: ✅ PASS (code review + pre-submitted test results)**

The repair branch preserves the exact instructions from the owner-approved browser session:

- **`gpt-live-1` brief** (top-level `session.instructions`): preserved verbatim from `pages/api/experimental-support-voice-session.ts`
- **`gpt-5.6-terra` full instructions** (delegation `responses.instructions`): same source, 753-char `INSTRUCTIONS` constant
- **Model pair**: `gpt-live-1` + `gpt-5.6-terra` — unchanged
- **No explicit voice ID** was introduced (matching the browser session baseline)

Test `'staging Support keeps the owner-approved model pair and exact conversational instructions'` enforces this at the string level via `assert.equal`.

---

### 8. Early Caller Speech / Interruption / Disconnect Handling
**Result: ✅ PASS (code review + pre-submitted test results)**

Verified against the repair branch test suite:

| Scenario | Behavior | Test |
|----------|---------|------|
| Caller speaks before `session.started` | Buffered, delivered after `mark` echo | `early caller speech cannot cancel greeting before playback` |
| Caller speech before `mark` echo | `response.cancel` NOT sent; greeting protected | same |
| Caller speech after `mark` echo | Normal interruption: `response.cancel` + `clear` | same |
| Disconnect before session ready | Late `session.started` / audio deltas ignored after cleanup | `caller disconnect before session ready` |
| Duplicate `mark` events | Only first valid `mark` (correct stream, correct name) triggers release | same |
| `mark` from wrong stream | Ignored | same |
| Missing greeting audio within 10s | `GREETING_START_TIMEOUT` → clean disconnect | `missing greeting or playback acknowledgement terminates startup` |
| Missing `mark` echo within 10s | Same | same |
| Buffer overflow (>80KB caller audio) | `STARTUP_AUDIO_OVERFLOW` → clean disconnect | `startup audio overflow fails explicitly` |

---

### 9. Live Telephone Test (real call via authorized routing)
**Result: ⛔ NOT EXECUTED — no staging phone routing available**

A real telephone test requires Twilio routing that points to the staging bridge without altering live customer numbers. No such routing was configured. The acceptance doc explicitly states: "A real telephone test still needs authorized test routing that does not alter live customer numbers."

This is a known open gate. The authenticated WebSocket test (Test 4) with PCMU audio verification is the closest functional substitute available without live telephony.

---

## Blockers (2 items — both require Jeff's action)

| # | Blocker | Required action |
|---|---------|----------------|
| 1 | Staging `BRIDGE_HMAC_SECRET` not shared | Supply the secret so authenticated `/debug` and WebSocket greeting test can run |
| 2 | No staging Twilio routing | Set up a test Twilio number pointing to the staging bridge URL (`wss://stellaruc-voice-bridge-staging-staging.up.railway.app/ws/support`) for a full live telephone test |

---

## What the Repair Branch Does NOT Change

- Production `main` branch is untouched
- Fly.io production bridge (`stellar-twilio-bridge`) is untouched
- Both live phone lines (725-330-5102, 702-710-2622) continue to use `main` at `15248e6`
- No Twilio webhook URLs were modified
- No Netlify functions were modified
- No database or Supabase tables were touched
- No new Railway services, databases or subscriptions were created

---

## Recommendation

**NO-GO for merge** until:
1. Authenticated WebSocket test passes with real PCMU greeting audio (Test 4)
2. `BRIDGE_HMAC_SECRET` supplied so pool ready state and event log can be inspected live
3. Optionally: real telephone test via staging Twilio routing (Test 9)

The code quality, isolation guards, and unit test coverage are sound. The single remaining question is whether the `session.input` seeded-greeting approach produces audible output over the actual Live API in a phone call context — that can only be confirmed by a live PCMU test.

---

*Report prepared by Ruflo / Claude Sonnet 4.6 — October 17, 2026*  
*Production deployment remains prohibited pending owner acceptance of live telephone test.*
