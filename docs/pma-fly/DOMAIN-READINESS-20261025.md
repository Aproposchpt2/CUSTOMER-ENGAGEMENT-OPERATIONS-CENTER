# PMA final staging domain readiness — October 25, 2026

Decision: **NO GO for the controlled live emergency notification test.** Configuration and non-sending database checks pass; deployment provenance and communication-path evidence remain unresolved.

## Verified source and runtime
- Repository: Aproposchpt2/CUSTOMER-ENGAGEMENT-OPERATIONS-CENTER.
- Current remote pma-validation source: e9917ed7628f7b910514d8dba0ace9bcf6f6cd06, emergency tool-call/submission logging correction.
- Reviewed bridge candidate: d8f68a495bd9dc3164edb02244d4878306f657cc; PR 143 remains open, stacked on PR 142, also open. Neither was merged or deployed by this audit.
- Active voice gateway: https://pma-validation--ai4cc-staging.netlify.app.
- Authenticated, non-sending GET /api/staging/pma-emergency-readiness returned HTTP 200, configurationReady=true, no configuration blockers, liveSmsAttempted=false. All 15 checks passed: authorized environment/project/tenant/property/gateway/sender, five enablement flags and four credential-presence checks. Credential presence is not proof of provider authorization.
- This runtime returned revision=null, deployId=null and context=null. Its exact uploaded source cannot be independently attested from this endpoint. The Git branch head must not be presented as the deployed gateway revision.
- Separately, Netlify's published operator site deployment 6add90a37840a0c0a01e7fda is ready at cda9967520269a93bb9c6b452e890dc5fee501a9. It is not proof of the pma-validation alias contents.
- The gateway readiness route rejects unauthenticated requests with 401; Netlify request 01M5T4HKXFPSQJJENTXXJKEHS1 independently confirms the function invocation and response.
- Existing bridge evidence identifies release v32, baked image source 9905d810954ccd688661f51605a7899be5effcce and immutable digest sha256:a07062f86d5c24b691fcd7f1dae368c668eeb439becf567eba57f09bb3d967b3. Fresh public health still reports 12c54995fb746e9d8d3937a240031aa58bad9da5, PMA/IVR enabled, catalog 1.0, zero active calls. No fresh console reattestation: the browser session now requires sign-in. Prior mixed-image and seven pending-secret findings remain unresolved release gates, not newly verified effective values.

## KB and intents
- Authorized staging Supabase: hvzauakkhlivzeqatfqm.
- Tenant 5885a020-d363-4c27-910a-c035eda132f5; Desert Ridge property eead9ac5-b28b-4594-b75b-a9e9bbbd111f.
- Deployed pm_public_voice_knowledge_v1 returns 42 records, all VERIFIED. Foreign property query returns zero.
- Database pm_catalog_config reports version 1.0 and 25 intents. Reviewed gateway source explicitly loads pma-intent-catalog-v1.json; bridge health also reports 1.0.
- Extended V2 content exists: 36 pma_operations_v2 KB entries and 28 pma_intent_catalog_v2 entries, approved/VERIFIED, publication_state=published, but visibility=staff and audience_scope=internal.
- Therefore V2 is published as an internal implementation reference, not activated as caller-facing V2 orchestration. None of those 64 entries is returned by the public voice knowledge RPC. Do not make them public as an incidental fix.

## Deployed database and security verification
- pm_voice_turn_v1 checks active voice parent session, two-hour lifetime, call SID, PMA selected route, property, tenant and immutable session scope. Actor is resolved from enabled database configuration; model identity is not accepted.
- Database operations have unique operation_id, primary key(session_id, kind, revision), stored outcomes, conflict/replay handling and explicit UNKNOWN recovery. Source projection refuses unsupported persistence claims.
- Emergency preparation is restricted to service-role claims and the exact staging tenant/property. Non-test calls require a matching active PMA call session.
- Incident key combines call and emergency intent; advisory transaction lock prevents duplicate preparation. FIRE/GAS map to SEV1.
- Public/private emergency preparation, voice-turn and SMS evidence RPCs deny anon/authenticated execution and allow service_role. Evidence tables have RLS enabled and deny direct reads to anon, authenticated and service_role.
- Real deployed database rollback test under service_role: synthetic GAS incident created, SEV1 row read back, retry reused the same ID with notify=false, unbound real-session request rejected.
- Second rollback test: prepared separate attempts for owner/vendor/tenant/owner_backup, retry returned claimed=false with same attempt ID, unapproved role rejected. All four attempts remained PREPARED with no provider SID, delivery state or acknowledgment.
- Post-rollback verification: incident count unchanged at 3; zero rollback fixtures; zero SMS attempts and events. No transport was invoked. These are sequential runtime checks, not independent concurrent-connection proof.

## Effective notification configuration and evidence
- Authenticated runtime check confirms configured sender +17252010584 and required credentials present. Provider validity/registration is unverified.
- Netlify branch configuration currently sets PMA_STAGING_NOTIFICATION_EVIDENCE_ENABLED=true; the readiness response does not itself expose or attest that specific flag.
- Database currently has active=true and staging_override=true for:
  - existing owner ending 8039 (preserved)
  - pma_v2_maintenance_vendor_test ending 5102
  - pma_v2_tenant_test ending 2622
  - pma_v2_owner_backup_test ending 1414
- These were already active when inspected; this audit did not activate, deactivate or contact them. A live emergency test may notify all four SMS destinations.
- One property/vendor link and one exact scoped vendor SMS binding exist; rollback preparation successfully resolved that vendor. There are zero maintenance vendor assignment records for this property.
- Installed SMS ledger distinguishes PREPARED/SUBMITTED/FAILED/UNKNOWN, signed delivery events and vendor_test_ack_received_at. Provider SID and attempt correlation, unique recipient claims and append-only event keys support independent evidence.
- Current durable records: zero SMS attempts, zero delivery events, zero inbound SMS records, zero vendor test acknowledgments. No actual delivery or acknowledgment is claimed.
- TEST ACK is explicitly not acceptance of a maintenance assignment (vendorAcceptedAssignment=false). Real assignment acceptance remains a separate authenticated workflow.
- The dispatcher has no email transport; configured email preference must not be reported as delivered or submitted.
- No connected Twilio account-management capability is available in this session. Ownership, SMS registration, effective receiver webhooks, sender authorization and provider delivery logs were not freshly verified. No Twilio settings were changed.

## Candidate compatibility and tests
- PR 142/143 leave PMA domain orchestration, dispatcher, intake route, PMA adapter and IVR voice-entry source unchanged relative to the integration candidate. They add image packaging/provenance, compatible dependency remediation and staging startup guards.
- Emergency dispatch SHA-256 is identical at e9917ed and d8f68a4: a65a6037d6f6cb0afc16586300ec0b5306bee4571d770d7960736d77b3ba6324.
- Voice orchestration SHA-256 is identical at both: 3f4d697317740ee5a4a8370363114a06231e277f23c7059d6e59b71c581a8339.
- Fresh focused suite: 53/53 passed across emergency wiring, permission repair, SMS evidence, readiness, intents, transport security, Fly provenance and startup guards. Provider calls are mocked; no SMS sent.
- Existing exact candidate CI independently rechecked as SUCCESS:
  https://github.com/Aproposchpt2/CUSTOMER-ENGAGEMENT-OPERATIONS-CENTER/actions/runs/40205775547
  It contains 311 application and 59 bridge tests, isolated HVAC SQL validation, types/build, dependency audits and actual builds/startup/health of both Docker images. These were not rerun or deployed in this domain audit.

## Remaining gates and ownership
1. PMA release owner: identify the actual pma-validation upload and source/build evidence. Readiness runtime metadata is null; obtain provider branch-deploy evidence or an approved immutable build receipt.
2. Fly lead/release owner: approve exact incorporation/release of PR 142/143 and reconcile image provenance, effective secret versions and mixed machines. No release is authorized by this report.
3. PMA content/orchestration owner: decide approved V2 runtime bindings; internal publication does not activate the revised service delivery.
4. Twilio/account owner: verify sender and all receiving paths read-only, including status callback and vendor reply routing. Preserve the main IVR voice webhook.
5. Owner: authorize one explicit controlled sending plan only after the above evidence is accepted. Record submission, carrier status and vendor test reply separately; do not claim maintenance assignment acceptance.

No corrective PMA code change was necessary for the mechanisms tested. The report records unresolved access, provenance and release gates without changing working architecture, notification preferences, knowledge publication, Twilio, Fly machines or production.
