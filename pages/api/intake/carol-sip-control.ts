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
  const raw = JSON.stringify(req.body);
  const signature = req.headers['x-carol-control-signature'];
  try {
    verifyControl(raw, signature, process.env.PMA_SIP_CONTROL_SECRET);
  } catch {
    return res.status(401).json({ error: 'Invalid SIP control request' });
  }
  try {
    const service = createService({ env: process.env });
    if (!service.enabled()) return res.status(503).json({ error: 'SIP staging unavailable' });
    // The background invocation owns and awaits the sideband session. Never
    // detach a WebSocket from this short-lived Next.js response.
    const response = await fetch(process.env.PMA_STAGING_BASE_URL + '/.netlify/functions/carol-sip-control-background', {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-carol-control-signature': signature as string },
      body: raw,
      signal: AbortSignal.timeout(5000),
    });
    if (response.status !== 202) return res.status(503).json({ error: 'SIP controller unavailable' });
    return res.status(202).json({ accepted: true });
  } catch {
    return res.status(503).json({ error: 'SIP controller unavailable' });
  }
}
