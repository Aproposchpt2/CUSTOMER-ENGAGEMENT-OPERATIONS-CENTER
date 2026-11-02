import type { NextApiRequest, NextApiResponse } from 'next';
import { createHmac, timingSafeEqual } from 'crypto';
import { createClient } from '@supabase/supabase-js';
import { connectToAgentTwiml, isCallSid, languageForDigit } from '@/lib/voiceLanguageMenu';

function validTwilioSignature(req: NextApiRequest, params: Record<string, string>, authToken: string): boolean {
  const signature = req.headers['x-twilio-signature'];
  if (!signature || typeof signature !== 'string') return false;
  const proto = (req.headers['x-forwarded-proto'] as string) || 'https';
  const host = (req.headers['x-forwarded-host'] as string) || (req.headers.host as string) || '';
  const signed = Object.keys(params).sort().reduce((acc, key) => acc + key + (params[key] ?? ''), '');
  const expected = createHmac('sha1', authToken).update(`${proto}://${host}${req.url ?? ''}${signed}`).digest();
  const actual = Buffer.from(signature, 'base64');
  return expected.length === actual.length && timingSafeEqual(expected, actual);
}

// Saves the caller's keypress, then hands the call to ElevenLabs. Every failure still connects
// the call: the caller reaches the agent in English rather than hearing an error.
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).send('Method not allowed');
  res.setHeader('Content-Type', 'text/xml; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store');

  const params = (req.body && typeof req.body === 'object' ? req.body : {}) as Record<string, string>;
  const authToken = process.env.TWILIO_AUTH_TOKEN;
  const trusted = !authToken || validTwilioSignature(req, params, authToken);
  const language = languageForDigit(params.Digits);

  if (trusted && language === 'es' && isCallSid(params.CallSid)) {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (url && key) {
      const db = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
      const { error } = await db.from('voice_language_choices').upsert({ call_sid: params.CallSid, language });
      if (error) console.error('[language-choice] save failed', error.code);
    } else {
      console.error('[language-choice] database not configured');
    }
  } else if (!trusted) {
    console.error('[language-choice] signature rejected');
  }

  return res.status(200).send(connectToAgentTwiml());
}
