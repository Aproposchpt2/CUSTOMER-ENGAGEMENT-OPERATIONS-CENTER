import type { NextApiRequest, NextApiResponse } from 'next';
import { createHmac, timingSafeEqual } from 'crypto';

function parseBody(raw: unknown): Record<string, string> {
  if (raw && typeof raw === 'object' && !Array.isArray(raw)) return raw as Record<string, string>;
  if (typeof raw === 'string') {
    const out: Record<string, string> = {};
    for (const pair of raw.split('&')) {
      const idx = pair.indexOf('=');
      if (idx === -1) continue;
      out[decodeURIComponent(pair.slice(0, idx).replace(/\+/g, ' '))] =
        decodeURIComponent(pair.slice(idx + 1).replace(/\+/g, ' '));
    }
    return out;
  }
  return {};
}

function validateTwilioSignature(req: NextApiRequest, authToken: string): boolean {
  const signature = req.headers['x-twilio-signature'];
  if (!signature || typeof signature !== 'string') return false;
  const proto = (req.headers['x-forwarded-proto'] as string) || 'https';
  const host = (req.headers['x-forwarded-host'] as string) || (req.headers['host'] as string) || '';
  const fullUrl = `${proto}://${host}${req.url ?? ''}`;
  const params = parseBody(req.body);
  const sortedStr = Object.keys(params).sort().reduce((acc, k) => acc + k + (params[k] ?? ''), '');
  const expected = createHmac('sha1', authToken).update(fullUrl + sortedStr).digest();
  try {
    const sigBuf = Buffer.from(signature, 'base64');
    if (expected.length !== sigBuf.length) return false;
    return timingSafeEqual(expected, sigBuf);
  } catch {
    return false;
  }
}

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).send('Method not allowed');
  res.setHeader('Content-Type', 'text/xml; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store');

  const authToken = process.env.TWILIO_AUTH_TOKEN;
  if (authToken && !validateTwilioSignature(req, authToken)) {
    return res.status(200).send(
      '<?xml version="1.0" encoding="UTF-8"?><Response><Say voice="Polly.Joanna">We could not verify your call. Please try again.</Say></Response>'
    );
  }

  const proto = (req.headers['x-forwarded-proto'] as string) || 'https';
  const host = (req.headers['x-forwarded-host'] as string) || (req.headers['host'] as string) || 'stellaruc.com';
  const baseUrl = `${proto}://${host}`;

  const twiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Gather numDigits="1" action="${baseUrl}/api/twilio/ivr-gather" method="POST" timeout="10">
    <Say voice="Polly.Joanna">You have reached Stellar Intelligent Technologies. Press 1 for Management. Press 2 for Sales Specialist. Press 3 for Support Specialist. Press 0 to repeat this message.</Say>
  </Gather>
  <Redirect method="POST">${baseUrl}/api/twilio/ivr</Redirect>
</Response>`;

  return res.status(200).send(twiml);
}
