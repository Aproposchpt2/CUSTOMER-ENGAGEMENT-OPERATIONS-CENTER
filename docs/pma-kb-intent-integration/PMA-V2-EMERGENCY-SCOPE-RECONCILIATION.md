# PMA v2.0 — Emergency Response / Property Operations Coordination
**Source of truth:** Owner-supplied `STELLAR_PMA_Revised_Knowledge_Base_and_Intent_Catalog_v2.0(1).docx` (2026-10-24), not the pre-existing PMA 25-intent schema.

## Owner scope correction
PMA is now a **24/7 emergency and maintenance response coordination system**, not a leasing, showing, applicant-screening, or general property management sales assistant. The v2.0 source defines nine stages: Receive, Verify, Assess, Protect, Record, Notify, Track, Update, Close. Operating promise: **“When Something Goes Wrong, Everyone Knows.”**

The source includes 36 numbered KB guidance entries (KB-001 through KB-036) and **28 intent rows**:
- General/routing: GENERAL_INQUIRY, SERVICE_MODE_INQUIRY.
- Maintenance: MAINTENANCE_REQUEST_NEW, MAINTENANCE_STATUS.
- Emergency: ACTIVE_WATER_LEAK, SEWAGE_BACKUP, GAS_ODOR, FIRE_SMOKE_CO, ELECTRICAL_HAZARD, HVAC_OUTAGE.
- Security: LOCKOUT, ACTIVE_SECURITY_INCIDENT.
- Notification: OWNER_NOTIFICATION, VENDOR_NOTIFICATION, TENANT_CONFIRMATION.
- Vendor: VENDOR_ACKNOWLEDGMENT, VENDOR_NO_RESPONSE, VENDOR_DECLINED.
- Workflow: MULTIPLE_ISSUES, DUPLICATE_REQUEST, NOTIFICATION_FAILURE, SYSTEM_OUTAGE.
- Governance: REPAIR_AUTHORIZATION, PRIVACY_REQUEST, CLOSE_TICKET.
- Resident/access/fallback: TENANT_COMPLAINT, LANGUAGE_ACCESSIBILITY, UNCERTAIN_CLASSIFICATION.

**Source nuance:** Although positioning is emergency response, the approved v2.0 scope also includes ordinary maintenance intake, status, notification, escalation, vendor tracking, governance, and controlled full-time/after-hours/overflow modes. Do not delete these source-backed workflows.

## Important divergence from existing code
- The deployed source's `twilio-bridge/pma-intent-catalog-v1.json` is a **different 25-intent schema** including leasing, showing and owner query actions; it does not represent the newly uploaded v2.0 operating contract.
- `twilio-bridge/pma-profile.json`, `twilio-bridge/pma-adapter.cjs`, `lib/propertyManagement/voiceOrchestration.ts`, `lib/voiceDemo/gateway.cjs`, current Supabase RPC intent allowlists, and voice instructions need an explicit **v2.0 mapping review**.
- Draft PR #118 only tests *legacy* 25-intent wiring and must not be merged or presented as v2.0 acceptance.
- Separate `voice-agent-catalog.json` version 2.0 is a universal/Sales/Support catalog and **not** the PMA v2.0 doc.

## Minimum safe implementation strategy
1. Preserve existing IVR, Sales, Support and production. Use isolated staging branch.
2. Create machine-readable **PMA v2.0** KB and 28-intent catalog from owner document (do not relabel the old catalog without maintaining safe aliases).
3. Build old-to-new intent compatibility map. Safety synonyms must map to approved deterministic emergency actions; never weaken 911/evacuation behavior or trusted call/tenant/property/session binding. Classify sewage and active flooding distinctly; HVAC urgency is policy-dependent.
4. Require trusted property-specific data, authorization, caller verification, approved primary/backup vendor rosters, escalation timers, contact-channel consent, delivery receipts, and status events before describing any ticket or notification as completed.
5. Emergency protection occurs **before** routine collection; no assumption that a sent SMS means vendor acceptance, arrival or repair; delivery failure and no-response must escalate as configured.
6. Keep sensitive resident/owner/vendor/access information out of unverified voice sessions. Do not publish staff-only KB entries.
7. Test all **28 v2.0** intents end-to-end, including missing configuration, duplicate suppression, permissions, notification failures and outages. Check live Netlify + Fly deployed source SHA and supervised phone calls.
8. No deployment/merge/DB grants/live SMS until reviewed and explicitly authorized.

## Acceptance
Every active intent must map to one or more of KB-001..KB-036, authorized runtime operation, auditable event, and a validated fallback. Only backend-confirmed effects may be claimed. Independent logs must distinguish owner/vendor/tenant notification outcomes. Capture complete case chronology.

**Status:** Scope reconciliation documented only. The v2.0 orchestration has **not yet been implemented, deployed or telephone-tested**.
