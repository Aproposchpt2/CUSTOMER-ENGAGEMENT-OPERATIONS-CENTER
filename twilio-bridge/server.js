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
const CSS_TENANT_ID = process.env.CSS_TENANT_ID || '5885a020-d363-4c27-910a-c035eda132f5';
const TRANSFER_NUMBER = process.env.TRANSFER_NUMBER || '+17023087429';
const MAX_CONCURRENT = parseInt(process.env.MAX_CONCURRENT_CALLS || '10', 10);
const MAX_CALL_MS = parseInt(process.env.MAX_CALL_DURATION_MS || '2700000', 10); // 45 min
const TOKEN_TTL_SECS = 120;

let activeCalls = 0;
const recentEvents = [];
function logEvent(msg) { console.log(msg); recentEvents.push({ t: Date.now(), msg }); if (recentEvents.length > 50) recentEvents.shift(); }

// ─── Live API session creation — same HTTP POST as staging, websocket transport ─
async function createLiveSession(profile, instructions, tools) {
  const body = {
    session: {
      model: LIVE_MODEL,
      instructions: profile === 'sales'
        ? 'You are the Stellar UC Intelligent Sales Specialist on a phone call. Be natural, professional, and concise.'
        : 'You are the Stellar UC Intelligent Support Specialist on a phone call. Be warm, clear, and professional.',
      audio: { format: { type: 'audio/pcmu' } },
      delegation: {
        type: 'responses',
        responses: { model: REASONING_MODEL, instructions, tools, tool_choice: 'auto' },
      },
    },
    transport: { type: 'websocket' },
  };
  const resp = await fetch('https://api.openai.com/v1/live/sessions', {
    method: 'POST',
    headers: { Authorization: `Bearer ${OPENAI_API_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(15000),
  });
  const data = await resp.json().catch(() => ({}));
  if (!resp.ok) throw new Error(`Live session ${resp.status}: ${JSON.stringify(data?.error || data)}`);
  // URL may be under transport.url or transport.websocket.url depending on API version
  const wsUrl = data.transport?.url || data.transport?.websocket?.url || data.transport?.ws_url;
  logEvent(`[live] session id=${data.session?.id} transport=${JSON.stringify(data.transport)}`);
  if (!wsUrl) throw new Error(`No WS URL in session response: ${JSON.stringify(data.transport)}`);
  return { sessionId: data.session?.id, wsUrl };
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

# Call setup (already handled — do not call start_intake)
At the start of this call, the system already ran intake and will tell you: INTERACTION_ID, TRANSFER_ALLOWED (yes/no), KNOWN_CALLER_NAME, and CALLER_NUMBER. Use these in your responses. If KNOWN_CALLER_NAME is set, confirm it with the caller ("Am I speaking with [first name]?"). If empty, ask "And who do I have the pleasure of speaking with?"

# Tools you have
- submit_business_profile: Call once right before your closing goodbye (or just before transfer). Collect: caller's name, their callback phone (read back digit by digit from CALLER_NUMBER to confirm), their email (spell back letter by letter), business name, service interest, and the full discovery summary. Do not call it during the demonstration. Confirm phone and email out loud before calling.
- end_call: Call after saying goodbye to hang up cleanly.
- transfer_to_specialist: Call after submit_business_profile when TRANSFER_ALLOWED is "yes" and the caller wants to speak with a person. If TRANSFER_ALLOWED is "no", offer a callback instead of transferring.

# Conversation flow
1. GREETING: Deliver the opening line. Start with: "Hello, you have reached Stellar Unified Communications. Who do I have the pleasure of speaking to today?" Then proceed with discovery once you have their name.
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
- Never book appointments directly into calendars. Never promise integrations. Never state dollar amounts.
- Transfers to specialist only when TRANSFER_ALLOWED is "yes".
- Outside transfer hours: take a callback request instead.

# Never do these
Never invent capabilities, prices, discounts, trials, pilots, timelines, integrations, certifications or future features. If you can't answer it, escalate or take a callback.`;

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

After successful case creation, tell the caller: "A support case has been opened. Our team will follow up with you." Then call end_call.

If the tool fails, apologize and advise them to call back or email support@stellaruc.com.

Never ask for passwords or payment information. Never promise specific fix timelines. For dangerous hardware or electrical issues, advise stopping use of the device immediately.`;

// transfer_to_specialist always present; bridge enforces transferAllowed flag at execution time
function salesTools(interactionId) {
  return [
    {
      type: 'function',
      name: 'submit_business_profile',
      description: 'Submit the lead record right before saying goodbye or transferring. Only call after confirming phone and email.',
      parameters: {
        type: 'object',
        properties: {
          interactionId: { type: 'string', description: `The interaction ID for this call. Use: ${interactionId}` },
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
      description: 'Transfer to a human specialist. Only after submit_business_profile has been called.',
      parameters: {
        type: 'object',
        properties: { reason: { type: 'string' } },
        additionalProperties: false,
      },
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
        purchaseDate: { type: 'string', description: 'YYYY-MM-DD or approximate' },
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

// ─── Pre-warmed session pool (one per profile) ────────────────────────────────
const sessionPool = { sales: [], support: [] };
const POOL_PER_PROFILE = 1;
const GENERIC_GREET = 'Hello, you have reached Stellar Unified Communications. Who do I have the pleasure of speaking to today?';

async function openPoolSession(profile) {
  if (!OPENAI_API_KEY) return;
  try {
    const instructions = (profile === 'sales' ? SALES_SYSTEM_PROMPT : SUPPORT_SYSTEM_PROMPT)
      + `\n\n# CALL CONTEXT\nINTERACTION_ID: PENDING\nTRANSFER_ALLOWED: no\nKNOWN_CALLER_NAME: \nCALLER_NUMBER: \n\nStart by saying exactly: "${GENERIC_GREET}"`;
    const tools = profile === 'sales' ? salesTools('PENDING') : supportTools;
    const { sessionId, wsUrl } = await createLiveSession(profile, instructions, tools);
    const ws = new WebSocket(wsUrl, { headers: { Authorization: `Bearer ${OPENAI_API_KEY}` } });
    ws._sessionId = sessionId;
    ws._profile = profile;
    ws._poolReady = false;
    ws.once('open', () => { ws._poolReady = true; logEvent(`[pool] ${profile} ready sid=${sessionId}`); });
    ws.once('error', (e) => { logEvent(`[pool] ${profile} ws error: ${e.message}`); ws.close(); });
    ws.once('close', () => {
      const i = sessionPool[profile].indexOf(ws);
      if (i !== -1) sessionPool[profile].splice(i, 1);
      logEvent(`[pool] ${profile} closed, refilling`);
      setTimeout(() => fillPool(profile), 10000);
    });
    // Log pool-level session events; don't process them (no call attached yet)
    ws.on('message', (raw) => {
      try {
        const m = JSON.parse(raw.toString());
        if (m.type && !['session.started', 'session.created'].includes(m.type)) {
          logEvent(`[pool:${profile}] unexpected event: ${m.type}`);
        }
      } catch { /* ignore */ }
    });
    sessionPool[profile].push(ws);
  } catch (e) {
    logEvent(`[pool] ${profile} session create failed: ${e.message}`);
    setTimeout(() => fillPool(profile), 15000);
  }
}

function fillPool(profile) {
  if (!OPENAI_API_KEY) return;
  while (sessionPool[profile].length < POOL_PER_PROFILE) openPoolSession(profile);
}

function claimPooled(profile) {
  const pool = sessionPool[profile];
  const i = pool.findIndex(w => w._poolReady && w.readyState === WebSocket.OPEN);
  if (i === -1) return null;
  const [ws] = pool.splice(i, 1);
  ws.removeAllListeners('message'); // strip pool drain listener before call handlers attach
  logEvent(`[pool] claimed ${profile} sid=${ws._sessionId}`);
  setTimeout(() => fillPool(profile), 0);
  return ws;
}

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

  const deadline = setTimeout(() => {
    logEvent(`[${callSid}] max duration reached`);
    cleanup('MAX_DURATION');
  }, MAX_CALL_MS);

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

  // ── Execute a tool call from the reasoning backend ─────────────────────────
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
        setTimeout(() => {
          twilioUpdateCall(callSid, '<Response><Hangup/></Response>');
          cleanup('END_CALL_TOOL');
        }, 1500);
      } else if (name === 'transfer_to_specialist') {
        if (transferAllowed !== 'yes') {
          output = { error: 'Transfer not available for this call. Please offer to take a callback instead.' };
        } else {
          output = { success: true };
          setTimeout(() => {
            twilioUpdateCall(callSid, `<Response><Dial>${TRANSFER_NUMBER}</Dial></Response>`);
            cleanup('TRANSFER_TOOL');
          }, 1000);
        }
      } else {
        output = { error: 'unknown_tool' };
      }
    } catch (e) {
      console.error(`[${callSid}] tool ${name} failed:`, e.message);
      output = { error: e.message };
    }

    sendToOpenAI({ type: 'conversation.item.create', item: {
      type: 'function_call_output',
      call_id: callId,
      output: JSON.stringify(output),
    }});
    sendToOpenAI({ type: 'response.create' });
  }

  // ── Attach OpenAI WebSocket handlers ───────────────────────────────────────
  function attachOpenAIHandlers() {
    const toolCallBuffers = {};

    openaiWs.on('message', (raw) => {
      let msg;
      try { msg = JSON.parse(raw.toString()); } catch { return; }
      const t = msg.type;

      // Session lifecycle
      if (t === 'session.started' || t === 'session.created' || t === 'session.updated') {
        logEvent(`[${callSid}] ${t} model=${msg.session?.model || '?'}`);
      } else if (t === 'response.created' || t === 'response.done') {
        const out = msg.response?.output ? JSON.stringify(msg.response.output.map(i => i.type)) : 'none';
        logEvent(`[${callSid}] ${t} status=${msg.response?.status} output=${out}`);
      } else if (t === 'input_audio_buffer.speech_started' || t === 'session.speech_started') {
        logEvent(`[${callSid}] speech_started`);
      } else if (t === 'error') {
        logEvent(`[${callSid}] OpenAI error: ${msg.error?.message || JSON.stringify(msg.error)}`);
      } else if (!['session.output_audio.delta','response.output_audio.delta','response.output_audio_transcript.delta',
        'response.function_call_arguments.delta','response.function_call_arguments.done',
        'response.output_item.added','response.output_item.done','response.content_part.added',
        'response.content_part.done','response.audio.done','response.audio_transcript.delta',
        'response.audio_transcript.done','response.text.delta','response.text.done',
        'input_audio_buffer.committed','input_audio_buffer.speech_stopped','session.speech_stopped',
        'conversation.item.created','rate_limits.updated'].includes(t)) {
        logEvent(`[${callSid}] oai: ${t} ${JSON.stringify(msg).slice(0, 120)}`);
      }

      // Audio out → Twilio (Live API uses session.output_audio.delta; Realtime uses response.output_audio.delta)
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

      // Start intake in parallel with session claim/creation
      const intakeP = profile === 'sales'
        ? callSalesIntakeStart(callSid, callerPhone).catch(e => { logEvent(`[${callSid}] intake failed: ${e.message}`); return null; })
        : Promise.resolve(null);

      // Try pooled session first
      openaiWs = claimPooled(profile);
      const poolHit = !!openaiWs;

      if (!poolHit) {
        // Pool miss: create a fresh Live API session
        logEvent(`[${callSid}] pool miss — creating fresh Live session`);
        try {
          const greet = GENERIC_GREET;
          const baseInstructions = (profile === 'sales' ? SALES_SYSTEM_PROMPT : SUPPORT_SYSTEM_PROMPT)
            + `\n\n# CALL CONTEXT\nINTERACTION_ID: PENDING\nTRANSFER_ALLOWED: no\nKNOWN_CALLER_NAME: \nCALLER_NUMBER: \n\nStart by saying exactly: "${greet}"`;
          const tools = profile === 'sales' ? salesTools('PENDING') : supportTools;
          const { wsUrl } = await createLiveSession(profile, baseInstructions, tools);
          openaiWs = new WebSocket(wsUrl, { headers: { Authorization: `Bearer ${OPENAI_API_KEY}` } });
        } catch (e) {
          logEvent(`[${callSid}] session create failed: ${e.message}`);
          cleanup('SESSION_CREATE_FAILED');
          return;
        }
      }

      // Attach handlers immediately (before any awaits) so no events are missed
      attachOpenAIHandlers();

      // For fresh WS: wait for open
      if (!poolHit && openaiWs.readyState !== WebSocket.OPEN) {
        try {
          await new Promise((res, rej) => { openaiWs.once('open', res); openaiWs.once('error', rej); });
        } catch (e) {
          logEvent(`[${callSid}] WS open failed: ${e.message}`);
          cleanup('WS_OPEN_ERROR');
          return;
        }
      }

      logEvent(`[${callSid}] OpenAI WS open (pool=${poolHit})`);

      // Wait for intake to complete
      const intake = await intakeP;
      if (profile === 'sales' && intake) {
        interactionId = intake.interactionId;
        transferAllowed = intake.transferAllowed || 'no';
        logEvent(`[${callSid}] intake ok interactionId=${interactionId} transfer=${transferAllowed}`);
      }

      // Trigger the agent's opening greeting
      sendToOpenAI({ type: 'response.create' });

    } else if (msg.event === 'media' && openaiWs) {
      if (openaiWs.readyState === WebSocket.OPEN) {
        // Live API uses session.input_audio.append; Realtime used input_audio_buffer.append
        openaiWs.send(JSON.stringify({
          type: 'session.input_audio.append',
          audio: msg.media?.payload,
        }));
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

  // Pre-warm one session per profile
  fillPool('sales');
  fillPool('support');

  const app = express();
  app.get('/health', (_, res) => res.json({ ok: true, activeCalls, pool: { sales: sessionPool.sales.length, support: sessionPool.support.length } }));

  app.get('/debug', async (req, res) => {
    const results = {
      hmacSecretSet: !!BRIDGE_HMAC_SECRET,
      openaiKeySet: !!OPENAI_API_KEY,
      liveModel: LIVE_MODEL,
      reasoningModel: REASONING_MODEL,
      pool: {
        sales: sessionPool.sales.map(w => ({ ready: w._poolReady, state: w.readyState, sid: w._sessionId })),
        support: sessionPool.support.map(w => ({ ready: w._poolReady, state: w.readyState, sid: w._sessionId })),
      },
    };
    // Self-mint token check
    try {
      const ts = Math.floor(Date.now() / 1000);
      const nonce = crypto.randomBytes(8).toString('hex');
      const payload = `sales:${ts}:${nonce}`;
      const sig = crypto.createHmac('sha256', BRIDGE_HMAC_SECRET).update(payload).digest('hex');
      results.selfMintValid = validateBridgeToken(`${payload}:${sig}`) === 'sales';
    } catch (e) { results.selfMintError = e.message; }
    // Probe Live API (just creates a session, immediately notes the response)
    try {
      const testResp = await fetch('https://api.openai.com/v1/live/sessions', {
        method: 'POST',
        headers: { Authorization: `Bearer ${OPENAI_API_KEY}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ session: { model: LIVE_MODEL }, transport: { type: 'websocket' } }),
        signal: AbortSignal.timeout(10000),
      });
      const testData = await testResp.json().catch(() => ({}));
      results.liveApiStatus = testResp.status;
      results.liveApiSessionId = testData.session?.id;
      results.liveApiWsUrl = !!(testData.transport?.url || testData.transport?.websocket?.url);
      // Close the probe session if we got a WS URL (don't leave it dangling)
      const probeUrl = testData.transport?.url || testData.transport?.websocket?.url;
      if (probeUrl) {
        const probe = new WebSocket(probeUrl, { headers: { Authorization: `Bearer ${OPENAI_API_KEY}` } });
        probe.once('open', () => probe.close());
        probe.once('error', () => {});
      }
    } catch (e) { results.liveApiError = e.message; }
    if (req.query.token) results.externalTokenValid = validateBridgeToken(req.query.token);
    results.recentEvents = recentEvents.slice(-20);
    res.json(results);
  });

  const server = http.createServer(app);
  const wss = new WebSocketServer({ noServer: true });

  server.on('upgrade', (req, socket, head) => {
    const url = new URL(req.url, `http://${req.headers.host}`);
    const pathParts = url.pathname.split('/').filter(Boolean); // ['ws','sales']
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
