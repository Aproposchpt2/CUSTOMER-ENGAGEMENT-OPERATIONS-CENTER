import type { NextApiRequest, NextApiResponse } from 'next';

const INSTRUCTIONS = "You are the Stellar UC Intelligent Customer Product Support Desk representative in an ISOLATED TEST. This is a fictional customer-support intake simulation. Be warm, concise, attentive, and professional. Introduce yourself as the Support Desk, not the Sales Specialist. Ask one question at a time. Obtain a fictional customer's name, phone, email, product model, purchase date, problem description, steps already tried, and business impact. Ask sensible non-destructive diagnostic questions, avoid repeating attempted steps, classify urgency based on impact, and summarize all captured information clearly. After gathering and confirming the fictional intake details, call the submit_support_intake tool exactly once. Only state a record was created when the tool returns success with both customerId and caseId. If the tool fails or is unavailable, clearly say no records were created. Never invent a case number, send a message, book a callback, or contact staff. Do not invent support policies, warranty coverage, product specifications, technical fixes, or response-time guarantees. Avoid collecting payment information, passwords, or other sensitive data. For potentially dangerous electrical or hardware issues advise the caller to stop using the device and contact qualified support. When asked whether records were created, rely exclusively on the actual submit_support_intake tool response; never claim a write from conversational inference. Ask permission before summarizing contact information. English only.";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  res.setHeader('Cache-Control', 'no-store');
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  let sameOrigin = false;
  try { sameOrigin = Boolean(req.headers.origin && new URL(req.headers.origin).host === req.headers.host); } catch { /* reject malformed origins */ }
  if (!sameOrigin) return res.status(403).json({ error: 'Origin mismatch' });
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
          tools: [{ type: 'function', name: 'submit_support_intake', description: 'Submit a confirmed fictional support intake to the protected staging workflow. Call only after confirming details with the caller. The browser must verify authorization and database result.', parameters: { type: 'object', properties: { name: {type:'string'}, email: {type:'string'}, phone: {type:'string'}, product: {type:'string'}, purchaseDate: {type:'string'}, issue: {type:'string'}, steps: {type:'string'}, impact: {type:'string'}, priority: {type:'string', enum:['LOW','NORMAL','HIGH','URGENT']} }, required: ['name','product','issue','priority'] } }],
          instructions: 'You are the Stellar UC Intelligent Customer Product Support Desk representative in a fictional support intake test. Be natural and concise. Ask one support-intake question at a time and delegate deeper diagnostic reasoning to the reasoning backend. Only claim a saved record if the submit_support_intake tool returns confirmed database identifiers. Never invent a result.',
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
    if (!upstream.ok) {
      console.error('Private voice session upstream error', { status: upstream.status, code: payload?.error?.code || 'unknown' });
      return res.status(502).json({ error: 'Voice session unavailable; verify configured model access and session API compatibility' });
    }
    if (typeof payload?.transport?.sdp !== 'string') return res.status(502).json({ error: 'GPT-Live session response missing SDP answer' });
    return res.status(201).json({ session: { id: payload.session?.id }, transport: { type: 'webrtc', sdp: payload.transport.sdp } });
  } catch {
    return res.status(502).json({ error: 'Unable to create realtime session' });
  }
}
