# Verified staging source integration evidence

October 25, 2026. Supabase project hvzauakkhlivzeqatfqm.

- Import reconstruction: all 148 previously stored voice answers unchanged, 12 missing original records restored, 90 complete expansion article payloads retained.
- Hosted source registry: 655 rows imported with exact JSON equality asserted in every batch.
- Independent committed-table readback: 655/655 exact JSON records, across 66 separate read batches, PASS.
- SQL source-integration QA: PASS. Coverage counts, 32-field preservation, 630 test specifications, draft-only constraints, null/wrong tenant rejection, RLS and role grants checked.
- Actual service_role RPC calls: Sales SAL-082 returned one source row; platform Support SUP-080 returned one source row; Summit GAS_LEAK returned one intent row; Summit request for platform SUP-080 returned zero.
- All 44 original HVAC source rows: content MD5 readback unchanged, 44/44.
- Node source/readiness tests: 10/10 PASS.
- Application suite: 304/304 PASS.
- Bridge suite with first seven source/readiness tests: 69/69 PASS. Three additional source-integrity tests then passed separately.
- Source expansion tests: 630 specifications only, NOT_EXECUTED. No spoken or tool-backed acceptance implied.
- Security advisors: new source table has the expected INFO for RLS enabled without user policies. Deliberate service-role-only design; no anon/authenticated grants. This is not a project-wide security clearance.
- No caller knowledge publication, runtime activation, notification, Fly deployment, PMA change or production modification.

Reproducible checks: node --test twilio-bridge/knowledge/*.test.cjs; npm test; sql/source-qa.sql. Source rebuild and seed instructions are in CONTINUITY.md.

## Caller v2 completion

269 published staging-only caller articles, separate from the legacy KB. All 269 UUID/content checks and independent content hashes pass. Negative eligibility and scope SQL tests pass. Synthetic Sales lead and Summit case persisted, independently read back and deduplicated; exact IDs are in FLY-HANDOFF.md. No notifications.

Reconciled PR #142/#143 and #146 candidate: application 311/311 PASS; bridge/source 80/80 PASS; isolated PostgreSQL regression PASS; root production dependency audit zero advisories. Source-derived content is not a production approval or natural-language test-passage claim.

The initial optimized build reached static generation but encountered an ENOTEMPTY generated-output cleanup error. Its generated directory was preserved separately before a clean retry; final retry result is recorded in the final CI.

Final local optimized build and TypeScript validation: PASS from an identical source copy on the local temporary filesystem. The workspace filesystem produced repeatable generated-output cleanup errors; no application code was changed to bypass build validation. Isolated PostgreSQL regression also PASS. Final exact-revision CI is required before Fly release.
