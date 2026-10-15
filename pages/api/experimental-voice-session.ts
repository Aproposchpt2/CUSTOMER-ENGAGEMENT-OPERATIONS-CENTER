import type { NextApiRequest, NextApiResponse } from 'next';

const INSTRUCTIONS = `You are Stellar UC's Intelligent Sales Specialist in an ISOLATED TEST. This is a simulated demonstration, not a live customer account. Speak naturally, briefly, and professionally. Never pretend to transfer a call, save a lead, book an appointment, or access customer records. Do not collect sensitive information. Explain four product pillars: around-the-clock 24/7/365 sales availability; target capacity of up to 20 simultaneous customer conversations (pending end-to-end production load validation); intelligent sales engagement and qualification; and usage-based pricing where customers pay for services delivered, not unused capacity. Existing business number and phone workflows may be retained subject to onboarding configuration. Never invent prices, integrations, operational guarantees, or measurable returns. When asked about abandoned calls, propose baseline measurements for abandonment, wait times, qualified opportunities, and outcomes. Ask one relevant discovery question at a time. State clearly when a capability is not verified. Answer in English.`;

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  res.setHeader('Cache-Control', 'no-store');
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  if (!req.headers.origin || new URL(req.headers.origin).host !== req.headers.host) return res.status(403).json({ error: 'Origin mismatch' });
  if (typeof req.body?.sdp !== 'string' || req.body.sdp.length < 100 || req.body.sdp.length > 65536) return res.status(400).json({ error: 'Valid SDP offer required' });
  const expected = process.env.STELLAR_VOICE_POC_ACCESS_CODE;
  if (!expected) return res.status(503).json({ error: 'Private test access is not configured' });
  const provided = req.headers['x-poc-access-code'];
  if (typeof provided !== 'string' || provided !== expected) return res.status(401).json({ error: 'Invalid test access code' });
  const key = process.env.OPENAI_API_KEY;
  if (!key) return res.status(503).json({ error: 'OpenAI API key unavailable' });
  try {
    const upstream = await fetch('https://api.openai.com/v1/live/sessions', {
      method: 'POST',
      headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        session: {
          model: 'gpt-live-1',
          instructions: 'You are the Stellar UC Intelligent Sales Specialist in a private demonstration. Be natural and concise. Delegate complex sales analysis and questions about business details to the reasoning backend. Never claim to have performed a real-world action.',
          delegation: {
            type: 'responses',
            responses: {
              model: 'gpt-5.6-terra',
              instructions: INSTRUCTIONS
            }
          }
        },
        transport: { type: 'webrtc', sdp: req.body.sdp }
      }),
      signal: AbortSignal.timeout(20000)
    });
    const payload = await upstream.json().catch(() => ({}));
    if (!upstream.ok) return res.status(502).json({ error: 'GPT-Live session request failed', status: upstream.status, detail: payload?.error?.message || 'Check GPT-Live model access and billing' });
    if (typeof payload?.transport?.sdp !== 'string') return res.status(502).json({ error: 'GPT-Live session response missing SDP answer' });
    return res.status(201).json({ session: { id: payload.session?.id }, transport: { type: 'webrtc', sdp: payload.transport.sdp } });
  } catch {
    return res.status(502).json({ error: 'Unable to create realtime session' });
  }
}
