**HISTORICAL CHECKPOINT — superseded by `docs/specialist-staging/FLY-HANDOFF.md`. Preserve this report as prior evidence; its readiness counts are not current.**

# Sales and Support expansion — continuity checkpoint

2026-10-25. STAGING ONLY. This is a progress checkpoint, not final Fly.io acceptance.

## Scope
Continue Sales Specialist Echo and Support Specialist Cedar KB/intent expansion. PMA is a separate product project; no PMA implementation, routing, database or production change is included.

## Independently verified hosted staging state
Project `hvzauakkhlivzeqatfqm`.

| Item | Readback |
| --- | --- |
| Sales intents | 100 |
| Support intents | 150 |
| Universal/control/safety | 16 / 9 / 8 |
| Full source definition parity | 283 / 283, zero mismatches |
| Intent execution enabled | 0 |
| Implementation status | 273 CATALOG_ONLY, 8 DETERMINISTIC_SAFETY, 2 STAGING_GATED_WRITE |
| Sales category knowledge | 63 records, 0 caller-eligible |
| Summit knowledge | 45 records, 0 caller-eligible |
| Active package versions | 0 |
| Hosted existing SQL QA | PASS |

Eligibility readback enforced approved/public/public/published/VERIFIED and all effective/expiry windows. SQL QA also verified 148 draft candidates, 39 Sales source sections, 7 platform Support sections, package guards and service-role-only grants. Source catalog comparison matched stable references, symbols, groups and every canonicalized definition. No claim of 283 executable workflows is made.

## Readiness defect repaired
The prior online gate selected only `id` and accepted the first matching row without checking its content or effective/expiration windows. The revised gate:
- accepts only the exact designated staging URL;
- retrieves policy fields and uses the runtime eligibility policy;
- rechecks tenant and Sales category, nonempty content, source and dates;
- pages through rows with deterministic ordering;
- reports exact qualifying UUIDs;
- explicitly labels its result as presence only, not complete intent coverage.

Four focused tests PASS: foreign environment rejection before network access; expired/future/private/foreign/wrong-category rejection; pagination with exact UUID evidence; failed/malformed HTTP response rejection. Two unchanged PMA emergency regression tests PASS. Offline source inventory PASS; syntax and whitespace checks PASS. Complete application/build, combined #142/#143 reconciliation and live Fly acceptance were not rerun or claimed.

## Content blockers requiring authoritative decisions
The 148 candidates contain generic template answers. They must not be promoted as finished product knowledge. `approvedVoiceAnswer` is a field name, not approval evidence.

Sales historical KB v1.1 contains a $1,200/month response and old branding; candidate metadata instead delegates pricing to prompt v1.15. Current commercial authority must be reconciled before publication. Internal prompts, lead-capture instructions and architecture must remain internal even if approved for staff use.

Seven recovered Support sections describe the STELLAR platform, not Summit HVAC policies. Summit service area, hours, diagnostic boundaries, pricing/warranty and response commitments require tenant-authoritative content; they cannot be inferred from platform documentation.

Existing review inventory: `STAGING-SPECIALIST-OWNER-APPROVAL-QUEUE-20261025.json`. Its 115 rows are a review queue, not a blanket publication manifest; internal instructions require exclusion from caller publication.

## Next checkpoint
Obtain/reconcile authoritative caller-answer content and documented approvals; retain unsupported topics as unavailable with truthful follow-up. Publish only selected approved staging knowledge, bind intent coverage to record IDs, then run hosted positive/negative retrieval and transaction acceptance. The Fly engineer owns Fly runtime/deployment, session wiring and telephone acceptance. Final completion handoff remains pending. No deployment or caller publication occurred in this continuity pass.
