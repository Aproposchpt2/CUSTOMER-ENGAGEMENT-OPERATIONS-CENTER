import type { NextApiRequest, NextApiResponse } from 'next';
import { createClient } from '../../utils/supabase/server';

const clean = (value: unknown, max: number) => typeof value === 'string' ? value.trim().slice(0, max) : '';

async function sendCaseNotification(params: {
  caseId: string; customerId: string; name: string; email: string; phone: string;
  product: string; purchaseDate: string | null; issue: string; priority: string;
}): Promise<{ sent: boolean; error: string | null }> {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) return { sent: false, error: 'RESEND_API_KEY not configured' };
  const from = process.env.RESEND_FROM_EMAIL || process.env.RESEND_EMAIL_FROM || 'Stellar UC Support <onboarding@resend.dev>';
  const to = process.env.RESEND_TO_EMAIL || 'jmitchell@aproposgroupllc.com';
  const subject = `[CSS Staging] New support case — ${params.priority} · ${params.product}`;
  const body = [
    `Support case created via voice intake (staging/test only).`,
    ``,
    `Case ID:   ${params.caseId}`,
    `Customer:  ${params.name}`,
    `Email:     ${params.email || '(none)'}`,
    `Phone:     ${params.phone || '(none)'}`,
    `Product:   ${params.product}`,
    `Purchased: ${params.purchaseDate || 'unknown'}`,
    `Priority:  ${params.priority}`,
    ``,
    `Issue:`,
    params.issue,
  ].join('\n');
  try {
    const r = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { authorization: `Bearer ${apiKey}`, 'content-type': 'application/json' },
      body: JSON.stringify({ from, to: [to], subject, text: body }),
      signal: AbortSignal.timeout(10000),
    });
    if (!r.ok) {
      const detail = await r.text().catch(() => '');
      console.error('[css-intake] Resend rejected notification', { status: r.status, detail: detail.slice(0, 200) });
      return { sent: false, error: `resend_${r.status}` };
    }
    return { sent: true, error: null };
  } catch (e) {
    console.error('[css-intake] Resend notification failed', e instanceof Error ? e.message : String(e));
    return { sent: false, error: 'resend_network_error' };
  }
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  res.setHeader('Cache-Control', 'no-store');
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  if (process.env.STELLAR_SUPPORT_TEST_WRITES_ENABLED !== 'true')
    return res.status(503).json({ error: 'Support test writes not enabled' });
  if (process.env.NEXT_PUBLIC_SUPABASE_URL?.includes('vqrqyanqsiqzsmlhytaz'))
    return res.status(503).json({ error: 'Production database not permitted' });
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL?.includes('hvzauakkhlivzeqatfqm'))
    return res.status(503).json({ error: 'Staging database required' });
  const origin = req.headers.origin;
  if (!origin || (() => { try { return new URL(origin).host !== req.headers.host; } catch { return true; } })())
    return res.status(403).json({ error: 'Origin mismatch' });
  const supabase = createClient(req, res);
  const { data: auth, error: authError } = await supabase.auth.getUser();
  if (authError || !auth.user) return res.status(401).json({ error: 'Sign in required' });
  const body = req.body || {};
  const tenantId = clean(body.tenantId, 36);
  if (!/^[0-9a-f-]{36}$/i.test(tenantId)) return res.status(400).json({ error: 'Valid tenant required' });
  const name = clean(body.name, 150);
  const email = clean(body.email, 254);
  const phone = clean(body.phone, 40);
  const product = clean(body.product, 160);
  const issue = clean(body.issue, 2000);
  const sessionId = clean(body.sessionId, 128);
  const priority = clean(body.priority || 'NORMAL', 10);
  if (name.length < 2 || product.length < 2 || issue.length < 10 || sessionId.length < 12 || (!email && !phone) || !['LOW','NORMAL','HIGH','URGENT'].includes(priority))
    return res.status(400).json({ error: 'Incomplete intake' });
  const { data, error } = await supabase.rpc('stellar_create_support_test_intake', {
    p_tenant_id: tenantId, p_session_id: sessionId, p_name: name, p_email: email, p_phone: phone,
    p_product: product, p_purchase_date: body.purchaseDate || null, p_issue: issue,
    p_steps: clean(body.steps, 2000), p_impact: clean(body.impact, 2000), p_priority: priority
  });
  if (error) {
    console.error('Staging support intake failed', { code: error.code });
    return res.status(error.code === '42501' ? 403 : 500).json({ error: 'Support intake could not be saved' });
  }
  const row = data?.[0];
  if (!row?.customer_id || !row?.case_id) return res.status(500).json({ error: 'Support intake not confirmed' });
  const notification = await sendCaseNotification({
    caseId: row.case_id, customerId: row.customer_id,
    name, email, phone, product,
    purchaseDate: body.purchaseDate || null,
    issue, priority,
  });
  if (!notification.sent) {
    console.warn('[css-intake] Case created but notification failed', { caseId: row.case_id, error: notification.error });
  }
  return res.status(201).json({
    customerId: row.customer_id, caseId: row.case_id, createdNew: row.created_new, testOnly: true,
    notificationSent: notification.sent, notificationError: notification.error,
  });
}
