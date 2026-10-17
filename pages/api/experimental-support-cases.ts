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

  // Try contact_id first (ai4cc convention), fall back to customer_id
  const fkCol = 'contact_id';
  const { data: cases, error: csErr } = await svc
    .from('stellar_support_cases')
    .select('*')
    .in(fkCol, contactIds)
    .order('created_at', { ascending: false })
    .limit(200);

  if (csErr) {
    // Try legacy column name if first attempt failed
    const { data: cases2, error: csErr2 } = await svc
      .from('stellar_support_cases')
      .select('*')
      .in('customer_id', contactIds)
      .order('created_at', { ascending: false })
      .limit(200);
    if (csErr2) {
      console.error('[css-dashboard] cases query failed both fk names', { msg: csErr.message, msg2: csErr2.message });
      return res.status(500).json({ error: 'Could not load cases', detail: csErr.message + ' / ' + csErr2.message });
    }
    return finalizeCases(res, cases2 || [], byId, 'customer_id');
  }

  return finalizeCases(res, cases || [], byId, fkCol);
}

function finalizeCases(
  res: import('next').NextApiResponse,
  cases: Record<string, unknown>[],
  byId: Record<string, { display_name: string; email: string; phone: string }>,
  fkCol: string,
) {
  const today = new Date().toISOString().slice(0, 10);
  const byPriority: Record<string, number> = {};
  let todayCount = 0;

  const enriched = cases.map(c => {
    const cid = (c.case_id ?? c.id) as string;
    const contactId = c[fkCol] as string;
    const contact = byId[contactId] ?? null;
    const priority = (c.priority as string) ?? 'NORMAL';
    byPriority[priority] = (byPriority[priority] || 0) + 1;
    if (((c.created_at as string) ?? '').startsWith(today)) todayCount++;
    return {
      caseId: cid,
      customerId: contactId,
      createdAt: c.created_at,
      priority,
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
