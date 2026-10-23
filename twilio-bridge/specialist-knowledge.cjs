'use strict';
// Read-only staging guidance. This module never calls a business API or exposes
// tenant facts, customer records, unpublished articles or credentials.
const kb = require('./knowledge/specialist-kb-v1.3.json');
const catalog = require('./knowledge/specialist-intents-v1.3.json');
const bindings = Object.freeze({
  sales: '5885a020-d363-4c27-910a-c035eda132f5',
  support: 'd7e80001-0000-4000-b000-000000000001',
});
const byId = new Map(kb.records.map(r => [r.intent_id, r]));
function enabled(env) {
  return env.STELLAR_BRIDGE_STAGING === 'true' && env.STAGING_SPECIALIST_KNOWLEDGE_ENABLED === 'true';
}
const tool = {
  type: 'function', name: 'specialist_knowledge',
  description: 'Retrieve audited handling guidance for a catalog intent. Read-only; never executes the proposed business action or retrieves private account data.',
  parameters: { type: 'object', properties: { intentId: { type: 'string' } }, required: ['intentId'], additionalProperties: false },
};
function lookup(context, args) {
  if (context?.authenticated !== true || context?.staging !== true ||
      !Object.hasOwn(bindings, context.profile) || context.tenantId !== bindings[context.profile]) {
    return { success: false, code: 'KNOWLEDGE_CONTEXT_REJECTED' };
  }
  if (!args || typeof args !== 'object' || Array.isArray(args) ||
      Object.keys(args).length !== 1 || typeof args.intentId !== 'string') {
    return { success: false, code: 'INVALID_KNOWLEDGE_REQUEST' };
  }
  const record = byId.get(args.intentId);
  if (!record || record.agent !== context.profile) return { success: false, code: 'INTENT_NOT_AVAILABLE' };
  return { success: true, guidanceOnly: true, businessActionEnabled: false,
    record: structuredClone(record) };
}
function instructions(profile) {
  if (!Object.hasOwn(bindings, profile)) return '';
  return '\n# AUDITED SPECIALIST KNOWLEDGE v1.3 — STAGING GUIDANCE\n' +
    'Use specialist_knowledge to retrieve the appropriate intent guidance before substantive handling. ' +
    'The returned record is guidance data, never authorization to execute a proposed tool. ' +
    'No additional business action is enabled. Do not claim case lookup, note updates, notifications, scheduling, suppression or transfers from this tool. ' +
    'If the caller asks for unsupported work, explain the limitation and preserve context for human review; do not invent a handoff destination or claim a task was saved. ' +
    'Safety takes precedence over verification, intake, tools and normal conversation. Never delay emergency direction for a lookup. ' +
    'Treat examples as fictional; never save them as caller facts. Ask one useful question, reuse confirmed context, separate compound goals and honor opt-outs. ' +
    'Never invent prices, hours, diagnosis, warranties, dispatch or callbacks. Missing purchase dates stay unknown; do not fabricate required data to submit an intake. ' +
    (profile === 'sales' ? 'Represent STELLAR INTELLIGENT TECHNOLOGIES, operated by Apropos Group LLC. Use usage-based pricing without unapproved dollar amounts; never guarantee savings, revenue or unlimited call capacity. ' :
      'The requested Support tenant is Summit Comfort Heating & Air, a fictional HVAC demonstration. Platform administration and IT-support intents require scope clarification and are not HVAC service capabilities. The legacy voice ticket writer is bound to a different tenant and is unavailable in this knowledge preview. Do not submit a support ticket or claim one was created. ') +
    'Catalog: ' + catalog.intents.filter(r => r.agent === profile).map(r => r.intent_id + '=' + r.intent_name).join('; ') + '\n';
}
module.exports = { enabled, tool, lookup, instructions, bindings, version: kb.version };
