# Property Management Discovery Report

Discovery was completed and reviewed before the owner authorized implementation on October 21, 2026. This file preserves the findings from that review; subsequent engineering is recorded separately in PROPERTY-MANAGEMENT-ACCEPTANCE.md.

1. Repository: Aproposchpt2/ai4-contact-center, the operational platform behind stellaruc.com. The inspected ai4businesses-org repository primarily contains marketing pages/functions.
2. Branch: owner requires feature/property-management-assistant-mvp. Discovery baseline main f4a02e2af12bb53e6cda4fa2815d43c8c7d34f13. The previously inspected Netlify deploy 6ad8596f09af7a832136cb2d matched that commit.
3. Framework: Next.js Pages Router, declared Next ^14.2.35, React 18, TypeScript, Node 24+, Supabase Auth/Postgres, Netlify web/API hosting and separate Railway voice WebSocket runtime.
4. Reusable modules: Customer 360, Lead Management, Voice Operations, SMS, Web Chat, Knowledge Vault, Mission Control and Analytics. Module presence alone is not production acceptance.
5. Reusable services: requireAi4ccContext, tenantModel, runtime routing/flow authority, canonical contacts/leads/activities/tasks, interactions/transcripts, audit logs, automation_tasks/runs and communication providers.
6. Database: hvzauakkhlivzeqatfqm has tenants, tenant_users, tenant settings/AI profiles, canonical CRM, interactions, workflows, audits and monitoring. No authoritative property/unit/occupancy/vendor-assignment/maintenance equivalents appeared in the inspected public schema. Selected membership/RLS policies were inspected; full audit remained an implementation task.
7. AI: tenant instructions/FAQs, existing Live voice/delegation runtime, structured tool execution, agent assistance and transcript intelligence. Support orchestration evidence is staging-specific and cannot establish PMA production readiness.
8. Workflows: durable staging support workflow/event/idempotency patterns and shared automation tasks/runs exist. Fixed staging tenant, support-only workflow types and test-only case constraints prevent direct relabeling as general maintenance.
9. Architecture: PMA extends shared services with property operations. Workspace tenant means owner/management company; residents are canonical contacts plus occupancy relationships. No duplicate auth, tenant, CRM, knowledge or notification engines. No accounting, ERP or applicant decisions.
10. New files: property domain/permissions/workflow adapters, property workspace/portal, scoped APIs, migrations, acceptance tests and architecture/runbook documents.
11. Modified files: existing Knowledge Vault API, navigation/Mission Control and voice runtime integration points. Shared services retain their existing contracts unless explicitly extended.
12. Risks: cross-workspace/property relationships, service-role bypass, in-memory knowledge, SMS legacy fixed tenant IDs, duplicate writes/notifications, unverified success statements, unconfigured emergency escalation and attachment access.
13. Assumptions: supplied database is staging; synthetic records only; no production communications during testing; human-approved residency conversion; availability/showing/repair/arrival claims require verification.
14. Dependencies: persistent knowledge, authorized channel contexts, workflow generalization, private attachments, external resident/vendor access and isolated staging configuration. Production release requires separate authorization.

The owner approved proceeding after receiving this report in conversation. This approval covers implementation and staging work; it does not authorize production release.
