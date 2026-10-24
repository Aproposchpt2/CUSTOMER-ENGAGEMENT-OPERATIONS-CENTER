'use strict';

// VoiceOps Diagnostic Monitoring Framework — Stellar Intelligent Technologies
// Instruments every measurable hop in the Twilio > Fly.io > OpenAI voice chain.

const THRESHOLDS = {
  sessionSetupMs: 2500,   // Twilio stream open → OpenAI session.started
  ttfaMs: 3500,           // stream open → first audio delta back to Twilio
  llmTurnMs: 1800,        // response.created → first output audio (per turn)
  toolMs: 5000,           // tool call invoked → result returned
  p95TurnMs: 2500,        // P95 of all LLM turn latencies
  inboundJitterMs: 30,    // max acceptable inbound audio jitter
  packetLossRatio: 0.02,  // 2% max inbound packet loss
};

class LatencyLogger {
  constructor(callSid, profile) {
    this.callSid = callSid;
    this.profile = profile;
    this.t = {
      callStart: Date.now(),
      streamStarted: null,
      sessionReady: null,
      firstAudioDelta: null,
      speechStarts: [],
      turns: [],          // [{responseCreated, firstAudioMs, completedMs, tool?}]
      tools: [],          // [{name, startMs, endMs, elapsedMs}]
      callEnd: null,
    };
    this._activeTurn = null;
    this._inboundPackets = [];
    this._lastInboundMs = null;
    this._jitterSamples = [];
    this._lostPackets = 0;
    this._expectedSeq = null;
  }

  // ── Lifecycle marks ────────────────────────────────────────────────────────
  markStreamStarted()  { this.t.streamStarted = Date.now(); }
  markSessionReady()   { this.t.sessionReady = Date.now(); }
  markFirstAudio()     { if (!this.t.firstAudioDelta) this.t.firstAudioDelta = Date.now(); }
  markSpeechStart()    { this.t.speechStarts.push(Date.now()); }
  markCallEnd()        { this.t.callEnd = Date.now(); }

  // ── Turn tracking (LLM response.created → first audio out) ────────────────
  turnStart() {
    this._activeTurn = { responseCreated: Date.now(), firstAudioMs: null, completedMs: null };
  }
  turnFirstAudio() {
    if (this._activeTurn && !this._activeTurn.firstAudioMs)
      this._activeTurn.firstAudioMs = Date.now() - this._activeTurn.responseCreated;
  }
  turnEnd() {
    if (this._activeTurn) {
      this._activeTurn.completedMs = Date.now() - this._activeTurn.responseCreated;
      this.t.turns.push(this._activeTurn);
      this._activeTurn = null;
    }
  }

  // ── Tool latency ──────────────────────────────────────────────────────────
  toolStart(name) {
    const entry = { name, startMs: Date.now(), endMs: null, elapsedMs: null };
    this.t.tools.push(entry);
    return entry;
  }
  toolEnd(entry) {
    if (entry) { entry.endMs = Date.now(); entry.elapsedMs = entry.endMs - entry.startMs; }
  }

  // ── Packet health (inbound Twilio media events) ───────────────────────────
  inboundPacket(seqNum) {
    const now = Date.now();
    if (this._lastInboundMs !== null) {
      const gap = now - this._lastInboundMs;
      // Expected gap for PCMU 8kHz 20ms frames ≈ 20ms
      const jitter = Math.abs(gap - 20);
      this._jitterSamples.push(jitter);
    }
    if (seqNum !== null && this._expectedSeq !== null && seqNum !== this._expectedSeq) {
      const lost = ((seqNum - this._expectedSeq) + 65536) % 65536;
      if (lost < 1000) this._lostPackets += lost;
    }
    if (seqNum !== null) this._expectedSeq = (seqNum + 1) % 65536;
    this._inboundPackets.push(now);
    this._lastInboundMs = now;
  }

  // ── Computed metrics ──────────────────────────────────────────────────────
  metrics() {
    const { streamStarted, sessionReady, firstAudioDelta, turns, tools } = this.t;
    const sessionSetupMs = sessionReady && streamStarted ? sessionReady - streamStarted : null;
    const ttfaMs = firstAudioDelta && streamStarted ? firstAudioDelta - streamStarted : null;

    const turnFirstAudio = turns.map(t => t.firstAudioMs).filter(v => v !== null);
    const llmP50 = _percentile(turnFirstAudio, 50);
    const llmP95 = _percentile(turnFirstAudio, 95);
    const llmP99 = _percentile(turnFirstAudio, 99);

    const avgJitter = this._jitterSamples.length
      ? this._jitterSamples.reduce((a, b) => a + b, 0) / this._jitterSamples.length : null;
    const totalPackets = this._inboundPackets.length + this._lostPackets;
    const packetLossRatio = totalPackets > 0 ? this._lostPackets / totalPackets : null;
    const mos = _estimateMOS(avgJitter, packetLossRatio);

    return {
      callSid: this.callSid,
      profile: this.profile,
      sessionSetupMs,
      ttfaMs,
      llmP50,
      llmP95,
      llmP99,
      avgJitterMs: avgJitter ? Math.round(avgJitter) : null,
      packetLossRatio: packetLossRatio !== null ? +packetLossRatio.toFixed(4) : null,
      mosEstimate: mos,
      turnCount: turns.length,
      toolCalls: tools.map(t => ({ name: t.name, elapsedMs: t.elapsedMs })),
      durationMs: this.t.callEnd ? this.t.callEnd - (this.t.streamStarted || this.t.callStart) : null,
    };
  }

  // ── Certification report ──────────────────────────────────────────────────
  certify() {
    const m = this.metrics();
    const checks = [
      { name: 'session_setup', pass: m.sessionSetupMs === null || m.sessionSetupMs <= THRESHOLDS.sessionSetupMs, value: m.sessionSetupMs, limit: THRESHOLDS.sessionSetupMs },
      { name: 'ttfa',          pass: m.ttfaMs === null || m.ttfaMs <= THRESHOLDS.ttfaMs,               value: m.ttfaMs,          limit: THRESHOLDS.ttfaMs },
      { name: 'llm_p95',       pass: m.llmP95 === null || m.llmP95 <= THRESHOLDS.p95TurnMs,            value: m.llmP95,          limit: THRESHOLDS.p95TurnMs },
      { name: 'jitter',        pass: m.avgJitterMs === null || m.avgJitterMs <= THRESHOLDS.inboundJitterMs, value: m.avgJitterMs, limit: THRESHOLDS.inboundJitterMs },
      { name: 'packet_loss',   pass: m.packetLossRatio === null || m.packetLossRatio <= THRESHOLDS.packetLossRatio, value: m.packetLossRatio, limit: THRESHOLDS.packetLossRatio },
      { name: 'mos',           pass: m.mosEstimate === null || m.mosEstimate >= 3.5,                    value: m.mosEstimate,     limit: 3.5 },
    ];
    const passed = checks.every(c => c.pass);
    return { callSid: this.callSid, profile: this.profile, passed, checks, metrics: m, ts: new Date().toISOString() };
  }

  // ── Structured log line for Fly.io / Supabase ingest ─────────────────────
  logLine(event, extra = {}) {
    return JSON.stringify({ event: `voiceops_${event}`, callSid: this.callSid, profile: this.profile, ts: Date.now(), ...extra });
  }
}

// ── Helpers ────────────────────────────────────────────────────────────────

function _percentile(arr, p) {
  if (!arr.length) return null;
  const sorted = [...arr].sort((a, b) => a - b);
  const idx = Math.ceil((p / 100) * sorted.length) - 1;
  return sorted[Math.max(0, idx)];
}

// E-model MOS estimate from jitter + packet loss (ITU-T G.107 simplified)
function _estimateMOS(jitterMs, lossRatio) {
  if (jitterMs === null && lossRatio === null) return null;
  const j = jitterMs ?? 0;
  const l = (lossRatio ?? 0) * 100;
  const delay = 150 + j * 2;
  const id = delay < 100 ? 0 : delay < 150 ? (delay - 100) * 0.03 : (delay - 150) * 0.07 + 1.5;
  const ie = 0 + l * 2.5;
  const r = Math.max(0, Math.min(100, 93.2 - id - ie));
  if (r < 0)  return 1.0;
  if (r > 100) return 4.5;
  return +Math.max(1, Math.min(4.5, 1 + 0.035 * r + r * (r - 60) * (100 - r) * 7e-6)).toFixed(2);
}

module.exports = { LatencyLogger, THRESHOLDS };
