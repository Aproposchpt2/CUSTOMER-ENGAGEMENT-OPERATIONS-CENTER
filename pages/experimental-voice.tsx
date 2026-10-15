import { useRef, useState } from 'react';
import Head from 'next/head';

export default function VoiceProofOfConcept() {
  const [accessCode, setAccessCode] = useState('');
  const [status, setStatus] = useState('Disconnected');
  const [error, setError] = useState('');
  const [events, setEvents] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const pc = useRef<RTCPeerConnection | null>(null);
  const stream = useRef<MediaStream | null>(null);
  const audio = useRef<HTMLAudioElement | null>(null);
  const channel = useRef<RTCDataChannel | null>(null);
  const log = (message: string) => setEvents(previous => [...previous.slice(-19), message]);
  function stop() {
    channel.current?.close(); channel.current = null;
    pc.current?.close(); pc.current = null;
    stream.current?.getTracks().forEach(t => t.stop()); stream.current = null;
    if (audio.current) { audio.current.srcObject = null; audio.current = null; }
    setStatus('Disconnected');
  }
  async function start() {
    if (busy || pc.current) return;
    setBusy(true); setError(''); setEvents([]);
    try {
      if (!window.isSecureContext) throw new Error('Microphone requires HTTPS.');
      const sessionResponse = await fetch('/api/experimental-voice-session', {
        method: 'POST', headers: { 'x-poc-access-code': accessCode }
      });
      const session = await sessionResponse.json();
      if (!sessionResponse.ok) throw new Error(session.error + (session.detail ? ': ' + session.detail : ''));
      stream.current = await navigator.mediaDevices.getUserMedia({ audio: true });
      const connection = new RTCPeerConnection();
      pc.current = connection;
      const player = new Audio();
      player.autoplay = true; audio.current = player;
      connection.ontrack = e => { player.srcObject = e.streams[0]; void player.play().catch(() => log('Tap screen to enable audio playback')); };
      connection.onconnectionstatechange = () => {
        if (connection.connectionState === 'connected') setStatus('Connected — speak to the specialist');
        if (['failed', 'closed', 'disconnected'].includes(connection.connectionState)) stop();
      };
      stream.current.getTracks().forEach(track => connection.addTrack(track, stream.current!));
      const dc = connection.createDataChannel('oai-events'); channel.current = dc;
      dc.onmessage = e => { try { const v = JSON.parse(e.data); if (v.type === 'error') log('Agent error: ' + (v.error?.message || 'unknown')); if (v.type === 'response.done') log('Agent response completed'); } catch {} };
      const offer = await connection.createOffer(); await connection.setLocalDescription(offer);
      const response = await fetch('https://api.openai.com/v1/realtime/calls', {
        method: 'POST',
        headers: { Authorization: 'Bearer ' + session.client_secret, 'Content-Type': 'application/sdp' },
        body: offer.sdp
      });
      if (!response.ok) throw new Error('Realtime connection rejected (' + response.status + '): ' + (await response.text()).slice(0,250));
      await connection.setRemoteDescription({ type: 'answer', sdp: await response.text() });
      setStatus('Connecting...');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Unable to connect');
      stop();
    } finally { setBusy(false); }
  }
  return <main style={{minHeight:'100vh',background:'#080c15',color:'#f6f0e5',padding:'clamp(20px,5vw,60px)',fontFamily:'system-ui,sans-serif'}}>
    <Head><title>Stellar UC | Private Voice Evaluation</title><meta name="robots" content="noindex,nofollow"/></Head>
    <div style={{maxWidth:720,margin:'auto'}}>
      <p style={{color:'#d8b86a',letterSpacing:2}}>STELLAR UC · PRIVATE ENGINEERING TEST</p>
      <h1>Intelligent Sales Specialist</h1>
      <p>Experimental browser voice evaluation. This is not the production telephone agent. No customer records or live sales actions are connected.</p>
      <label htmlFor="access">Private test access code</label>
      <input id="access" type="password" autoComplete="off" value={accessCode} onChange={e=>setAccessCode(e.target.value)} style={{display:'block',width:'100%',padding:12,margin:'8px 0 20px',background:'#171e2b',color:'white',border:'1px solid #c8a85a',borderRadius:6}} />
      <div style={{display:'flex',gap:12,flexWrap:'wrap'}}>
        <button disabled={busy || !!pc.current || !accessCode} onClick={start} style={{padding:'14px 22px',background:'#d7b968',color:'#151515',border:0,borderRadius:8,cursor:'pointer'}}>Start voice conversation</button>
        <button disabled={!pc.current} onClick={stop} style={{padding:'14px 22px',background:'#363b45',color:'white',border:0,borderRadius:8,cursor:'pointer'}}>End conversation</button>
      </div>
      <p role="status">Status: {busy ? 'Preparing microphone and session...' : status}</p>
      {error && <p role="alert" style={{color:'#ffb5b5'}}>{error}</p>}
      <h2>Suggested intelligence challenge</h2>
      <blockquote style={{borderLeft:'3px solid #d7b968',paddingLeft:18,lineHeight:1.6}}>My business doesn't miss many calls, but I suspect some callers hang up before my employees answer. How would you help me determine whether your service is worth the investment?</blockquote>
      <h2>Session events</h2>
      <ul>{events.map((v,i)=><li key={i}>{v}</li>)}</ul>
      <p style={{opacity:.7,fontSize:13}}>Microphone access is requested only when you start. Audio is sent to OpenAI for this test. Do not provide confidential information. Usage incurs API charges. No calls are placed through Twilio.</p>
    </div>
  </main>;
}
