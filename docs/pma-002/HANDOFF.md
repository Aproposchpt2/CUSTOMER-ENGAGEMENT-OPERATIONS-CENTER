# STELLAR-PMA-002-R1 — Agent 03 implementation handoff

October 23, 2026 (America/Los_Angeles). To Project Orchestrator and the future Agent 05 integration role. Agent 05 is a handoff destination, not an agent created or contacted during this work.

**Disposition:** PMA domain safeguards implemented and staging SQL verified. Application code is not deployed. Voice integration and independent telephone acceptance remain pending. Real calendar booking is disabled.

## Recovery and source provenance

Recovery assignment: https://docs.google.com/document/d/1Q6BOJ4xDLELtYgiEEHiq6YNVxURsKbTqH9htghFl1Ak/edit

Repository: https://github.com/Aproposchpt2/CUSTOMER-ENGAGEMENT-OPERATIONS-CENTER

Branch: `implementation/pma-002-agent03-20261023`. Audited application base: `0c7074d1b41cd0526bf2f996fc9d4fbebccf9507`.

Recovered four uncommitted files: domain.ts, availability.ts, the PMA branch of voice-demo-staging.ts, and an unfinished 216-line migration. Checkpoint: `2a06b98aed2090359e97d962457bcc66a7f89851`. Domain implementation checkpoint: `cfb0ed1a8fbd8f8649117984b41b502a65f49b09`. Subsequent corrections, tests and documentation are new work. No files from the failed scheduling write survived; scheduling/prospect contracts were authored in this recovery session.

The named remote branch was absent on inspection. It was created through the connected GitHub account at the audited base. Raw git push initially received an automatic review rejection; repository inspection then verified public visibility, ownership by connected Aproposchpt2, and push/admin permission. Retrying raw git passed review but failed because git had no interactive credentials. Connected GitHub publication is used instead; no credentials were exposed and no force push is authorized.

Current GitHub comparison for this repository reports release/pma-fly-staging-20261022 at ancestor `5b2a48dfd6846fcd14eb7ad37b936d7cfe22493e`, 36 commits behind the audited application, with no commits ahead. This differs from the audit's historical divergence snapshot against `5f803c6…`. Keep those observations distinct; neither proves current Fly/Netlify deployed source. No release branch was merged.

## Implemented behavior

- One SQL `private.pm_knowledge_eligible_v1` predicate controls PMA voice preload, transactional answers, customer/resident RLS answer access and the public prospect listing. It requires exact approved=true, publication_state=published, source_status=VERIFIED, authorized tenant/property/unit/visibility, non-template nonblank content, and current effective/expiry/validity bounds. Null validity bounds retain the prior unbounded-date meaning; null reviewer metadata is not invented. Staff editing access remains unchanged. Existing answers remain searchable with the prior conservative full-text/conflict behavior. Returned selected answers include ID/version/reviewer metadata.
- SQL DATE stays YYYY-MM-DD; voice responses additionally include a calendar-date label. Relative day helpers use America/Los_Angeles. Offset-free timestamps, invalid dates and DST gaps are rejected; repeated DST hours require an explicit valid offset. The SQL catalog and PMA voice inventory path use the existing 24-hour freshness threshold, vacant status and nonnull date; catalog lookup also honors exact unit scope. No unit timestamps were refreshed artificially.
- Synthetic tour slots carry source_ref, timezone, start/end, capacity, blackout and version. The default list is REQUESTED_ONLY with no slots. Two independent fixture gates are required for synthetic slots: a transaction-local pma.synthetic_tours_enabled=on setting AND property.metadata.pma_synthetic_tours=true. Neither is enabled for Desert Ridge. New showing operations lock the stable operation key and the slot row; capacity is rechecked before an atomic reservation/showing/lead/audit write. REQUESTED is the fallback. CONFIRMED_SYNTHETIC is possible only for persisted synthetic test reservations. Semantic retries recover the original showing even if notes are rephrased; changed time/contact/unit/version conflicts.
- Prospect capture uses existing ai4cc_contacts and ai4cc_leads. It requires an active persisted synthetic PMA call/session, explicit boolean consent and confirmation, validated text and contact method. It creates a session-specific contact instead of overwriting the shared fixture or merging an unverified phone/email identity. Versioned spelling/contact corrections update the same session contact; stable retries recover the same IDs. Consent denial creates no prospect. Capturing a prospect does not authenticate a resident.
- Structured maintenance captures category, description, impact, urgency, safety indicators and optional contact preference/photo references. Unitless common_area is allowed for authorized contacts; other unitless categories are rejected. Safety indicators/deterministic hazards override routine urgency. Existing resident own-record scope and staff-only lifecycle authority remain in place. Notifications are actual blocked sandbox tasks with notificationSent=false, QUEUED_SIMULATED and no provider receipt; no dispatch, arrival or completion assertion is added.

## Staging migrations

Project is exclusively `hvzauakkhlivzeqatfqm`. All three migrations were applied and read back. Local filenames and server history versions differ because the migration tool assigns its own version.

| Local migration | Staging history version | State |
| --- | --- | --- |
| 20261023172852_pma_002_controlled_domain_safeguards.sql | 20261023175722 | APPLIED / VERIFIED |
| 20261023175818_pma_002_public_listing_gate.sql | 20261023175954 | APPLIED / VERIFIED |
| 20261023180027_pma_002_prospect_audit_authority.sql | 20261023180048 | APPLIED / VERIFIED |

Additions: knowledge schema reconciliation columns only if absent; PMA unit DATE/property timezone/metadata reconciliation; maintenance intake_details; private pm_tour_slots_v1 and pm_tour_operations_v1; PMA-scoped function/policy replacements and versioned RPCs. No knowledge content or publication state was changed. No new CRM contact model was created.

Live staging exposed a permission difference: service_role cannot directly insert audit_log. A failed test rolled back fully. The third migration moves bounded prospect capture to a private service-only SECURITY DEFINER and exposes an invoker wrapper. It grants no new rights on shared audit/contact tables. All public new RPC wrappers are SECURITY INVOKER. Private tables have RLS and no direct public/anon/authenticated grants/policies; only guarded private definers mutate them. Advisor INFO for those intentionally default-deny private tables is documented in evidence; there are no PMA-specific WARN findings. Existing Support/Auth advisor warnings were left unchanged and outside scope. Advisor reference: https://supabase.com/docs/guides/database/database-linter?lint=0008_rls_enabled_no_policy

The broader scoped tenant/property-or-workspace knowledge set contains 148 rows (not the audit's PMA-only 69 selection). Before/after row hash is identical: `e6dee66f7758d8f3b0065bff22ef1022`. This proves this run did not alter those existing rows; it does not certify their policy accuracy or owner review.

## Agent 05 contracts — version 1.0

### Trusted call and stable operation boundary

EXISTING TypeScript contracts: `lib/propertyManagement/callScope.ts` and `scheduling.ts`.

After existing HMAC/Twilio checks, fetch the persisted parent interaction server-side. `pmaCallScope(row,binding)` validates tenant, property, session UUID, call SID, selected PMA route, active/open status, synthetic/demo flags and no end time. Binding tenant/property/actor comes from approved server configuration, never model fields. A persisted capture yields contactId; otherwise it remains null. verifiedResidentUserId remains null until a separate identity-verification flow exists.

`pmaOperationId(scope,kind,nonce,secret)` produces pma:v1:<HMAC> for showing/prospect/maintenance. Allocate the nonce server-side ONCE for each confirmed semantic operation and durably retain it in the operation ledger. Reuse it after timeout/reconnect/rephrasing; never derive identity from wording or per-turn model tool-call IDs. The helper does not itself persist a ledger. Return UNKNOWN on transport uncertainty, then recover with the same operation. Never announce a reference before a persisted result.

PROPOSED integration work: add PMA-only gateway/adapter actions and a durable trusted operation/session wrapper. New scheduling/maintenance authenticated RPCs are NOT directly executable using service_role. A reviewed private service-only wrapper must validate the persisted call, configured actor's property write authority and server-derived contact/unit scope before invoking them. Do not grant broad service-role table permissions, expose arbitrary actor impersonation, or enable the new actions through the Support RPC allowlist. This wrapper is an integration prerequisite, not an implemented HTTP endpoint. Existing trustedPmaTurn still uses the bounded synthetic fixture and must not be represented as real caller capture.

### Knowledge and availability

EXISTING SQL: public.pm_public_voice_knowledge_v1(t uuid,p uuid) -> JSON array; service_role only. PMA branch of voice-demo-staging.ts calls it; Sales/Support branches retain their original behavior.

EXISTING voice tool: pma_check_availability({bedrooms?}) remains untouched in pma-adapter.cjs. PMA HTTP callback now returns {success,stagingOnly,property,asOf,timezone,availabilityMaxAgeHours:24,units:[{unit,bedrooms,bathrooms,earliestRecordedDate,earliestRecordedDateLabel,recordUpdatedAt}],requiresHumanReview,availabilityGuaranteed:false,disclaimer}. No read failure is converted to fabricated availability. Quote earliestRecordedDateLabel without converting SQL DATE into a local midnight instant. Empty/stale/error means staff confirmation is needed; vacancy dates are never tour slots.

### listTourSlots

EXISTING SQL: public.pm_list_tour_slots_v1(t uuid,p uuid,from_time timestamptz,to_time timestamptz) -> JSON; authenticated property writer. Window must be positive and at most 31 days. Returns {contractVersion:'1.0',mode:'REQUESTED_ONLY',slots:[],authoritative:false} by default. Synthetic fixture mode returns source_ref/version/timezone/remaining capacity for each real persisted fixture slot, marked SYNTHETIC_TEST and authoritative:false. No real appointment source is connected.

PROPOSED bridge action name: listTourSlots. It must preserve that distinction and must not advertise synthetic slots as real availability. Resolve 'today/tomorrow' by requestedDay; a day label does not create a reservation. Real office-hours/notice/blackout rules require owner-approved configuration; no Sunday schedule is inferred from vacancy dates.

### requestOrBookShowing

EXISTING SQL: public.pm_request_or_book_showing_v1(t uuid,p uuid,c uuid,u uuid,operation_id text,requested_at timestamptz,notes text default '',slot_id uuid default null,slot_version integer default null). Authenticated property writer; operation ID 8–150 characters. Validate requested_at with showingInstant before SQL; do not pass offset-free/natural language to PostgreSQL.

REQUESTED + persisted=true + showingId + leadId + bookingConfirmed=false means request saved, pending staff confirmation. REQUESTED_ONLY + persisted=false means a supplied slot cannot be booked because authority is unavailable. CONFLICT + persisted=false means refresh/clarify; never silently change the user's chosen time. CONFIRMED_SYNTHETIC is test-only with a persisted synthetic reservation. All responses keep notificationSent=false. Cancel/reschedule are NOT implemented; route to staff and leave the original request unchanged.

### captureProspect

EXISTING SQL: public.pm_capture_prospect_v1(t uuid,p uuid,session_id uuid,call_sid text,operation_id text,details jsonb); service_role only via private bounded definer. Details keys only: name, email?, phone?, consent, confirmed, expectedVersion?. Name is 2–150 characters; email is lowercased/trimmed and syntactically checked; phone is E.164. Explicit confirmation is required after spelling review; syntactic validation is not email/phone ownership verification.

First save expectedVersion=0 or omitted. Corrections need a new retained operation ID and current expectedVersion. Response CAPTURED includes contactId,leadId,version,persisted=true,testOnly=true,notificationSent=false. Same operation and normalized payload replays. A stale version or changed payload with the same operation conflicts. CONSENT_REQUIRED/persisted=false creates no contact/lead. Do not release synthetic records to outbound automation.

### maintenance and status

EXISTING SQL: public.pm_submit_maintenance_v1(t uuid,p uuid,c uuid,u uuid,operation_id text,ch text,details jsonb). Authenticated property staff or independently authenticated resident matching the contact/occupancy. Operation ID 8–140 characters; channel voice/sms/chat. Required details: category,description,impact,urgency(low/normal/high/emergency),safetyIndicators:string[],confirmed:true. Optional preferredContactMethod(phone/email/sms),photos:string[] (references only, no fetch); photo evidence is optional. photos are not proof of upload authorization. Unit may be null only for valid common_area.

Result includes persisted requestId, urgency, notificationTaskId,notificationState:QUEUED_SIMULATED,notificationSent:false,providerReceiptId:null. Replay returns the original committed outcome. Current status must be fetched through existing authorized MAINTENANCE_STATUS/catalog path; a replay result is historical, not a fresh status assertion. Never infer resident identity from caller ID, prospect consent or a spoken name. Voice resident status remains BLOCKED until independent resident/contact/session linkage exists. Staff verifies vendor completion and closes requests through the existing lifecycle.

## Validation and limits

`node scripts/verify-pma-002.mjs` runs `npm test` and `npx tsc --noEmit`, captures logs/exit codes. Final run: 211 tests PASS, 0 FAIL; TypeScript exit 0. No skipped tests. Includes all 25 catalog routes, P0 exclusions across preload/transactional/public listing, resident RLS, exact dates/stale/occupied/unit filtering, explicit DST offset behavior, lookup failure, request/replay/conflicts, consent/normalization/correction, common-area preservation, simulated receipts and rollback.

Live staging SQL executed and passed:
- supabase/tests/pma_002_acceptance.sql — new contracts T03/T04/T06/T08/T10/T11/T14; rollback.
- supabase/tests/pma_acceptance.sql — existing tenant/property/role/lifecycle/notification regressions; rollback.
- supabase/tests/pma_catalog_acceptance.sql — all 25 catalog routes and authorization; rollback.

Separate transaction capacity test: transaction 2308 created CONFIRMED_SYNTHETIC; 2309 returned CONFLICT; exactly one reservation/showing existed. Guarded cleanup removed fixtures. Calls were submitted in parallel, but recorded transaction times do NOT overlap because the connector serialized them. This is capacity-conflict evidence, NOT a proven simultaneous-lock contention pass. Agent 06 must run independent concurrent connections before any real scheduling activation. Reproducible setup/call/cleanup SQL and timing evidence are included.

Postflight: zero fixture tenants, zero synthetic slots, zero tour operations; Desert Ridge synthetic tour gate false. Final schema/functions/history were re-read and hashes saved. No provider message, real booking, test telephone call, application build/deploy, Fly config, IVR route, Sales code or Support code was changed. No CI run is claimed; tests ran locally and via staging SQL.

## Owner review list and remaining gates

Draft policy review only; originals preserved:
1. Resolve rent grace/late-fee contradiction: KB grace through day 3/late day 4 versus property metadata five-day grace/$75. Quote neither as a settled rule before approval.
2. Reconcile smoke-free wording versus common-area-only metadata; do not choose a stronger rule independently.
3. Review screening/income/credit/guarantor/occupancy rules; no individual housing decision.
4. Review pet restrictions and assistance-animal handling separately; no automated eligibility or fee determination.
5. Review move-out notice/deposit return deadlines, entry notices and towing rules.
6. Verify emergency contacts/after-hours procedure; no invented emergency number or dispatch.
7. Approve maintenance/vendor callback, response, arrival and completion commitments; queued tasks are not provider receipts.
8. Approve owner spending thresholds, vendor terms and signing authority.
9. Supply calendar authority/source, tour duration/capacity, notice period, closed days/blackouts, autonomous-booking authority, cancel/reschedule rules and callback commitments.
10. Confirm inventory freshness provenance/refresh process. Units 415 (2026-10-25) and 301 (2026-11-01) remain vacant, but are now over 24 hours old and will be withheld until legitimately refreshed; occupied 205 stays excluded. No record was refreshed to make a test pass.

Agent 05 may review/integrate the committed contracts in an isolated branch. Do not enable the bridge actions before the trusted session/operation wrapper is implemented and reviewed. Agent 06 must independently verify deployed source provenance, simultaneous contention, end-to-end recovery, actual spoken dates, no cross-contact disclosures, and owner telephone acceptance. Neither role was instantiated during this assignment.

## Rollback and release boundary

`docs/pma-002/rollback.sql` is a tested behavior rollback, NOT automatically applied. It restores pre-change PMA answer/catalog/listing definitions/policy and revokes v1 workflow entry points while retaining additive columns, private storage and persisted references. Coordinate any later application source rollback to the audited base. Do not drop populated structures or rewrite the existing 69-row PMA inventory. Retest and re-read functions after any approved rollback.

No merge, deploy or production approval is included. A database migration is not an application release; running Fly/IVR routing remains untouched. Evidence paths and exact changed-file list are in this directory. Final remote commit details are recorded in PUBLICATION.md after publication verification.
