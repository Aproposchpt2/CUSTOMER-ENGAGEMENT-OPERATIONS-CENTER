'use strict';

// SUP-001..079 intent ID validation — Support Specialist Expanded Intent Catalog v1.0.
// Used server-side to normalize submit_support_intake.intentId (when present).
// Never used for real-time transcript classification — the LLM classifies caller intent.

const SUP_IDS = new Set([
  // Opening and verification (SUP-001..006)
  'SUP-001','SUP-002','SUP-003','SUP-004','SUP-005','SUP-006',
  // Issue intake (SUP-007..015)
  'SUP-007','SUP-008','SUP-009','SUP-010','SUP-011',
  'SUP-012','SUP-013','SUP-014','SUP-015',
  // General information (SUP-016..022)
  'SUP-016','SUP-017','SUP-018','SUP-019','SUP-020',
  'SUP-021','SUP-022',
  // Access and identity (SUP-023..029)
  'SUP-023','SUP-024','SUP-025','SUP-026','SUP-027',
  'SUP-028','SUP-029',
  // Configuration and MACD (SUP-030..038)
  'SUP-030','SUP-031','SUP-032','SUP-033','SUP-034',
  'SUP-035','SUP-036','SUP-037','SUP-038',
  // Troubleshooting (SUP-039..048)
  'SUP-039','SUP-040','SUP-041','SUP-042','SUP-043',
  'SUP-044','SUP-045','SUP-046','SUP-047','SUP-048',
  // Case workflow (SUP-049..057)
  'SUP-049','SUP-050','SUP-051','SUP-052','SUP-053',
  'SUP-054','SUP-055','SUP-056','SUP-057',
  // Billing and account (SUP-058..064)
  'SUP-058','SUP-059','SUP-060','SUP-061','SUP-062',
  'SUP-063','SUP-064',
  // Incident and escalation (SUP-065..072)
  'SUP-065','SUP-066','SUP-067','SUP-068','SUP-069',
  'SUP-070','SUP-071','SUP-072',
  // Communication and closure (SUP-073..079)
  'SUP-073','SUP-074','SUP-075','SUP-076','SUP-077',
  'SUP-078','SUP-079',
]);

// Returns normalized uppercase ID if valid, null if absent/empty, 'UNKNOWN' if unrecognized.
// A bad intentId never blocks the ticket save — it is stripped and logged.
function validateSupportIntentId(id) {
  if (id === undefined || id === null || id === '') return null;
  const upper = String(id).toUpperCase().trim();
  return SUP_IDS.has(upper) ? upper : 'UNKNOWN';
}

module.exports = { validateSupportIntentId, SUP_IDS };
