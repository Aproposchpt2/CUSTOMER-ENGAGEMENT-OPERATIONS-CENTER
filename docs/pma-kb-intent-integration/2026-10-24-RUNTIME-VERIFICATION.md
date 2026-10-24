# PMA KB and intent runtime: evidence and release checklist (2026-10-24)

Status: **SOURCE PATH EXISTS — LIVE REVISION AND END-TO-END ACCEPTANCE NOT VERIFIED**. This document is an evidence-based audit, **not** an activation or deployment.

## Environment
- Staging admin: https://admin-staging.stellaruc.com/
- App: `pma-validation` Netlify staging branch
- Database: `hvzauakkhlivzeqatfqm` (STELLAR staging)
- Fly bridge configuration: `twilio-bridge/fly.pma-staging.toml`
- Working 25-intent PMA source: `twilio-bridge/pma-intent-catalog-v1.json`, classifier `twilio-bridge/pma-intents.cjs`, tool schema `twilio-bridge/pma-profile.json`.
- Separately uploaded enterprise catalog `twilio-bridge/voice-agent-catalog.json`: version 2.0 / status STAGING_CANDIDATE / universal, conversation_control, sales, support, safety; **does not contain PMA intents**. Do not replace the working PMA-specific catalog with this file.

## Verified source wiring (pma-validation branch, inspected 2026-10-24)
1. `pages/api/intake/voice-demo-staging.ts` resolves PMA public knowledge with `pm_public_voice_knowledge_v1`, supplying configured tenant and property. This is a **read-only property-scoped RPC**. Other specialist routes use their own agent-tagged queries.
2. `lib/voiceDemo/gateway.cjs` on `stream_start` validates trusted session/route, filters approved, published, public, VERIFIED, effective/unexpired records, sends up to 64 PMA records as `assets.knowledgeEntries`; it attaches the PMA 25-intent catalog as `assets.intents`.
3. `twilio-bridge/voice-entry.cjs` sends signed `stream_start`, and `boundInstructions()` injects the resulting approved knowledge JSON plus intent catalog into the live session instructions. This is **preloaded retrieval at session start**, not dynamic per-question search.
4. `twilio-bridge/server.js` awaits `voiceEntry.openSession(session)`, constructs the PMA-specific instructions and tools, binds assets, then starts the OpenAI session. `twilio-bridge/pma-adapter.cjs` provides `pma_property_workflow` and `pma_check_availability`, with signed staging API calls and response-state validation.
5. Emergency repair PR #116 merged into `pma-validation`; it normalizes five safety categories at dispatch while preserving caller/session/property checks. This repair does **not** certify the full KB or ordinary 25-intent action coverage.

## Database evidence (read-only)
- Table `public.ai4cc_knowledge_entries`: 257 total records.
- Publication/approval: 162 approved + published, 65 unapproved drafts, 30 published but unapproved.
- Scope/visibility: 42 records are property-scoped, public, approved and published. Other property records are staff-only/resident-only and must **not** be surfaced to unauthenticated calls.
- These counts alone do **not** demonstrate all 42 satisfy `source_status='VERIFIED'`, effective/expiration windows, runtime RPC filtering, or actual session delivery.
- No database records, permissions, deployment settings, or phone numbers changed in this audit.

## Remaining release gates
1. Identify the revised KB records by IDs/versions/source timestamps, compare with the current RPC's returned rows under the configured staging tenant/property. Verify `source_status='VERIFIED'`, `publication_state='published'`, `approved=true`, public audience, validity windows, and no private disclosures. Never mass-publish drafts to make content visible.
2. Reconcile the new reference KB/intent uploads with the operative PMA 25-intent table. Produce a 25-row matrix: intent, trigger, KB source, runtime tool, read/write authorization, expected result, fallback, integration test. No inference from presence in a JSON file.
3. Prove live Netlify gateway revision and Fly image SHA match audited code and share the same HMAC staging configuration. A GitHub merge is not deployment evidence.
4. Execute isolated `stream_start` fixture tests for published public KB entry inclusion; drafts, unverified, expired, staff-only, resident-only, unit-private and cross-property exclusion. Confirm no prompt injection can modify tool authority.
5. Execute isolated classifier -> tool -> signed gateway -> authorized RPC tests for all 25 intents. For writes, verify trusted operation IDs, session/tenant/property binding, consent, idempotency, persistence confirmation, and safe failure. Keep SMS/Twilio credentials and sensitive results out of logs.
6. Re-run IVR/Sales/Support regressions; perform supervised staging calls for public policies, exact availability, maintenance, safety, unsupported privileged requests and no-match. Validate transcript/dispatch receipt correlation before GO.
7. Promote only after independent review and explicit staging release approval. Do not merge to main or change production.

## Conclusion
The statement 'KB and intents are only internal reference records and have no orchestration wiring' is **not true of the inspected source**: a session-start binding path exists. The unresolved issues are **content eligibility/version reconciliation, deployment provenance, 25-intent execution coverage, and telephone acceptance**. Do not call the integration complete until those gates pass.
