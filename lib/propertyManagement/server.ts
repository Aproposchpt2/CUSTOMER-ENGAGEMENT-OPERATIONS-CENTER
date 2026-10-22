import type { NextApiRequest, NextApiResponse } from 'next';
import { createClient } from '@supabase/supabase-js';
import { createServerClient } from '@supabase/ssr';
import { requireAi4ccContext, apiErrorStatus } from '@/lib/ai4ccServer';
import { PmaError } from './domain';

export function stagingGate() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
  if (process.env.PMA_ENABLED !== 'true' || process.env.PMA_ENVIRONMENT !== 'staging' || process.env.AI4CC_SCHEMA_MODEL !== 'stellar' || url !== 'https://hvzauakkhlivzeqatfqm.supabase.co') {
    throw new PmaError('Property Management is not enabled in this environment', 503);
  }
}
export async function pmaSession(req: NextApiRequest, portal = false) {
  stagingGate();
  if (req.method !== 'GET' && !req.headers.authorization) {
    const origin = req.headers.origin;
    if (!origin || new URL(origin).host !== req.headers.host) throw new PmaError('Invalid request origin', 403);
  }
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!key) throw new PmaError('Authentication is not configured', 503);
  const token = req.headers.authorization?.replace(/^Bearer\s+/i, '');
  const db = token ? createClient(url, key, { global: { headers: { Authorization: `Bearer ${token}` } }, auth: { persistSession: false, autoRefreshToken: false } }) : createServerClient(url, key, { cookies: { getAll: () => Object.entries(req.cookies).map(([name, value]) => ({ name, value: value ?? '' })), setAll() {} } });
  const { data, error } = await db.auth.getUser();
  if (error || !data.user) throw new PmaError('Not authenticated', 401);
  const staff = portal ? null : await requireAi4ccContext(req);
  // Durable user limit is shared by all instances; no process-local counter.
  const limited = await db.rpc('pm_rate_limit');
  if (limited.error) throw new PmaError('Request limit service unavailable', 503);
  if (limited.data !== true) throw new PmaError('Too many requests. Please try again shortly.', 429);
  return { db, userId: data.user.id, tenantId: staff?.tenantId, role: staff?.role, admin: staff?.admin };
}
export function result<T>(r: { data: T; error: { code?: string; message: string } | null }): T {
  if (r.error) {
    const code = r.error.code;
    const status = code === '42501' ? 403 : code === 'P0002' ? 404 : code?.startsWith('23') ? 409 : 500;
    throw new PmaError(status === 500 ? 'Property operation failed' : r.error.message, status);
  }
  return r.data;
}
export function fail(res: NextApiResponse, error: unknown) {
  const status = error instanceof PmaError ? error.status : apiErrorStatus(error);
  const message = error instanceof PmaError ? error.message : status === 401 ? 'Not authenticated' : status === 403 ? 'Workspace access denied' : 'Property operation failed';
  return res.status(status).json({ error: message });
}
export function privateResponse(res: NextApiResponse) {
  res.setHeader('Cache-Control', 'private, no-store');
  res.setHeader('X-Robots-Tag', 'noindex, nofollow');
}
