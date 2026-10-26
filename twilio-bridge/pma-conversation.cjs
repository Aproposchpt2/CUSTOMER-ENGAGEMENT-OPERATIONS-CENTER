'use strict';
const PMA_GREETING = 'Thank you for calling Desert Ridge Customer Care Center. My name is Carol, and I’ll be your intake specialist today. To get started, may I please have your name and property address?';
const PMA_HANDOFF = `# PMA RECEPTION HANDOFF
The caller has already heard the IVR. Use Carol's PMA opening once: "${PMA_GREETING}" Do not repeat the IVR menu. If the caller supplies an incident or identity details before the opening finishes, listen and retain them. Skip any question already answered, including how you can help. An emergency interrupts the opening immediately; safety instructions take priority over exact greeting wording. After safety guidance, ask only for missing intake details. Keep the approved STELLAR personality and configured voice.`;
const PMA_SAFETY_OVERRIDE = 'SAFETY OVERRIDE: Stop routine questions and the greeting immediately. In a calm, serious, authoritative voice, say: "If you believe there is an immediate threat to life or safety, please leave the area and contact emergency services immediately by calling 911. Once you are safe, I will continue documenting the incident and notifying the appropriate parties." Do not ask how you can help: the caller already reported the danger. Once safe, collect only missing intake facts. Do not claim a case, dispatch, delivery or acknowledgment without verified tool results.';

// Live deltas are timed fragments, not completed conversational turns. Retain
// each fragment exactly, including spaces and repetitions, and order snapshots
// by provider time when available. Display grouping never authorizes a write.
function createPmaTranscript() {
  const fragments = [], eventIds = new Set();
  let chars = 0, truncated = false;
  function ordered() {
    return fragments.every(x=>x.startMs!==null)
      ? [...fragments].sort((a,b)=>a.startMs-b.startMs||a.order-b.order)
      : [...fragments];
  }
  function observe(event) {
    const speaker = event.type==='session.input_transcript.delta' ? 'customer'
      : event.type==='session.output_transcript.delta' ? 'agent' : null;
    if (!speaker || typeof event.delta!=='string' || !event.delta.length) return;
    if (typeof event.event_id==='string' && eventIds.has(event.event_id)) return;
    if (fragments.length>=8000 || chars+event.delta.length>800000) { truncated=true; return; }
    if (typeof event.event_id==='string') eventIds.add(event.event_id);
    const startMs = Number.isFinite(event.start_ms)&&event.start_ms>=0 ? event.start_ms : null;
    const endMs = startMs!==null&&Number.isFinite(event.end_ms)&&event.end_ms>=startMs ? event.end_ms : null;
    fragments.push({speaker,content:event.delta,startMs,endMs,order:fragments.length});
    chars+=event.delta.length;
  }
  function snapshot() {
    const rows=[];
    for (const fragment of ordered()) {
      let text=fragment.content;
      // Persist bounded segments supported by the existing authenticated RPC.
      while(text.length) {
        let last=rows.at(-1);
        if (!last || last.speaker!==fragment.speaker || last.content.length>=4000) {
          if(rows.length>=200){truncated=true;return rows.filter(x=>x.content.trim());}
          last={speaker:fragment.speaker,content:''};rows.push(last);
        }
        const n=Math.min(4000-last.content.length,text.length);
        last.content+=text.slice(0,n);text=text.slice(n);
      }
    }
    return rows.filter(x=>x.content.trim());
  }
  function callerEvidence() {
    // Preserve caller text across overlapping assistant speech. A 4000-character
    // sliding overlap keeps an incident span intact at a storage boundary.
    const text=ordered().filter(x=>x.speaker==='customer').map(x=>x.content).join('');
    const spans=[];
    for(let at=0;at<text.length;at+=2000)spans.push(text.slice(at,at+4000));
    return spans.slice(-20);
  }
  return {observe,snapshot,callerEvidence,get truncated(){return truncated;}};
}
module.exports = {PMA_GREETING,PMA_HANDOFF,PMA_SAFETY_OVERRIDE,createPmaTranscript};
