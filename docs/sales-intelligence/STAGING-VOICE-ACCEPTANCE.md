# Sales staging voice tool activation — controlled testing only

Changes introduced by PR #95:
- `search_approved_sales_knowledge` is available only when the bridge runs in explicit staging mode AND `STELLAR_SALES_KB_READ_ENABLED=true`; the retriever independently requires this flag and `SUPABASE_URL` plus `SUPABASE_SERVICE_ROLE_KEY` on the server. The agent cannot supply the tenant ID. The server derives `CSS_TENANT_ID`. The query and returned rows must both satisfy tenant, owner-approval, published, verified, and public-audience conditions. Staged 24 Sales drafts are rejected.
- `assess_sales_intent` is available only when the bridge runs in explicit staging mode AND `STELLAR_SALES_INTENT_ASSESSMENT_ENABLED=true`. It validates the OpenAI reasoning model's candidate reference ID and numeric confidence against the canonical catalog. **It does not autonomously detect an intent or authorize any business transaction.** Never claim that it does.
- This branch has **not** been deployed. Do not enable either flag on the working line or production until separately authorized and independently tested.

## Required acceptance evidence
1. Verify running Fly.io bridge, deployed source commit, actual selected OpenAI models, relevant environment, and staging isolation.
2. Run `node --test tests/salesOrchestration.test.cjs tests/salesKnowledgeRetrieval.test.cjs tests/salesProductLineIndex.test.cjs tests/salesIntentKnowledgeMap.test.cjs tests/salesVoiceIntentWiring.test.cjs` in checked-out branch; attach output. No test pass claimed in this document.
3. Explicitly deny cross-tenant, draft, staff-only, proposed, expired knowledge. Confirm empty retrieval on all 24 staged drafts.
4. Show OpenAI function call to `assess_sales_intent`, valid `SLS-001..025` results, low confidence clarification, and separate backend transaction authorization.
5. Run sample utterances from master intent matrix; document true classifier performance, false-positive rate, confusion cases and conversation continuity.
6. Verify source-based coverage of all five portfolio options, 23 full KB sections, FAQ and objections. This branch's index is not the approved caller-facing corpus.
7. Prove verified lead persistence and a safe UNKNOWN/retry reconciliation before claiming transaction readiness.
8. Safety precedence remains in existing safety scanner; do not substitute model-reported intent IDs for deterministic safety alerts.

## Outstanding blockers
Complete verified and owner-approved STELLAR product-line material, publish process, per-tenant RLS validation, durable lead adapter, automated classification confidence calibration, robust orchestration state and actual staging voice UAT.
