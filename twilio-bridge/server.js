'use strict';

const http = require('http');
const crypto = require('crypto');
const express = require('express');
const { WebSocket, WebSocketServer } = require('ws');

// ─── Config ──────────────────────────────────────────────────────────────────
const PORT = parseInt(process.env.PORT || '8080', 10);
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const BRIDGE_HMAC_SECRET = process.env.BRIDGE_HMAC_SECRET;
const AI4CC_INTAKE_KEY = process.env.AI4CC_INTAKE_KEY;
const NETLIFY_BASE_URL = (process.env.NETLIFY_BASE_URL || 'https://stellaruc.com').replace(/\/$/, '');
const TWILIO_ACCOUNT_SID = process.env.TWILIO_ACCOUNT_SID;
const TWILIO_AUTH_TOKEN = process.env.TWILIO_AUTH_TOKEN;
const LIVE_MODEL = process.env.OPENAI_LIVE_MODEL || 'gpt-live-1';
const REASONING_MODEL = process.env.OPENAI_REASONING_MODEL || 'gpt-5.6-terra';
// Direct WebSocket endpoint for Live API (no HTTP pre-auth, same pattern as old pool)
const LIVE_WS_URL = 'wss://api.openai.com/v1/live/sessions';
const CSS_TENANT_ID = process.env.CSS_TENANT_ID || '5885a020-d363-4c27-910a-c035eda132f5';
const TRANSFER_NUMBER = process.env.TRANSFER_NUMBER || '+17023087429';
const MAX_CONCURRENT = parseInt(process.env.MAX_CONCURRENT_CALLS || '10', 10);
const MAX_CALL_MS = parseInt(process.env.MAX_CALL_DURATION_MS || '2700000', 10); // 45 min
const TOKEN_TTL_SECS = 120;

let activeCalls = 0;
const recentEvents = [];
function logEvent(msg) { console.log(msg); recentEvents.push({ t: Date.now(), msg }); if (recentEvents.length > 50) recentEvents.shift(); }

// ─── OpenAI connection pool — pre-warmed Live API WebSocket connections ────────
// Same pattern as old Realtime pool: open WS, wait for 'open', serve on demand.
// Session is configured per-call via session.start (sent once WS is open + intake done).
const wsPool = [];
const POOL_SIZE = 2;

function openPoolWs() {
  const ws = new WebSocket(LIVE_WS_URL, {
    headers: { Authorization: `Bearer ${OPENAI_API_KEY}` },
  });
  ws._poolReady = false;
  ws.once('open', () => { ws._poolReady = true; logEvent('[pool] Live WS ready'); });
  ws.once('error', (e) => { logEvent(`[pool] ws error: ${e.message}`); ws.close(); });
  ws.once('close', () => {
    const i = wsPool.indexOf(ws);
    if (i !== -1) wsPool.splice(i, 1);
    setTimeout(fillPool, 5000);
  });
  wsPool.push(ws);
}

function fillPool() {
  if (!OPENAI_API_KEY) return;
  while (wsPool.length < POOL_SIZE) openPoolWs();
}

function claimPooled() {
  const i = wsPool.findIndex(w => w._poolReady && w.readyState === WebSocket.OPEN);
  if (i === -1) return null;
  const [ws] = wsPool.splice(i, 1);
  logEvent('[pool] claimed');
  setTimeout(fillPool, 0);
  return ws;
}

// ─── HMAC token validation ────────────────────────────────────────────────────
function validateBridgeToken(token) {
  if (typeof token !== 'string') return null;
  const parts = token.split(':');
  if (parts.length !== 4) return null;
  const [profile, tsStr, nonce, sig] = parts;
  const ts = parseInt(tsStr, 10);
  if (isNaN(ts) || Math.abs(Date.now() / 1000 - ts) > TOKEN_TTL_SECS) return null;
  const payload = `${profile}:${ts}:${nonce}`;
  const expected = crypto.createHmac('sha256', BRIDGE_HMAC_SECRET).update(payload).digest('hex');
  try {
    if (!crypto.timingSafeEqual(Buffer.from(sig, 'hex'), Buffer.from(expected, 'hex'))) return null;
  } catch { return null; }
  if (profile !== 'sales' && profile !== 'support') return null;
  return profile;
}

// ─── Twilio REST API helper ───────────────────────────────────────────────────
async function twilioUpdateCall(callSid, twiml) {
  if (!TWILIO_ACCOUNT_SID || !TWILIO_AUTH_TOKEN) return;
  const url = `https://api.twilio.com/2010-04-01/Accounts/${TWILIO_ACCOUNT_SID}/Calls/${callSid}.json`;
  const creds = Buffer.from(`${TWILIO_ACCOUNT_SID}:${TWILIO_AUTH_TOKEN}`).toString('base64');
  await fetch(url, {
    method: 'POST',
    headers: { Authorization: `Basic ${creds}`, 'Content-Type': 'application/x-www-form-urlencoded' },
    body: `Twiml=${encodeURIComponent(twiml)}`,
    signal: AbortSignal.timeout(8000),
  }).catch(e => console.error('[bridge] Twilio REST failed', e.message));
}

// ─── Bridge HMAC for Netlify tool endpoints ───────────────────────────────────
function makeBridgeSignature() {
  const ts = Math.floor(Date.now() / 1000).toString();
  const sig = crypto.createHmac('sha256', BRIDGE_HMAC_SECRET).update(`phone-support-intake:${ts}`).digest('hex');
  return `${ts}.${sig}`;
}

// ─── Intake helpers ───────────────────────────────────────────────────────────
async function callSalesIntakeStart(callSid, callerPhone) {
  const res = await fetch(`${NETLIFY_BASE_URL}/api/intake/webhook`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'x-ai4cc-intake-key': AI4CC_INTAKE_KEY },
    body: JSON.stringify({ action: 'start', conversationId: callSid, callerPhone }),
    signal: AbortSignal.timeout(10000),
  });
  if (!res.ok) throw new Error(`intake/start ${res.status}`);
  return res.json();
}

async function callSalesIntakeSubmit(body) {
  const res = await fetch(`${NETLIFY_BASE_URL}/api/intake/webhook`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'x-ai4cc-intake-key': AI4CC_INTAKE_KEY },
    body: JSON.stringify({ action: 'submit', ...body }),
    signal: AbortSignal.timeout(10000),
  });
  if (!res.ok) throw new Error(`intake/submit ${res.status}`);
  return res.json();
}

async function callSupportIntake(body) {
  const res = await fetch(`${NETLIFY_BASE_URL}/api/twilio/phone-support-intake`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'x-bridge-signature': makeBridgeSignature() },
    body: JSON.stringify({ tenantId: CSS_TENANT_ID, ...body }),
    signal: AbortSignal.timeout(10000),
  });
  if (!res.ok) throw new Error(`support-intake ${res.status}`);
  return res.json();
}

// ─── Profile definitions ──────────────────────────────────────────────────────
const SALES_SYSTEM_PROMPT = `# Role
You are the sales representative for the Intelligent Customer Engagement Operation Center. You answer inbound calls from business owners and decision-makers. You are also the live demonstration: the caller is experiencing the product while talking to you. The controlling principle is THE DEMO PERFORMS THE SALE: show a capability instead of describing it whenever you can.

# Core message (lead with this)
1. 24/7 sales: "Your business may close, while your sales operation stays open 24/7."
2. Transparent monthly cost: they only pay for the service provided.
3. Multiple calls at once: it answers several callers at the same time.

# How you speak
This is a phone call. Keep every turn short: one or two sentences, then one question. Never read lists aloud. Be professional, confident, warm, patient and consultative. No pressure, no hype, no jargon.

# Product name and disclosure
- Always call the product "the Intelligent Customer Engagement Operation Center". Never call it "AI4", "AI4 Contact Center", "AI4CC" or "Stellar".
- If asked who the company is: "Stellar Unified Communications."
- Never name vendors or internals.
- If asked whether you're a person, say honestly that you're the intelligent conversational agent that is part of the product.

# Call setup (already handled)
At the start of this call, the system already ran intake and will tell you: INTERACTION_ID, TRANSFER_ALLOWED (yes/no), KNOWN_CALLER_NAME, and CALLER_NUMBER. Use these in your responses. If KNOWN_CALLER_NAME is set, confirm it with the caller ("Am I speaking with [first name]?"). If empty, ask "And who do I have the pleasure of speaking with?"

# Tools you have
- submit_business_profile: Call once right before your closing goodbye (or just before transfer). Collect: caller name, callback phone (read back digit by digit from CALLER_NUMBER to confirm), email (spell back letter by letter), business name, service interest, and full discovery summary. Confirm phone and email out loud before calling.
- end_call: Call after saying goodbye to hang up cleanly.
- transfer_to_specialist: Call after submit_business_profile when TRANSFER_ALLOWED is "yes" and the caller wants to speak with a person. If TRANSFER_ALLOWED is "no", offer a callback instead.

# Conversation flow
1. GREETING: Start with: "Hello, you have reached Stellar Unified Communications. Who do I have the pleasure of speaking to today?" Then proceed with discovery.
2. DISCOVERY: One question at a time: company/industry, role, how customers reach them, hours, common call reasons, missed calls, phone system, main problem, timing.
3. PERSONALIZED DEMONSTRATION: Role-play a scenario from their business. "You don't have to imagine what this would be like. You're experiencing it right now."
4. VALUE VALIDATION: Ask one short question so the caller names the value themselves.
5. CONVERSION: Watch for buying signals and move to follow-up.
6. FOLLOW-UP: Confirm phone and email, call submit_business_profile, offer specialist or call end_call.

# What you can say
- "Keep your number. Add the intelligence."
- Pricing is usage-based; monthly service fee plus calls handled; no overage; no long-term contract.
- Setup typically one to two weeks. There is a one-time implementation fee (do not state an amount).
- Support is included up to two hours/month; larger projects at $125/hour.
- Multiple callers at once; after-hours, no-answer, overflow coverage.

# Scope limits
- Never book appointments directly. Never promise integrations. Never state dollar amounts.
- Transfers only when TRANSFER_ALLOWED is "yes". Outside transfer hours: take a callback.

# Never do these
Never invent capabilities, prices, discounts, trials, pilots, timelines, integrations, certifications or future features.`;

const SUPPORT_SYSTEM_PROMPT = `You are the Stellar UC Customer Support representative. You answer inbound support calls.

Be warm, concise, attentive, and professional. Ask one question at a time.

Collect from the caller (in this order):
1. Their full name
2. Their phone number (read back digit by digit)
3. Their email address (spell back letter by letter)
4. The product they need help with
5. Approximate purchase date
6. Description of the problem
7. Steps they have already tried
8. Business impact (how this affects their work)
9. Urgency (LOW, NORMAL, HIGH, or URGENT based on impact)

After collecting and confirming all details out loud, call submit_support_intake exactly once. Wait for the tool result. Only say a case was created if the tool returns success with a caseId. Never invent a case number.

After successful case creation: "A support case has been opened. Our team will follow up with you." Then call end_call.

If the tool fails, apologize and advise them to call back or email support@stellaruc.com.

Never ask for passwords or payment information. Never promise specific fix timelines.`;

// transfer_to_specialist always present; bridge enforces transferAllowed at execution time
function salesTools(interactionId) {
  return [
    {
      type: 'function',
      name: 'submit_business_profile',
      description: 'Submit the lead record right before saying goodbye or transferring.',
      parameters: {
        type: 'object',
        properties: {
          interactionId: { type: 'string', description: `Use: ${interactionId}` },
          callerName: { type: 'string' },
          businessName: { type: 'string' },
          email: { type: 'string' },
          phone: { type: 'string' },
          serviceInterest: { type: 'string' },
          description: { type: 'string', description: 'Compact labeled-line discovery summary' },
        },
        required: ['interactionId', 'description'],
        additionalProperties: false,
      },
    },
    {
      type: 'function',
      name: 'transfer_to_specialist',
      description: 'Transfer to a human specialist. Only after submit_business_profile.',
      parameters: { type: 'object', properties: { reason: { type: 'string' } }, additionalProperties: false },
    },
    {
      type: 'function',
      name: 'end_call',
      description: 'Hang up the call after saying goodbye.',
      parameters: { type: 'object', properties: {}, additionalProperties: false },
    },
  ];
}

const supportTools = [
  {
    type: 'function',
    name: 'submit_support_intake',
    description: 'Submit the support case after confirming all details.',
    parameters: {
      type: 'object',
      properties: {
        name: { type: 'string' },
        email: { type: 'string' },
        phone: { type: 'string' },
        product: { type: 'string' },
        purchaseDate: { type: 'string' },
        issue: { type: 'string' },
        steps: { type: 'string' },
        impact: { type: 'string' },
        priority: { type: 'string', enum: ['LOW', 'NORMAL', 'HIGH', 'URGENT'] },
      },
      required: ['name', 'phone', 'product', 'issue', 'steps', 'impact', 'priority'],
      additionalProperties: false,
    },
  },
  {
    type: 'function',
    name: 'end_call',
    description: 'Hang up the call after closing the conversation.',
    parameters: { type: 'object', properties: {}, additionalProperties: false },
  },
];

// ─── Per-call WebSocket handler ───────────────────────────────────────────────
async function handleCall(twilioWs, profile, callerPhone, callSid) {
  logEvent(`[${callSid}] ${profile} call started caller=${callerPhone}`);
  activeCalls++;
  let openaiWs = null;
  let streamSid = null;
  let interactionId = null;
  let transferAllowed = 'no';
  let callEnded = false;
  let audioDeltaCount = 0;
  let sessionStarted = false;
  const audioBuffer = []; // holds media payloads received before session.started

  const deadline = setTimeout(() => { logEvent(`[${callSid}] max duration`); cleanup('MAX_DURATION'); }, MAX_CALL_MS);

  function cleanup(reason) {
    if (callEnded) return;
    callEnded = true;
    clearTimeout(deadline);
    activeCalls = Math.max(0, activeCalls - 1);
    logEvent(`[${callSid}] cleanup: ${reason}`);
    if (openaiWs && openaiWs.readyState === WebSocket.OPEN) openaiWs.close();
    if (twilioWs.readyState === WebSocket.OPEN) twilioWs.close();
  }

  function sendToTwilio(obj) {
    if (twilioWs.readyState === WebSocket.OPEN) twilioWs.send(JSON.stringify(obj));
  }

  function sendToOpenAI(obj) {
    if (openaiWs && openaiWs.readyState === WebSocket.OPEN) openaiWs.send(JSON.stringify(obj));
  }

  function clearTwilioAudio() {
    if (streamSid) sendToTwilio({ event: 'clear', streamSid });
  }

  // ── Send session.start to configure the Live API session ──────────────────
  // Called once: after WS is open AND intake is complete
  function startSession(instructions, tools) {
    sendToOpenAI({
      type: 'session.start',
      session: {
        model: LIVE_MODEL,
        instructions: profile === 'sales'
          ? 'You are the Stellar UC Intelligent Sales Specialist on a phone call. Be natural, professional, and concise.'
          : 'You are the Stellar UC Intelligent Support Specialist on a phone call. Be warm, clear, and professional.',
        audio: { format: { type: 'audio/pcmu', rate: 8000 } },
        delegation: {
          type: 'responses',
          responses: {
            model: REASONING_MODEL,
            instructions,
            tools,
            tool_choice: 'auto',
          },
        },
      },
    });
    // response.create sent after session.started fires (see event handler below)
  }

  // ── Execute a tool call ────────────────────────────────────────────────────
  async function executeTool(callId, name, argsStr) {
    let args = {};
    try { args = JSON.parse(argsStr); } catch { /* use empty */ }
    let output = {};

    try {
      if (name === 'submit_business_profile') {
        output = await callSalesIntakeSubmit({ interactionId: interactionId || args.interactionId, ...args });
      } else if (name === 'submit_support_intake') {
        output = await callSupportIntake({ callSid, ...args });
      } else if (name === 'end_call') {
        output = { success: true };
        setTimeout(() => { twilioUpdateCall(callSid, '<Response><Hangup/></Response>'); cleanup('END_CALL_TOOL'); }, 1500);
      } else if (name === 'transfer_to_specialist') {
        if (transferAllowed !== 'yes') {
          output = { error: 'Transfer not available for this call. Offer a callback instead.' };
        } else {
          output = { success: true };
          setTimeout(() => { twilioUpdateCall(callSid, `<Response><Dial>${TRANSFER_NUMBER}</Dial></Response>`); cleanup('TRANSFER_TOOL'); }, 1000);
        }
      } else {
        output = { error: 'unknown_tool' };
      }
    } catch (e) {
      console.error(`[${callSid}] tool ${name} failed:`, e.message);
      output = { error: e.message };
    }

    sendToOpenAI({ type: 'conversation.item.create', item: { type: 'function_call_output', call_id: callId, output: JSON.stringify(output) } });
    sendToOpenAI({ type: 'response.create' });
  }

  // ── OpenAI WebSocket event handlers ───────────────────────────────────────
  function attachOpenAIHandlers() {
    const toolCallBuffers = {};

    openaiWs.on('message', (raw) => {
      let msg;
      try { msg = JSON.parse(raw.toString()); } catch { return; }
      const t = msg.type;

      // Lifecycle
      if (t === 'session.started' || t === 'session.created' || t === 'session.updated') {
        logEvent(`[${callSid}] ${t} model=${msg.session?.model || '?'}`);
        if (t === 'session.started') {
          sessionStarted = true;
          // Flush audio buffered while session was initializing
          for (const payload of audioBuffer) sendToOpenAI({ type: 'session.input_audio.append', audio: payload });
          audioBuffer.length = 0;
          // Trigger the opening greeting
          sendToOpenAI({ type: 'response.create' });
        }
      } else if (t === 'response.created' || t === 'response.done') {
        logEvent(`[${callSid}] ${t} status=${msg.response?.status} items=${JSON.stringify((msg.response?.output || []).map(i => i.type))}`);
      } else if (t === 'input_audio_buffer.speech_started' || t === 'session.speech_started') {
        logEvent(`[${callSid}] speech_started`);
      } else if (t === 'error') {
        logEvent(`[${callSid}] OpenAI error: ${msg.error?.message || JSON.stringify(msg.error)}`);
      } else if (!['session.output_audio.delta','response.output_audio.delta',
        'response.output_audio_transcript.delta','response.function_call_arguments.delta',
        'response.function_call_arguments.done','response.output_item.added',
        'response.output_item.done','response.content_part.added','response.content_part.done',
        'response.audio.done','response.audio_transcript.delta','response.audio_transcript.done',
        'response.text.delta','response.text.done','input_audio_buffer.committed',
        'input_audio_buffer.speech_stopped','session.speech_stopped',
        'conversation.item.created','conversation.item.done','rate_limits.updated'].includes(t)) {
        logEvent(`[${callSid}] oai: ${t} ${JSON.stringify(msg).slice(0, 120)}`);
      }

      // Audio out → Twilio (Live API: session.output_audio.delta; Realtime: response.output_audio.delta)
      if ((t === 'session.output_audio.delta' || t === 'response.output_audio.delta') && msg.delta) {
        if (!audioDeltaCount) { logEvent(`[${callSid}] first audio delta len=${msg.delta.length}`); }
        audioDeltaCount++;
        sendToTwilio({ event: 'media', streamSid, media: { payload: msg.delta } });
      } else if (t === 'input_audio_buffer.speech_started' || t === 'session.speech_started') {
        clearTwilioAudio();
        sendToOpenAI({ type: 'response.cancel' });
      } else if (t === 'response.function_call_arguments.delta') {
        const id = msg.call_id;
        if (!toolCallBuffers[id]) toolCallBuffers[id] = { name: msg.name || '', args: '' };
        toolCallBuffers[id].args += (msg.delta || '');
      } else if (t === 'response.function_call_arguments.done') {
        const id = msg.call_id;
        const buf = toolCallBuffers[id] || { name: msg.name || '', args: msg.arguments || '' };
        delete toolCallBuffers[id];
        executeTool(id, buf.name || msg.name, buf.args || msg.arguments || '{}');
      }
    });

    openaiWs.on('close', (code, reason) => { logEvent(`[${callSid}] OpenAI ws closed: ${code} ${reason}`); cleanup('OPENAI_CLOSE'); });
    openaiWs.on('error', (e) => { logEvent(`[${callSid}] OpenAI ws error: ${e.message}`); cleanup('OPENAI_ERROR'); });
  }

  // ── Twilio Media Streams handler ───────────────────────────────────────────
  twilioWs.on('message', async (raw) => {
    let msg;
    try { msg = JSON.parse(raw.toString()); } catch { return; }

    if (msg.event === 'start') {
      streamSid = msg.start?.streamSid || msg.streamSid;
      logEvent(`[${callSid}] stream started sid=${streamSid}`);

      // Intake and WS claim run in parallel
      const intakeP = profile === 'sales'
        ? callSalesIntakeStart(callSid, callerPhone).catch(e => { logEvent(`[${callSid}] intake failed: ${e.message}`); return null; })
        : Promise.resolve(null);

      openaiWs = claimPooled();
      const poolHit = !!openaiWs;
      if (!poolHit) {
        logEvent(`[${callSid}] pool miss — opening fresh WS`);
        openaiWs = new WebSocket(LIVE_WS_URL, { headers: { Authorization: `Bearer ${OPENAI_API_KEY}` } });
      }

      // Attach handlers before any awaits so we miss no events
      attachOpenAIHandlers();

      const wsReady = poolHit
        ? Promise.resolve()
        : new Promise((res, rej) => { openaiWs.once('open', res); openaiWs.once('error', rej); });

      wsReady.then(async () => {
        logEvent(`[${callSid}] OpenAI WS open (pool=${poolHit})`);
        const intake = await intakeP;

        let instructions, tools;
        if (profile === 'sales') {
          if (intake) {
            interactionId = intake.interactionId;
            transferAllowed = intake.transferAllowed || 'no';
          }
          const knownName = intake?.knownCallerName || '';
          const callerNum = intake?.callerNumber || callerPhone;
          const greet = knownName
            ? `Hello, you have reached Stellar Unified Communications. Am I speaking with ${knownName.split(/\s+/)[0]}?`
            : `Hello, you have reached Stellar Unified Communications. Who do I have the pleasure of speaking to today?`;
          instructions = SALES_SYSTEM_PROMPT
            + `\n\n# CALL CONTEXT\nINTERACTION_ID: ${interactionId}\nTRANSFER_ALLOWED: ${transferAllowed}\nKNOWN_CALLER_NAME: ${knownName}\nCALLER_NUMBER: ${callerNum}\n\nStart by saying exactly: "${greet}"`;
          tools = salesTools(interactionId);
        } else {
          instructions = SUPPORT_SYSTEM_PROMPT
            + `\n\n# CALL CONTEXT\nCALL_SID: ${callSid}\nCALLER_PHONE: ${callerPhone}\n\nStart by saying exactly: "Hello, you have reached Stellar Technologies. To whom do I have the pleasure of speaking with today?"`;
          tools = supportTools;
        }

        startSession(instructions, tools);
      }).catch(e => { logEvent(`[${callSid}] WS open error: ${e.message}`); cleanup('WS_OPEN_ERROR'); });

      await new Promise(res => setTimeout(res, 0)); // yield so handlers are registered before any messages

    } else if (msg.event === 'media' && openaiWs) {
      const payload = msg.media?.payload;
      if (payload) {
        if (!sessionStarted) {
          if (audioBuffer.length < 200) audioBuffer.push(payload); // buffer until session.started
        } else if (openaiWs.readyState === WebSocket.OPEN) {
          openaiWs.send(JSON.stringify({ type: 'session.input_audio.append', audio: payload }));
        }
      }
    } else if (msg.event === 'stop') {
      cleanup('TWILIO_STOP');
    }
  });

  twilioWs.on('close', () => cleanup('TWILIO_CLOSE'));
  twilioWs.on('error', (e) => { console.error(`[${callSid}] Twilio ws error`, e.message); cleanup('TWILIO_WS_ERROR'); });
}

// ─── Express + WebSocket server ───────────────────────────────────────────────
function start() {
  if (!OPENAI_API_KEY) { console.error('OPENAI_API_KEY not set'); process.exit(1); }
  if (!BRIDGE_HMAC_SECRET) { console.error('BRIDGE_HMAC_SECRET not set'); process.exit(1); }

  fillPool();

  const app = express();
  app.get('/health', (_, res) => res.json({ ok: true, activeCalls, pool: wsPool.length }));

  app.get('/debug', async (req, res) => {
    const results = {
      hmacSecretSet: !!BRIDGE_HMAC_SECRET,
      openaiKeySet: !!OPENAI_API_KEY,
      liveModel: LIVE_MODEL,
      reasoningModel: REASONING_MODEL,
      poolSize: wsPool.length,
      poolReady: wsPool.filter(w => w._poolReady).length,
    };
    try {
      const ts = Math.floor(Date.now() / 1000);
      const nonce = crypto.randomBytes(8).toString('hex');
      const payload = `sales:${ts}:${nonce}`;
      const sig = crypto.createHmac('sha256', BRIDGE_HMAC_SECRET).update(payload).digest('hex');
      results.selfMintValid = validateBridgeToken(`${payload}:${sig}`) === 'sales';
    } catch (e) { results.selfMintError = e.message; }
    if (req.query.token) results.externalTokenValid = validateBridgeToken(req.query.token);
    results.recentEvents = recentEvents.slice(-20);
    res.json(results);
  });

  const server = http.createServer(app);
  const wss = new WebSocketServer({ noServer: true });

  server.on('upgrade', (req, socket, head) => {
    const url = new URL(req.url, `http://${req.headers.host}`);
    const pathParts = url.pathname.split('/').filter(Boolean);
    const profile = pathParts[1] || url.searchParams.get('profile');
    logEvent(`[upgrade] path=${url.pathname} profile=${profile} from=${req.socket.remoteAddress}`);
    if (pathParts[0] !== 'ws') { logEvent('[upgrade] rejected: wrong path'); socket.destroy(); return; }
    if (activeCalls >= MAX_CONCURRENT) { logEvent('[upgrade] rejected: concurrent limit'); socket.destroy(); return; }
    if (profile !== 'sales' && profile !== 'support') { logEvent(`[upgrade] rejected: bad profile ${profile}`); socket.destroy(); return; }

    logEvent(`[upgrade] accepted profile=${profile}`);
    wss.handleUpgrade(req, socket, head, (ws) => {
      let callerPhone = '';
      let callSid = '';

      const firstMessage = (raw) => {
        let msg;
        try { msg = JSON.parse(raw.toString()); } catch { logEvent('[ws] bad JSON'); ws.close(); return; }
        logEvent(`[ws] first msg event=${msg.event}`);
        if (msg.event === 'connected') return;
        if (msg.event !== 'start') { logEvent(`[ws] unexpected ${msg.event}`); ws.close(); return; }

        const params = msg.start?.customParameters || {};
        const tokenStr = params.bridge_token || params.token;
        const tokenProfile = validateBridgeToken(tokenStr);
        if (!tokenProfile || tokenProfile !== profile) {
          logEvent(`[bridge] token rejected: tokenProfile=${tokenProfile} urlProfile=${profile}`);
          ws.close();
          return;
        }
        logEvent(`[bridge] token accepted for ${profile}`);
        callerPhone = msg.start?.from || params.callerPhone || '';
        callSid = msg.start?.callSid || '';

        ws.removeListener('message', firstMessage);
        handleCall(ws, profile, callerPhone, callSid);
        ws.emit('message', raw);
      };

      ws.on('message', firstMessage);
      ws.on('close', (code) => logEvent(`[ws] pre-start close code=${code}`));
    });
  });

  server.listen(PORT, () => {
    console.log(`[bridge] listening on port ${PORT} model=${LIVE_MODEL} reasoning=${REASONING_MODEL}`);
  });
}

start();
