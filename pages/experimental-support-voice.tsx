import { useRef, useState } from 'react';
import Head from 'next/head';

export default function VoiceProofOfConcept() {
  const [accessCode, setAccessCode] = useState('');
  const [tenantId, setTenantId] = useState('');
  const intakeSessionId = useRef('');
  const submitted = useRef(false);
  const [status, setStatus] = useState('Disconnected');
  const [error, setError] = useState('');
  const [events, setEvents] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [readiness, setReadiness] = useState('Not checked');
  const pc = useRef<RTCPeerConnection | null>(null);
  const stream = useRef<MediaStream | null>(null);
  const audio = useRef<HTMLAudioElement | null>(null);
  const channel = useRef<RTCDataChannel | null>(null);
  const closeTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  const sessionTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  const log = (message: string) => setEvents(previous => [...previous.slice(-19), message]);
  function stop() {
    if (closeTimeout.current) { clearTimeout(closeTimeout.current); closeTimeout.current = null; }
    if (sessionTimeout.current) { clearTimeout(sessionTimeout.current); sessionTimeout.current = null; }
    channel.current?.close(); channel.current = null;
    pc.current?.close(); pc.current = null;
    stream.current?.getTracks().forEach(t => t.stop()); stream.current = null;
    if (audio.current) { audio.current.srcObject = null; audio.current = null; }
    setStatus('Disconnected');
  }
  async function start() {
    if (busy || pc.current) return;
    setBusy(true); setError(''); setEvents([]); submitted.current = false; intakeSessionId.current = crypto.randomUUID();
    try {
      if (!window.isSecureContext) throw new Error('Microphone requires HTTPS.');
      const readinessResponse = await fetch('/api/experimental-support-readiness', {method:'POST',headers:{'x-poc-access-code':accessCode}});
      const check = await readinessResponse.json();
      if (!readinessResponse.ok || !check.ready || !check.tenantIds?.includes(tenantId)) {
        setReadiness('Not ready: staging writes, authenticated admin membership, or tenant selection requires attention');
        throw new Error('Staging record-creation preflight failed. Voice test not started.');
      }
      setReadiness('Ready: authorized staging tenant and writes enabled');
      stream.current = await navigator.mediaDevices.getUserMedia({ audio: true });
      const connection = new RTCPeerConnection();
      sessionTimeout.current = setTimeout(() => { log('15-minute test duration reached'); stop(); }, 15 * 60 * 1000);
      pc.current = connection;
      const player = new Audio();
      player.autoplay = true; audio.current = player;
      connection.ontrack = e => { player.srcObject = e.streams[0]; void player.play().catch(() => log('Tap screen to enable audio playback')); };
      connection.onconnectionstatechange = () => {
        if (connection.connectionState === 'connected') setStatus('Transport connected — awaiting agent readiness');
        if (['failed', 'closed', 'disconnected'].includes(connection.connectionState)) stop();
      };
      stream.current.getTracks().forEach(track => connection.addTrack(track, stream.current!));
      const dc = connection.createDataChannel('oai-events'); channel.current = dc;
      dc.onmessage = e => { try {
        const v = JSON.parse(e.data);
        if (v.type === 'session.started') { setStatus('Connected — speak to the support desk'); log('GPT-Live session started'); }
        if (v.type === 'session.closed') { log('Session finalized'); stop(); }
        if (v.type === 'error') log('Agent error: ' + (v.error?.message || 'unknown'));
        if (v.type === 'response.function_call_arguments.done' && v.name === 'submit_support_intake') {
          void (async () => {
            let result: Record<string, unknown> = {success:false,error:'Unable to save intake'};
            try {
              if (submitted.current) throw new Error('Intake already submitted this session');
              if (!/^[0-9a-f-]{36}$/i.test(tenantId)) throw new Error('Valid staging tenant ID required');
              const args = JSON.parse(v.arguments || '{}');
              if (!window.confirm('Submit this fictional customer and support case to the staging database?')) throw new Error('Test operator declined record creation');
              submitted.current = true;
              const response = await fetch('/api/experimental-support-intake', {
                method:'POST', headers:{'Content-Type':'application/json'},
                body:JSON.stringify({...args, tenantId, sessionId:intakeSessionId.current})
              });
              const payload = await response.json();
              if (!response.ok || !payload.customerId || !payload.caseId) throw new Error(payload.error || 'Save not confirmed');
              result = {success:true,customerId:payload.customerId,caseId:payload.caseId,testOnly:true};
              log('Confirmed staging customer and support case IDs: '+payload.customerId+' / '+payload.caseId);
            } catch (err) { result = {success:false,error:err instanceof Error ? err.message : 'Save failed'}; log('Support intake not saved: '+result.error); }
            if (dc.readyState === 'open') {
              dc.send(JSON.stringify({type:'conversation.item.create',item:{type:'function_call_output',call_id:v.call_id,output:JSON.stringify(result)}}));
              dc.send(JSON.stringify({type:'response.create'}));
            }
          })();
        }
      } catch {} };
      const offer = await connection.createOffer();
      await connection.setLocalDescription(offer);
      if (connection.iceGatheringState !== 'complete') {
        await new Promise<void>((resolve, reject) => {
          const timer = setTimeout(() => { connection.removeEventListener('icegatheringstatechange', check); reject(new Error('ICE gathering timed out')); }, 10000);
          function check() { if (connection.iceGatheringState === 'complete') { clearTimeout(timer); connection.removeEventListener('icegatheringstatechange', check); resolve(); } }
          connection.addEventListener('icegatheringstatechange', check);
          check();
        });
      }
      const sessionResponse = await fetch('/api/experimental-support-voice-session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-poc-access-code': accessCode },
        body: JSON.stringify({ sdp: connection.localDescription?.sdp })
      });
      const session = await sessionResponse.json();
      if (!sessionResponse.ok) throw new Error(session.error + (session.detail ? ': ' + session.detail : ''));
      if (!session.transport?.sdp) throw new Error('Missing GPT-Live SDP answer');
      setStatus('Completing voice connection...');
      await connection.setRemoteDescription({ type: 'answer', sdp: session.transport.sdp });
    } catch (e) {
      stop();
      setError(e instanceof Error ? e.message : 'Unable to connect');
    } finally { setBusy(false); }
  }
  function endConversation() {
    if (channel.current?.readyState === 'open') {
      setStatus('Finalizing session...');
      channel.current.send(JSON.stringify({ type: 'session.close' }));
      closeTimeout.current = setTimeout(stop, 15000);
    } else stop();
  }
  return <main style={{minHeight:'100vh',background:'#080c15',color:'#f6f0e5',padding:'clamp(20px,5vw,60px)',fontFamily:'system-ui,sans-serif'}}>
    <Head><title>Stellar UC | Private Support Desk Evaluation</title><meta name="robots" content="noindex,nofollow"/></Head>
    <div style={{maxWidth:720,margin:'auto'}}>
      <p style={{color:'#d8b86a',letterSpacing:2}}>STELLAR UC · PRIVATE ENGINEERING TEST</p>
      <h1>Intelligent Customer Product Support Desk</h1>
      <p>Experimental support intake voice evaluation. Use fictional customer information only. Staging writes require a signed-in tenant administrator, server enablement, and explicit operator confirmation. No real customer follow-ups occur.</p>
      <label htmlFor="tenant">Staging tenant ID (authorized administrator)</label><input id="tenant" value={tenantId} onChange={e=>setTenantId(e.target.value)} placeholder="Tenant UUID" style={{display:"block",width:"100%",padding:12,margin:"8px 0 20px",background:"#171e2b",color:"white",border:"1px solid #c8a85a",borderRadius:6}}/><label htmlFor="access">Private test access code</label>
      <input id="access" type="password" autoComplete="off" value={accessCode} onChange={e=>setAccessCode(e.target.value)} style={{display:'block',width:'100%',padding:12,margin:'8px 0 20px',background:'#171e2b',color:'white',border:'1px solid #c8a85a',borderRadius:6}} />
      <div style={{display:'flex',gap:12,flexWrap:'wrap'}}>
        <button disabled={busy || !!pc.current || !accessCode} onClick={start} style={{padding:'14px 22px',background:'#d7b968',color:'#151515',border:0,borderRadius:8,cursor:'pointer'}}>Start voice conversation</button>
        <button disabled={!pc.current} onClick={endConversation} style={{padding:'14px 22px',background:'#363b45',color:'white',border:0,borderRadius:8,cursor:'pointer'}}>End conversation</button>
      </div>
      <p role="status">Status: {busy ? 'Checking staging readiness and preparing session...' : status}</p><p role="status">Database readiness: {readiness}</p>
      {error && <p role="alert" style={{color:'#ffb5b5'}}>{error}</p>}
      <h2>Suggested intelligence challenge</h2>
      <blockquote style={{borderLeft:'3px solid #d7b968',paddingLeft:18,lineHeight:1.6}}>Hello, I purchased a StellarConnect 500 wireless device and it keeps losing its network connection. Can you help?</blockquote>
      <h2>Session events</h2>
      <ul>{events.map((v,i)=><li key={i}>{v}</li>)}</ul>
      <p style={{opacity:.7,fontSize:13}}>Microphone access is requested only when you start. Audio is sent to OpenAI for this test. Do not provide confidential information. Usage incurs API charges. No calls are placed through Twilio.</p>
    </div>
  </main>;
}
