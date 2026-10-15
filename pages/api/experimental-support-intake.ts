import type { NextApiRequest, NextApiResponse } from 'next';
import { createClient } from '../../utils/supabase/server';

const clean = (value: unknown, max: number) => typeof value === 'string' ? value.trim().slice(0, max) : '';
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
  if (!origin || new URL(origin).host !== req.headers.host)
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
  return res.status(201).json({ customerId: row.customer_id, caseId: row.case_id, createdNew: row.created_new, testOnly: true });
}
