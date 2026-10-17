import type { NextApiRequest, NextApiResponse } from 'next';
import { createClient } from '../../utils/supabase/server';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  res.setHeader('Cache-Control', 'no-store');
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  const origin = req.headers.origin;
  if (!origin || (() => { try { return new URL(origin).host !== req.headers.host; } catch { return true; } })())
    return res.status(403).json({ error: 'Origin mismatch', reason: 'ORIGIN_MISMATCH' });
  const supabase = createClient(req, res);
  const { data: auth, error: authError } = await supabase.auth.getUser();
  if (authError || !auth.user) return res.status(401).json({ ready: false, reason: 'SESSION_NOT_FOUND' });
  const { data: members, error: memberError } = await supabase.from('tenant_users').select('tenant_id,role,status').eq('user_id', auth.user.id).in('role', ['OWNER','ADMIN']).limit(10);
  if (memberError) return res.status(503).json({ ready: false, reason: 'TENANT_MEMBERSHIP_LOOKUP_FAILED' });
  const tenantIds = (members || []).filter(m => m.status === 'ACTIVE').map(m => m.tenant_id);
  if (!tenantIds.length) return res.status(403).json({ ready: false, reason: 'NO_ACTIVE_ADMIN_MEMBERSHIP' });
  return res.status(200).json({ ready: true, authenticated: true, tenantIds });
}
