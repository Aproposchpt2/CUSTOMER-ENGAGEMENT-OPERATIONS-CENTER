/**
 * RUF-005: Knowledge retrieval visibility controls
 * Server-side scope + audience enforcement for ai4cc_knowledge_entries.
 * All KB reads must go through buildKbQuery() — never bypass this gate.
 */

import type { SupabaseClient } from '@supabase/supabase-js';

export type AudienceScope = 'public' | 'staff' | 'owner' | 'vendor' | 'internal';
export type KbScope = 'platform' | 'tenant' | 'product';
export type PublicationState = 'draft' | 'published' | 'archived';

export interface KbQueryOpts {
  tenantId: string;
  /** Caller's role — controls which audience_scope values they may see */
  callerRole: 'service_role' | 'owner' | 'staff' | 'vendor' | 'public';
  /** Restrict to a specific KB scope (optional) */
  scope?: KbScope;
  /** Only return entries with this publication_state (default: published) */
  publicationState?: PublicationState;
  /** Filter by category */
  category?: string;
  /** Free-text search in title + content (case-insensitive) */
  search?: string;
  limit?: number;
}

const AUDIENCE_VISIBILITY: Record<KbQueryOpts['callerRole'], AudienceScope[]> = {
  service_role: ['public', 'staff', 'owner', 'vendor', 'internal'],
  owner:        ['public', 'staff', 'owner'],
  staff:        ['public', 'staff'],
  vendor:       ['public', 'vendor'],
  public:       ['public'],
};

/**
 * Returns a Supabase query with tenant isolation, audience scope, and
 * publication state enforced. Never returns cross-tenant rows.
 *
 * RLS on the table provides a second enforcement layer.
 */
export function buildKbQuery(supabase: SupabaseClient, opts: KbQueryOpts) {
  const allowedAudiences = AUDIENCE_VISIBILITY[opts.callerRole];
  const state = opts.publicationState ?? 'published';

  let q = supabase
    .from('ai4cc_knowledge_entries')
    .select('id, title, category, content, tags, source_status, scope, audience_scope, publication_state, version_num, effective_at, expires_at, created_at')
    .eq('tenant_id', opts.tenantId)
    .eq('publication_state', state)
    .in('audience_scope', allowedAudiences)
    .order('created_at', { ascending: false })
    .limit(opts.limit ?? 50);

  if (opts.scope) q = q.eq('scope', opts.scope);
  if (opts.category) q = q.eq('category', opts.category);
  if (opts.search) {
    // Case-insensitive title/content search (uses Supabase ilike or full-text)
    q = q.or(`title.ilike.%${opts.search}%,content.ilike.%${opts.search}%`);
  }

  // Exclude expired entries
  q = q.or('expires_at.is.null,expires_at.gt.' + new Date().toISOString());

  return q;
}

/**
 * Convenience: fetch a single entry with ownership verification.
 * Returns null if the entry does not belong to the tenant or is outside caller scope.
 */
export async function getKbEntry(
  supabase: SupabaseClient,
  id: string,
  opts: Pick<KbQueryOpts, 'tenantId' | 'callerRole'>
) {
  const allowedAudiences = AUDIENCE_VISIBILITY[opts.callerRole];
  const { data, error } = await supabase
    .from('ai4cc_knowledge_entries')
    .select('*')
    .eq('id', id)
    .eq('tenant_id', opts.tenantId)
    .in('audience_scope', allowedAudiences)
    .maybeSingle();
  if (error) throw error;
  return data;
}
