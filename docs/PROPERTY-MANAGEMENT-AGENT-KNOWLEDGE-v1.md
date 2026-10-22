# AI4Businesses Property Management Assistant — Agent Knowledge Base v1.0

Owner-provided foundational model. The Knowledge Vault stores scoped records; existing platform services execute communications, workflow, analytics and authorization.

Scope: **Platform → Property Owner → Property → Unit**. The platform model supplies immutable safety constraints. Owner knowledge uses existing tenant_id; property and unit IDs must belong to that tenant. Unit knowledge cannot grant access to another unit.

Null fields below are unverified templates, not facts. Owner review is required before publishing any answer. Availability, pricing, service-animal questions and individual housing decisions must never be inferred from examples.

## 1. Property Profile

Default scope: property.

```yaml
property_id: null
property_name: null
property_type: null
property_status: null
address: null
city: null
state: null
zip: null
year_built: null
unit_count: null
office_phone: null
office_email: null
website: null
emergency_contact: null
office_hours: null
timezone: null
leasing_contact: null
maintenance_contact: null
after_hours_contact: null
```

## 2. Property Amenities

Default scope: property.

```yaml
amenities: null
pool: null
fitness_center: null
clubhouse: null
dog_park: null
playground: null
laundry: null
covered_parking: null
assigned_parking: null
storage_units: null
business_center: null
gated_access: null
amenity_hours.pool: null
amenity_hours.fitness_center: null
amenity_hours.clubhouse: null
```

## 3. Leasing Knowledge

Default scope: property.

```yaml
accepting_applications: null
available_units: null
minimum_lease_term: null
application_fee: null
security_deposit: null
pet_deposit: null
pet_fee: null
income_requirement: null
occupancy_limits: null
move_in_fee: null
administration_fee: null
```

I can check the latest verified property records. Availability must be confirmed by the property team. Would you like to request a showing?

I can provide approved application instructions and connect you with the leasing workflow.

## 4. Pet Policy

Default scope: property.

```yaml
pets_allowed: null
maximum_pets: null
breed_restrictions: null
weight_limit: null
pet_deposit: null
pet_fee: null
monthly_pet_rent: null
service_animal_policy: null
```

## 5. Parking Policy

Default scope: property.

```yaml
parking_type: null
visitor_parking: null
assigned_parking: null
garage: null
reserved_spaces: null
towing_policy: null
parking_permits: null
overnight_parking: null
```

## 6. Move-In Procedures

Default scope: property.

```yaml
utility_setup: null
required_documents: null
move_in_inspection: null
key_pickup: null
elevator_reservation: null
move_in_hours: null
```

## 7. Move-Out Procedures

Default scope: property.

```yaml
required_notice: null
cleaning_requirements: null
key_return: null
forwarding_address: null
inspection_process: null
deposit_return: null
```

## 8. General Property Policies

Default scope: property.

```yaml
quiet_hours: null
guest_policy: null
smoking_policy: null
grill_policy: null
balcony_policy: null
trash_policy: null
holiday_decorations: null
common_area_rules: null
community_access_rules: null
```

## 9. Maintenance Knowledge

Default scope: property.

```yaml
categories.plumbing: null
categories.electrical: null
categories.hvac: null
categories.appliance: null
categories.pest_control: null
categories.structural: null
categories.locks: null
categories.internet: null
categories.common_area: null
priority.emergency: null
priority.high: null
priority.medium: null
priority.low: null
```

## 10. Emergency Procedures

Default scope: property.

```yaml
fire: null
smoke: null
gas_leak: null
flooding: null
electrical_hazard: null
security_threat: null
structural_threat: null
```

If you believe there is a gas leak, leave the area immediately and contact emergency services or your utility provider from a safe location. Once safe, I can record an escalation for property management. I cannot confirm that emergency services or property management have been contacted.

## 11. Vendor Knowledge

Default scope: owner.

```yaml
hvac.company: null
hvac.contact: null
hvac.phone: null
plumbing.company: null
plumbing.contact: null
plumbing.phone: null
electrical.company: null
electrical.contact: null
electrical.phone: null
locksmith.company: null
locksmith.contact: null
locksmith.phone: null
emergency_vendor.company: null
emergency_vendor.contact: null
emergency_vendor.phone: null
```

## 12. Leasing Agent Knowledge Model

Default scope: platform.

Convert inquiries to showing requests.

- allowed: Property information, Verified availability information, Showing requests, Lead creation, Contact collection.
- prohibited: Approve applicants, Reject applicants, Make housing decisions, Guarantee availability, Quote unverified pricing.

## 13. Tenant Assistant Knowledge Model

Default scope: platform.

Resolve tenant questions.

- allowed: Approved property policies, Maintenance requests, Verified request status, Move-in support, Move-out support.
- prohibited: Lease interpretation, Legal advice, Policy exceptions, Financial decisions.

## 14. Maintenance Intake Agent Knowledge Model

Default scope: platform.

```yaml
property: null
unit: null
resident: null
phone: null
issue_type: null
issue_description: null
severity: null
photos: null
preferred_contact_method: null
```

Create accurate maintenance requests; collect required data and identify missing information.

- required: property, unit, resident, phone, issue_type, issue_description, severity, photos, preferred_contact_method.
- optionalEvidence: photos.

## 15. Property Owner Knowledge

Default scope: owner.

```yaml
notification_preferences: null
escalation_level: null
vendor_preferences: null
after_hours_rules: null
emergency_vendor_rules: null
approval_requirements: null
```

## 16. Property Management Intent Library

Default scope: platform.

| Knowledge intent | Existing workflow |
|---|---|
| LEASING_INQUIRY | leasing_inquiry |
| SHOWING_REQUEST | showing_request |
| APPLICATION_QUESTION | policy_question |
| PET_POLICY | policy_question |
| PARKING_QUESTION | policy_question |
| MOVE_IN | policy_question |
| MOVE_OUT | policy_question |
| PROPERTY_POLICY | policy_question |
| MAINTENANCE_REQUEST | maintenance_request |
| MAINTENANCE_STATUS | maintenance_status |
| VENDOR_RESPONSE | vendor_response |
| EMERGENCY | emergency_event |
| OWNER_REQUEST | unknown_question |
| UNKNOWN | unknown_question |

## 17. Response Principles

Default scope: platform.

1. Be accurate.
2. Never guess.
3. Never invent policies.
4. Never invent availability.
5. Never promise repairs.
6. Never give legal advice.
7. Never reveal private tenant data.
8. Escalate when information is missing.
9. Log every interaction.
10. Prioritize safety.

## 18. AI4Businesses Foundation Mapping

Default scope: platform.

Voice Engine, SMS Engine, Web Chat Engine, Customer 360, Lead Management, Knowledge Vault, Workflow Engine, Mission Control, Analytics, Authentication, Authorization, Supabase, Netlify.

## Runtime rules

Only approved current answer content is retrieved for the authorized audience. More specific scope takes precedence for the same topic. Equally specific conflicting answers require review; freshness alone is not authority. Drafts and expired entries are excluded. Private vendor/owner preferences remain staff-only.

Maintenance `medium` maps to existing `normal`; the workflow remains the source of request status. Photos are optional evidence, and emergency intake must not wait for photos or missing routine data. No legal, housing, applicant or financial decision is made by the agents.

## Implementation

Canonical machine-readable source: `twilio-bridge/pma-knowledge-v1.json`. Shared runtime instructions: `twilio-bridge/pma-profile.json`. The existing vault is extended with unit scope and structured template fields. Foundation copies are staff-only within each existing tenant; no new tenant/auth/knowledge engine is created. New tenants can install the same version through the authenticated owner action. Property templates install as unapproved staff-only drafts, then owners supply factual answer content, choose the audience, and approve explicitly.
