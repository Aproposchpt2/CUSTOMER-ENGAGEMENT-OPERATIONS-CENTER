'use strict';

/**
 * STELLAR Sales Orchestration Core v1 — staging-only module, not live-wired.
 * Source of truth: config/sales-intelligence/master-intent-registry-v1.0.json
 * Implements server-owned decisions rather than assuming prompt instructions are controls.
 */
const registry = require('../config/sales-intelligence/master-intent-registry-v1.0.json');
const ALL = Array.isArray(registry.intents) ? registry.intents : [];
const map = new Map(ALL.map(item => [item.reference_id || item.ref_id, item]));
const SALES = new Set(ALL.filter(x => x.group === 'sales').map(x => x.reference_id));
const SAFETY = new Set(ALL.filter(x => x.group === 'safety').map(x => x.reference_id));
const CONTROL = new Set(ALL.filter(x => x.group === 'conversation_control').map(x => x.reference_id));
const UNIVERSAL = new Set(ALL.filter(x => x.group === 'universal').map(x => x.reference_id));
const ALLOWED = new Set([...SALES, ...SAFETY, ...CONTROL, ...UNIVERSAL]);

function routeIntent({ intentId, confidence, safetyIntentId = null, entities = {} }) {
  // Only deterministic scanner is authorized to provide safetyIntentId.
  if (safetyIntentId) {
    if (!SAFETY.has(safetyIntentId)) return { action: 'REJECT_INVALID_SAFETY', mayExecute: false };
    return { action: 'SAFETY_OVERRIDE', intentId: safetyIntentId, mayExecute: false, escalationRequired: true };
  }
  if (!ALLOWED.has(intentId)) return { action: 'UNKNOWN', intentId: null, mayExecute: false };
  if (typeof confidence !== 'number' || !Number.isFinite(confidence) || confidence < 0 || confidence > 1) {
    return { action: 'CLARIFY_CONFIDENCE', intentId, mayExecute: false };
  }
  if (confidence < 0.70) return { action: 'UNKNOWN', intentId, mayExecute: false };
  if (confidence < 0.90) return { action: 'CLARIFY', intentId, mayExecute: false };
  if (SALES.has(intentId)) return { action: 'SALES_INTENT', intentId, mayExecute: false, knowledgeLookupAllowed: true, entities };
  // Universal/control intents never independently authorize business writes.
  return { action: CONTROL.has(intentId) ? 'CONTROL' : 'UNIVERSAL', intentId, mayExecute: false, entities };
}

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

function acceptedWorkflowResult(result, idField) {
  if (!result || result.state !== 'COMPLETED') return { completed: false, state: result?.state || 'UNKNOWN' };
  const value = result[idField];
  if (typeof value !== 'string' || !value.trim() || result.persisted !== true) return { completed: false, state: 'UNKNOWN' };
  return { completed: true, state: 'COMPLETED', id: value };
}

module.exports = { routeIntent, requireApprovedKnowledge, acceptedWorkflowResult, ALL, SALES, SAFETY, CONTROL };
