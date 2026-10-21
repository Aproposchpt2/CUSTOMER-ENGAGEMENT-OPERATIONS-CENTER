# STELLAR INTELLIGENT TECHNOLOGIES — Private Gateway Acceptance
Operated by Apropos Group LLC

Date: October 20, 2026. **Overall: PARTIAL acceptance; production NO-GO.**

## Verified deployed target
Private Netlify PR #77 preview, deploy 6ad73d3b43df9970ecf81146, exact application commit f0553ac7290cfe0ade53a2300f416f5b25fcdd37. Team SSO applies to all deployments. Application email-code sign-in succeeded and active staging OWNER/ADMIN authorization admitted the test page. Existing published staging deploy unchanged; branch deploys restored to None; PR remains draft/unmerged.

## Executed results
| Check | Result | Actual evidence |
|---|---|---|
| Authorized application access | PASS | Email-code login and private acceptance page rendered |
| G01 fictional submission and authoritative persistence | PASS | One case bbcdda13-1487-4565-981c-dcc002c68a26, one contact 69e8e6d4-2f83-4c3a-b9ff-f614f392b9df, workflow 16bd5fc6-ce7e-4fc2-bb35-6284ce36fe42 COMPLETED |
| Original-operation status recovery | PASS | Browser HTTP_CONFIRMED/COMPLETED; same case/session/tenant in SQL |
| G04 sequential duplicate subset | PASS | Original case returned; SQL workflow version 3 unchanged and exactly one COMPLETED event before/after |
| G03 forged tenant, changed intake and tampered token subset | PASS | HTTP 400,409,403 respectively; no additional persistence |
| G06 absent-operation subset | PASS | UNKNOWN_WITHOUT_TICKET; no second workflow/case |
| G07 independent database/security/cleanup | PASS | Exact count and row fingerprint equality on all six tables; security snapshots identical |

Tenant: 5885a020-d363-4c27-910a-c035eda132f5. Operation: gateway:6a9f61c9-7041-4901-913c-690f1929d0fa. Original session: phone-staging:CAb82580b0bbab47f09877aa07b8c72557. Synthetic contact uses example.invalid, test_only=true and notifications_disabled=true.

Event IDs: 127 ACCEPTED,128 RUNNING,129 COMPLETED. All were PENDING with attempts=0; no dispatcher delivery or notification occurred. Completion event case ID matched authoritative persisted case. SQL timestamps from acceptance 2026-10-20T10:14:56.843284Z to completion 10:14:57.899252Z span approximately 1.056 seconds. This does not measure HTTP round trip or voice latency; no model/voice test or per-call cost measurement occurred.

## Original and final counts
| Table | Original | Final | Whole-row fingerprint |
|---|---:|---:|---|
| Support cases |20|20|ddeb4729999cd8a90965ab2197b4355c|
| Contacts |13|13|a67f355fc8bc1a3e258ab772b308c485|
| Workflows |0|0|d41d8cd98f00b204e9800998ecf8427e|
| Outbox events |0|0|d41d8cd98f00b204e9800998ecf8427e|
| Dispatch receipts |0|0|d41d8cd98f00b204e9800998ecf8427e|
| Dispatch effects |0|0|d41d8cd98f00b204e9800998ecf8427e|

Cleanup committed through the existing administrative testing mechanism with exact manifest-bound tenant/session/workflow/case/contact guards and expected delete counts. Removed exactly 3 events,1 workflow,1 case,1 contact. Separate post-cleanup queries confirmed fingerprints and permissions. No grant, schema, RLS or RPC change was made. Reloaded the browser after cleanup to discard the in-memory operation capability and prevent accidental resubmission from the completed fixture.

## Pending / not accepted
G02 real foreign/inactive-user access; G03 real capability expiry; G04 simultaneous first submission in separate processes; G05 gateway committed worker interruption/restart; G06 invalid persisted association. Previously executed headless C1/R1/V5 evidence is separate and does not establish these browser-gateway scenarios. No full G01–G07 acceptance or production readiness claim.

No functional defect was observed in the executed live subset. The publishing repair was the preview-only scanner exclusion for the public SUPABASE_URL endpoint, not an API-key exclusion. Prior unit/regression validation remains 43+110 tests with build success.

Next engineering gate: design and run the pending gateway identity, expiry, concurrent first-submit and process-interruption tests using existing approved staging mechanisms and deterministic cleanup. Do not provision identities/infrastructure or elevate privileges without authorization. Preserve approved voice agent, instructions, routing and production. No merge or Railway deploy.

Actual SQL queries/responses and browser observations: docs/evidence/stellar-pr77-gateway-live-2026-10-20.json (evidence commit 4e18f206db00dafa5905e3b43211cbef550975ac).


## Addendum — real expiry completed at 11:07:55Z, October 20
G03 real capability expiry is now PASS on preview deploy6ad747abc3fe26d78bc9f2b6, exact source ec9f9a0edf3cf9f73a72dd193641b21d33abe7c4. Original server TTL900seconds was unchanged. The unsubmitted capability expired11:07:40Z; actual authenticated browser request recorded HTTP403 OPERATION_NOT_AUTHORIZED at11:07:55.710Z, with no verified case/customer/success. All six final counts and whole-row fingerprints match baseline20/13/0/0/0/0; security fingerprint7d7d57fadb6ad09162e3b6c37baa1a31 unchanged. No fixture write or cleanup deletion. Browser capability discarded by reload after saving evidence. Evidence: docs/evidence/stellar-pr77-real-expiry-2026-10-20.json, commit8f8bcd19ea6bf2533a1503771bef0d74676bd5d6. Expanded gateway/harness suite46/46PASS and secret-free GitHub contracts checks successful. Pending items above are historical where they include real expiry; remaining gates are G02 actual foreign/inactive identity,G04 two-process first submit,G05 gateway process restart,G06 invalid association through HTTP. Overall remains partial acceptance; productionNO-GO.
Owner clarifies his business tenancy is development/testing only and there are no external clients. No production/Railway/routing/approved-agent change or PRmerge authorized by this clarification.
