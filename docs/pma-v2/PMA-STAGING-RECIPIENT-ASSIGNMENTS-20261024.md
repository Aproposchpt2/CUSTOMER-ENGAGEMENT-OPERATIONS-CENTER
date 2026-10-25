# PMA v2 — Staging SMS recipient routing (implementation hold)

## Owner-approved routing
- Main inbound IVR +17252010584 (do not modify voice webhook).
- Maintenance vendor +17253305102.
- Tenant +17027102622.
- Owner backup +17029351414.
- Preserve existing functioning owner alert +17753508039.

## Executed 2026-10-24
Three role-specific, inactive, staging-only records were inserted and independently read back from public.pm_notification_preferences for Desert Ridge Apartments (eead9ac5-b28b-4594-b75b-a9e9bbbd111f), tenant 5885a020-d363-4c27-910a-c035eda132f5.

Records use event_type pma_v2_maintenance_vendor_test, pma_v2_tenant_test, and pma_v2_owner_backup_test; channel sms, staging_override true, active false. **Do not simply set active true.** They are not currently used by the emergency notification dispatcher.

## Verified blockers
1. private.pm_staging_emergency_prepare_v1 explicitly selects only emergency_escalation SMS destination +17753508039; no other SMS destination is returned. Existing owner alert works and must remain operational.
2. lib/propertyManagement/emergencyDispatch.ts currently composes all SMS as "Owner action required" and does not include recipient role; message creates false/misleading context if sent to vendor/tenant.
3. Current deployed code catches Twilio send errors silently and claims email logged without sending. Draft PR #120 addresses part of this; reconcile rather than overwrite.
4. No records in pm_property_vendors, and no vendor dispatch acceptance/decline proof. A vendor record alone is not authorization to dispatch.
5. Twilio receiving webhooks, messaging compliance, and current inbound IVR number assignment are not verified via Twilio account. No direct Twilio account connector was available. Sending SMS to another Twilio DID does not prove a human saw it.

## Acceptance before activating recipients
- Implement *staging-scoped* role-aware routing; retain explicit service_role and tenant/property/call binding controls.
- Distinguish owner, vendor and tenant and validate permitted destinations against exact approved allowlist. Never notify a vendor as owner.
- Record separate provider submission, provider delivery callback status, and vendor acknowledgment independently; no faux successful delivery.
- Configure authorized vendor/property assignment; avoid unverified real vendor outreach.
- Determine which number is configured as outbound sender; don't assume the inbound IVR DID is the sender.
- Verify production and Sales/Support are untouched. Test behavior using safe mocks before controlled real SMS.
- Verify Twilio incoming SMS visibility/forwarding for owned recipient DIDs, then authorize controlled T-027 test. Avoid unexpected live messaging.

Status: **STAGED ONLY / NOT READY FOR CALL**.