'use strict';

// SAL-001..081 intent ID validation — Sales Specialist Expanded Intent Catalog v1.0.
// Used server-side to normalize submit_business_profile.intentId.
// Never used for real-time transcript classification — the LLM classifies caller intent.
// Legacy SLS-001..025 IDs accepted during transition (treated as valid, not UNKNOWN).

const SAL_IDS = new Set([
  // Opening and consent (SAL-001..005)
  'SAL-001','SAL-002','SAL-003','SAL-004','SAL-005',
  // Business discovery (SAL-006..015)
  'SAL-006','SAL-007','SAL-008','SAL-009','SAL-010',
  'SAL-011','SAL-012','SAL-013','SAL-014','SAL-015',
  // Pain and impact (SAL-016..023)
  'SAL-016','SAL-017','SAL-018','SAL-019','SAL-020',
  'SAL-021','SAL-022','SAL-023',
  // Qualification (SAL-024..031)
  'SAL-024','SAL-025','SAL-026','SAL-027','SAL-028',
  'SAL-029','SAL-030','SAL-031',
  // Solution mapping (SAL-032..040)
  'SAL-032','SAL-033','SAL-034','SAL-035','SAL-036',
  'SAL-037','SAL-038','SAL-039','SAL-040',
  // Pricing and value (SAL-041..048)
  'SAL-041','SAL-042','SAL-043','SAL-044','SAL-045',
  'SAL-046','SAL-047','SAL-048',
  // Objections (SAL-049..058)
  'SAL-049','SAL-050','SAL-051','SAL-052','SAL-053',
  'SAL-054','SAL-055','SAL-056','SAL-057','SAL-058',
  // Demo and proof (SAL-059..065)
  'SAL-059','SAL-060','SAL-061','SAL-062','SAL-063',
  'SAL-064','SAL-065',
  // Next actions (SAL-066..073)
  'SAL-066','SAL-067','SAL-068','SAL-069','SAL-070',
  'SAL-071','SAL-072','SAL-073',
  // Compliance and boundaries (SAL-074..081)
  'SAL-074','SAL-075','SAL-076','SAL-077','SAL-078',
  'SAL-079','SAL-080','SAL-081',
]);

// Legacy SLS IDs — accepted during transition, not returned as UNKNOWN.
const SLS_LEGACY = new Set([
  'SLS-001','SLS-002','SLS-003','SLS-004','SLS-005','SLS-006','SLS-007','SLS-008',
  'SLS-009','SLS-010','SLS-011','SLS-012','SLS-013','SLS-014','SLS-015','SLS-016',
  'SLS-017','SLS-018','SLS-019','SLS-020','SLS-021','SLS-022','SLS-023','SLS-024','SLS-025',
]);

// Returns normalized uppercase ID if valid, null if absent/empty, 'UNKNOWN' if unrecognized.
// A bad intentId never blocks the lead save — it is stripped and logged.
function validateIntentId(id) {
  if (id === undefined || id === null || id === '') return null;
  const upper = String(id).toUpperCase().trim();
  if (SAL_IDS.has(upper) || SLS_LEGACY.has(upper)) return upper;
  return 'UNKNOWN';
}

module.exports = { validateIntentId, SAL_IDS, SLS_IDS: SLS_LEGACY };
