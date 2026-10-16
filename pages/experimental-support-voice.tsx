import { useRef, useState } from 'react';
import Head from 'next/head';
import { createBrowserClient } from '@supabase/ssr';

export default function VoiceProofOfConcept() {
  const [accessCode, setAccessCode] = useState('');
  const [tenantId, setTenantId] = useState('5885a020-d363-4c27-910a-c035eda132f5');
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [authMessage, setAuthMessage] = useState('Not signed in to staging');
  const intakeSessionId = useRef('');
  const submitted = useRef(false);
  const toolRegistered = useRef(false);
  const processedCalls = useRef<Set<string>>(new Set());
  const [status, setStatus] = useState('Disconnected');
  const [error, setError] = useState('');
  const [events, setEvents] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [readiness, setReadiness] = useState('Not checked');
  const [preflightPassed, setPreflightPassed] = useState(false);
  const pc = useRef<RTCPeerConnection | null>(null);
  const stream = useRef<MediaStream | null>(null);
  const audio = useRef<HTMLAudioElement | null>(null);
  const channel = useRef<RTCDataChannel | null>(null);
  const closeTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  const sessionTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Privacy-by-design: diagnostic exports contain only fixed event codes, never arbitrary
  // upstream messages, customer fields, case IDs, authentication material or transcripts.
  const diagnosticEvents = useRef<{at:string;code:string}[]>([]);
  const protocolError = useRef<{code:string;type:string;parameter:string}|null>(null);
  // Fictional-test-only transcript buffer. No server persistence or audio recording.
  const transcript = useRef<{at:string;speaker:'customer'|'representative';text:string}[]>([]);
  // Sanitized histogram of all received event types for diagnostics.
  const eventTypeHistogram = useRef<Record<string,number>>({});
  function downloadTranscript() {
    const blob = new Blob([JSON.stringify({schemaVersion:1,testOnly:true,
      warning:'Fictional test data only. Browser-local transcript; completeness depends on live event support.',
      exportedAt:new Date().toISOString(),turns:transcript.current},null,2)],{type:'application/json'});
    const url=URL.createObjectURL(blob);const a=document.createElement('a');
    a.href=url;a.download='stellaruc-css-transcript-'+Date.now()+'.json';
    document.body.appendChild(a);a.click();a.remove();window.setTimeout(()=>URL.revokeObjectURL(url),1000);
  }

  function safeDiagnosticCode(message: string): string {
    if (message.startsWith('Protocol event: ')) {
      const eventType = message.slice('Protocol event: '.length).split(' ')[0];
      const allowed = ['session.started','session.updated','session.delegation.created',
        'session.input_transcript.delta','session.output_transcript.delta','session.usage.updated',
        'response.event','response.event:response.output_item.added','response.event:response.output_item.done',
        'response.event:response.function_call_arguments.delta','response.event:response.function_call_arguments.done',
        'response.event:response.completed','response.event:response.failed'];
      return allowed.includes(eventType) ? 'PROTOCOL_'+eventType.replace(/[^a-zA-Z0-9]/g,'_').toUpperCase() : 'PROTOCOL_OTHER';
    }
    if (message.startsWith('Voice channel opened')) return 'CHANNEL_OPEN';
    if (message.startsWith('Confirmed staging customer and support case IDs:')) return 'INTAKE_PERSISTED';
    if (message.startsWith('Support intake not saved:')) return 'INTAKE_FAILED';
    if (message.startsWith('Agent error:')) return 'VOICE_AGENT_ERROR';
    if (message.startsWith('Voice session established')) return 'VOICE_SESSION_ESTABLISHED';
    if (message.startsWith('Session finalized')) return 'VOICE_SESSION_FINALIZED';
    if (message.startsWith('Customer transcript segment')) return 'TRANSCRIPT_CUSTOMER';
    if (message.startsWith('Representative transcript segment')) return 'TRANSCRIPT_REPRESENTATIVE';
    if (message.startsWith('Unable to parse session event')) return 'PROTOCOL_PARSE_FAILED';
    if (message.startsWith('15-minute test duration reached')) return 'SESSION_TIME_LIMIT';
    if (message.startsWith('Tap screen to enable audio playback')) return 'AUDIO_PLAYBACK_BLOCKED';
    return 'OTHER_EVENT';
  }
  function downloadDiagnostics() {
    const report = {schemaVersion:3,product:'Stellar UC CSS Private POC',
      generatedAt:new Date().toISOString(),testOnly:true,
      sessionStarted:Boolean(intakeSessionId.current),
      toolRegistered:toolRegistered.current,
      intakeSubmissionAttempted:submitted.current,
      protocolError:protocolError.current,
      eventTypeHistogram:eventTypeHistogram.current,
      eventCount:diagnosticEvents.current.length,
      events:diagnosticEvents.current};
    const blob = new Blob([JSON.stringify(report,null,2)],{type:'application/json'});
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href=url; anchor.download='stellaruc-css-diagnostics-'+Date.now()+'.json';
    document.body.appendChild(anchor); anchor.click(); anchor.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
  const log = (message: string) => {
    diagnosticEvents.current.push({at:new Date().toISOString(),code:safeDiagnosticCode(message)});
    setEvents(previous => [...previous.slice(-19), message]);
  };
  function stagingClient() {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
    if (!url?.includes('hvzauakkhlivzeqatfqm') || !key) throw new Error('Staging login not configured');
    return createBrowserClient(url, key);
  }
  async function sendOtp() {
    setPreflightPassed(false);
    try {
      const { error } = await stagingClient().auth.signInWithOtp({email,options:{shouldCreateUser:false}});
      if (error) throw error;
      setAuthMessage('Check your email for the staging sign-in code');
    } catch (e) {setAuthMessage(e instanceof Error ? e.message : 'Sign-in failed');}
  }
  async function verifyOtp() {
    setPreflightPassed(false);
    try {
      const { error } = await stagingClient().auth.verifyOtp({email,token:otp,type:'email'});
      if (error) throw error;
      setAuthMessage('Staging sign-in successful. The preflight will verify administrator authorization.');
    } catch (e) {setAuthMessage(e instanceof Error ? e.message : 'Verification failed');}
  }
  async function verifyReadiness() {
    setPreflightPassed(false);
    setReadiness('Checking authenticated staging access...');
    try {
      const response = await fetch('/api/experimental-support-readiness', {method:'POST',headers:{'x-poc-access-code':accessCode}});
      const result = await response.json();
      if (!response.ok || !result.ready || !result.tenantIds?.includes(tenantId)) {
        const explanations: Record<string,string> = {
          ORIGIN_MISMATCH:'Request origin did not match the private test site',
          ACCESS_CODE_REJECTED:'Private test access code is incorrect or not configured',
          STAGING_CONFIG_MISSING:'Staging database URL is not configured',
          STAGING_SESSION_NOT_FOUND:'Staging sign-in was not available to the server; sign in again',
          TENANT_MEMBERSHIP_LOOKUP_FAILED:'Staging tenant membership could not be verified',
          TEST_WRITES_DISABLED:'Private staging support test writes are disabled',
          NO_ACTIVE_ADMIN_MEMBERSHIP:'Signed-in account is not an active Owner or Admin for this tenant'
        };
        const reason = String(result.reason || 'UNKNOWN');
        setReadiness('FAILED ['+reason+']: '+(explanations[reason] || 'Staging readiness check did not pass'));
        return;
      }
      setPreflightPassed(true);
      setReadiness('PASS: staging authenticated administrator, selected tenant and test writes verified');
    } catch {
      setReadiness('FAILED: readiness endpoint could not be reached');
    }
  }
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
    if (busy || pc.current || !preflightPassed) return;
    setBusy(true); setError(''); setEvents([]); diagnosticEvents.current=[]; protocolError.current=null; transcript.current=[]; eventTypeHistogram.current={}; toolRegistered.current = false; submitted.current = false; processedCalls.current.clear(); intakeSessionId.current = crypto.randomUUID();
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
      dc.onopen = () => { log('Voice channel opened'); };
      dc.onmessage = e => { try {
        const v = JSON.parse(e.data);
        // Track all event types (sanitized) for diagnostics
        if (typeof v.type === 'string') {
          const safeType = /^[a-zA-Z0-9_.-]{1,80}$/.test(v.type) ? v.type : 'INVALID_TYPE';
          eventTypeHistogram.current[safeType] = (eventTypeHistogram.current[safeType] || 0) + 1;
        }
        if (v.type === 'session.started' || v.type === 'session.created') {
          // Tools declared server-side at session creation; active from first session event.
          toolRegistered.current = true;
          setStatus('Connected — support intake ready');
          log('Voice session established');
        }
        if (v.type === 'session.updated') log('Protocol event: session.updated');
        if (v.type === 'session.delegation.created') log('Protocol event: session.delegation.created');
        // Transcript capture: GPT-Live emits session.*_transcript.delta, not Realtime conversation events
        if (v.type === 'session.input_transcript.delta' && typeof v.delta === 'string') {
          transcript.current.push({at:new Date().toISOString(),speaker:'customer',text:v.delta.slice(0,10000)});
          log('Customer transcript segment captured');
        }
        if (v.type === 'session.output_transcript.delta' && typeof v.delta === 'string') {
          transcript.current.push({at:new Date().toISOString(),speaker:'representative',text:v.delta.slice(0,10000)});
          log('Representative transcript segment captured');
        }
        if (v.type === 'session.closed') { log('Session finalized'); stop(); }
        if (v.type === 'error') {
          const safeField = (value:unknown) => typeof value === 'string' && /^[a-zA-Z0-9_.-]{1,80}$/.test(value) ? value : 'unavailable';
          protocolError.current = {code:safeField(v.error?.code),type:safeField(v.error?.type),parameter:safeField(v.error?.param)};
          log('Agent error: ' + (v.error?.message || 'unknown'));
        }
        // Function calls from Responses delegation arrive inside response.event envelopes
        if (v.type === 'response.event') {
          const inner = v.event;
          if (!inner || typeof inner.type !== 'string') return;
          const safeInner = /^[a-zA-Z0-9_.-]{1,80}$/.test(inner.type) ? inner.type : 'INVALID_INNER_TYPE';
          eventTypeHistogram.current['response.event:'+safeInner] = (eventTypeHistogram.current['response.event:'+safeInner] || 0) + 1;
          log('Protocol event: response.event:' + safeInner);
          if (inner.type === 'response.output_item.done'
              && inner.item?.type === 'function_call'
              && inner.item?.name === 'submit_support_intake'
              && typeof inner.item?.call_id === 'string'
              && !processedCalls.current.has(inner.item.call_id as string)) {
            processedCalls.current.add(inner.item.call_id as string);
            const callId = inner.item.call_id as string;
            const callArgs = inner.item.arguments as string;
            void (async () => {
              let result: Record<string, unknown> = {success:false,error:'Unable to save intake'};
              try {
                if (!toolRegistered.current) throw new Error('Support intake not active this session');
                if (submitted.current) throw new Error('Intake already submitted this session');
                if (!/^[0-9a-f-]{36}$/i.test(tenantId)) throw new Error('Valid staging tenant ID required');
                const args = JSON.parse(callArgs || '{}');
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
                dc.send(JSON.stringify({type:'response.item.create',item:{type:'function_call_output',call_id:callId,output:JSON.stringify(result)}}));
                dc.send(JSON.stringify({type:'response.create'}));
              }
            })();
          }
        }
      } catch { log('Unable to parse session event'); } };
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
      if (!sessionResponse.ok) { const d = session.diagnostic; throw new Error(session.error + (d ? ' [upstream '+(d.upstreamStatus || 'connection')+', '+(d.code || 'unknown')+', '+(d.type || 'unknown')+(d.param ? ', parameter '+d.param : '')+']' : '')); }
      if (!session.transport?.sdp) throw new Error('Missing GPT-Live SDP answer');
      setStatus('Completing voice connection...');
      await connection.setRemoteDescription({ type: 'answer', sdp: session.transport.sdp });
    } catch (e) {
      stop();
      setError(e instanceof Error ? e.message : 'Unable to connect');
    } finally { setBusy(false); }
  }
  async function verifyStagingIntakeIndependently() {
    if (!preflightPassed || pc.current || busy) return;
    if (!window.confirm('Create ONE fictional Robert Anderson support case in STAGING to verify the database path? This is independent of voice.')) return;
    setBusy(true);
    try {
      const sessionId = crypto.randomUUID();
      const response = await fetch('/api/experimental-support-intake', {
        method:'POST',headers:{'Content-Type':'application/json'},
        body:JSON.stringify({tenantId,sessionId,name:'Robert Anderson',email:'robert.anderson@example.com',
          phone:'(702) 555-0142',product:'StellarConnect 500 Wireless Device',purchaseDate:'2026-10-10',
          issue:'Fictional test: intermittent wireless disconnections during customer communications.',
          steps:'Restarted device and reconnected wireless network.',impact:'Customer communications interrupted.',
          priority:'HIGH'})
      });
      const payload = await response.json();
      if (!response.ok || !payload.customerId || !payload.caseId) throw new Error('Staging persistence not confirmed (HTTP '+response.status+')');
      log('Confirmed staging customer and support case IDs: '+payload.customerId+' / '+payload.caseId);
      setReadiness('Staging test write VERIFIED. Case ID: '+payload.caseId);
    } catch (err) {
      log('Support intake not saved: '+(err instanceof Error ? err.message : 'unknown'));
      setError('Independent staging intake test failed; no case ID confirmed.');
    } finally {setBusy(false);}
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
      <p style={{border:'1px solid #c8a85a',padding:12}}>Protocol notice: submit_support_intake is declared server-side at session creation (delegation.responses.tools). Function calls arrive inside response.event envelopes. Run the independent staging-write test first to verify database persistence before a voice test.</p>
      <h2>Staging administrator sign-in</h2>
      <p>Use the email associated with the existing staging tenant Owner account. This is separate from Netlify SSO.</p>
      <label htmlFor="email">Staging account email</label>
      <input id="email" type="email" value={email} onChange={e=>setEmail(e.target.value)} style={{display:'block',width:'100%',padding:12,margin:'8px 0 12px',background:'#171e2b',color:'white'}} />
      <button type="button" onClick={()=>void sendOtp()} disabled={!email.includes('@')} style={{padding:10,marginBottom:12}}>Email sign-in code</button>
      <label htmlFor="otp">Email verification code</label>
      <input id="otp" type="text" value={otp} onChange={e=>setOtp(e.target.value)} style={{display:'block',width:'100%',padding:12,margin:'8px 0 12px',background:'#171e2b',color:'white'}} />
      <button type="button" onClick={()=>void verifyOtp()} disabled={!otp || !email} style={{padding:10,marginBottom:12}}>Verify staging sign-in</button>
      <p role="status">{authMessage}</p>
      <label htmlFor="tenant">Staging tenant ID (authorized administrator)</label><input id="tenant" value={tenantId} onChange={e=>{setTenantId(e.target.value);setPreflightPassed(false);}} placeholder="Tenant UUID" style={{display:"block",width:"100%",padding:12,margin:"8px 0 20px",background:"#171e2b",color:"white",border:"1px solid #c8a85a",borderRadius:6}}/><label htmlFor="access">Private test access code</label>
      <input id="access" type="password" autoComplete="off" value={accessCode} onChange={e=>{setAccessCode(e.target.value);setPreflightPassed(false);}} style={{display:'block',width:'100%',padding:12,margin:'8px 0 20px',background:'#171e2b',color:'white',border:'1px solid #c8a85a',borderRadius:6}} />
      <div style={{display:'flex',gap:12,flexWrap:'wrap'}}>
        <button disabled={busy || !accessCode || !!pc.current} onClick={()=>void verifyReadiness()} style={{padding:'14px 22px',background:'#363b45',color:'white',border:0,borderRadius:8,cursor:'pointer'}}>Verify staging readiness</button>
        <button type="button" disabled={busy || !!pc.current || !preflightPassed} onClick={()=>void verifyStagingIntakeIndependently()} style={{padding:'14px 22px',background:'#363b45',color:'white',border:0,borderRadius:8}}>Verify fictional staging case write (no voice)</button>
        <button disabled={busy || !!pc.current || !accessCode || !preflightPassed} onClick={start} style={{padding:'14px 22px',background:'#d7b968',color:'#151515',border:0,borderRadius:8,cursor:'pointer'}}>Start voice conversation</button>
        <button disabled={!pc.current} onClick={endConversation} style={{padding:'14px 22px',background:'#363b45',color:'white',border:0,borderRadius:8,cursor:'pointer'}}>End conversation</button>
      </div>
      <p role="status">Status: {busy ? 'Checking staging readiness and preparing session...' : status}</p><p role="status">Database readiness: {readiness}</p>
      {error && <p role="alert" style={{color:'#ffb5b5'}}>{error}</p>}
      <h2>Suggested intelligence challenge</h2>
      <blockquote style={{borderLeft:'3px solid #d7b968',paddingLeft:18,lineHeight:1.6}}>Hello, I purchased a StellarConnect 500 wireless device and it keeps losing its network connection. Can you help?</blockquote>
      <h2>Session events</h2><button type="button" onClick={downloadDiagnostics} style={{padding:12,marginBottom:12,background:'#d7b968',color:'#151515',border:0,borderRadius:8}}>Download Diagnostic Report (.json)</button><button type="button" onClick={downloadTranscript} style={{padding:12,marginLeft:8,marginBottom:12,background:"#363b45",color:"white",border:0,borderRadius:8}}>Download Test Transcript (.json)</button>
      <ul>{events.map((v,i)=><li key={i}>{v}</li>)}</ul>
      <p style={{opacity:.7,fontSize:13}}>Microphone access is requested only when you start. Audio is sent to OpenAI for this test. Do not provide confidential information. Usage incurs API charges. No calls are placed through Twilio.</p>
    </div>
  </main>;
}
