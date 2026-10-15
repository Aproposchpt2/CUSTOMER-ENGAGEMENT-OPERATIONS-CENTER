import type { NextApiRequest, NextApiResponse } from 'next';
import { createClient } from '../../utils/supabase/server';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  res.setHeader('Cache-Control', 'no-store');
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });
  const origin = req.headers.origin;
  if (!origin || (() => { try { return new URL(origin).host !== req.headers.host; } catch { return true; } })())
    return res.status(403).json({ error: 'Origin mismatch' });
  const expected = process.env.STELLAR_VOICE_POC_ACCESS_CODE;
  if (!expected || req.headers['x-poc-access-code'] !== expected)
    return res.status(401).json({ error: 'Private test access required' });
  const staging = process.env.NEXT_PUBLIC_SUPABASE_URL?.includes('hvzauakkhlivzeqatfqm') === true;
  const writesEnabled = process.env.STELLAR_SUPPORT_TEST_WRITES_ENABLED === 'true';
  if (!staging) return res.status(503).json({ ready: false, staging: false, writesEnabled: false });
  const supabase = createClient(req, res);
  const { data: auth, error: authError } = await supabase.auth.getUser();
  if (authError || !auth.user) return res.status(401).json({ ready: false, staging: true, writesEnabled, authenticated: false });
  const { data: members, error: memberError } = await supabase.from('tenant_users').select('tenant_id,role,status').eq('user_id', auth.user.id).in('role', ['OWNER','ADMIN']).limit(10);
  if (memberError) return res.status(503).json({ ready: false, staging: true, writesEnabled, authenticated: true, admin: false });
  const tenantIds = (members || []).filter(m => m.status === 'ACTIVE').map(m => m.tenant_id);
  return res.status(200).json({ ready: staging && writesEnabled && tenantIds.length > 0, staging, writesEnabled, authenticated: true, tenantIds });
}
