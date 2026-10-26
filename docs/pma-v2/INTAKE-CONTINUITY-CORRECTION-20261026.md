# PMA intake continuity correction — October 26, 2026

Scope: staging PMA correction based on the owner's failed gas-leak intake call. Live acceptance remains blocked until the corrected gateway and bridge run together and an owner-controlled call verifies the result.

## Verified findings

- Deployed Fly health was read directly on October 26: `ok=true`, `stagingOnly=true`, `revisionMismatch=false`, `commit=imageRevision=399f25ba4bf702c5c64c4eec4aabe81d6b670e9a`.
- The IVR-to-PMA handoff appended an overriding `Desert Ridge Apartments. How can I help you?` greeting. The Carol profile separately asked how to help after gathering identity. These competing instructions can restart intake after the caller reports an issue; this is source evidence, not a recovered call recording.
- Transcript processing discarded space-only deltas and waited for undocumented Live transcript `done` events to separate turns. Actual Live transcript fragments are not completed turns.
- Incident intake required the entire observed caller buffer to equal the incident description, rejecting a verbatim incident inside a longer utterance containing name/address.
- Hosted staging has zero finalized transcript captures. Its PMA interaction ended at `2026-10-26T05:02:31.976279Z`; a PostgreSQL `Active staging PMA session required` error followed at `05:02:32.527Z`. The capture RPC used the active-call scope check even though bridge cleanup submits the transcript at hangup. The timing supports a finalization race; the original audio and spoken sequence have not been recovered.

## Correction

- Carol's approved opening and continuity rules reach both Live speech and delegated Responses, including the IVR handoff. Ask only missing questions and retain the reported issue. The shared STELLAR warmth, enthusiasm, confidence, empathy, natural conversation, proactive assistance and professionalism remain active; emergency tone is serious and authoritative. Configured voice selection is unchanged.
- Explicitly delegate verified lookups and record operations to the backend. A prompt change does not prove the live model invokes the tool.
- Use documented Live input/output transcript fragments, preserving spaces, repetitions, deduplication and provider timing in call memory. Ignore delegated text as evidence of spoken output. Persist bounded speaker segments through the existing signed RPC; these are transcript segments, not certified conversational turns or an audio recording.
- Accept an exact observed incident span within a longer caller utterance. Reject paraphrases, missing evidence and partial-word matches. Observed emergency wording cannot be downgraded by a shortened model description.
- The deterministic safety guardrail clears queued routine audio and sends an immediate serious safety instruction. It does not submit an incomplete emergency report. The complete incident path remains responsible for persistence and the dedicated dispatcher.
- New transcript-only scope allows finalization during the same bound call or for five minutes after its completed state. Service-role, tenant/property/call/route, synthetic staging flags, actor authority, two-hour start limit and immutable session bindings remain enforced. Incident/preference writes retain the original active-call requirement. Changed transcript replays remain rejected.
- Transcript failure telemetry reports only bounded status/class and HTTP status; transcript text stays out of logs.

## Local validation

- Application regressions: 319/319 PASS, including isolated PostgreSQL capture/readback, replay and negative authorization checks.
- Bridge regressions: 59/59 PASS.
- Optimized Next.js build and type checking: PASS (existing Supabase Edge-runtime warning remains).
- Runtime tests replay provider messages through the actual server with mocked sockets/HTTP; these are not paid-model or telephone results.
- Docker is unavailable locally. The dedicated and shared image build/start checks are required in `PMA Fly Isolated Image Validation`, now also triggered for PRs targeting `pma-validation`.

## Release requirements

1. Apply `20261026135420_pma_transcript_finalize_scope.sql` to staging `hvzauakkhlivzeqatfqm`; verify a rollback-only synthetic capture and readback. Do not apply to production.
2. Publish the corrected gateway and bridge at the approved staging revision after required CI, including both image startup checks, passes.
3. Verify effective Fly commit/imageRevision and gateway commit. Existing health proves process/provenance only.
4. Owner-controlled routine sink call first: issue stated before identity must be retained; collect missing name/address/unit, confirm facts, create exactly one report, read the actual case number, and independently verify the stored report and transcript. Routine contact preference does not send SMS.
5. Then controlled gas-leak scenario: emergency interruption without a repeated help question, followed by missing fields and verified incident/dispatch statuses. Provider submission, handset delivery and vendor acceptance are different evidence.

## Rollback

Restore the previously approved bridge/gateway source/image if the candidate fails acceptance. The additive transcript-only helper can remain without broadening incident writes; to reverse it, restore `pma_voice_transcript_save_v1` from the preceding migration and remove the unused private helper. Existing captured transcripts and incidents must not be deleted.

Documentation references: https://developers.openai.com/api/docs/guides/live-conversations and https://developers.openai.com/api/docs/guides/live-delegation.
