# AI4Businesses Property Management Assistant

## Authorization and baseline
Owner authorized implementation on October 21, 2026 after discovery. Baseline main: f4a02e2af12bb53e6cda4fa2815d43c8c7d34f13. Branch: feature/property-management-assistant-mvp. Production release requires separate authorization. No implementation-branch deployment. Test data must be synthetic and no production communication may be sent.

## Decisions
1. Reuse public.tenants, tenant_users, Supabase Auth, Customer 360 contacts, leads, interaction/transcript history, automation_tasks/runs, and audit_log. A resident is a contact plus an occupancy, never another platform tenant.
2. Add property-domain records only: properties, staff grants, units, occupancies, vendor profiles and property links, maintenance, assignments, activity, showings and attachment references. Composite foreign keys enforce workspace and property relationships even for privileged callers.
3. Extend the existing Knowledge Vault with ai4cc_knowledge_entries. The PMA and Knowledge Vault APIs share this durable store; no second PMA knowledge engine.
4. Owners/admins manage workspace properties. Other staff require explicit property grants and an active existing membership. Residents/vendors use the same Auth accounts with occupancy/vendor links and narrow RLS. They are not given staff memberships.
5. PMA APIs execute queries as the authenticated user, under RLS, after trusted session verification. Service-role use is limited to explicitly authorized CRM projections, atomic channel workflows and automation integration. Do not accept tenant context from an AI classification.
6. Database triggers enforce maintenance transitions, immutable ownership, and append activity/audit plus BLOCKED notification tasks atomically. Notification tasks reuse automation_tasks and are sandboxed; a queued task is not a sent notification.
7. Staging gate requires PMA_ENABLED=true, PMA_ENVIRONMENT=staging, AI4CC_SCHEMA_MODEL=stellar and the authorized staging Supabase host. No PMA production enablement in this change.
8. No accounting, applicant decisions, legal/financial advice, repair/arrival guarantees or unverified emergency dispatch statements.

## Reuse assessment
Customer 360 and leads have durable canonical tables. Voice has a separate Railway bridge. SMS sender path needs trusted tenant authorization. Web chat has canonical interactions but rule-based guidance. Knowledge Vault currently uses memory and is extended with persistent storage. Analytics registry is development maturity. Existing support orchestration is staging-specific and cannot be relabeled as generic maintenance orchestration.

## Validation and release
All domain writes require RLS, validation and audit evidence. Test cross-workspace/property reads and all write operations, invalid relationships, role escalation, replay and lifecycle races. Production build and existing tests must pass. Voice/SMS/chat transport acceptance, notification delivery, private file access and browser review are separate evidence gates; do not infer these from unit tests. Preserve unrelated products and all support orchestration branches.
