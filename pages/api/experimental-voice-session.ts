import type { NextApiRequest, NextApiResponse } from 'next';

const INSTRUCTIONS = `You are Stellar UC's Intelligent Sales Specialist in an ISOLATED TEST. This is a simulated demonstration, not a live customer account. Speak naturally, briefly, and professionally. Never pretend to transfer a call, save a lead, book an appointment, or access customer records. Do not collect sensitive information. Explain four product pillars: around-the-clock 24/7/365 sales availability; target capacity of up to 20 simultaneous customer conversations (pending end-to-end production load validation); intelligent sales engagement and qualification; and usage-based pricing where customers pay for services delivered, not unused capacity. Existing business number and phone workflows may be retained subject to onboarding configuration. Never invent prices, integrations, operational guarantees, or measurable returns. When asked about abandoned calls, propose baseline measurements for abandonment, wait times, qualified opportunities, and outcomes. Ask one relevant discovery question at a time. State clearly when a capability is not verified. Answer in English.`;

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  res.setHeader('Cache-Control', 'no-store');
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  if (req.headers.origin && new URL(req.headers.origin).host !== req.headers.host) return res.status(403).json({ error: 'Origin mismatch' });
  const expected = process.env.STELLAR_VOICE_POC_ACCESS_CODE;
  if (!expected) return res.status(503).json({ error: 'Private test access is not configured' });
  const provided = req.headers['x-poc-access-code'];
  if (typeof provided !== 'string' || provided !== expected) return res.status(401).json({ error: 'Invalid test access code' });
  const key = process.env.OPENAI_API_KEY;
  if (!key) return res.status(503).json({ error: 'OpenAI API key unavailable' });
  try {
    const upstream = await fetch('https://api.openai.com/v1/realtime/client_secrets', {
      method: 'POST',
      headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        session: {
          type: 'realtime',
          model: process.env.STELLAR_VOICE_POC_MODEL || 'gpt-realtime',
          instructions: INSTRUCTIONS,
          audio: { output: { voice: 'marin' } }
        }
      }),
      signal: AbortSignal.timeout(12000)
    });
    const payload = await upstream.json().catch(() => ({}));
    if (!upstream.ok) return res.status(502).json({ error: 'OpenAI session request failed', status: upstream.status, detail: payload?.error?.message || 'Check model access and API billing' });
    const token = payload?.value || payload?.client_secret?.value;
    if (!token) return res.status(502).json({ error: 'OpenAI did not return an ephemeral client credential' });
    return res.status(200).json({ client_secret: token, model: process.env.STELLAR_VOICE_POC_MODEL || 'gpt-realtime' });
  } catch {
    return res.status(502).json({ error: 'Unable to create realtime session' });
  }
}
