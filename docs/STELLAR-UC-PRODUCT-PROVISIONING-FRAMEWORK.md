# Stellar UC — Product Provisioning Framework v0.1
Date: 2026-10-15
Status: ARCHITECTURE SPECIFICATION — not deployed
Scope: experimental branch only; no production changes

## Product catalog
- sales_starter: small-business Intelligent Sales Specialist; dashboard-managed availability, appointment requests pending staff confirmation, transactional SMS, sales records, approved knowledge and pricing, handoff, usage visibility.
- sales_professional: starter plus advanced integrations and configurable follow-up; entitlements subject to approval.
- sales_enterprise: professional plus multi-location and advanced workflows; entitlements subject to approval.
- support_intake: 24/7 customer product support intake, triage, case creation, human escalation; separate product family.

## Tenant and subscription model
- tenants: tenant_id UUID, business identity, environment, status.
- product_definitions: stable product_code, family, version, lifecycle.
- tenant_product_subscriptions: tenant_id, product_code, effective dates, status, price_version; multiple products per tenant supported.
- feature_definitions: stable feature_code, description, cost_driver.
- product_feature_entitlements: product_code, feature_code, enabled, limits JSON validated by server.
- tenant_feature_overrides: tenant_id, feature_code, authorized override, reason, expiry.
- tenant_business_profiles and tenant_knowledge_versions: tenant-scoped, versioned.
- tenant_communication_channels: tenant-scoped routing, identifiers, and integration references; credentials server-side only.
- tenant_appointment_windows: tenant_id, service_type, timezone, start_at, end_at, capacity, reserved_count, status.
- tenant_appointment_requests: tenant_id, window_id nullable, customer reference, preferred window, status, staff decision, timestamps.
- tenant_support_cases: tenant_id, customer reference, product identifier, problem summary, priority, status, escalation target.
- tenant_usage_events: tenant_id, product_code, session_id, meter_type, units, supplier_cost_estimate, retail_charge_estimate, idempotency_key.
- tenant_acceptance_runs: tenant_id, product_code, configuration_version, test results, approver, decision, timestamps.
- tenant_promotion_history: tenant_id, approved version, source/target environment, authorizer, timestamp.

## Security gates
1. Every tenant-scoped row includes tenant_id; tenant identity derived from authenticated server context, never accepted solely from browser input.
2. RLS enabled for tenant tables; explicitly test cross-tenant read/write denial. Service-role keys remain server-only.
3. Tool calls enforce product entitlements server-side; prompt text is not authorization.
4. Idempotent appointment reservation and case creation; transaction/locking protects slot capacity under concurrency.
5. Requested appointment is not confirmed until authorized staff approval, unless a separately approved calendar-connected auto-confirm mode is enabled.
6. Never represent simulated bookings, quotes, payments or support resolution as completed production transactions.
7. Usage ledger includes voice, telephony legs, SMS segments, delegated reasoning and infrastructure cost components when available; reconcile estimates to provider billing.
8. PII retention, transcript consent/disclosure, SMS opt-in, audit logs and role permissions require review before customer onboarding.

## Provisioning lifecycle
DRAFT -> CONFIGURED -> STAGING_TESTING -> ACCEPTANCE_PENDING -> APPROVED -> PRODUCTION_ACTIVE; FAILED or SUSPENDED states allowed. Promotion requires signed acceptance and immutable configuration version. Staging test records are not promoted to production.

## Tier upgrade
Change subscription/entitlement assignment with effective date; preserve tenant_id, customer records, existing appointments, integration references, and audit history. Run new-feature acceptance tests before activation.

## Acceptance tests
- Tenant A cannot access Tenant B records or tools.
- Sales Starter can read posted appointment windows, request a slot, and await staff confirmation; capacity never overbooks.
- Staff confirmation sends SMS once, with delivery/error status.
- Support Intake creates a unique ticket and routes urgency to staff; no false resolution claims.
- Feature-disabled tool calls fail safely.
- Concurrent calls and rate limits meet independently measured targets.
- Usage ledger reconciles OpenAI + Twilio + SMS charges by session and tenant.
- Client acceptance gates block unauthorized production promotion.

## Execution sequence
1. Inspect existing staging schema and identity model.
2. Design additive SQL migrations and RLS policies without disrupting current POC.
3. Implement authenticated provisioning APIs and feature gates.
4. Implement sales and support workspace records and tools.
5. Implement usage metering and acceptance console.
6. Run security, functional, concurrency, and billing tests.
7. Request explicit production-promotion authorization.

## Boundaries
This file is a specification only. It does not assert database tables, APIs, or UI have been implemented. Do not deploy to production from this branch.
