# Sales and Support staging completion handoff

STELLAR INTELLIGENT TECHNOLOGIES — Operated by Apropos Group LLC.
October 25, 2026. STAGING ONLY. No production or Fly deployment performed.

## Completed staging work
The candidate reconciles PR #146 complete source packages with runtime/security corrections from PR #142 and PR #143. It adds isolated staging caller retrieval and an opt-in bridge consumer. PMA domain code, IVR routing and deployed environment variables were not changed. Both Dockerfiles package the new transitive runtime dependencies.

Source counts: 100 Sales + 150 STELLAR platform Support KB records, all 32 fields for 250 product intents, 630 unexecuted voice-acceptance specifications, separate Summit HVAC source inventory and 19 HVAC intents. The original 33 shared runtime intents remain intact.

Caller package scoped-v2: 100 Sales, 150 platform Support, 19 Summit HVAC answers. These are curated staging-only answers with source derivation, deterministic UUIDs, product scope and test_only=true. Internal prompts, procedures, PMA content and staff source-review payloads are excluded from caller retrieval.

## Source revision
Repository: Aproposchpt2/CUSTOMER-ENGAGEMENT-OPERATIONS-CENTER.
Candidate branch: integration/specialist-source-staging-ready-20261025.
Source parent: 4b74afadf715e7aa6fd9f99cfedea609555845c2 (PR #146).
Runtime parent: d8f68a495bd9dc3164edb02244d4878306f657cc (PR #143, includes #142).
Use the candidate PR HEAD SHA as the exact reconciled revision. Do not deploy earlier individual branches as this combined candidate.

## Database contracts
Project: hvzauakkhlivzeqatfqm; URL https://hvzauakkhlivzeqatfqm.supabase.co.
Migration 20261025205818_specialist_scoped_source_registry retains 655 draft source rows.
Migration 20261025211026_specialist_scoped_staging_caller_v2 adds public.ai4cc_specialist_staging_articles and service-role-only RPC public.ai4cc_specialist_staging_knowledge_v2(uuid,text,text,integer).

POST /rest/v1/rpc/ai4cc_specialist_staging_knowledge_v2
Arguments: p_tenant_id, p_scope, p_query, p_limit (maximum 5).
Sales scope sales and platform scope support_platform bind to 5885a020-d363-4c27-910a-c035eda132f5.
Summit scope support_hvac binds to d7e80001-0000-4000-b000-000000000001.
A wrong scope/tenant returns no data. Anonymous and ordinary authenticated roles cannot call the RPC or read its table. The server must first validate trusted call/session identity.
Only approved, published, effective, unexpired scoped-v2 rows with test_only=true are returned. Package expires after its 30-day staging review window, beginning November 24, 2026; use actual row timestamps. No automatic extension is implied.
Response fields: id, stable_id, tenant_id, product_scope, title, content, source_status, execution_mode, test_only, package_version, effective_at, expires_at.

Do not use ai4cc_specialist_review_source_v1 for caller knowledge. Do not promote legacy draft candidates or broaden PMA/public KB retrieval. Legacy ai4cc_knowledge_entries remains unchanged by caller publication; its old zero-eligible counts do not describe the new scoped-v2 store.

## Bridge configuration and behavior
New opt-in environment name/value: SS_STAGING_RETRIEVAL_VERSION=scoped-v2.
The existing staging URL, tenant bindings, HMAC/session authorization and credential requirements remain mandatory. No environment changes were applied by this engineer.
In scoped-v2 mode Sales uses its 100-intent taxonomy and receives all 32 fields on assessment. Summit uses 19 HVAC intents plus 33 shared intents, not 150 platform account-administration intents. TICKET_CREATION is the Summit write-authorization reference; legacy SUP-049 is not a v2 HVAC intent.
Writes remain opt-in through existing SS_STAGING_SALES_WRITES_ENABLED and SS_STAGING_HVAC_WRITES_ENABLED flags. Preserve explicit observed confirmation, exact-summary matching, readback, deduplication and UNKNOWN reconciliation. Classification alone never authorizes an action.

Unsupported account, scheduling, payment, suppression, dispatch and notification operations are explicitly information-only. No specialized tool is invented. Platform Support has a separate retrieval scope but no new live voice route or write dispatch.

## Reconciled content decisions
Sales uses usage-based wording without dollar prices or contractual promises. Historical $1,200 wording is excluded.
Summit's fictional demo uses the newer Co-Pilot HVAC v1.1 weekday hours, 8 AM-5 PM Las Vegas local time. The older conflicting 8 AM-6 PM/Saturday entry is excluded from scoped-v2. Demo hours do not establish real emergency availability or dispatch promises.
Caller curation is based on the owner's staging-completion directive. It is not approval of real client policies or production release. Sources and new draft articles remain preserved for audit.

## Hosted evidence
269/269 caller articles retrieved by exact UUID/content through SQL RPC validation; independent content-hash readback matches the canonical package 269/269. Cross-tenant, same-tenant cross-product, short-query, unapproved, retired, expired and future-effective negative tests PASS.
Sales existing RPC stellar_voice_demo_sales_submit_staging created synthetic lead e80b95e8-3c73-45dd-9423-b4ddb65201e8, independently read back. Repeat returned the same lead with deduplicated=true. Synthetic parent session a0000000-0000-4000-8000-000000000147 was then marked completed.
Summit existing RPC stellar_create_hvac_demo_support_intake created case efba2b19-a2ee-4bb6-8dec-962bece1fd69, independently read back. Repeat returned the same case with created_new=false.
These were database-level tests, not signed gateway or live telephone tests. Both retained synthetic/test-only metadata with notifications disabled. No real notification, appointment or dispatch occurred.

## Fly engineer acceptance work
Review the final candidate and its CI/image evidence, then use the separately authorized staging release process. Verify actual running revision, gateway, credentials and flags. After deployment, perform signed-session and controlled telephone acceptance for greetings/voices, retrieval IDs, safety, consent/corrections, writes/readback, duplicate prevention and UNKNOWN recovery. Record actual results against the 630 specifications; they remain NOT_EXECUTED as voice tests until that evidence exists.

Rollback: disable scoped-v2 selection or revert the authorized staging image to its prior verified revision. Retire dedicated caller rows through an authorized staging change if needed; preserve audit sources. No production, IVR, PMA or Twilio routing change is authorized by this handoff.
