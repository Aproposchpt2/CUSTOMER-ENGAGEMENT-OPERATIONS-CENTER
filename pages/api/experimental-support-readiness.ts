import type { NextApiRequest, NextApiResponse } from 'next';
import { createClient } from '../../utils/supabase/server';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  res.setHeader('Cache-Control', 'no-store');
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  const origin = req.headers.origin;
  if (!origin || (() => { try { return new URL(origin).host !== req.headers.host; } catch { return true; } })())
    return res.status(403).json({ error: 'Origin mismatch', reason: 'ORIGIN_MISMATCH' });
  const expected = process.env.STELLAR_VOICE_POC_ACCESS_CODE;
  if (!expected || req.headers['x-poc-access-code'] !== expected)
    return res.status(401).json({ error: 'Private test access code was not accepted', reason: 'ACCESS_CODE_REJECTED' });
  const staging = process.env.NEXT_PUBLIC_SUPABASE_URL?.includes('hvzauakkhlivzeqatfqm') === true;
  const writesEnabled = process.env.STELLAR_SUPPORT_TEST_WRITES_ENABLED === 'true';
  if (!staging) return res.status(503).json({ ready: false, reason: 'STAGING_CONFIG_MISSING' });
  const supabase = createClient(req, res);
  const { data: auth, error: authError } = await supabase.auth.getUser();
  if (authError || !auth.user) return res.status(401).json({ ready: false, reason: 'STAGING_SESSION_NOT_FOUND' });
  const { data: members, error: memberError } = await supabase.from('tenant_users').select('tenant_id,role,status').eq('user_id', auth.user.id).in('role', ['OWNER','ADMIN']).limit(10);
  if (memberError) return res.status(503).json({ ready: false, reason: 'TENANT_MEMBERSHIP_LOOKUP_FAILED' });
  const tenantIds = (members || []).filter(m => m.status === 'ACTIVE').map(m => m.tenant_id);
  if (!writesEnabled) return res.status(503).json({ ready: false, reason: 'TEST_WRITES_DISABLED' });
  if (!tenantIds.length) return res.status(403).json({ ready: false, reason: 'NO_ACTIVE_ADMIN_MEMBERSHIP' });
  return res.status(200).json({ ready: true, staging: true, writesEnabled: true, authenticated: true, tenantIds });
}
