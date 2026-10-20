'use client';
import { useMemo, useState, useRef, useEffect } from 'react';
import Head from 'next/head';

type Turn = { speaker: 'customer' | 'agent'; text: string; ts: string };

function newSessionId() {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) return crypto.randomUUID();
  return `chat-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

export default function ChatPage() {
  const sessionId = useMemo(() => newSessionId(), []);
  const [message, setMessage] = useState('');
  const [turns, setTurns] = useState<Turn[]>([]);
  const [status, setStatus] = useState<'ready' | 'active' | 'completed'>('ready');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [turns]);

  async function sendMessage() {
    const text = message.trim();
    if (!text || sending || status === 'completed') return;
    setSending(true);
    setError(null);
    const now = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    setTurns((t) => [...t, { speaker: 'customer', text, ts: now }]);
    setMessage('');
    try {
      const res = await fetch('/api/chat/message', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'message', sessionId, visitorId: `visitor-${sessionId.slice(0, 8)}`, message: text }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error ?? 'Unable to reach support');
      const replyTs = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      setTurns((t) => [...t, { speaker: 'agent', text: data.reply, ts: replyTs }]);
      setStatus('active');
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setSending(false);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }

  function handleKey(e: React.KeyboardEvent) {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); }
  }

  return (
    <>
      <Head>
        <title>Chat with Support · Stellar Intelligent Technologies</title>
        <meta name="robots" content="noindex, nofollow" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </Head>
      <div style={{ minHeight: '100vh', background: '#06111f', display: 'flex', flexDirection: 'column', fontFamily: "'Inter','Jost',sans-serif" }}>
        <header style={{ padding: '1rem 1.25rem', borderBottom: '1px solid rgba(255,255,255,.08)', display: 'flex', alignItems: 'center', gap: '10px', background: '#07182a' }}>
          <div style={{ width: 36, height: 36, borderRadius: 9, background: 'linear-gradient(135deg,#5bd3ff,#3aa8d8)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 900, fontSize: '1rem', color: '#06111f', flexShrink: 0 }}>S</div>
          <div>
            <div style={{ fontWeight: 900, color: '#fff', fontSize: '.95rem' }}>Stellar Support</div>
            <div style={{ fontSize: '.65rem', color: '#5bd3ff', fontWeight: 700, letterSpacing: '.06em' }}>{status === 'active' ? '● CONNECTED' : status === 'completed' ? '○ SESSION ENDED' : '○ READY'}</div>
          </div>
        </header>

        <div style={{ flex: 1, overflowY: 'auto', padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '.75rem' }}>
          {turns.length === 0 && (
            <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', textAlign: 'center', padding: '2rem 1rem' }}>
              <div>
                <div style={{ fontSize: '1.5rem', marginBottom: '.5rem' }}>👋</div>
                <div style={{ color: '#fff', fontWeight: 800, fontSize: '1rem', marginBottom: '.3rem' }}>How can we help?</div>
                <div style={{ color: 'rgba(255,255,255,.45)', fontSize: '.82rem' }}>Send a message to connect with our team.</div>
              </div>
            </div>
          )}
          {turns.map((turn, i) => (
            <div key={i} style={{ display: 'flex', justifyContent: turn.speaker === 'customer' ? 'flex-end' : 'flex-start' }}>
              <div style={{ maxWidth: '78%' }}>
                <div style={{ borderRadius: turn.speaker === 'customer' ? '14px 14px 4px 14px' : '14px 14px 14px 4px', padding: '.75rem .9rem', background: turn.speaker === 'customer' ? '#5bd3ff' : 'rgba(255,255,255,.07)', color: turn.speaker === 'customer' ? '#06111f' : '#e8f0fe', fontSize: '.9rem', lineHeight: 1.5 }}>
                  {turn.text}
                </div>
                <div style={{ fontSize: '.6rem', color: 'rgba(255,255,255,.3)', marginTop: '3px', textAlign: turn.speaker === 'customer' ? 'right' : 'left' }}>{turn.ts}</div>
              </div>
            </div>
          ))}
          {sending && (
            <div style={{ display: 'flex', justifyContent: 'flex-start' }}>
              <div style={{ borderRadius: '14px 14px 14px 4px', padding: '.75rem .9rem', background: 'rgba(255,255,255,.07)', color: 'rgba(255,255,255,.45)', fontSize: '.85rem' }}>Typing…</div>
            </div>
          )}
          {error && <div style={{ padding: '10px 14px', borderRadius: 8, background: 'rgba(255,80,80,.1)', border: '1px solid rgba(255,100,100,.25)', color: '#ff9090', fontSize: '.82rem' }}>{error}</div>}
          <div ref={bottomRef} />
        </div>

        <div style={{ padding: '1rem 1.25rem', borderTop: '1px solid rgba(255,255,255,.08)', background: '#07182a' }}>
          {status === 'completed' ? (
            <div style={{ textAlign: 'center', color: 'rgba(255,255,255,.5)', fontSize: '.85rem', padding: '.5rem' }}>This chat session has ended. Refresh the page to start a new chat.</div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0,1fr) auto', gap: '8px', alignItems: 'end' }}>
              <textarea
                ref={inputRef}
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                onKeyDown={handleKey}
                disabled={sending}
                placeholder="Type a message…"
                rows={2}
                style={{ resize: 'none', borderRadius: 10, border: '1px solid rgba(255,255,255,.12)', background: 'rgba(255,255,255,.05)', color: '#e8f0fe', padding: '.75rem .85rem', fontFamily: 'inherit', fontSize: '.9rem', lineHeight: 1.5 }}
              />
              <button
                onClick={sendMessage}
                disabled={sending || !message.trim()}
                style={{ border: 0, borderRadius: 10, background: '#5bd3ff', color: '#06111f', padding: '.85rem 1.1rem', fontWeight: 900, cursor: sending || !message.trim() ? 'default' : 'pointer', opacity: sending || !message.trim() ? 0.55 : 1, fontSize: '.9rem' }}
              >
                {sending ? '…' : '→'}
              </button>
            </div>
          )}
          <div style={{ marginTop: '6px', textAlign: 'center', fontSize: '.58rem', color: 'rgba(255,255,255,.2)', letterSpacing: '.06em' }}>POWERED BY STELLAR INTELLIGENT TECHNOLOGIES</div>
        </div>
      </div>
    </>
  );
}
