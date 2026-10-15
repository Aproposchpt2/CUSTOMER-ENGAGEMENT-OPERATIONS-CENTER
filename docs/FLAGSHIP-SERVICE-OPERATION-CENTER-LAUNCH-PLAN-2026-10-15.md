# Stellar UC — Intelligent Customer Service Operation Center
## Flagship launch execution specification | 2026-10-15
Status: Owner-approved strategic priority; engineering acceptance pending.
Scope: PRIVATE STAGING POC ONLY until independent launch authorization. Preserve production stellaruc.com, production Supabase and Sales Specialist POC.

### Commercial scope
Parent brand: Stellar Unified Communications (Stellar UC).
Flagship: Intelligent Customer Service Operation Center.
Initial verticals: HVAC, electrical, plumbing, restoration and field services. Horizontal, multi-tenant architecture for later sectors.
Core promise: 24/7/365 intelligent customer service; existing business number; concurrent calls; service intake; verified notification; customer lifecycle; admin workspace; transparent usage-based pricing. Validate capacity and cost before advertising quantified claims.

### P0 transactional acceptance
1. Authenticated private staging administrator preflight and test-only tenant.
2. Live conversation collects caller name, contact method, service address/ZIP, issue, urgency, preferred callback and optional product/purchase details.
3. Confirm intake facts; issue a function call with schema-valid arguments; show explicit operator consent for test write.
4. Persist contact and service request atomically and idempotently; return actual database case ID. If failure, no confirmation.
5. Resolve tenant-specific designated service recipient; deliver notification through configured channel with provider-verified success; log delivery status and timestamps. No real outbound notifications during fictional test unless owner separately approves a safe test recipient.
6. Voice representative states only verified facts: recorded case ID if saved, notification if delivered, callback estimate only if tenant SLA configured.
7. Admin workspace displays tenant-isolated case and notification outcome.
8. Repeat test for duplicates, failed writes, missing recipient, rejected notification, urgency and multiple concurrent calls. Verify RLS isolation and no cross-tenant leakage.

### Current verified baseline
2026-10-15 first live voice call was conversationally successful. Netlify private POC POST /api/experimental-support-voice-session returned HTTP 201. No /api/experimental-support-intake request observed in inspected request window. Direct staging query returned zero rows in public.stellar_support_cases. Therefore E2E is NOT PASSED.

### First engineering repair
Inspect GPT-Live data channel session.update response and actual function-call event types. Existing frontend sends session.update with session.type='realtime', waits for session.updated containing session.tools and handles response.output_item.done. Add explicit telemetry for registration errors, tool call arguments, confirmation, HTTP response and spoken acknowledgment. Avoid logging PII or credentials. Fix protocol compatibility based on observed event contract, not speculation. Re-test protected staging deployment before attempting notification.
Keep Sales Specialist route unchanged.

### Safety and product requirements
For imminent danger, direct caller to emergency services rather than promising technician dispatch. Distinguish HIGH/URGENT service from emergency public safety response. Tenant-configurable routing, business hours, service area, escalation chain, and realistic response SLA. Privacy, call-recording consent, retention and access controls must be reviewed before public launch. Tenant dashboard must display intake status, notification status and lifecycle.
Never describe an unverified action as completed. Never claim unlimited concurrency or guaranteed savings without measured evidence.

### Release gates
Gate 1: staging transactional acceptance with case and linked contact, evidence and voice confirmation.
Gate 2: notification delivery acceptance, failed delivery handling, tenant-specific routing.
Gate 3: concurrent call load testing, tenancy/RLS, security and privacy.
Gate 4: onboarding, dashboard, usage metering and commercial disclosures.
Gate 5: owner-approved controlled launch, production change authorization, rollback plan.
