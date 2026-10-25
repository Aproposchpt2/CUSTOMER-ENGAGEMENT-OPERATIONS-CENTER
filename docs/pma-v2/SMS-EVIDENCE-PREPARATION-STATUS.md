# PMA v2 SMS blocker repair — preparation status

**Release decision: NO GO for three-recipient T-027 until installation and receiver verification.**

## A. Netlify

Published staging remains ready at deployment 6add7de18ee5dfde2b9d78fe / expected commit 916cadb50bf8f2e71ec717b7446a55398bbf0501. No release merge or deployment was performed. The existing audit establishes that the active pma-validation gateway has an identical tree. The new receiver/status/read routes are preparation only and are not live on that gateway.

## B. Supabase

Read-back during this continuation confirms zero active additional recipient preferences, zero Desert Ridge vendor assignments, and no private.pm_staging_sms_attempts_v1 table. No migration or configuration was applied. Original owner preference and existing emergency functions are unchanged.

Prepared a review-only private ledger and scoped service-role RPC. Four private RLS tables separate vendor bindings, notification attempts, provider events and owned-number inbox receipts. No raw table grants. Claims validate the fixed staging scope, bound incident/call, active exact preference and verified vendor assignment before sending. Only isolated local PostgreSQL tests executed this SQL.

## C. Twilio

No Twilio settings were changed and no live SMS was sent. The audit's receiving blockers remain: vendor's retired Sales handler, tenant demo auto-reply, blank backup-owner handler, retired ElevenLabs sender inbox, no application delivery callback. This package supplies proposed signed receiving/status endpoints and per-message callback construction; it does not claim Twilio invoked them.

## D. Corrective work completed in source

- Receiving-only signed webhook, returning empty TwiML with no reply/forwarding transport.
- Per-attempt callback with immutable provider MessageSid and destination correlation, event deduplication and non-regressing delivery projection.
- A persisted claim before the outbound request, unique per incident/role; no duplicate send or automatic retry after an uncertain result.
- Independent submission, provider delivery, owned inbox receipt and vendor test ACK. Real vendor assignment acceptance is always false in this synthetic feature.
- Protected read-only projection masks destination numbers and omits message text and ACK tokens.
- New behavior is explicitly gated by PMA_STAGING_NOTIFICATION_EVIDENCE_ENABLED=true; absent/false leaves the existing owner dispatch path unchanged.
- Exact migration/configuration/rollback sequence in STAGING-SMS-EVIDENCE-INSTALLATION.md. No IVR voice change, production work, Sales/Support rewrite or new live activation.

## E. Validation

PASS: 289 application tests, 57 bridge tests, TypeScript, optimized build and diff check. Existing Supabase Edge Runtime build warning remains. New tests use the official Twilio SDK with synthetic signatures, local fetch mocks and isolated PostgreSQL. They cover disabled/production/account/number/query tampering, no DB access on rejected webhooks, receiver with no auto-reply, read API authentication, claim-before-send, duplicate claims, UNKNOWN timeout handling, inactive preferences, absent vendor binding, raw table denial, callback-before-completion, out-of-order/duplicate statuses, wrong provider reference, inbox replay, separate test ACK and privacy-safe inspection. No live delivery or human vendor acceptance is claimed.

## F. Remaining actions

Review stacked PRs; authorize/apply the staging-only migration; choose the authoritative vendor record and establish its property and private test binding; deploy the approved source with the new flag initially off; separately authorize staging installation/flag and SMS-only receiver configuration; verify receiver visibility and authenticated evidence reads. Keep all three additional preferences inactive throughout installation. Only then obtain explicit owner authorization for one controlled sending test and preference activation.

Provider-delivered, owned-number inbox receipt and test ACK remain different facts. A correlated ACK from an owner-controlled test DID does not verify a real vendor's identity or accept a maintenance assignment. Unknown submission or missing callback requires read-only provider verification and an authorized reconciliation decision, never blind replay of the completed call.

## G. Decision

**NO GO for T-027; ready for review of corrective staging installation.** Working owner alert, IVR voice and current release remain preserved. These changes extend the existing dispatcher with evidence and receiving; they do not replace the PMA architecture.
