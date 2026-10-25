'use strict';
function requireApprovedKnowledge(row, { tenantId, callerRole = 'public', now = new Date() }) {
  if (!row || typeof row !== 'object' || !tenantId || row.tenant_id !== tenantId) return null;
  if (row.approved !== true || row.publication_state !== 'published') return null;
  if (row.visibility !== 'public' || row.audience_scope !== 'public') return null;
  if (!(now instanceof Date) || !Number.isFinite(now.getTime())) return null;
  for (const field of ['effective_at','expires_at','valid_until']) {
    const value = row[field];
    if (value == null) continue;
    if (typeof value !== 'string' || !Number.isFinite(Date.parse(value))) return null;
    if (field === 'effective_at' ? Date.parse(value) > now.getTime() : Date.parse(value) <= now.getTime()) return null;
  }
  if (typeof row.content !== 'string' || !row.content.trim()) return null;
  if (row.source_status !== 'VERIFIED') return null;
  if (callerRole !== 'public') return null; // Caller-facing channel always assumes public.
  return { id: row.id, title: row.title, content: row.content, source_status: row.source_status };
}

module.exports={requireApprovedKnowledge};
