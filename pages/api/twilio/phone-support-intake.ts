import type { NextApiRequest, NextApiResponse } from 'next';
import { createClient } from '@supabase/supabase-js';
import { createHmac, timingSafeEqual } from 'crypto';

const TOKEN_MAX_AGE_SECS = 300;

function admin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error('Supabase not configured');
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
}

function validateBridgeToken(req: NextApiRequest, secret: string): boolean {
  const header = req.headers['x-bridge-signature'];
  if (!header || typeof header !== 'string') return false;
  const parts = header.split('.');
  if (parts.length !== 2) return false;
  const [ts, sig] = parts;
  const timestamp = parseInt(ts, 10);
  if (isNaN(timestamp) || Math.abs(Date.now() / 1000 - timestamp) > TOKEN_MAX_AGE_SECS) return false;
  const expected = createHmac('sha256', secret).update(`phone-support-intake:${ts}`).digest('hex');
  try {
    return timingSafeEqual(Buffer.from(sig, 'hex'), Buffer.from(expected, 'hex'));
  } catch {
    return false;
  }
}

function clean(v: unknown, max: number) {
  return typeof v === 'string' ? v.trim().slice(0, max) : '';
}

async function sendNotification(params: {
  caseId: string; name: string; email: string; phone: string;
  product: string; purchaseDate: string | null; issue: string; priority: string;
}) {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) return;
  const from = process.env.RESEND_FROM_EMAIL || 'Stellar UC Support <onboarding@resend.dev>';
  const to = process.env.RESEND_TO_EMAIL || 'jmitchell@aproposgroupllc.com';
  try {
    await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { authorization: `Bearer ${apiKey}`, 'content-type': 'application/json' },
      body: JSON.stringify({
        from, to: [to],
        subject: `[CSS Phone] New support case — ${params.priority} · ${params.product}`,
        text: [
          'Support case created via phone voice intake.',
          '',
          `Case ID:   ${params.caseId}`,
          `Customer:  ${params.name}`,
          `Email:     ${params.email || '(none)'}`,
          `Phone:     ${params.phone || '(none)'}`,
          `Product:   ${params.product}`,
          `Purchased: ${params.purchaseDate || 'unknown'}`,
          `Priority:  ${params.priority}`,
          '',
          'Issue:',
          params.issue,
        ].join('\n'),
      }),
      signal: AbortSignal.timeout(10000),
    });
  } catch {
    // non-fatal
  }
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  res.setHeader('Cache-Control', 'no-store');
  if (req.method !== 'POST') return res.status(405).json({ error: 'POST only' });

  const secret = process.env.BRIDGE_HMAC_SECRET;
  if (!secret || !validateBridgeToken(req, secret)) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const body = req.body || {};
  const tenantId = clean(body.tenantId, 36);
  if (!/^[0-9a-f-]{36}$/i.test(tenantId)) return res.status(400).json({ error: 'tenantId required' });

  const name = clean(body.name, 150);
  const email = clean(body.email, 254);
  const phone = clean(body.phone, 40);
  const product = clean(body.product, 160);
  const issue = clean(body.issue, 2000);
  const sessionId = clean(body.sessionId || body.callSid || '', 128);
  const priority = clean(body.priority || 'NORMAL', 10);

  if (name.length < 2 || product.length < 2 || issue.length < 10 || (!email && !phone) ||
      !['LOW', 'NORMAL', 'HIGH', 'URGENT'].includes(priority)) {
    return res.status(400).json({ error: 'Incomplete intake' });
  }

  try {
    const db = admin();
    const { data, error } = await db.rpc('stellar_create_support_intake', {
      p_tenant_id: tenantId,
      p_session_id: sessionId || null,
      p_name: name,
      p_email: email,
      p_phone: phone,
      p_product: product,
      p_purchase_date: clean(body.purchaseDate, 20) || null,
      p_issue: issue,
      p_steps: clean(body.steps, 2000),
      p_impact: clean(body.impact, 2000),
      p_priority: priority,
    });
    if (error) {
      console.error('[phone-support-intake] RPC failed', { code: error.code });
      return res.status(500).json({ error: 'Support intake could not be saved' });
    }
    const row = data?.[0];
    if (!row?.customer_id || !row?.case_id) return res.status(500).json({ error: 'Not confirmed' });
    sendNotification({ caseId: row.case_id, name, email, phone, product, purchaseDate: clean(body.purchaseDate, 20) || null, issue, priority });
    return res.status(201).json({ customerId: row.customer_id, caseId: row.case_id, createdNew: row.created_new });
  } catch (e) {
    console.error('[phone-support-intake] failed', e instanceof Error ? e.message : e);
    return res.status(500).json({ error: 'Internal error' });
  }
}
