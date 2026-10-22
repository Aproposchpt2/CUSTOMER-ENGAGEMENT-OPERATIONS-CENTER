# Property Management Assistant — remaining environment work

Owner authorization covers implementation and staging. Production requires separate authorization. Keep PR #91 draft and unmerged. Do not deploy the implementation branch.

Repository: Aproposchpt2/ai4-contact-center
Branch: feature/property-management-assistant-mvp
Staging Supabase: hvzauakkhlivzeqatfqm
PR: https://github.com/Aproposchpt2/ai4-contact-center/pull/91

## Resume only the unresolved work
1. Read PROPERTY-MANAGEMENT-ACCEPTANCE.md and PROPERTY-MANAGEMENT-STAGING-RUNBOOK.md. The prior MVP and Knowledge Base v1.0 source are saved on the branch. Do not rebuild the platform or duplicate its services.
2. Verify live schema/migration history before changing anything. The latest successful read-only check reported that `ai4cc_knowledge_entries.model_values` did not exist. The attempted apply returned `Invalid or expired requestState`; earlier execution was interrupted. Never assume a failed/aborted connector request rolled back or completed.
3. If absent, apply the exact reviewed `supabase/migrations/20261021235624_pma_knowledge_model_v1.sql` through a working authorized Supabase connection/CLI. It extends the existing vault, adds unit scope and private draft templates, seeds a tenant-scoped internal copy of the 18-section model, and hardens canonical answer retrieval. Do not apply pma_local_baseline.sql to Supabase. Verify the column/constraints/policies/functions, one staff-only unapproved model reference per eligible workspace, unchanged tenant isolation, audit events and security advisors afterward.
4. Current isolated validation is 127 passing tests plus TypeScript. Tests use a relevant staging schema snapshot and PGlite, not a complete Supabase runtime. Review current GitHub CI and screenshot results for the new commit. Retest only changed/failed/unverified areas.
5. Prepare a separate staging release with existing protected credentials; never export service-role secrets. Validate actual sign-in, resident/vendor/prospect access, private file upload/download and knowledge draft/review/publication. Real property facts have not been supplied; blank templates must remain unapproved.
6. Configure a dedicated staging voice bridge, HMAC, synthetic actor/property/contact bindings and a dedicated inbound test DID/caller allowlist. Follow the runbook. Never alter production Sales +17253305102, Support +17027102622 or the main IVR. Do not place production outbound calls/SMS/emails during testing.
7. Verify inbound voice/SMS persistence and replay/reconnect behavior, plus approved sandbox-provider notification receipts. Notification queue delivery remains simulated until this is completed. Report real provider results separately from mocked browser/runtime results.
8. Review emergency escalation procedures and human access with the owner. Record exact commits, deployed IDs, completed checks and remaining blockers. Production must remain unmerged/undeployed without separate owner authorization.

## Knowledge behavior to preserve
Platform → existing owner tenant_id → property_id → unit_id. The compiled platform safety rules cannot be overridden by retrieved content. Private owner/vendor content stays internal. Only approved, current, authorized answer content is quoted. Equally specific multiple matches escalate; timestamps do not resolve policy conflict. Structured template values are reference fields; the owner-reviewed answer is the spoken/text reply. Null fields are unknown. All channels use canonical transactional workflow logs. No applicant/housing/financial decisions, legal advice, availability/repair promises or fabricated emergency/provider delivery claims.
