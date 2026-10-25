# STELLAR — STAGING SIDE IMPLEMENTATION EVIDENCE
**2026-10-25 | STAGING ONLY | NO CALLER-KB PUBLICATION | NO FLY DEPLOY**
Owner: STELLAR INTELLIGENT TECHNOLOGIES (operated by Apropos Group LLC)

## Assignment boundary
This report covers **Supabase staging-side** Sales Specialist Echo and Support Specialist Cedar / Summit Comfort Heating & Air: source staging, intent registry, package ledger, retrieval eligibility and tests. Fly.io image/runtime/orchestration implementation belongs to the Fly.io Lead Engineer. PMA and IVR are preserved. No production change or Fly deployment occurred.

## Applied database changes (confirmed by readback)
Project: `hvzauakkhlivzeqatfqm`.
- `public.ai4cc_specialist_intent_catalog` — **283 records** package v2.0, exact source-definition parity 283/283, IDs unique, 100 Sales, 150 Support, 16 universal, 9 control, 8 safety. All `enabled=false`, `approval_state=review_required`. Sales bound to tenant `5885a020-d363-4c27-910a-c035eda132f5`; Support to `d7e80001-0000-4000-b000-000000000001`; shared intents have null tenant.
- `public.ai4cc_specialist_package_versions` — **4 staged packages**, all `active=false`, `approved=false`, `publication_state=review`. Check constraint rejects activating an unapproved package.
- `public.ai4cc_specialist_caller_knowledge_v1(uuid,text,integer)` — security-invoker, service-role-only read RPC, exact tenant allowlist, Sales category `sales_*`, published/approved/public/VERIFIED, date windows, content and query-length gates; limit <=5. Fly bridge must still validate trusted call/session and tenant before invoking. This RPC is an additional staging API; existing specialist runtime currently queries `ai4cc_knowledge_entries` directly, so the Fly engineer must deliberately choose the contract.
- `public.ai4cc_knowledge_entries` — **46 new internal drafts**: 39 exact-content Sales v1.1 sections + 7 internal STELLAR Support platform sections. Exact source text parity **46/46** and exact UUID readback confirmed. These are `approved=false`, `visibility=staff`, `audience_scope=staff`, `publication_state=draft`, `source_status=UNKNOWN`. No internal platform content was assigned to Summit.
- Summit's **45 preexisting** records were preserved (24 Co-Pilot HVAC source drafts, 16 supplemental HVAC review drafts, 4 approved/published staff-only records, 1 PMA model record). No Summit row was modified.
- Existing STELLAR Sales KB 24 `sales_*` records were preserved; 16 VERIFIED approved/published staff-only and 8 PROPOSED approved/published staff-only. No Sales row was modified.
- Full STELLAR tenant KB now 258 records (212 original + 46 source drafts), of which 42 unrelated public caller-eligible; **zero Sales-category caller-eligible**. Summit remains 45 total, **zero caller-eligible**.

## Source and reproducibility
- `docs/fly-lead/sql/STELLAR-STAGING-SPECIALIST-SCHEMA-20261025.sql` — applied registry and caller-read RPC schema.
- `docs/fly-lead/sql/STELLAR-STAGING-SPECIALIST-PACKAGE-LEDGER-20261025.sql` — applied ledger and four packages.
- `docs/fly-lead/sql/STELLAR-STAGING-INTENT-CATALOG-SEED-20261025.sql` — exact 283-row idempotent seed.
- `docs/fly-lead/sql/STELLAR-STAGING-SOURCE-DRAFTS-20261025.sql` — exact 46-row idempotent source seed.
- `docs/fly-lead/sql/STELLAR-STAGING-SPECIALIST-QA-20261025.sql` — executed invariant test.
- `docs/fly-lead/STAGING-SPECIALIST-LOADED-RECORD-IDS-20261025.json` — UUIDs, categories and statuses for 46 new and 45 existing Summit rows.
- `docs/fly-lead/STAGING-SPECIALIST-OWNER-APPROVAL-QUEUE-20261025.json` — 115 individual review decisions needed across existing and recovered source; excludes any claim of blanket approval.
- Existing full 283-intent to implementation matrix: `docs/fly-lead/SALES-SUPPORT-283-INTENT-IMPLEMENTATION-MATRIX-20261025.json`.

## Executed staging QA
**PASS**
1. Source parity: 46/46 exact text readback vs GitHub source; all drafts private and unapproved.
2. Catalog parity: 283/283 exact canonical JSON definitions, stable IDs, tenant groups and disabled status vs GitHub version 2.0.
3. Catalog counts: 100/150/16/9/8; 0 enabled.
4. Package ledger: 4 review packages, 0 active; activation constraint rejects attempted unapproved activation.
5. RPC permissions: anon=false, authenticated=false, service_role=true; registry SELECT anon=false, authenticated=false, service_role=true; RLS enabled.
6. **Transactional synthetic eligibility test**: temporary uncommitted positive Sales and Summit VERIFIED/public/published fixtures each returned exactly one match; draft, staff, expired, future, expired valid_until, PROPOSED, non-Sales category, wrong tenant and short query rejected. Transaction ROLLBACK, zero fixture rows remained.
7. Executed SQL QA script `STELLAR-STAGING-SPECIALIST-QA-20261025.sql` returned `PASS` with 283 intents and zero active packages.

9. **Exact UUID readback fixture test:** two uncommitted VERIFIED/public/published records were inserted with returned UUIDs, retrieved by the tenant-bound RPC, and each retrieved UUID was asserted equal to its inserted UUID; cross-tenant content returned zero. PASS. Transaction rolled back; zero synthetic rows persisted.
8. Supabase security advisors: no specific high-severity finding reported on these new objects; INFO `rls_enabled_no_policy` includes the catalog intentionally because access is service-role-only with no user policies. See https://supabase.com/docs/guides/database/database-linter?lint=0008_rls_enabled_no_policy.

**NOT YET POSSIBLE / NOT CLAIMED**
- Positive hosted retrieval of a *persistently approved* Sales or Summit caller-facing record. Both currently have zero eligible records.
- Owner-approved final substantive content for all 100 Sales / 150 Support intents.
- Actual Fly runtime usage of the new RPC and catalog; Fly engineer owns orchestration.
- Live spoken end-to-end acceptance, real signed-session tool invocation and Fly deployment.
- Merging PR #144 with PR #142/#143; the branches are divergent.

## Content approval boundary and next step
Owner's prior constraint explicitly prohibits publishing unapproved content. No evidence of individual caller-public approval exists for the recovered Sales and Summit drafts. The staging-side engineering infrastructure, source imports and tests are implemented, but **caller-facing staging KB activation cannot be completed without approved record-level content**.

Required next step: owner/content approver reviews `STAGING-SPECIALIST-OWNER-APPROVAL-QUEUE-20261025.json`, supplies approved answer revisions, confirms pricing/product claims and Summit-specific HVAC policies, and explicitly authorizes caller-public publication. Only then can an engineer publish selected verified records, set package active version, rerun real positive retrieval with UUIDs, and issue a **fully completed** Fly.io release handoff.

**Current release status: NO GO for Echo/Cedar caller knowledge activation.**
