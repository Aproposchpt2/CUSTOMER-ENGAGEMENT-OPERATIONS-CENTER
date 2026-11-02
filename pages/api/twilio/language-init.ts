import type { NextApiRequest, NextApiResponse } from 'next';
import { createClient } from '@supabase/supabase-js';
import { initiationResponse, isCallSid, type VoiceLanguage } from '@/lib/voiceLanguageMenu';

// ElevenLabs calls this as a phone call starts. It reveals only the language chosen for a call
// SID, so it needs no key. Any failure answers English so the call always starts.
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'POST only' });
  res.setHeader('Cache-Control', 'no-store');

  const body = (req.body ?? {}) as Record<string, unknown>;
  let language: VoiceLanguage = 'en';
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (isCallSid(body.call_sid) && url && key) {
    const db = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
    const { data, error } = await db
      .from('voice_language_choices')
      .select('language')
      .eq('call_sid', body.call_sid)
      .maybeSingle();
    if (error) console.error('[language-init] lookup failed', error.code);
    if (data?.language === 'es') language = 'es';
  }

  return res.status(200).json(initiationResponse(language, body.caller_id));
}
