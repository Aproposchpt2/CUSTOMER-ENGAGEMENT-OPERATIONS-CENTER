# Sales and Support staging integration

Owner: STELLAR INTELLIGENT TECHNOLOGIES, operated by Apropos Group LLC.
Date: October 25, 2026. Environment: hvzauakkhlivzeqatfqm only.

## Scope and source authority
The source integration restores 100 Sales and 150 STELLAR platform Support KB records with full source content, all 32 fields for 250 product intents, and 630 unexecuted expansion test specifications. The original 33 shared runtime intents remain unchanged. Sales guide paragraph/table ordering is preserved as internal guidance. Source filenames and SHA-256 checksums are in source/manifest.json.

The 160 original records are recovered from the owner-supplied v1.2 document; 90 additions are newly authored v4.0 drafts. Titles such as Approved Voice Answer are source labels, not publication permission. All imported records remain draft and caller-disabled.

## Critical scope distinction
- sales: main STELLAR tenant 5885a020-d363-4c27-910a-c035eda132f5.
- support_platform: main STELLAR tenant, separate product scope. Never substitute it for Summit HVAC.
- support_hvac: synthetic Summit tenant d7e80001-0000-4000-b000-000000000001.
- shared: manifest only, no tenant.

Summit's 44 HVAC records remain in ai4cc_knowledge_entries without modifications. The unrelated PMA model row is excluded from this integration. Audit references preserve original UUIDs, statuses and content MD5s. The separate 19-intent HVAC catalog is preserved. The two conflicting hours sources remain flagged: Co-Pilot profile Monday-Friday 8 AM-5 PM versus older configured Monday-Friday 8 AM-6 PM/Saturday 9 AM-3 PM. No value was silently chosen or published.

## Database and API
Applied migration: 20261025205818_specialist_scoped_source_registry.

New service-role-only RLS table: public.ai4cc_specialist_source_records.
Primary key: package_key, record_type, record_id.
Package key: specialist-source-20261025-v1.
Expected source rows: 655 (250 knowledge, 269 intents including 19 HVAC, 90 test bundles containing 630 test cases, one Sales guide, one manifest, 44 HVAC references).

Internal review RPC: public.ai4cc_specialist_review_source_v1(uuid,text,text,text).
Arguments: p_tenant_id, p_scope, p_type, p_record_id.
Returns: package_key, record_id, payload, review_state, caller_enabled.
This is an internal source-review contract, never caller retrieval. Wrong tenant/scope pair returns no rows; anon/authenticated have no access. A database constraint prevents caller_enabled=true entirely. Publication must use the separate reviewed knowledge-management process and caller retrieval policy.

No existing intent tenant bindings or candidate rows are rewritten. In particular, older registry rows binding generic Support candidates to Summit are legacy drafts and must not be activated. The new explicit product scopes resolve the import ambiguity without changing running behavior.

## Replay
Run with bundled Python and python-docx:
python scripts/import-specialist-source.py OWNER_UPLOAD_DIR docs/specialist-staging/source
python scripts/build-specialist-source-seed.py docs/specialist-staging/source SCRATCH_SQL_DIR

Apply sql/source-registry.sql to the designated staging database only, then execute generated batches in sequence. Each batch returns exact JSON parity and count. The seed is idempotent and preserves draft/caller-disabled state. Do not run the legacy 148-row QA as a completeness check for this new version; use sql/source-qa.sql.

## Remaining activation work
Review actual caller text, resolve pricing authority and Summit demo hours, approve tenant policies, verify executable tool contracts, selectively publish eligible caller records and perform retrieval/transaction/telephone acceptance. Expansion specifications remain NOT_EXECUTED until exercised with recorded results. Imported procedures do not implement missing actions.

Fly deployment, live session wiring, image provenance and telephone acceptance belong to the Fly.io engineer. PRs #142/#143 remain separate runtime work and are not claimed reconciled by this data-only integration. PMA and production are unchanged.
