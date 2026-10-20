# STELLAR INTELLIGENT TECHNOLOGIES — G06 acceptance and interruption recovery
Operated by Apropos Group LLC

October 20, 2026. Isolated staging only. Production NO-GO. PR77 remains unmerged; no deployment or approved-agent change was performed.

## Outcome
**Observed integrity checks PASS; full G06 evidence acceptance remains INCOMPLETE.** The preserved evidence labels this PASS_WITH_EVIDENCE_LIMITATION. This is not an unconditional full-gate PASS: the browser coordinator did not export the raw HTTP customerId/notification fields.

Recovered committed evidence: [SQL and browser record](evidence/stellar-g06-browser-acceptance-2026-10-20.json), commit 9c661c441c3f6f54d5932a0d87b0006302a8c69c. No completed test was repeated on resume.

## Actual execution
- Verified protected preview application commit ec9f9a0edf3cf9f73a72dd193641b21d33abe7c4, deploy6ad747abc3fe26d78bc9f2b6, ready. Existing application login used; no Auth account/membership created.
- Existing authorized postgres testing role; database TLS=true. No grants, policies, RLS, constraints, triggers, function definitions or credentials changed.
- Prepared capability and saved sanitized manifest; never clicked Submit.
- At16:51:23.626671Z committed exactly one fictional case/contact through approved test-only RPC and one intentionally mismatched COMPLETED workflow, with no outbox event.
- Fresh independent connection at16:51:33.948164Z confirmed persisted fixture.
- Two actual protected browser STATUS requests displayed PENDING/state UNKNOWN. Deployed recover() only records that result after HTTP202, false/falsy success and absent/falsy caseId checks succeed. No confirmed case/contact ID appeared in the visible evidence.
- Independent service_role lookup at16:51:53.287941Z raised COMPLETED_ASSOCIATION_INVALID, captured in a rollback-only exception block. This SQL error was not returned verbatim by the HTTP route.
- Fresh independent SQL at16:52:00.939065Z confirmed fixture state/version/case/contact fingerprints unchanged and zero events.
- Exact guarded workflow→case→contact cleanup committed, observed16:53:01.948604Z. Each DELETE required exactly one row; no unrelated references allowed.
- Independent six-table baseline and full security snapshot matched originals. Browser reloaded to discard capability. No pending request or synthetic fixture remained.

## Fixture identifiers
| Item | Value |
|---|---|
| Tenant | 5885a020-d363-4c27-910a-c035eda132f5 |
| Workflow | d0f60a38-f082-4e73-8793-c4be3b5a907e |
| Operation | gateway:cff7fb00-add3-4fd1-8324-27c6dee5049f |
| Original session | phone-staging:CAaf4db9fd72404d28ac4c3b128173fb7a |
| Different case session | phone-staging:CAd0f60a38f0824e738793c4be3b5a907e |
| Synthetic case | 84d4ac3e-48d7-4965-baba-d591fe5a0756 |
| Synthetic contact | 3cdfcc6f-454d-48d9-9b56-81cda4c0c3aa |

## Results
| Assertion | Actual result |
|---|---|
| Committed invalid association constructed within approved scope | PASS |
| Real protected STATUS twice refuses ticket confirmation | PASS — UNKNOWN twice |
| Authoritative SQL association check | PASS — COMPLETED_ASSOCIATION_INVALID |
| No extra ticket or completion event | PASS |
| Fixture records unchanged by status checks | PASS |
| Exact cleanup and original fingerprints restored | PASS |
| RLS/ACL/policy/function-definition preservation | PASS — security snapshots identical |
| Raw HTTP customerId absent and notification flags false | NOT INDEPENDENTLY CAPTURED — UI does not export these fields |
| Full G06 acceptance | INCOMPLETE pending that evidence gap |

The UI hardcodes databaseVerified=false, cleanupVerified=false and a historical pending checklist. Those labels do not incorporate independent SQL verification; the evidence file provides that verification. Do not treat them as live suite totals.

## Original and final counts
| Table | Before | During fixture | Final |
|---|---:|---:|---:|
| Support cases | 20 | 21 | 20 |
| Contacts | 13 | 14 | 13 |
| Workflows | 0 | 1 | 0 |
| Outbox events | 0 | 0 | 0 |
| Dispatcher receipts | 0 | 0 | 0 |
| Dispatcher effects | 0 | 0 | 0 |

Original/final case fingerprint ddeb4729999cd8a90965ab2197b4355c; contacts a67f355fc8bc1a3e258ab772b308c485; empty tables d41d8cd98f00b204e9800998ecf8427e.
Fixture workflow fingerprint bd29758d80a8d0ee18898b7d5dc6f682; case75fd36c57320c11a2809d7a468daabe3; contact73ee663be9d1a43ee6d14b46e388f0d9 were unchanged before cleanup.
Evidence JSON contains executed SQL, actual database responses, browser snapshot and full before/after security snapshots. No secret values or capability exported.

## Resume point and next engineering gate
1. Do not rerun completed SQL/browser checks without a specific need. Do not recreate the cleaned fixture blindly.
2. Review/prepare sanitized HTTP evidence capture that asserts absent customerId and false notification/followup flags, recording status/timestamps without tokens. Source reviewed behavior alone is not execution evidence. Any new fixture/deployment must remain within existing scope and deployment restrictions.
3. Archive and independently review Run14 artifact12280931998 before October27; detailed archive remained blocked by unavailable local execution environment.
4. Complete internal pooler-to-database TLS review, remaining voice/integration/security/performance gates before production.
No functional integrity defect found in executed G06 checks; remaining defect is test evidence completeness. GO for isolated evidence-review/preparation only; NO-GO for full G06 sign-off or production. Preserve approved Support Specialist.
