import type { NextApiRequest, NextApiResponse } from 'next';
import { createClient } from '../../utils/supabase/server';
import { createClient as createServiceClient } from '@supabase/supabase-js';

const clean = (v: unknown, max: number) => typeof v === 'string' ? v.trim().slice(0, max) : '';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  res.setHeader('Cache-Control', 'no-store');
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });
  if (process.env.NEXT_PUBLIC_SUPABASE_URL?.includes('vqrqyanqsiqzsmlhytaz'))
    return res.status(503).json({ error: 'Production database not permitted' });
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL?.includes('hvzauakkhlivzeqatfqm'))
    return res.status(503).json({ error: 'Staging database required' });
  const origin = req.headers.origin;
  if (origin) {
    try { if (new URL(origin).host !== req.headers.host) return res.status(403).json({ error: 'Origin mismatch' }); }
    catch { return res.status(403).json({ error: 'Invalid origin' }); }
  }
  const supabase = createClient(req, res);
  const { data: auth, error: authError } = await supabase.auth.getUser();
  if (authError || !auth.user) return res.status(401).json({ error: 'Sign in required' });
  const tenantId = clean(req.query.tenantId, 36);
  if (!/^[0-9a-f-]{36}$/i.test(tenantId)) return res.status(400).json({ error: 'Valid tenant required' });

  const svc = createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const { data: contacts, error: cErr } = await svc
    .from('ai4cc_contacts')
    .select('id, display_name, email, phone')
    .eq('tenant_id', tenantId);

  if (cErr) {
    console.error('[css-dashboard] contacts query failed', { code: cErr.code, msg: cErr.message });
    return res.status(500).json({ error: 'Could not load contacts', detail: cErr.message });
  }
  if (!contacts?.length) {
    return res.status(200).json({ cases: [], usage: { total: 0, today: 0, byPriority: {} } });
  }

  const contactIds = contacts.map(c => c.id);
  const byId = Object.fromEntries(contacts.map(c => [c.id, c]));

  const { data: cases, error: csErr } = await svc
    .from('stellar_support_cases')
    .select('id, case_id, created_at, priority, product, issue, customer_id, session_id')
    .in('customer_id', contactIds)
    .order('created_at', { ascending: false })
    .limit(200);

  if (csErr) {
    console.error('[css-dashboard] cases query failed', { code: csErr.code, msg: csErr.message });
    return res.status(500).json({ error: 'Could not load cases', detail: csErr.message });
  }

  const today = new Date().toISOString().slice(0, 10);
  const byPriority: Record<string, number> = {};
  let todayCount = 0;

  const enriched = (cases || []).map(c => {
    const cid = c.case_id ?? c.id;
    const contact = byId[c.customer_id] ?? null;
    byPriority[c.priority] = (byPriority[c.priority] || 0) + 1;
    if ((c.created_at ?? '').startsWith(today)) todayCount++;
    return {
      caseId: cid,
      customerId: c.customer_id,
      createdAt: c.created_at,
      priority: c.priority,
      product: c.product,
      issue: c.issue,
      sessionId: c.session_id,
      customer: contact ? { name: contact.display_name, email: contact.email, phone: contact.phone } : null,
    };
  });

  return res.status(200).json({
    cases: enriched,
    usage: { total: enriched.length, today: todayCount, byPriority },
  });
}
