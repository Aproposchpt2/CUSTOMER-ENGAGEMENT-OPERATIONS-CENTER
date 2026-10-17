import type { NextApiRequest, NextApiResponse } from 'next';
import { createClient } from '../../utils/supabase/server';

const INSTRUCTIONS = "You are the Stellar UC Intelligent Customer Product Support Desk representative in an ISOLATED TEST. This is a fictional customer-support intake simulation. Be warm, concise, attentive, and professional. Introduce yourself as the Support Desk, not the Sales Specialist. Ask one question at a time. Obtain a fictional customer's name, phone, email, product model, purchase date, problem description, steps already tried, and business impact. Ask sensible non-destructive diagnostic questions, avoid repeating attempted steps, classify urgency based on impact, and summarize all captured information clearly. After gathering and confirming fictional intake details, call submit_support_intake once. Wait for its result. State a case was created only if the tool returns success with customerId and caseId. If unavailable or unsuccessful, explain no case was confirmed. Never invent a case number, send a message, book a callback, or contact staff. Do not invent support policies, warranty coverage, product specifications, technical fixes, or response-time guarantees. Avoid collecting payment information, passwords, or other sensitive data. For potentially dangerous electrical or hardware issues advise the caller to stop using the device and contact qualified support. When asked whether records were created, rely exclusively on the actual submit_support_intake tool response; never claim a write from conversational inference. Ask permission before summarizing contact information. English only.";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  res.setHeader('Cache-Control', 'no-store');
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  let sameOrigin = false;
  try { sameOrigin = Boolean(req.headers.origin && new URL(req.headers.origin).host === req.headers.host); } catch { /* reject malformed origins */ }
  if (!sameOrigin) return res.status(403).json({ error: 'Origin mismatch' });
  if (typeof req.body?.sdp !== 'string' || req.body.sdp.length < 100 || req.body.sdp.length > 65536) return res.status(400).json({ error: 'Valid SDP offer required' });
  const supabase = createClient(req, res);
  const { data: auth, error: authError } = await supabase.auth.getUser();
  if (authError || !auth.user) return res.status(401).json({ error: 'Sign in required' });
  const key = process.env.OPENAI_API_KEY;
  if (!key) return res.status(503).json({ error: 'OpenAI API key unavailable' });
  try {
    const upstream = await fetch('https://api.openai.com/v1/live/sessions', {
      method: 'POST',
      headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        session: {
          model: 'gpt-live-1',

          instructions: 'You are the Stellar UC Intelligent Customer Product Support Desk representative in a fictional support intake test. Be natural and concise. Ask one support-intake question at a time and delegate deeper diagnostic reasoning to the reasoning backend. After collecting and confirming the caller fictional details, use submit_support_intake exactly once. The tool becomes available after the secure voice channel opens. Wait for its returned result. Speak the real caseId only on confirmed success; otherwise explain the record was not confirmed. Never invent a result.',
          delegation: {
            type: 'responses',
            responses: {
              model: 'gpt-5.6-terra',
              instructions: INSTRUCTIONS,
              tools: [
                {
                  type: 'function',
                  name: 'submit_support_intake',
                  description: 'Submit a fictional customer support intake to staging only after confirming all details with the caller. Call exactly once, then wait for the real database result before speaking a case ID.',
                  parameters: {
                    type: 'object',
                    properties: {
                      name: { type: 'string' },
                      email: { type: 'string' },
                      phone: { type: 'string' },
                      product: { type: 'string' },
                      purchaseDate: { type: 'string', description: 'YYYY-MM-DD' },
                      issue: { type: 'string' },
                      steps: { type: 'string' },
                      impact: { type: 'string' },
                      priority: { type: 'string', enum: ['LOW', 'NORMAL', 'HIGH', 'URGENT'] }
                    },
                    required: ['name', 'email', 'phone', 'product', 'purchaseDate', 'issue', 'steps', 'impact', 'priority'],
                    additionalProperties: false
                  }
                }
              ],
              tool_choice: 'auto'
            }
          }
        },
        transport: { type: 'webrtc', sdp: req.body.sdp }
      }),
      signal: AbortSignal.timeout(20000)
    });
    const payload = await upstream.json().catch(() => ({}));
    if (!upstream.ok) {
      const code = typeof payload?.error?.code === 'string' ? payload.error.code.slice(0,80) : 'unknown';
      const type = typeof payload?.error?.type === 'string' ? payload.error.type.slice(0,80) : 'unknown';
      const param = typeof payload?.error?.param === 'string' ? payload.error.param.slice(0,80) : null;
      console.error('Private support voice upstream rejection', { status: upstream.status, code, type, param });
      return res.status(502).json({ error: 'Voice session rejected by upstream service', diagnostic: { upstreamStatus: upstream.status, code, type, param } });
    }
    if (typeof payload?.transport?.sdp !== 'string') return res.status(502).json({ error: 'GPT-Live session response missing SDP answer' });
    return res.status(201).json({ session: { id: payload.session?.id }, transport: { type: 'webrtc', sdp: payload.transport.sdp } });
  } catch (e) {
    const category = e instanceof Error && e.name === 'TimeoutError' ? 'UPSTREAM_TIMEOUT' : 'UPSTREAM_CONNECTION_ERROR';
    console.error('Private support voice session transport failure', { category });
    return res.status(502).json({ error: 'Unable to create realtime session', diagnostic: { code: category } });
  }
}
