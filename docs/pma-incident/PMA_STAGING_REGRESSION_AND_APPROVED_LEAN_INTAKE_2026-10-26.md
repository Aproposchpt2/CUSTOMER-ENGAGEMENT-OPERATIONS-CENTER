# STELLAR PMA — STAGING REGRESSION AND APPROVED LEAN INTAKE (2026-10-26)

**Owner-directed incident record. STAGING ONLY. Production NO GO.**

## Reported regressions
- IVR begins “I'll transfer you now,” sighs, then starts “You have reached Stellar...” rather than completing the greeting first.
- Transfer announcement audio is cut off.
- PMA voice persona remains unacceptable despite the requested shared personality upgrade.
- Orchestration fails to reliably create and persist tenant incident reports.
- These are live-call owner reports; a healthy HTTP endpoint does not establish working business workflows.

## Fly.io evidence provided by owner
- App: `ai4-pma-bridge-staging`, URL: https://ai4-pma-bridge-staging.fly.dev/
- Rolling deployment output cleared lease for machine `820e3eb7206d78` (not independently confirmed as the currently serving machine).
- `/health`: `ok=true`, `stagingOnly=true`, `revisionMismatch=false`, `commit=imageRevision=399f25ba4bf702c5c64c4eec4aabe81d6b670e9a`, `nodeVersion=v24.22.1`, `pma.enabled=true`, `pma.path=/ws/pma`, `pma.catalogVersion=1.0`.
- OCI image digest, current Fly machine status, exact effective runtime prompt, and source/PR ancestry remain to be independently verified.

## Approved simplification
**Focus on orchestration and case persistence, not KB/intent expansion.** Implement a single `tenant_incident_report` flow. Capture name, property, unit (when applicable), and the tenant's exact description without asking the caller to categorize it. Bind to trusted session/property and stable operation ID; persist and read back the committed case before claiming success. Keep emergency classification minimal and internal. Track Maintenance forwarding independently. Capture preferred text/email/phone destination, with explicit consent before SMS. Return portal-ready case number/status/preference; do not claim tenant portal access until authenticated lookup is live.

## Approved Desert Ridge / Carol spoken script
**Opening:** “Thank you for calling Desert Ridge Customer Care Center. My name is Carol, and I'll be your intake specialist today. To get started, may I please have your name and property address?”

**After identity intake:** “Thank you, [caller name]. How may I help you today?” Capture unit if applicable and preserve the caller's own words.

**Before actual write:** “Thank you for that information. Please give me a moment while I create an incident report for you.”

**Only after confirmed persistence:** “Thank you for waiting. I now have an incident report on file for your request. I have your incident number ready. Please let me know when you're ready to record it.” After the caller agrees: “Your incident number is [verified case number]. I'll repeat that once more. [verified case number].” The example PMA-24871 is illustrative only.

**Portal wording is CONDITIONAL:** Owner's desired text is “This incident number can be used to access the Tenant Incident Portal. The portal allows you to track the status of your incident, review updates, and monitor progress through resolution.” Do not use until authenticated case lookup is implemented and tested; otherwise explain portal tracking is not yet confirmed.

**Preference:** “What is your preferred method of communication for updates regarding this incident: text message, email, or phone call?” Verify destination; obtain consent before SMS. Say preference was recorded only after a successful write. Do not promise delivery without evidence.

**Closing only after confirmed case:** “Your incident has been successfully recorded. Is there anything else I can assist you with today?” On no: “Thank you, [caller name]. It has been my pleasure assisting you today. Have a wonderful day.”

**Emergency:** For fire, smoke, gas leak, carbon monoxide, electrical hazard, or immediate danger, immediately and seriously say: “If you believe there is an immediate threat to life or safety, please leave the area and contact emergency services immediately by calling 911. Once you are safe, I will continue documenting the incident and notifying the appropriate parties.” Never delay safety advice for intake or imply notifications occurred without receipts. For gas leaks, do not suggest operating switches or ignition sources.

## Engineering priorities and release gates
1. **P0:** Trace Twilio call SID → trusted session → operation ID → orchestration tool → database commit → verified case ID → spoken response. Fix the actual failure, not only the prompt. Prove idempotency and honest failure behavior.
2. **P0:** Repair IVR first-utterance ordering, transfer audio flush, premature transfer instruction, sigh/yawn behavior, and truncated playback.
3. **P1:** Verify effective deployed PMA persona and Carol identity against the live image; avoid sweeping rewrites.
4. **P1:** Separately verify case creation, Maintenance forwarding, SMS submission/delivery, and portal capability. Never conflate their statuses.
5. Validate routine kitchen sink, write failure, retry, gas leak, frustrated caller, contact consent, transfer and complete PMA v2.0 30-scenario suite, plus Sales/Support regressions.
6. Obtain Fly machine status, OCI digest, deployed revision, sanitized effective prompts, orchestration traces, database case receipts, test counts, exact fixes and rollback target.

**NO PRODUCTION RELEASE, MERGE, ROUTING CHANGE OR LIVE NOTIFICATION ACTIVATION IS AUTHORIZED.** Reconcile last-known-good staging against `399f25ba...`, restore a reliable baseline, then request owner live-call acceptance.

**Source:** October 26, 2026 owner-supplied deployment output, observed call failures, and explicitly approved PMA script. This file documents requirements and symptoms, not completed repairs.
