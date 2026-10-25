# Sales + Support staging readiness — independent audit (2026-10-24)

Scope: `Aproposchpt2/CUSTOMER-ENGAGEMENT-OPERATIONS-CENTER`. **Read-only findings**, no production or voice routing authorization. This audit branch is based on `main`; it intentionally does not merge Ruflo's parallel development branches.

## Verified as of audit

- `twilio-bridge/stellar-kb-v1.json`: version 1.0, STAGING_CANDIDATE, **148 records** (75 Sales, 73 Support), source described as `STELLAR_Combined_Sales_and_Support_KB_Population_FINAL_v1.2.docx`.
- `twilio-bridge/voice-agent-catalog.json`: version 2.0, STAGING_CANDIDATE, **283 intent definitions** (100 sales, 150 support, 16 universal, 9 conversation_control, 8 safety).
- `twilio-bridge/server.js` on `main` imports both assets, but the identified use of these variables is in `/health` for versions/counts. Import alone **does not prove classification, retrieval, tool dispatch, or model instructions**.
- Main `twilio-bridge/server.js` has a generic STELLAR Support greeting; do not assume approved Summit Comfort greeting and Cedar voice are active in that build.
- `feature/summit-support-intelligence-staging-20261023` includes a separate tenant-locked pure projection `twilio-bridge/support-intelligence.cjs`, supplementary declarative Support intents, tests, and an installation gate. Its own gate reports no live runtime activation and an unverified Support-exclusive Fly app.
- `feature/stellar-sales-intelligence-foundation-20261022` includes Sales candidate assessment and tenant KB retrieval behind staging environment flags; its acceptance doc explicitly says that is not autonomous intent classification or verified execution.
- Staging Supabase project `hvzauakkhlivzeqatfqm`: main tenant `5885a020-d363-4c27-910a-c035eda132f5` has 212 KB records, 158 approved and 46 meeting basic approved/public/published criteria; Summit Comfort `d7e80001-0000-4000-b000-000000000001` has 45 KB records, 4 approved, **0** meeting the basic caller-eligible filter.
- The staging database record count does not prove that any KB row is reachable by the currently deployed voice bridge. The basic caller-eligible filter is necessary, not a full source-status, effective-date or auth check.

## Blocking gates before a staging call

1. **Runtime provenance:** determine actual Fly app and running commit SHA for Sales and Support and their correct Twilio route; check app separation before modifying any release. `twilio-bridge/fly.toml` targets `stellar-twilio-bridge`, historically shared.
2. **Tenant scope:** authenticate the route-bound server tenant at session creation and on every retrieval/transaction; Summit Comfort must resolve `d7e80001-0000-4000-b000-000000000001`, and Sales must use its own explicitly authorized tenant.
3. **Model integration:** inspect the running agent instructions and tool list to demonstrate use of complete 148-record KB (bounded retrieval, not bulk context injection) and 283-intent taxonomy; distinguish a label match from actionable tool dispatch.
4. **Support knowledge approval:** inspect the four approved Summit Comfort entries for public visibility and source safety; require individual source review of full Co-Pilot/recovered content. Never flip bulk approvals or bypass audience gate.
5. **Persistence:** require actual test-only Sales lead and Support case with DB reference, idempotent session identity, and rejection of cross-tenant access. No claims based on synthetic staging IDs.
6. **Voice QA:** verify exact owner-approved Cedar Summit greeting, Echo Sales greeting, safety escalation, recovery from interruptions, unknown question, price objection, consent, and failed transaction.
7. **Release gate:** obtain separate owner authorization before any Fly release, real Twilio webhook update, production merge or notification activation.

## Work-agent execution assignment

Use Work mode with connected GitHub, Fly.io dashboard/browser, Twilio and staging Supabase. First report repo and running deployment SHAs, app names, backend URLs, and DID-to-Fly routing without revealing secrets. Compare `main`, `feature/summit-support-intelligence-staging-20261023`, `feature/stellar-sales-intelligence-foundation-20261022`, and `docs/hvac-kb-recovery-001-20261022` for overlaps and divergent commits. Inspect recent main commits and checks.

Run source-level unit tests on an isolated checkout. Build an evidence matrix separating PASS, FAIL, NOT RUN, and BLOCKED. Correct defects only on isolated feature branches and open draft PRs. Do not merge, deploy, change live IVR, or make tenant KB public without separate owner authorization. Inspect env var **names** but never print secret values. Distinguish genuine live runtime capabilities from JSON file inventories. Return exact test commands/results, commits/PR links, Fly app identity, and owner-facing staged-call scripts.
