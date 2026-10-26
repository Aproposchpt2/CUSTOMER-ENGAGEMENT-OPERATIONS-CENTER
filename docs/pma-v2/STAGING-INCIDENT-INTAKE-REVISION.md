# PMA staging incident intake revision

## Product flow

Carol answers as Desert Ridge Customer Care Center, gathers the caller-reported name, property address and unit when applicable, and records the incident description verbatim. The runtime uses a `PMA-` case number. After the trusted workflow confirms persistence, Carol asks whether the caller is ready, reads the actual case number twice, explains current portal capability accurately, and records a text, email or phone preference only after explicit consent.

Routine reports use one `MAINTENANCE_REQUEST` workflow; callers do not select a category or severity. Fire, suspected gas leaks and immediate threats continue through the dedicated emergency path. The original description remains unchanged in either path.

## Persistence and scope

- The staging case is recorded in `public.pm_maintenance_requests`, which is already visible to the property operations portal.
- `case_number` is a generated random reference distinct from the internal request UUID.
- Caller name, address and unit are stored as caller-reported facts; they do not authenticate occupancy.
- The operation is bound to the active synthetic voice session, call SID, tenant, configured property and configured property writer.
- An exact repeat in the same call replays the original case. Changed details in that call return a conflict for staff review.
- The case is created as `New`; no maintenance vendor is assigned and no message is sent by this revision.
- Contact preference, destination and explicit consent are stored against the case. A saved preference is not a notification receipt.
- Carol must not say that stakeholder notifications were prepared or sent; the normal incident path does not prepare or send them yet.
- The current resident portal requires an authorized account and does not support tenant case-number lookup. The spoken script must not promise that the case number currently opens a portal or exposes live tracking.
- Staging call transcript turns are written to `public.ai4cc_transcripts` through a service-role-only RPC and property-scoped writer. Transcript content is not included in application logs.

## Portal and plan direction

The tenant case portal is a separate follow-on. Once it supports tenant case lookup and is enabled for Desert Ridge, a case-specific link can be delivered through the tenant's recorded text or email preference after a successful send. Phone preference supports phone updates; it cannot deliver a clickable link by itself. The current staging revision does not promise or send a portal link, and it does not guarantee future updates after recording a preference.

Proposed service tiers remain product configuration, not runtime gates in this revision:

1. Customer Care: 24/7 intake, case creation, urgent manager notification and tenant case link.
2. Maintenance Coordination: client-supplied contracted vendor directory, case-based vendor notifications and vendor updates.
3. Property Operations: manager dashboard, portfolio oversight, escalation rules and reporting.

Vendor assignment and status depend on the client's configured contracted vendors and their participation. A case state must distinguish intake, manager alert, assignment, vendor acknowledgment, carrier delivery and resolution.

## Release limits

This migration is staging-only. It retains the existing emergency dispatcher separately. It does not activate routine manager/vendor SMS, enable new recipients, send portal links, create vendor assignments, publish a public tenant portal, or alter production. A production migration requires a separate identity, retention, portal authorization, messaging and subscription-plan review.
