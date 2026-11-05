# STELLAR — SALES/SUPPORT HANDOFF TO FLY.IO LEAD ENGINEER
**Date:** 2026-10-25  | **Classification:** STAGING ONLY / P0 / NOT RELEASE AUTHORIZED
**Owner:** STELLAR INTELLIGENT TECHNOLOGIES, operated by Apropos Group LLC
**Release assessment:** **NO GO** for specialist knowledge activation or telephone acceptance.

## 1. Source revision and integration precedence
Repository: `Aproposchpt2/CUSTOMER-ENGAGEMENT-OPERATIONS-CENTER`.
- Joint integration: `integration/ss-pma-joint-20261025` @ `acf62316945a95cf1f08ae4b3171f6a9c638bc9f`, PR #140 (includes prior PMA #136, specialist #129, Sales category #139).
- PMA Fly image/dependency fix: `repair/pma-fly-validation-security-20261025` @ `5981378faedbadb7d4257b4f7d604ba99dd6666e`, PR #142.
- Staging startup isolation: `repair/fly-staging-runtime-guards-20261025` @ `d8f68a495bd9dc3164edb02244d4878306f657cc`, PR #143 (stacked on #142).
- KB recovery and audit artifacts: `repair/specialist-knowledge-readiness`, PR #144. This branch starts from joint integration and is **not merged with #142/#143**. Inspect latest PR HEAD for exact handoff revision.
- PR #142/#143 and PR #144 diverge from the common integration commit. **Do not deploy either branch as the combined candidate.** Incorporate #142, then #143, then #144 onto a new reviewed integration candidate; preserve PMA emergency, IVR, Sales-only KB isolation and both Dockerfiles. No merge or deploy without owner authorization.
PRs: https://github.com/Aproposchpt2/CUSTOMER-ENGAGEMENT-OPERATIONS-CENTER/pull/140 ; /pull/142 ; /pull/143 ; /pull/144

## 2. Knowledge packages and complete paths
**Sales**
- Authoritative historical source: `docs/sales/SALES-KNOWLEDGE-BASE-V1.md`, version 1.1, 43 numbered sections (some commercial terms/branding outdated). Supporting voice prompt: `docs/sales/SALES-AGENT-PROMPT-V1.md`, version 1.15.
- Recovered source package: `twilio-bridge/knowledge/specialist-source-recovery-20261025.json`, version 1.0, 39 substantive Sales sections marked DRAFT/REVIEW_REQUIRED. Excludes sections 1, 35, 36, 43 from the recovery set pending reconciliation; original remains intact.
- Combined candidate: `twilio-bridge/stellar-kb-v1.json`, version 1.0, provenance `STELLAR_Combined_Sales_and_Support_KB_Population_FINAL_v1.2.docx`; 75 Sales candidate records `SAL-001..SAL-075`. Lifecycle `DRAFT-STAGING-CANDIDATE`; generic draft answers are not approved for callers.
- Actual Sales staging KB: 24 `sales_*` records (7+5+4+3+3+2 by category/source status), **all visibility=staff**. No Sales row passes the current caller-public retrieval policy. Exact UUIDs, titles, status, date fields: `docs/fly-lead/SALES-SUPPORT-STAGING-KB-RECORD-INVENTORY-20261025.json`.
- Missing: reconciled current product/commercial facts, review decisions, 100-intent topic mapping, publication, effective package version in DB, and live retrieval readback.

**Support**
- Source: `docs/STELLAR_UC_CSS_MASTER_CONTINUITY_2026-10-15.md` (platform/transactional specification; not Summit's authorized HVAC knowledge); 7 sections recovered in source package. Do not treat STELLAR platform policy as Summit tenant facts.
- Combined candidate: `twilio-bridge/stellar-kb-v1.json`, 73 Support candidate records `SUP-001..SUP-073`, DRAFT-STAGING-CANDIDATE.
- Summit HVAC support catalog: `twilio-bridge/support-intent-catalog-v1.json`, version 1.0.0, 19 legacy/support-safety examples; this is **not** the full 150-intent catalog.
- Actual Summit staging KB: 45 rows; 4 approved/published but visibility=staff (2 VERIFIED safety, 2 DEMO service), plus 41 staff-only UNKNOWN drafts. **Zero caller-public eligible rows.** Exact IDs/topics: staging inventory JSON above.
- Missing: tenant-specific reviewed HVAC FAQs, service area, hours, supported diagnostic boundaries, ticket process and emergency rules; record-by-record approval, caller-public publication, actual live retrieval.
- No recovered source entry has been activated or published. No effective/expiration timestamps are set on the 24 Sales records inspected; null date fields are allowed but never override approval, visibility, publication and source-status gates. No active package-version registry was verified.

## 3. Staging database and retrieval contract
Supabase staging project `hvzauakkhlivzeqatfqm`; URL `https://hvzauakkhlivzeqatfqm.supabase.co`.
Sales tenant `5885a020-d363-4c27-910a-c035eda132f5`; Summit Support tenant `d7e80001-0000-4000-b000-000000000001`. **No binding change proposed.**
- Knowledge: `public.ai4cc_knowledge_entries` via `GET /rest/v1/ai4cc_knowledge_entries`. Fields selected: `id,tenant_id,title,content,category,approved,visibility,audience_scope,publication_state,source_status,effective_at,expires_at,valid_until`. Exact tenant, approved=true, visibility=public, audience_scope=public, publication_state=published, bounded title/content search and limit=5. Sales additionally requires `category=like.sales_*`. Response-side policy requires source_status=VERIFIED, nonempty content, effective_at<=now if set, expires_at>now and valid_until>now if set. Legacy Support helper also allows DEMO but still requires public visibility; that policy difference must be reviewed before release.
- Source implementation: `twilio-bridge/specialist-staging.cjs`, `twilio-bridge/staging-knowledge-policy.cjs`, `twilio-bridge/support-intelligence.cjs`. No cross-tenant fallback. Draft JSON only supplies candidate lineage.
- Support write: `POST /rest/v1/rpc/stellar_create_hvac_demo_support_intake` (confirmed existing SECURITY INVOKER RPC) with `p_tenant_id,p_session_id,p_name,p_email,p_phone,p_product,p_purchase_date,p_issue,p_steps,p_impact,p_priority`; readback `GET /rest/v1/stellar_support_cases` filtered by tenant, `intake_session_id`, test_only=true. Linked contacts: `public.ai4cc_contacts`.
- Sales write: existing signed voice-entry `salesSubmit`/synthetic gateway; readback `GET /rest/v1/ai4cc_leads` filtered by tenant, `metadata.voice_demo_session_id` and synthetic=true; require notificationsDisabled=true and matching persisted lead ID. Do not invent an unverified direct Sales RPC.
- PMA KB remains independent: `pm_public_voice_knowledge_v1` and PMA domain authorization. Never substitute PMA's 42 public articles for Sales/Summit.
- **Read-only hosted evidence:** Sales 24 rows, zero caller-eligible; Summit 45 rows, zero caller-eligible. No loaded IDs from PR #144; package not imported. Current active Sales/Support caller KB package version: **NONE VERIFIED**.
- Current staging readiness script `twilio-bridge/knowledge/check-specialist-readiness.cjs` is a **presence gate**, not full completeness proof. It requires further validation of effective/expiry and per-intent coverage before release.

## 4. Complete intent-to-workflow matrix
**Authoritative machine-readable, all 283 entries:** `docs/fly-lead/SALES-SUPPORT-283-INTENT-IMPLEMENTATION-MATRIX-20261025.json`.
- `twilio-bridge/voice-agent-catalog-expanded.json` version 2.0: 100 Sales (`SAL-001..SAL-100`), 150 Support (`SUP-001..SUP-150`), 16 universal (`UNI-001..UNI-016`), 9 conversation-control (`CTL-001..CTL-009`), 8 safety (`SAFE-001..SAFE-008`).
- Each matrix entry records stable reference, symbol, category, definition, recognition trigger, required KB scope, source-suggested operation, **actual runtime binding**, required inputs, authorization, confirmation, success/failure/unavailable/UNKNOWN and implementation status.
- Most expanded catalog entries have **no actual caller example phrase in source**; the matrix marks examples `NOT_SUPPLIED_IN_EXPANDED_CATALOG`, not fabricated. Existing 19-entry Support catalog contains separate example phrases but has not been proved 1:1 equivalent to all 150.
- Only `SAL-033` (`SAL_LEAD_CAPTURE`) and `SUP-049` (`SUP_CREATE_TICKET`) have verified specialist write bindings in the current orchestrator. 8 safety overrides are deterministic. Remaining 273 entries are **classification/knowledge/clarification only** absent independently verified specialized tool dispatch. A catalog listing is not proof of 283 implemented workflows.
- `assess_specialist_intent` requires confidence>=0.90 for CLASSIFIED, but returns mayExecute=false; lower/invalid => CLARIFY. `search_specialist_knowledge` is read-only. Neither grants write permission. Safety overrides supersede routine workflow.

## 5. Agent configuration, prompts, tools, sessions and secrets
- Sales voice `echo`; greeting: `You have reached the Sales Department at Stellar Intelligent Technologies. How can I help you?`.
- Support voice `cedar`; greeting: `You have reached Summit Comfort Heating & Air. How can I help you?`.
- Source prompt `twilio-bridge/voice-system-prompts.json` version 1.1 contains the Sales instructions. Support's legacy prompt is embedded in `twilio-bridge/server.js`; both specialist profiles receive dynamic instructions built in `twilio-bridge/specialist-staging.cjs`, including full selected catalog JSON and retrieval safety rules. **There is no separate complete published Support system-prompt file.**
- Runtime integration: `twilio-bridge/server.js`; specialist session `twilio-bridge/specialist-staging.cjs`; shared safety `twilio-bridge/safety-intents.cjs`; staging startup guard `twilio-bridge/staging-runtime-config.cjs` from PR #143. Shared and dedicated Dockerfiles: `twilio-bridge/Dockerfile`, `twilio-bridge/Dockerfile.pma-staging`.
- Function schemas: `assess_specialist_intent(reference enum, confidence number 0..1)`; `search_specialist_knowledge(query string 3..240)`; `submit_support_intake` with nine string fields; `submit_business_profile` with six string fields and optional trusted interaction ID. See exact live schema source in `server.js` and `specialist-staging.cjs`, not draft JSON.
- Trusted session: Twilio `CA` + 32-hex CallSid; server-bound `trustedSession.call_sid`, UUID `session_id`, exact `agentRoute`, not ended; stable operation ID derived from tenant/session/product. Caller text/model-supplied tenant, route, confirmation boolean or record ID cannot grant authority. Read back a matching persisted record before speaking success. UNKNOWN => readback reconciliation; no blind second POST.
- Environment **names only**: `STELLAR_BRIDGE_STAGING`, `SS_STAGING_INTELLIGENCE_ENABLED`, `SS_STAGING_HVAC_WRITES_ENABLED`, `SS_STAGING_SALES_WRITES_ENABLED`, `STAGING_SUPABASE_URL`, `STAGING_SUPABASE_SERVICE_ROLE_KEY`, `SS_STAGING_SALES_TENANT_ID`, `SS_STAGING_SUPPORT_TENANT_ID`, `NETLIFY_BASE_URL`, `PMA_CHANNELS_ENABLED`, `PMA_STAGING_BASE_URL`, `BRIDGE_HMAC_SECRET`, `OPENAI_API_KEY`, `OPENAI_REALTIME_MODEL`, `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`. PR #143 requires exact staging gateway `https://pma-validation--ai4cc-staging.netlify.app` and the stated project/tenant bindings. Other gateway-specific secrets remain governed by the existing Fly release configuration. No credential values recorded.

## 6. Executed evidence and limitations
- Joint PR #140: GitHub Actions run `40198374808` at `eaa20738ae7be69c6be50b4c5fccaa0636ebc4a5`, SUCCESS: 44/44 specialist/shared, 2/2 PMA emergency, 303/303 application, isolated PGlite persistence, TypeScript/build.
- PR #142: run `40203891572` at `5981378faedbadb7d4257b4f7d604ba99dd6666e`, SUCCESS: 307/307 application, 59/59 bridge, isolated PostgreSQL, build, Node24 dedicated Docker smoke, npm audit zero.
- PR #143: run `40205775547` at `d8f68a495bd9dc3164edb02244d4878306f657cc`, SUCCESS: 311/311 application, 59/59 bridge, isolated PostgreSQL, build, zero advisories, BOTH Docker image smoke. Logs independently inspected: test names confirm staging tenant binding rejection, draft/private/expired/foreign KB rejection, Sales/PMA isolation, safety, confirmation/readback, no duplicate POST and UNKNOWN reconciliation.
- These are **automated fixture/local PostgreSQL results**, not actual caller-eligible KB readback from hosted staging. Hosted Sales/Summit eligible counts are zero; therefore **no valid returned Sales or Summit caller KB record IDs exist for the requested positive retrieval proof**.
- PR #144 source inventory and matrix are committed; new branch's complete CI, exact-head combined regression, Fly release and live telephone tests **not yet verified**. Do not attribute #143's passing CI to #144.

## 7. Release dependencies and rollback
1. Preserve a rollback image digest, current Fly machine inventory, exact running revision, env/secret names, and existing signed IVR/Twilio mapping. PR #142 notes Fly PMA app `ai4-pma-bridge-staging` v32 and a stopped legacy-image machine; PR #143 notes separate `stellar-twilio-bridge` v28. **Neither is proven to be running the new integrated specialist source.**
2. Reconcile #142 -> #143 -> #144 onto one isolated candidate. Retain security fixes, provenance checks, PMA emergency dispatch/tracing and Sales KB category filter. Test exact combined HEAD with both Dockerfiles, app/bridge, PGlite, TypeScript, dependency audit and staging startup fail-closed tests.
3. Author/review/approve tenant-specific knowledge; verify source provenance and current commercial facts. Load into **staging only** with stable IDs, package version and audit metadata; no bulk promotion of unreviewed drafts. Enforce public visibility, verified source, dates and no cross-tenant reads. Check all 100 Sales and 150 Support intent coverage gaps.
4. Execute real hosted staging retrieval and capture returned UUIDs for both tenants; test positive and negative cases, 25+ scenario spoken acceptance per specialist, exact tool invocation, readback, safety, deduplication and UNKNOWN. Do not enable real notifications or external recipient actions during synthetic tests.
5. Fly lead checks correct signed gateway, dedicated/shared image revisions, actual secrets presence and staging routing. Owner separately approves exact Fly staging deployment and any Twilio/voice activation. Production remains unchanged.
6. **Rollback:** disable specialist feature/write flags (with explicit authorized configuration change), revert to prior verified Fly image digest and machine configuration, verify `/health`, signed IVR/PMA routes and tenant isolation; preserve KB audit history and avoid deleting records. Revert KB publication by restoring prior version/visibility only through approved staged rollback. No live SMS or production switch.
7. **GO conditions:** merged source candidate reviewed, both knowledge packages approved and caller-retrievable, intent-to-workflow evidence sufficient, hosted database and telephone tests pass, security/Fly machine and secrets reviewed, independent PMA signoff, explicit owner release authorization.

**Implementation state:** source recovery, catalog and staging-gated runtime integration are in GitHub. **Not completed:** full verified Sales/Support KB publication, complete 283 workflow implementation, combined #142/#143/#144 CI, hosted caller retrieval, Fly specialist activation, telephone acceptance. **No deployment or publication performed by this handoff.**
