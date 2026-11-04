import type { NextApiRequest, NextApiResponse } from 'next';
import { createHmac, timingSafeEqual } from 'crypto';
import { createClient } from '@supabase/supabase-js';
import {
  attendantDepartmentTwiml,
  attendantEndedTwiml,
  attendantLanguageTwiml,
  attendantRoute,
  isCallSid,
  languageForDigit,
  type VoiceLanguage,
} from '@/lib/voiceLanguageMenu';

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

// Saves a Spanish choice so language-init can set the demo agent's language for this call.
async function saveSpanish(callSid: string) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    console.error('[attendant] database not configured');
    return;
  }
  const db = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
  const { error } = await db.from('voice_language_choices').upsert({ call_sid: callSid, language: 'es' });
  if (error) console.error('[attendant] save failed', error.code);
}

// Twilio's voice webhook for the main number. Every failure still moves the call forward.
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).send('Method not allowed');
  res.setHeader('Content-Type', 'text/xml; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store');

  const params = (req.body && typeof req.body === 'object' ? req.body : {}) as Record<string, string>;
  const authToken = process.env.TWILIO_AUTH_TOKEN;
  const trusted = !authToken || validTwilioSignature(req, params, authToken);
  if (!trusted) console.error('[attendant] signature rejected');

  const language: VoiceLanguage = req.query.lang === 'es' ? 'es' : 'en';
  const step = req.query.step;

  if (step === 'language') {
    return res.status(200).send(attendantDepartmentTwiml(languageForDigit(params.Digits), 1));
  }
  if (step === 'route') {
    const attempt = Number(req.query.attempt) === 2 ? 2 : 1;
    const route = attendantRoute(params.Digits, language, attempt);
    if (trusted && route.demoLanguage === 'es' && isCallSid(params.CallSid)) await saveSpanish(params.CallSid);
    return res.status(200).send(route.twiml);
  }
  if (step === 'ended') {
    return res.status(200).send(attendantEndedTwiml(params.DialCallStatus, language));
  }
  return res.status(200).send(attendantLanguageTwiml());
}
