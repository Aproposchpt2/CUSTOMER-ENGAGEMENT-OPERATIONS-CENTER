# PMA-003 intent-to-runtime matrix

All example utterances and lowercase/hyphen/INT-xxx aliases are tested. Safety overrides precede malformed model input. Authenticated portal paths remain separate from this unverified voice route.

| ID | Canonical intent | Bounded voice action / result |
| --- | --- | --- |
| INT-001 | LEASING_INQUIRY | INFORMATION; unified eligible public KB or staff review |
| INT-002 | UNIT_AVAILABILITY | INFORMATION; vacant + DATE + 24-hour freshness |
| INT-003 | SHOWING_REQUEST | CLARIFICATION_REQUIRED or consented REQUESTED; never booked |
| INT-004 | APPLICATION_QUESTION | INFORMATION; unified eligible public KB or staff review |
| INT-005 | PROPERTY_POLICY | INFORMATION; unified eligible public KB or staff review |
| INT-006 | PET_POLICY | INFORMATION; unified eligible public KB or staff review |
| INT-007 | PARKING_QUESTION | INFORMATION; unified eligible public KB or staff review |
| INT-008 | MOVE_IN | INFORMATION; unified eligible public KB or staff review |
| INT-009 | MOVE_OUT | INFORMATION; unified eligible public KB or staff review |
| INT-010 | MAINTENANCE_REQUEST | AUTHORIZATION_REQUIRED; validated intake only, no domain write |
| INT-011 | MAINTENANCE_STATUS | AUTHORIZATION_REQUIRED; authenticated portal |
| INT-012 | FIRE_OR_SMOKE | Safety guidance + interaction concern; no dispatch/work-order claim |
| INT-013 | SUSPECTED_GAS_LEAK | Safety guidance + interaction concern; no dispatch/work-order claim |
| INT-014 | ELECTRICAL_HAZARD | Safety guidance + interaction concern; no dispatch/work-order claim |
| INT-015 | MAJOR_FLOODING | Safety guidance + interaction concern; no dispatch/work-order claim |
| INT-016 | PERSONAL_SAFETY_THREAT | Safety guidance + interaction concern; no dispatch/work-order claim |
| INT-017 | VENDOR_RESPONSE | AUTHORIZATION_REQUIRED; authenticated portal |
| INT-018 | VENDOR_STATUS_UPDATE | AUTHORIZATION_REQUIRED; authenticated portal |
| INT-019 | OWNER_REQUEST | AUTHORIZATION_REQUIRED; authenticated portal |
| INT-020 | OWNER_OVERRIDE | AUTHORIZATION_REQUIRED; authenticated portal |
| INT-021 | PAYMENT_QUESTION | INFORMATION / staff review; no account disclosure or decisions |
| INT-022 | LEASE_QUESTION | INFORMATION / staff review; no account disclosure or decisions |
| INT-023 | UNKNOWN_QUESTION | INFORMATION / staff review; no account disclosure or decisions |
| INT-024 | HELP_REQUEST | INFORMATION; bounded capability explanation |
| INT-025 | GENERAL_GREETING | INFORMATION; no lead/work order |

Prospect capture is an explicit consented suboperation; it requires caller readback confirmation and normalized facts. Capture returns CONFIRMED only for persisted contact/lead IDs and never authenticates resident scope. Recovery is read-only against the existing call operation ledger.
