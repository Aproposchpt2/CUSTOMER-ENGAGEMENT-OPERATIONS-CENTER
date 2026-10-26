# Universal voice persona — independent engineering validation
STELLAR INTELLIGENT TECHNOLOGIES · Operated by Apropos Group LLC  
October 26, 2026 · STAGING ONLY · **NO GO for release pending live and hosted workflow evidence**

## Source and scope
Repository: https://github.com/Aproposchpt2/CUSTOMER-ENGAGEMENT-OPERATIONS-CENTER
Engineering branch: `engineering/persona-runtime-validation-20261026`; target `pma-validation`.
Tested implementation commit (local): `bb132cd35cc19e792e42870e04182e8be2120ccf`. Published commit is recorded in the accompanying PR; the report and evidence are added without further runtime changes.
Current staging base: `399f25ba4bf702c5c64c4eec4aabe81d6b670e9a`.
Original PR: https://github.com/Aproposchpt2/CUSTOMER-ENGAGEMENT-OPERATIONS-CENTER/pull/149
GitHub reports PR #149 already merged as `bd622b899693a42387a4576a1d26f198c1fcb658`, head `2be16b71e1e714c72a6d696cb1e89180a7479e5d`. This engineering session did not merge it. Its implementation branch later acquired documentation commit `56764a7871ece2af617cc33cce9bd2c0bfd4467e`; this candidate instead preserves the newer staging implementation at 399f25b.

## Actual runtime paths
| Agent/path | Speech instructions | Delegated instructions | Result |
|---|---|---|---|
| IVR | voice-receptionist.cjs configure → session.start.instructions = INSTRUCTIONS | same INSTRUCTIONS in delegation.responses | Shared persona present |
| PMA direct/bound/handoff | server.js handleCall → startSession → speechInstructions | reasoningInstructions | Shared persona present |
| Sales specialist/bound/handoff/fallback | same server construction, createSpecialistSession + boundInstructions where applicable | reasoningInstructions includes specialist workflow | Shared persona present |
| Support specialist/bound/handoff/fallback | same server construction | reasoningInstructions includes verified ticket flow | Shared persona present |

Shared definition: `twilio-bridge/stellar-conversational-persona.cjs`. `voice-entry.cjs` binds immutable route, approved knowledge and intent data; `server.js` adds the exact shared persona to both models even when binding is bypassed by fallback paths. Both Dockerfiles package it. The model/voice selection is preserved: IVR IVR_VOICE/marin, PMA PMA_VOICE/verse, Sales echo, Support cedar.

Inspected session start, pooled and fresh socket construction, receptionist handoff, tool result appends, safety overrides and terminal socket cleanup. No reconnect recovery is implemented: socket closure terminates the call; a new call reconstructs instructions. This is not seamless reconnect support. Tool appends do not replace the persona. Duplicate session-start notifications do not rebuild the session. Repeated synthetic events are not proof of long conversational stability.

## Defects and corrections
1. IVR received provider speech-start events but did not clear Twilio buffered playback. Added clear for three supported speech-start event names after readiness. Preserved delegated routing; no response cancellation or new greeting. Added protocol regression that routes successfully after interruption.
2. New staging PMA intake removed explicit emergency execution/no-resident-confirmation wording, failing an existing safety regression. Restored immediate safety guidance, then emergency workflow invocation during the active call once safe minimum incident fields exist, using confirmed=false. Preserved single submission, verified persistence and distinct dispatch evidence.
3. Bridge identity test still expected the superseded PMA direct opening. Updated only that assertion to the current Carol intake script. The existing reception handoff opening remains unchanged.
4. Added fallback and all-specialist handoff persona tests for speech and delegated models; verified repeated session events do not reset instructions, duplicate persona or grant tools.

Earlier PR fixes independently confirmed: Sales/Support previously sent persona only to reasoning; now speech receives it too. Both image packaging definitions include the new module. No speculative infrastructure rewrite or voice replacement was made.

## Automated evidence
| Check | Result |
|---|---|
| Complete application npm test | 315 passed, 0 failed, 0 skipped |
| Bridge CJS suite | 60 passed, 0 failed, 0 skipped |
| Specialist/runtime/safety/image dependency subset | 50 passed, 0 failed; overlaps complete suite |
| Image dependency/provenance source checks | 3 passed within subset; both Dockerfiles inspected |
| Optimized Next build, lint/type stage | Passed on current staging source; final changes are CJS runtime/tests |
| Bridge server/receptionist/PMA adapter syntax and diff whitespace | Passed |
| Root and bridge production dependency npm audit | 0 vulnerabilities reported in each |
| Isolated PGlite PostgreSQL persistence replay | Passed: verified case, idempotent replay, cross-tenant denial, anon/authenticated denial, notifications disabled |

Evidence logs are in this directory. PGlite is an isolated embedded PostgreSQL engine; it is not hosted staging nor a separate-connection concurrency proof. Dependency audit is not a comprehensive penetration test. Docker executable is unavailable, so no actual image build, OCI digest or running-container inspection was performed here.

## PMA authoritative acceptance baseline
Read the complete owner file `STELLAR_PMA_Revised_Question_Test_Scripts_v2.0(2).docx` (Library ID libfile_dc7355eb9f5c8191a56e5dcb4f8337a8), all 30 scenarios T-001–T-030, expected intents, pass criteria and automatic failures. It was not edited or replaced. All 30 end-to-end acceptance scenarios remain **NOT EXECUTED / BLOCKED in this session** because no authorized deployed candidate, live model calls, hosted case receipts or notification evidence was exercised. Unit regressions must not be substituted for those results.

## Voice-experience matrix
| Scenario | Engineering evidence | Live acceptance |
|---|---|---|
| IVR opening | Approved prompt and once-only startup tests | Clipping/energy unverified |
| Transfer | Allowlisted, persisted route and handoff tests | Audio continuity unverified |
| PMA maintenance | Workflow and isolated persistence regressions | Hosted case/number unverified |
| PMA emergency | Safety/tool regressions and serious-tone instructions | Spoken safety + notification audit unverified |
| Frustrated resident | Empathy and scoped-status instructions/regressions | Live empathy and exact case status unverified |
| Sales | Both model persona and knowledge/tool regressions | Consultative delivery unverified |
| Support | Both model persona, ticket success/failure regressions | Live troubleshooting outcome unverified |
| Interruption | New IVR buffer-clear test and specialist regressions | Telephone timing unverified |
| Backend failure | No invented success and authorization regressions | Hosted outage handling unverified |
| Extended conversation | Persona retained in configuration/repeated events | Multi-turn spoken consistency unverified |

## Remaining blockers and operational risk
The later source incident record at 56764a7 documented owner reports of clipped IVR/transfer audio, unacceptable PMA delivery and unreliable incident persistence. These are historical owner reports, not reproduced or declared repaired by this review. The new interruption fix does not prove the reported clipping root cause is resolved. PMA retains an additional handoff delivery paragraph and an older handoff greeting alongside the newer Carol direct intake; these remain possible experience inconsistency risks requiring owner evaluation. No current Fly machine status, image digest, live effective prompts, deployment revision or hosted database state was independently inspected. The owner-reported machine `820e3eb7206d78` is not asserted current.

## Release prerequisites and rollback
1. Review this isolated PR and its checks; no automatic merge or deployment.
2. Separately authorize staging release of an exact reviewed commit; verify both image dependency closure and a real Docker build.
3. Capture the pre-release Fly image digest, machine config, effective sanitized prompts and current revision for rollback. Target app is ai4-pma-bridge-staging; confirm it before action.
4. Deploy only with separate approval, verify revision/image consistency, approved models/voices, trusted route/tenant scope and staging notification controls.
5. Execute all unchanged PMA v2.0 scenarios and the ten supplemental voice scenarios; capture actual tool, case and notification receipts. Do not activate real notifications merely to run this review.
6. Owner performs and accepts live calls for all four agents.
Rollback: redeploy the captured known-good staging image/config, verify revision and rerun smoke tests. Do not assume 399f25b is known-good merely because it is the current source base. This candidate changes no database schema, phone assignment or production routing; no database rollback is introduced.

## Recommendation
**NO GO for staging release acceptance or production activation.** Source persona integration is verified and an isolated corrective candidate is ready for review. Live speech quality, reported operational regressions and all 30 end-to-end PMA acceptance results remain unverified. No deployment, merge, production database change, phone reassignment or live notification activation was performed. Preserve the separate PROPERTY-MANAGEMENT-ASSISTANT production migration plan and shared module packaging when separating repositories.
