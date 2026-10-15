import type { NextApiRequest, NextApiResponse } from 'next';
import { createClient } from '../../utils/supabase/server';

/**
 * Private staging read-only provisioning inventory.
 * Uses the authenticated user's Supabase session and database RLS.
 * Never uses service-role credentials or accepts a tenant ID for authorization.
 * No writes, activations, or billing operations.
 */
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY) {
    return res.status(503).json({ error: 'Supabase staging client is not configured' });
  }
  try {
    const supabase = createClient(req, res);
    const { data: auth, error: authError } = await supabase.auth.getUser();
    if (authError || !auth.user) return res.status(401).json({ error: 'Authentication required' });

    const [products, features, entitlements, assignments] = await Promise.all([
      supabase.from('stellar_product_catalog').select('product_code,product_family,display_name,lifecycle_status').order('product_code'),
      supabase.from('stellar_feature_catalog').select('feature_code,description').order('feature_code'),
      supabase.from('stellar_product_features').select('product_code,feature_code,enabled,limits').order('product_code'),
      supabase.from('stellar_tenant_products').select('id,tenant_id,product_code,status,created_at').order('created_at', { ascending: false }),
    ]);
    const failed = [products, features, entitlements, assignments].find(result => result.error);
    if (failed?.error) {
      console.error('Provisioning inventory query failed', { code: failed.error.code });
      return res.status(503).json({ error: 'Provisioning inventory unavailable' });
    }
    return res.status(200).json({
      products: products.data ?? [],
      features: features.data ?? [],
      entitlements: entitlements.data ?? [],
      tenantProducts: assignments.data ?? [],
      note: 'Read-only staging inventory; assignments are limited by database tenant-membership policies.',
    });
  } catch {
    return res.status(503).json({ error: 'Provisioning inventory unavailable' });
  }
}
