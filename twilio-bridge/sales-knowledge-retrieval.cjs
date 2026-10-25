'use strict';
const { requireApprovedKnowledge } = require('./sales-orchestration.cjs');

/** Read-only caller-safe KB retriever. Server secrets only, no user-supplied tenant identity.
 * Requires STELLAR_SALES_KB_READ_ENABLED=true and a server-provided tenant ID.
 * Fail closed if configuration, query, or publication metadata is missing.
 */
async function lookupSalesKnowledge({query, tenantId, fetchImpl=fetch, env=process.env}) {
  if (env.STELLAR_SALES_KB_READ_ENABLED !== 'true') return {status:'DISABLED',entries:[]};
  const base=env.SUPABASE_URL || env.NEXT_PUBLIC_SUPABASE_URL;
  const key=env.SUPABASE_SERVICE_ROLE_KEY;
  if (!base || !key || !tenantId) return {status:'UNAVAILABLE',entries:[]};
  if (typeof query!=='string' || !query.trim() || query.length>240) return {status:'INVALID_QUERY',entries:[]};
  const clean=query.trim().replace(/[%(),*]/g,' ').replace(/\s+/g,' ').slice(0,120);
  if (clean.length<3) return {status:'INVALID_QUERY',entries:[]};
  const url=new URL('/rest/v1/ai4cc_knowledge_entries',base);
  url.searchParams.set('select','id,tenant_id,title,content,category,approved,visibility,publication_state,audience_scope,source_status,effective_at,expires_at,valid_until');
  url.searchParams.set('tenant_id','eq.'+tenantId);
  url.searchParams.set('approved','eq.true');
  url.searchParams.set('publication_state','eq.published');
  url.searchParams.set('audience_scope','eq.public');
  url.searchParams.set('visibility','eq.public');
  url.searchParams.set('source_status','eq.VERIFIED');
  url.searchParams.set('or',`(title.ilike.*${clean}*,content.ilike.*${clean}*)`);
  url.searchParams.set('limit','5');
  try {
    const res=await fetchImpl(url.toString(),{headers:{apikey:key,Authorization:'Bearer '+key,Accept:'application/json'},signal:AbortSignal.timeout(7000)});
    if (!res.ok) return {status:'UNAVAILABLE',entries:[]};
    const rows=await res.json();
    if (!Array.isArray(rows)) return {status:'UNAVAILABLE',entries:[]};
    const entries=rows.map(row=>requireApprovedKnowledge(row,{tenantId})).filter(Boolean).map(({id,title,content,source_status})=>({id,title,source_status,content:content.slice(0,3500)}));
    return {status:entries.length?'FOUND':'NO_APPROVED_MATCH',entries};
  } catch { return {status:'UNAVAILABLE',entries:[]}; }
}
module.exports={lookupSalesKnowledge};
