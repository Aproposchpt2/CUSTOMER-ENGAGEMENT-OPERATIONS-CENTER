import type { NextApiRequest, NextApiResponse } from 'next';
import { createClient } from '@supabase/supabase-js';
import { createHmac, timingSafeEqual } from 'crypto';
import { normalizePhone } from '../intake/webhook';

function admin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error('Storage not configured');
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
}

async function verifySession(req: NextApiRequest) {
  const authHeader = req.headers.authorization;
  const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null;
  if (!token) return null;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (!url || !anonKey) return null;
  const client = createClient(url, anonKey, { auth: { persistSession: false, autoRefreshToken: false } });
  const { data: { user }, error } = await client.auth.getUser(token);
  if (error || !user) return null;
  return user;
}

function validE164(value: string): boolean {
  return /^\+1\d{10}$/.test(value) || /^\+\d{7,15}$/.test(value);
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'POST only' });

  const user = await verifySession(req);
  if (!user) return res.status(401).json({ error: 'Not authenticated' });

  const { interactionId, to: rawTo, body: messageBody } = (req.body ?? {}) as Record<string, string>;

  const to = normalizePhone(rawTo ?? '');
  if (!to || !validE164(to)) return res.status(400).json({ error: 'A valid E.164 destination number is required' });

  const text = (messageBody ?? '').trim().slice(0, 1600);
  if (!text) return res.status(400).json({ error: 'Message body is required' });

  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const authToken = process.env.TWILIO_AUTH_TOKEN;
  const fromNumber = process.env.TWILIO_SMS_FROM_NUMBER || process.env.TWILIO_PHONE_NUMBER;
  if (!accountSid || !authToken || !fromNumber) {
    return res.status(503).json({ error: 'SMS not configured — TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, and TWILIO_SMS_FROM_NUMBER are required' });
  }

  const twilioUrl = `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`;
  const params = new URLSearchParams({ From: fromNumber, To: to, Body: text });
  const twilioRes = await fetch(twilioUrl, {
    method: 'POST',
    headers: {
      'Authorization': `Basic ${Buffer.from(`${accountSid}:${authToken}`).toString('base64')}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: params.toString(),
  });
  const twilioData = await twilioRes.json() as Record<string, unknown>;
  if (!twilioRes.ok) {
    console.error('[sms-send] Twilio error', twilioData);
    return res.status(502).json({ error: twilioData?.message ?? 'Failed to send SMS via Twilio' });
  }

  const messageSid = twilioData.sid as string;

  if (interactionId) {
    try {
      const db = admin();
      const TENANT_ID = '5885a020-d363-4c27-910a-c035eda132f5';
      const { data: existing } = await db.from('ai4cc_transcripts').select('sequence_no').eq('interaction_id', interactionId).order('sequence_no', { ascending: false }).limit(1).maybeSingle();
      const nextSeq = ((existing as any)?.sequence_no ?? 0) + 1;
      await db.from('ai4cc_transcripts').insert({
        tenant_id: TENANT_ID,
        interaction_id: interactionId,
        speaker: 'agent',
        sequence_no: nextSeq,
        content: text,
        sentiment: 0,
        metadata: { source: 'agent_sms_reply', messageSid, agentUserId: user.id },
      });
      await db.from('ai4cc_interactions').update({ metadata: { sms_last_reply: text, sms_last_reply_sid: messageSid } }).eq('id', interactionId).eq('tenant_id', TENANT_ID);
    } catch (err) {
      console.warn('[sms-send] transcript write failed (non-fatal)', err);
    }
  }

  return res.status(200).json({ ok: true, messageSid });
}
