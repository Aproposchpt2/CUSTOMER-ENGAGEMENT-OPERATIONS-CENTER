# Sales and Support source integration handoff

STELLAR INTELLIGENT TECHNOLOGIES — Operated by Apropos Group LLC.
October 25, 2026. STAGING ONLY.

## Disposition
SOURCE IMPORT AND INTERNAL REVIEW API: IMPLEMENTED AND VERIFIED.
CALLER PUBLICATION AND END-TO-END ACCEPTANCE: PENDING.
This handoff does not authorize Fly deployment, voice activation or production changes.

## Exact source location
Repository: Aproposchpt2/CUSTOMER-ENGAGEMENT-OPERATIONS-CENTER.
Branch: integration/specialist-source-staging-20261025.
Base: PR #145 at 2bba4002be11d91f208fce0154365526d62ba3a1, stacked over #144. Use the final PR HEAD for this handoff's exact revision.
This source/data integration does not reconcile runtime PRs #142/#143; retain their corrections during the separate runtime release reconciliation.

## Delivered material
- docs/specialist-staging/source/knowledge.json: 100 Sales + 150 STELLAR platform Support records, complete recovered blocks and newly authored article payloads.
- intents-all-fields.json: 250 product intents, all 32 fields. Preserve source CanonicalName spelling; nine aliases differ from existing normalized runtime symbols. Do not replace executable symbols without an explicit alias mapping and compatibility review.
- validation-tests.json: 630 specifications, all NOT_EXECUTED.
- sales-guide.json: internal Sales KB, prompt and call flows in original paragraph/table order.
- summit-inventory.json: 44 HVAC references with original UUIDs, statuses and content hashes. Original full HVAC contents remain in ai4cc_knowledge_entries.
- summit-intents.json: separate 19-intent HVAC catalog.
- manifest.json: source SHA-256s and approval state.
- CONTINUITY.md and EVIDENCE.md: scope, reproducibility, validation and pending work.

## Hosted database and API contracts
Project: hvzauakkhlivzeqatfqm.
Table: public.ai4cc_specialist_source_records; package specialist-source-20261025-v1.
Internal service-role-only review RPC:
POST /rest/v1/rpc/ai4cc_specialist_review_source_v1
Body keys: p_tenant_id, p_scope, p_type, p_record_id.
Returns package_key, record_id, payload, review_state=draft, caller_enabled=false.
The source table intentionally cannot enable caller publication. Never expose review payloads through search_specialist_knowledge or model tools.
Client implementation: twilio-bridge/knowledge/specialist-source-contract.cjs. It validates exact staging URL and tenant/product scope and labels all responses INTERNAL_REVIEW_ONLY, callerUsable=false.

Sales and platform Support use tenant 5885a020-d363-4c27-910a-c035eda132f5 with separate sales/support_platform scopes. Summit uses d7e80001-0000-4000-b000-000000000001 with support_hvac scope. Do not assign the 150 platform articles to Summit.

Existing caller contract remains approved/public/published tenant-bound knowledge from ai4cc_knowledge_entries, with source verification and date restrictions. There is still no approved caller-public package activated by this integration. The 33 shared runtime intents and existing Sales/Support transaction contracts are unchanged.

## Fly engineer next steps
1. Review complete sources and maintain strict separation of Sales, platform Support and Summit HVAC.
2. Verify each required executable operation against the implemented orchestration/API contract; 90 new source articles carry TOOL_GAP, not implementation evidence.
3. Reconcile runtime revisions while preserving Sales category isolation, staging guards, trusted session binding and existing PMA/IVR behavior.
4. After selected caller content is reviewed and approved in staging, validate real retrieval IDs, consent, transaction readback, duplicate prevention and UNKNOWN reconciliation.
5. Run controlled telephone acceptance only on the authorized staging release.

## Content decisions remaining
- Sales commercial authority and conflicting historical pricing.
- Summit demo hours conflict: Co-Pilot profile 8 AM-5 PM weekdays versus older entry 8 AM-6 PM weekdays plus Saturday 9 AM-3 PM.
- Tenant-specific policies, approved caller wording and selective publication.
- Actual execution evidence for the 630 expansion scenarios and verified tool mappings.

No missing article source remains for the 250 product IDs. Draft completeness is not caller acceptance. Preserve this file with every subsequent checkpoint so the owner does not have to reconstruct expired chats.
