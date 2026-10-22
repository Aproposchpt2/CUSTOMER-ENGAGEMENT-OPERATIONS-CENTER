'use strict';

// SLS-001..025 intent ID validation.
// Used server-side to normalize submit_business_profile.intentId.
// Never used for real-time transcript classification — the LLM classifies caller intent.

const SLS_IDS = new Set([
  'SLS-001','SLS-002','SLS-003','SLS-004','SLS-005','SLS-006','SLS-007','SLS-008',
  'SLS-009','SLS-010','SLS-011','SLS-012','SLS-013','SLS-014','SLS-015','SLS-016',
  'SLS-017','SLS-018','SLS-019','SLS-020','SLS-021','SLS-022','SLS-023','SLS-024','SLS-025',
]);

// Returns normalized uppercase ID if valid, null if absent/empty, 'UNKNOWN' if unrecognized.
// A bad intentId never blocks the lead save — it is stripped and logged.
function validateIntentId(id) {
  if (id === undefined || id === null || id === '') return null;
  const upper = String(id).toUpperCase().trim();
  return SLS_IDS.has(upper) ? upper : 'UNKNOWN';
}

module.exports = { validateIntentId, SLS_IDS };
