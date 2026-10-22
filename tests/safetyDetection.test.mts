import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import { createRequire } from 'node:module';
import { readFileSync } from 'node:fs';
import { EventEmitter } from 'node:events';
const require = createRequire(import.meta.url);
const { detectSafetyIntent } = require('../twilio-bridge/safety-intents.cjs');

// ─── Unit tests: detectSafetyIntent ───────────────────────────────────────────

test('SAFE-001: gas smell triggers',()=>{
  assert.equal(detectSafetyIntent('I smell gas in my unit')?.intentId,'SAFE-001');
  assert.equal(detectSafetyIntent('there is a gas leak')?.intentId,'SAFE-001');
  assert.equal(detectSafetyIntent('smells like rotten eggs')?.intentId,'SAFE-001');
  assert.equal(detectSafetyIntent('gas odor coming from the furnace')?.intentId,'SAFE-001');
});

test('SAFE-002: CO alarm triggers',()=>{
  assert.equal(detectSafetyIntent('my co alarm is going off')?.intentId,'SAFE-002');
  assert.equal(detectSafetyIntent('carbon monoxide detector triggered')?.intentId,'SAFE-002');
});

test('SAFE-003: fire triggers',()=>{
  assert.equal(detectSafetyIntent('my building is on fire')?.intentId,'SAFE-003');
  assert.equal(detectSafetyIntent('I can see fire coming from the unit')?.intentId,'SAFE-003');
  assert.equal(detectSafetyIntent('there is visible fire')?.intentId,'SAFE-003');
  assert.equal(detectSafetyIntent('there\'s a fire in the hall')?.intentId,'SAFE-003');
});

test('SAFE-004: smoke triggers',()=>{
  assert.equal(detectSafetyIntent('I can smell smoke coming from the vents')?.intentId,'SAFE-004');
  assert.equal(detectSafetyIntent('there\'s a lot of smoke')?.intentId,'SAFE-004');
  assert.equal(detectSafetyIntent('smoke alarm going off')?.intentId,'SAFE-004');
  assert.equal(detectSafetyIntent('smoke coming from the unit')?.intentId,'SAFE-004');
});

test('SAFE-005: sparks triggers',()=>{
  assert.equal(detectSafetyIntent('I see sparks from the outlet')?.intentId,'SAFE-005');
  assert.equal(detectSafetyIntent('the panel is sparking')?.intentId,'SAFE-005');
  assert.equal(detectSafetyIntent('sparks flying everywhere')?.intentId,'SAFE-005');
});

test('SAFE-006: medical triggers',()=>{
  assert.equal(detectSafetyIntent('I have chest pain')?.intentId,'SAFE-006');
  assert.equal(detectSafetyIntent('can\'t breathe')?.intentId,'SAFE-006');
  assert.equal(detectSafetyIntent('I think I\'m having a heart attack')?.intentId,'SAFE-006');
  assert.equal(detectSafetyIntent('medical emergency right now')?.intentId,'SAFE-006');
  assert.equal(detectSafetyIntent('he passed out')?.intentId,'SAFE-006');
});

test('SAFE-007: flooding triggers',()=>{
  assert.equal(detectSafetyIntent('there is major flooding in the basement')?.intentId,'SAFE-007');
  assert.equal(detectSafetyIntent('water everywhere and near the electrical panel')?.intentId,'SAFE-007');
  assert.equal(detectSafetyIntent('water is rising rapidly')?.intentId,'SAFE-007');
});

test('SAFE-008: electrical emergency triggers',()=>{
  assert.equal(detectSafetyIntent('there is an electrical fire')?.intentId,'SAFE-008');
  assert.equal(detectSafetyIntent('I got shocked by the outlet')?.intentId,'SAFE-008');
  assert.equal(detectSafetyIntent('the wire is burning')?.intentId,'SAFE-008');
});

// ─── Negative corpus: common false-positive phrases ─────────────────────────

test('no false positives on common sales/business phrases',()=>{
  const negatives = [
    'we fired our answering service last month',
    'I own a gas station on the strip',
    'we run a smoke shop in Las Vegas',
    'our team has been on fire this quarter',
    'that gave me a heart attack when I saw the bill',
    'we need to spark new growth',
    'let me give you a number that will blow your mind',
    'our phones are burning up with calls',
    'water is important for our plants',
    'we installed fire alarms throughout the building',
    'gas prices have gone up',
    'our current provider is shocking us with fees',
    'I have been fighting to get this resolved',
    'the competition is flooding the market',
  ];
  for (const phrase of negatives) {
    const hit = detectSafetyIntent(phrase);
    assert.equal(hit, null, `expected null for: "${phrase}" but got ${hit?.intentId}`);
  }
});

// ─── Integration: safety scan in server.js ───────────────────────────────────

const source = readFileSync(new URL('../twilio-bridge/server.js', import.meta.url), 'utf8').replace(/start\(\);\s*$/, 'globalThis.handleCall = handleCall; globalThis.wsPool = wsPool;');

async function session(profile: string, staging = false) {
  const outbound: any[] = [], sockets: any[] = [], phoneOutbound: any[] = [];
  class Socket extends EventEmitter {
    static OPEN = 1; readyState = 1;
    constructor(..._args: any[]) { super(); sockets.push(this); queueMicrotask(() => this.emit('open')); }
    send(raw: string) { outbound.push(JSON.parse(raw)); }
    close() { this.readyState = 3; }
  }
  const timers: any[] = [];
  const context: any = {
    require: (n: string) =>
      n === './staging-support-intake.cjs' ? { readiness: () => 'STAGING_WRITES_DISABLED', submitStagingSupport: async () => { throw new Error('STAGING_WRITES_DISABLED'); } } :
      n === './safety-intents.cjs' ? require('../twilio-bridge/safety-intents.cjs') :
      n === './sales-intents.cjs' ? require('../twilio-bridge/sales-intents.cjs') :
      n === 'express' ? () => ({}) :
      n === 'ws' ? { WebSocket: Socket, WebSocketServer: class {} } :
      require(n),
    console: { log() {}, error() {} },
    process: { env: { OPENAI_API_KEY: 'mock', BRIDGE_HMAC_SECRET: 'mock', NETLIFY_BASE_URL: 'https://staging.invalid', RAILWAY_ENVIRONMENT_NAME: staging ? 'staging' : 'test' } },
    Buffer, URL, AbortSignal,
    setTimeout: (fn: any, ms: number) => { timers.push({ fn, ms }); return timers.length; },
    clearTimeout() {}, setInterval: (fn: any, ms: number) => { timers.push({ fn, ms, interval: true }); return timers.length; },
    clearInterval: (id: number) => { if (timers[id - 1]) timers[id - 1].cleared = true; },
    fetch: async (_url: string, opts: any) => {
      const body = JSON.parse(opts.body);
      return { ok: true, json: async () => body.action === 'start' ? { interactionId: 'fictional-interaction', transferAllowed: 'yes' } : { lead: { id: 'fictional-lead' } } };
    },
  };
  vm.runInNewContext(source, context);
  const phone: any = new EventEmitter();
  phone.readyState = 1; phone.send = (raw: string) => phoneOutbound.push(JSON.parse(raw)); phone.close = () => { phone.readyState = 3; };
  await context.handleCall(phone, profile, '+12025550199', 'TEST_CALL');
  phone.emit('message', Buffer.from(JSON.stringify({ event: 'start', start: { streamSid: 'TEST_STREAM' } })));
  const flush = async () => { for (let i = 0; i < 12; i++) await Promise.resolve(); };
  await flush();
  const ws = sockets[0];
  const transcript = async (delta: string) => {
    ws.emit('message', Buffer.from(JSON.stringify({ type: 'session.input_transcript.delta', delta })));
    await flush();
  };
  return { outbound, phone, ws, transcript, flush };
}

const hasSafeOverride = (outbound: any[]) =>
  outbound.some((x: any) => x.type === 'session.instructions.append' && typeof x.content === 'string' && x.content.includes('SAFETY OVERRIDE'));

test('SAFE-I01: gas signal on sales profile fires cancel + override + create',async()=>{
  const s = await session('sales');
  // Set greetingPlayed so the cancel guard is not suppressed by startup
  s.ws.emit('message', Buffer.from(JSON.stringify({ type: 'session.output_audio.delta', delta: 'AQID' })));
  await s.flush();
  s.phone.emit('message', Buffer.from(JSON.stringify({ event: 'mark', streamSid: 'TEST_STREAM', mark: { name: 'stellar-greeting-start' } })));
  await s.flush();
  const beforeLen = s.outbound.length;
  await s.transcript('I think I smell gas in my office');
  assert.ok(hasSafeOverride(s.outbound), 'session.instructions.append with SAFETY OVERRIDE must fire');
  const overrideIdx = s.outbound.findIndex((x:any) => x.type === 'session.instructions.append' && x.content?.includes('SAFETY OVERRIDE'));
  const cancelIdx = s.outbound.findIndex((x:any,i:number) => i >= beforeLen && x.type === 'response.cancel');
  const createIdx = s.outbound.findIndex((x:any,i:number) => i > overrideIdx && x.type === 'response.create');
  assert.ok(cancelIdx >= beforeLen, 'response.cancel must fire');
  assert.ok(createIdx > overrideIdx, 'response.create must follow the override append');
  const override = s.outbound[overrideIdx];
  assert.match(override.content, /SAFE-001/);
  assert.match(override.content, /Are you safe right now/);
});

test('SAFE-I02: same override does not fire twice (dedup)',async()=>{
  const s = await session('sales');
  await s.transcript('I smell gas near the furnace');
  await s.transcript('I smell gas again coming from the vents');
  const overrides = s.outbound.filter((x:any) => x.type === 'session.instructions.append' && x.content?.includes('SAFE-001'));
  assert.equal(overrides.length, 1, 'SAFE-001 override must fire at most once per call');
});

test('SAFE-I03: support profile fires override on CO alarm',async()=>{
  const s = await session('support');
  await s.transcript('the co alarm is going off upstairs');
  assert.ok(hasSafeOverride(s.outbound), 'safety override must fire on support profile');
  const override = s.outbound.find((x:any) => x.type === 'session.instructions.append' && x.content?.includes('SAFETY OVERRIDE'));
  assert.match(override.content, /SAFE-002/);
});

test('SAFE-I04: pma profile does NOT fire server override (has own routing)',async()=>{
  const s = await session('pma');
  await s.transcript('I smell gas in the unit');
  assert.ok(!hasSafeOverride(s.outbound), 'pma profile must not trigger server safety override');
});
