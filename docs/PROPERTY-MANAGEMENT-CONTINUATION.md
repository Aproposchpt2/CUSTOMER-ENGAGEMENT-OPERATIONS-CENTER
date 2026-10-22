# Property Management Assistant — current staging status

> 2026-10-22 Fly migration update: read PROPERTY-MANAGEMENT-FLY-STAGING.md first. It supersedes the older Railway/preview configuration notes below.
>
> Fly app ai4-pma-bridge-staging is deployed and healthy on reviewed source 5b2a48dfd6846fcd14eb7ad37b936d7cfe22493e. Authenticated synthetic audio probe received OpenAI audio. KB v1 and 25-intent catalog are installed; synthetic resident binding was repaired with a separate test unit.
>
> Latest real call CA00ee4da0280cd6234cd3ed1cd52e311c at 16:36:11 UTC failed Twilio 11200 / HTTP 404 at the old private-voice-poc URL. Dedicated DID (702) 935-1414 Voice POST URL has now been corrected and saved to https://pma-validation--ai4cc-staging.netlify.app/api/twilio/pma-voice-staging.
>
> BLOCKER: preview channel flag true is configured, but gateway rebuild run 39814792785 (release commit c0b5336eb8c0a07cd8e3a035d11da0662c4f5dd3) is queued without a runner; pending environment approvals are empty. Current gateway still responds 503 channels disabled. GitHub Status reports Actions degraded performance. Do not trigger duplicate releases or weaken guards.
>
> Next: check this run, verify gateway signature/HMAC guards after release, test synthetic bridge-to-Supabase persistence, then request a real inbound call. No successful phone call is claimed. PR #91 remains draft/unmerged; production, SMS and existing bridges unchanged.

## Earlier notes (historical; use current status above)

# Property Management Assistant — remaining environment work

> Latest call diagnosis: PROPERTY-MANAGEMENT-CALL-FAILURE-20261022.md supersedes the preview-deployment blocker below. The web release succeeded on a later attempt. Both PMA voice POST endpoints return 503 because channels remain disabled; the Railway PMA integration and exact Twilio call/routing evidence remain outstanding.

> Current configuration audit: read PROPERTY-MANAGEMENT-CONFIG-AUDIT-20261022.md before continuing. The owner confirms OpenAI/Twilio/Railway is the approved voice stack; ElevenLabs is not used. Railway access is restored. There are 66 loaded property-scoped knowledge entries, with publication-state consistency and a synthetic resident-binding mismatch still to resolve. The PMA preview remains undeployed. This audit supersedes older assumptions about missing content or Railway authentication.

Owner authorization covers implementation and staging. Production requires separate authorization. Keep PR #91 draft and unmerged. Do not deploy the implementation branch.

Repository: Aproposchpt2/ai4-contact-center
Branch: feature/property-management-assistant-mvp
Staging Supabase: hvzauakkhlivzeqatfqm
PR: https://github.com/Aproposchpt2/ai4-contact-center/pull/91

## Resume only the unresolved work
1. Read PROPERTY-MANAGEMENT-STAGING-ACTIVATION-20261022.md and PROPERTY-MANAGEMENT-STAGING-RUNBOOK.md. Both Knowledge Base v1.0 and the full 25-intent catalog are now installed and verified on staging. Do not reapply them or duplicate the platform.
2. Verify current migration history before any new schema work. The connector recorded `pma_knowledge_model_v1` as 20261022055747 and `pma_intent_catalog_v1` as 20261022055803; these correspond to the repository migration files ending 20261021235624 and 20261022053315. Existing structures from another staging update were reconciled; no unrelated columns were removed.
3. Live rolled-back SQL acceptance passed for tenant/property isolation, knowledge visibility, maintenance, resident/vendor/prospect permissions and all 25 catalog routes. Isolated validation passed 195 tests. Local/PGlite results are separate from real browser/provider evidence.
4. Prepare a separate staging web release using existing protected credentials. Validate actual sign-in, resident/vendor/prospect access, private file upload/download and knowledge draft/review/publication. Real property facts have not been supplied; blank templates must remain unapproved. Do not deploy the implementation branch directly.
5. Configure a dedicated staging voice bridge, HMAC, synthetic actor/property/contact bindings and a dedicated inbound test DID/caller allowlist. The existing OpenAI/Twilio bridge is reused; no ElevenLabs agent was provisioned. Never alter production Sales +17253305102, Support +17027102622 or the main IVR.
6. Verify real inbound voice/SMS persistence, replay/reconnect and sandbox-provider notification receipts. Notification delivery remains blocked/simulated until safe provider validation is completed. No production outbound calls/SMS/emails during testing.
7. Review emergency escalation procedures and human access with the owner. Record exact commits/deployed IDs and remaining blockers. Keep PR #91 draft and unmerged. Production release still requires separate authorization.

## Knowledge behavior to preserve
Platform → existing owner tenant_id → property_id → unit_id. The compiled platform safety rules cannot be overridden by retrieved content. Private owner/vendor content stays internal. Only approved, current, authorized answer content is quoted. Equally specific multiple matches escalate; timestamps do not resolve policy conflict. Structured template values are reference fields; the owner-reviewed answer is the spoken/text reply. Null fields are unknown. All channels use canonical transactional workflow logs. No applicant/housing/financial decisions, legal advice, availability/repair promises or fabricated emergency/provider delivery claims.

## Saved implementation evidence
Knowledge implementation commit: `2d0cadaa64567c5b952e9738c46708a79f8afcd8`.
Standard CI: https://github.com/Aproposchpt2/ai4-contact-center/actions/runs/39700448994 (success).
Browser/build validation: https://github.com/Aproposchpt2/ai4-contact-center/actions/runs/39700449022 (success; mocked sessions/API).
All 127 tests, TypeScript and optimized build passed. The mobile knowledge screenshot was inspected. An earlier browser failure identifying the scope selector was fixed with explicit accessible labels and the full workflow then passed. That earlier inspection is superseded by the staging activation record dated 2026-10-22: both migrations are now applied and live rolled-back SQL acceptance passed. Actual web/provider acceptance remains outstanding.
