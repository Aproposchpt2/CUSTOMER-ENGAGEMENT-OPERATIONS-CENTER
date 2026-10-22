# PMA Knowledge Base and Intent Catalog — staging activation

Date: 2026-10-22 UTC
Project: STELLAR-UCAAS-STAGING (`hvzauakkhlivzeqatfqm`)
Repository: Aproposchpt2/ai4-contact-center
Branch: feature/property-management-assistant-mvp; PR #91 remains draft and unmerged.

## Installed and verified
- `pma_knowledge_model_v1`, recorded migration version **20261022055747**; repository source `20261021235624_pma_knowledge_model_v1.sql`.
- `pma_intent_catalog_v1`, recorded migration version **20261022055803**; repository source `20261022053315_pma_intent_catalog_v1.sql`.
- Complete 18-section canonical knowledge reference in both eligible existing workspaces, each staff-only and unapproved as answer content.
- Exactly 25 configured intents; deterministic emergency review, confidence/required-entity gates, native owner authority, scoped vendor updates and correlated audit output.
- Knowledge Vault RLS enabled with explicit SELECT/INSERT/UPDATE/DELETE policies. Anonymous catalog execution, authenticated trusted-service execution and the legacy public workflow bypass are denied.

## Reconciliation performed
Preflight found Knowledge Base columns, guards and an incomplete model placeholder already installed outside the pending migration history. The lookup function had also been changed: it returned `answer` instead of the expected `reply`, and included staff content among contact-facing candidates. The maintenance category constraint had not yet been expanded.

The pending knowledge migration was made repeatable: retain existing columns and equivalent constraints/indexes, replace the reviewed guard/lookup functions, refresh the canonical model reference without duplicates and install the tested category constraint. Unrelated phase-1 property/unit columns, knowledge metadata, workflow/session tables and their data were preserved. The catalog migration then installed its resident-authorized helpers and bounded router. A new isolated test verifies reconciliation of pre-existing structures and a placeholder while preserving unrelated columns.

## Live verification
1. `supabase/tests/pma_acceptance.sql`: PASS on actual staging for workspace/property isolation, roles, relationships, resident/vendor scope, maintenance lifecycle, assignment/showing replay, knowledge visibility, audit, canonical voice/SMS/chat database records, metrics, prospective resident access, conversion, rate limits, attachments and blocked notifications.
2. `supabase/tests/pma_catalog_acceptance.sql`: PASS on actual staging for all 25 routes, all canonical fields, confidence clarification, emergency override, owner/vendor authority, cross-owner denial and audit correlations.
3. Both suites use synthetic fixtures in transactions ending in ROLLBACK. An initial public-listing assertion assumed the database contained no other published property; it was corrected to check only fixture IDs. The initial failed transaction left no fixture tenants. The corrected suite and catalog suite passed.
4. Security advisors returned the same pre-existing findings as preflight: four staging orchestrator/dispatcher tables intentionally without policies; one existing public Support test SECURITY DEFINER function warning; leaked-password protection disabled. No new PMA advisor findings were reported. This does not replace actual account/storage/provider acceptance.
5. Isolated regression suite: 195 tests passed after reconciliation. Browser/build evidence for the previously saved catalog is documented in the existing acceptance record; no new application UI/provider release occurred in this activation.

## Remaining work
Actual staging web sign-in/storage and dedicated voice/SMS/provider receipt validation remain open. Property-specific facts, policies, contacts and emergency procedures still need owner-reviewed content. No invented facts were published. Notification delivery remains blocked/simulated. No production release, production phone routing change or ElevenLabs agent provisioning occurred.
