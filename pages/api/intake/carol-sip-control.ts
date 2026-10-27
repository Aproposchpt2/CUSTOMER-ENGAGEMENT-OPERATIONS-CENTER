import type { NextApiRequest, NextApiResponse } from 'next';
import { privateResponse } from '@/lib/propertyManagement/server';
const { createService, verifyControl } = require('@/twilio-bridge/carol-sip-server.cjs');

// Internal signed dispatch from the OpenAI SIP webhook. Never expose a public
// way to start an arbitrary Realtime call or bypass the staging allowlist.
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  privateResponse(res);
  if (req.method !== 'POST') return res.status(405).json({ error: 'POST only' });
  if (process.env.PMA_ENVIRONMENT !== 'staging' ||
      process.env.PMA_SIP_ENABLED !== 'true') {
    return res.status(503).json({ error: 'SIP staging disabled' });
  }
  try {
    const raw = JSON.stringify(req.body);
    const signature = req.headers['x-carol-control-signature'];
    const binding = verifyControl(raw, signature, process.env.PMA_SIP_CONTROL_SECRET);
    const service = createService({ env: process.env });
    if (!service.enabled()) return res.status(503).json({ error: 'SIP staging unavailable' });
    // The WebSocket session must stay alive after this acknowledgment.
    // Netlify request lifetimes are finite: production-grade SIP control needs
    // an approved persistent execution strategy before end-to-end acceptance.
    void service.run(binding).catch(() => {});
    return res.status(202).json({ accepted: true });
  } catch {
    return res.status(401).json({ error: 'Invalid SIP control request' });
  }
}
