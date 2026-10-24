'use strict';

// VoiceOps Audio Quality Analyzer — Stellar Intelligent Technologies
// Diagnoses signal degradation through the PCMU (G.711 µ-law) Twilio call path.
//
// The gap: browser playground uses 24kHz PCM (full range), phone uses 8kHz PCMU
// (µ-law, cuts all audio above 4kHz). This module measures what actually happens
// to the signal so we can distinguish codec degradation from level/clipping issues.

// ── µ-law decode table (ITU-T G.711) ─────────────────────────────────────────
const ULAW_DECODE = new Int16Array(256);
(function buildDecodeTable() {
  for (let i = 0; i < 256; i++) {
    let byte = ~i & 0xFF;
    const sign = byte & 0x80 ? -1 : 1;
    const exp  = (byte >> 4) & 0x07;
    const mant = byte & 0x0F;
    const linear = ((mant << 1) + 33) << (exp + 2);
    ULAW_DECODE[i] = sign * (linear - 33);
  }
})();

// ── Analyzer ──────────────────────────────────────────────────────────────────
class VoiceQualityAnalyzer {
  constructor(direction = 'inbound') {
    this.direction = direction; // 'inbound' (Twilio→bridge) or 'outbound' (bridge→Twilio)
    this._frames = 0;
    this._totalSamples = 0;
    this._sumSq = 0;           // for RMS calculation
    this._clippedSamples = 0;
    this._silentFrames = 0;
    this._peakAbsolute = 0;
    this._energyHistory = [];  // per-frame RMS for variance/SNR estimate
    this._CLIP_THRESHOLD = 30000; // ~91% of Int16 max (32767)
    this._SILENCE_THRESHOLD = 200; // RMS below this = silence frame
  }

  // Feed a base64-encoded PCMU payload (from Twilio media event or output delta)
  addFrame(base64Payload) {
    const bytes = Buffer.from(base64Payload, 'base64');
    let frameSumSq = 0;
    let frameClipped = 0;
    let framePeak = 0;

    for (let i = 0; i < bytes.length; i++) {
      const linear = ULAW_DECODE[bytes[i]];
      const abs = Math.abs(linear);
      frameSumSq += linear * linear;
      if (abs > this._CLIP_THRESHOLD) frameClipped++;
      if (abs > framePeak) framePeak = abs;
    }

    const n = bytes.length;
    const frameRms = n > 0 ? Math.sqrt(frameSumSq / n) : 0;

    this._frames++;
    this._totalSamples += n;
    this._sumSq += frameSumSq;
    this._clippedSamples += frameClipped;
    if (framePeak > this._peakAbsolute) this._peakAbsolute = framePeak;
    if (frameRms < this._SILENCE_THRESHOLD) this._silentFrames++;

    // Keep a rolling window of 300 frames (~6 seconds at 20ms/frame) for variance
    this._energyHistory.push(frameRms);
    if (this._energyHistory.length > 300) this._energyHistory.shift();
  }

  // ── Computed metrics ────────────────────────────────────────────────────────
  metrics() {
    if (this._totalSamples === 0) return null;

    const rmsOverall = Math.sqrt(this._sumSq / this._totalSamples);
    const dbfs = rmsOverall > 0 ? 20 * Math.log10(rmsOverall / 32767) : -Infinity;
    const clippingRatio = this._clippedSamples / this._totalSamples;
    const silenceRatio  = this._silentFrames / this._frames;
    const peakDbfs      = this._peakAbsolute > 0 ? 20 * Math.log10(this._peakAbsolute / 32767) : -Infinity;

    // Energy variance as a proxy for dynamic range (flat = TTS/recorded; varied = natural speech)
    const eh = this._energyHistory;
    const mean = eh.reduce((a, b) => a + b, 0) / eh.length;
    const variance = eh.reduce((a, b) => a + (b - mean) ** 2, 0) / eh.length;
    const dynamicRange = Math.sqrt(variance); // std dev of RMS energy

    // Crude SNR estimate: mean active-frame energy / mean silent-frame energy
    const activeFrames  = eh.filter(e => e >= this._SILENCE_THRESHOLD);
    const silentFrames  = eh.filter(e => e  < this._SILENCE_THRESHOLD);
    const activeMean    = activeFrames.length  ? activeFrames.reduce((a,b)=>a+b,0)/activeFrames.length  : 0;
    const silentMean    = silentFrames.length  ? silentFrames.reduce((a,b)=>a+b,0)/silentFrames.length  : 1;
    const snrEstDb      = activeMean > 0 && silentMean > 0 ? 20 * Math.log10(activeMean / Math.max(silentMean, 1)) : null;

    return {
      direction:    this.direction,
      frames:       this._frames,
      rmsDbfs:      +dbfs.toFixed(1),
      peakDbfs:     +peakDbfs.toFixed(1),
      clippingRatio:+clippingRatio.toFixed(4),
      silenceRatio: +silenceRatio.toFixed(3),
      dynamicRange: +dynamicRange.toFixed(1),
      snrEstDb:     snrEstDb !== null ? +snrEstDb.toFixed(1) : null,
    };
  }

  // ── Diagnosis ───────────────────────────────────────────────────────────────
  diagnose() {
    const m = this.metrics();
    if (!m) return null;

    const issues = [];

    // Level issues
    if (m.rmsDbfs < -30) issues.push({ code: 'LOW_LEVEL',    sev: 'warn', msg: `Signal level ${m.rmsDbfs} dBFS — caller audio may be too quiet; check Twilio gain or mic` });
    if (m.rmsDbfs > -6)  issues.push({ code: 'HOT_LEVEL',    sev: 'crit', msg: `Signal level ${m.rmsDbfs} dBFS — near clipping; check TTS output gain` });
    if (m.clippingRatio > 0.005) issues.push({ code: 'CLIPPING', sev: 'crit', msg: `${(m.clippingRatio*100).toFixed(2)}% of samples clipped — severe distortion; reduce TTS/input gain` });

    // Silence / activity
    if (m.silenceRatio > 0.7) issues.push({ code: 'HIGH_SILENCE', sev: 'warn', msg: `${(m.silenceRatio*100).toFixed(0)}% silent frames — may indicate dropped audio or excessive hold music` });

    // Dynamic range (flat = processed/compressed too hard)
    if (m.dynamicRange < 50 && m.frames > 20) issues.push({ code: 'FLAT_SIGNAL', sev: 'warn', msg: `Low dynamic range (${m.dynamicRange.toFixed(0)}) — signal may be over-compressed or from a synthetic source` });

    // SNR
    if (m.snrEstDb !== null && m.snrEstDb < 15) issues.push({ code: 'LOW_SNR', sev: 'crit', msg: `SNR estimate ${m.snrEstDb} dB — background noise or codec degradation is masking speech` });

    // Codec note (always present — this is the known PCMU quality ceiling)
    issues.push({ code: 'PCMU_CEILING', sev: 'info', msg: 'PCMU 8kHz (G.711) cuts all audio above 4kHz. Voices will sound thinner than 24kHz PCM playground previews. This is the codec path, not a signal defect.' });

    return { direction: m.direction, pass: !issues.some(i => i.sev === 'crit'), issues, metrics: m };
  }
}

module.exports = { VoiceQualityAnalyzer, ULAW_DECODE };
