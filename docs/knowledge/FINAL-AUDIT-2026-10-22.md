# Sales and Support knowledge final audit

Reviewed on October 22, 2026 against the owner-provided KB, both intent catalogs, implementation package, the staging voice source at 5626f35abac3c36d7d47f675e5da94de529d4347, Railway configuration, and staging database metadata.

## Delivered scope

The owner-approved corrected DOCX and original intent catalogs are retained in `source/`. The audited v1.3 Markdown and JSON companion are the canonical staging guidance and semantic action map. They supersede source catalog action assignments; they do not authorize a transaction. All 81 Sales and 79 Support stable IDs and names are preserved.

Every intent has an individually reviewed natural caller example and handling guidance. Source questions that simply repeated the intent name were replaced. Proposed business interfaces are explicitly distinguished from enabled interfaces. Four scenario specifications per intent give 640 authored cases, not 640 executed live tests.

## Findings and corrections

1. Source catalogs cycle through eight action labels irrespective of intent. Corrected all mappings by meaning. Ticket creation, status lookup, note append, authorization failure, preference, information, and transfer are no longer interchangeable.
2. Repeated generic answers and examples were insufficient training/retrieval material. Replaced handling guidance and primary caller examples for all 160 intents with intent-specific content.
3. Safety Concern retains HIGH risk and an immediate-danger critical override. Security compromise receives elevated handling. Safety instructions never wait for identity, full intake, or a tool.
4. Add Note is a protected append operation with visibility controls, not a FAQ or silent overwrite. Its proposed interface is unavailable until implemented and authorized.
5. Private pricing, discount promises, guaranteed savings, revenue, unlimited concurrency, and unverified named integrations remain prohibited. Current owner branding supersedes legacy company names. Historical prices in old source documents are not runtime authority.
6. Role-play facts cannot become real lead data. Consent for support follow-up is separate from marketing consent. Opt-outs do not imply a persisted suppression action without a real system receipt.
7. Support intents 23–48 describe platform administration/IT support, not verified HVAC services. Marked explicitly for scope clarification; no invented HVAC capabilities.
8. Knowledge retrieval is read-only, session scoped, staging gated, and rejects model-provided identity/tenant fields. It never retrieves draft company articles or private account data. Proposed tools are never exposed as executable tools by the catalog.
9. Knowledge preview blocks the legacy Support writer because it targets a different tenant from the requested HVAC demonstration. This protects tenant isolation; it does not implement or certify the replacement writer.

## Remaining integration gaps

The current Railway staging branch hardcodes legacy Support writes to the Apropos tenant. The requested HVAC tenant exists with the correct name and a distinct ID. An HVAC intake RPC exists but is not used by this deployed adapter. Its authorization and recovery behavior must be tested before integration; merely finding the RPC is not proof it succeeds. Do not silently repoint the existing durable orchestrator or bypass its verified-result checks.

The staging database contains 41 unapproved draft/unknown HVAC articles, two approved verified safety articles, and two approved DEMO service articles. No draft was promoted. The knowledge preview does not publish these stored articles or treat demo company policies as production facts. No active `tenant_ai_profiles` rows were found. The Sales brand is associated with the existing Apropos tenant; a second tenant was not created by guessing that brand name implies a new identity.

Missing inputs and tools include approved tenant-specific service scope, hours, service area, warranty/billing terms, escalation contacts, callback commitments, scheduling availability, protected case lookup/note updates, notification delivery, preference persistence, and the correctly scoped Support transactional adapter. No unapproved fact or secret was invented to fill these gaps. Missing purchase dates cannot be fabricated to satisfy a legacy schema.

## Verification

`node --test twilio-bridge/specialist-knowledge.test.cjs twilio-bridge/voice-orchestrator-adapter.staging.test.cjs`: 17 tests passed, zero failed.

Coverage includes tenant/agent separation, production rejection, additional-field/prompt-injection rejection, immutable returned data, unavailable action enforcement, all original IDs, 640 unique scenario IDs, corrected semantic distinctions, safety priority, HVAC versus IT scope, commercial boundaries, consent, and existing orchestration duplicate/unknown-result behavior.

`node --check` passed for the modified bridge and new adapter. `git diff --check` passed. These are local implementation tests; they do not prove live conversation quality, live database mutation, provider delegation acceptance, delivery, or end-to-end telephone acceptance.

## Deployment and rollback

`STAGING_SPECIALIST_KNOWLEDGE_ENABLED=true` plus `STELLAR_BRIDGE_STAGING=true` enables the read-only preview in the bridge. The flag defaults off. The Dockerfile includes the adapter and complete JSON package. PMA is outside this package and receives no new tools or instructions.

While enabled, Support ticket submission returns `SUPPORT_WRITE_TENANT_MISMATCH` without calling the legacy writer. Safety and helpful conversation remain available. Do not describe this preview as a fully operational ticketing release. Restore the prior pinned staging commit to roll back code; the existing durable database data is unchanged. Production activation requires acceptance of tenant overlays, transactional integration, actual retrieval/conversation tests, and owner release approval.
