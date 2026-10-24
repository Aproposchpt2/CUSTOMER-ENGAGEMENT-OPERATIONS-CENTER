> Current entry update, 2026-10-22: the owner confirmed a real call completed and routed through the preceding IVR. It has now been replaced on the same dedicated test number by the OpenAI Live conversational receptionist (Marin), accepting spoken destinations and keypad 1/2/3, with 0 repeat. No Polly/Say announcement remains in the active entry flow. See VOICE-RECEPTIONIST-STAGING.md for the current implementation and verification. Application source fbfc21adbb65e0bed73ba587fcc585e011252d0c; protected release 39835717943 succeeded; Netlify deploy 6ada5c76ca5471f175f93d08; Fly healthy on that source. Synthetic spoken Sales handoff and keypad Support/PMA handoffs returned specialist audio; all three route/end logs independently verified. Owner listening acceptance of the new conversational entry is pending. Repository is now Aproposchpt2/CUSTOMER-ENGAGEMENT-OPERATIONS-CENTER (same ID 1296163902). Older DTMF-only descriptions below are historical.

# Property Management Assistant — continuation

Updated 2026-10-22. This file supersedes older queued-release, disabled-channel and Railway-only blocker notes. Implementation and synthetic staging testing are authorized; production release remains separate.

## Architecture and scope

Reuse the existing OpenAI audio engine, Fly Node bridge, Netlify signed gateway, Supabase tenant/auth/RBAC, Customer 360, CRM, Knowledge Vault and durable workflows. No ElevenLabs integration or replacement platform. The staging entry IVR is 1 Support / 2 Sales / 3 PMA, with frozen session.agentRoute and persisted call lifecycle. The implementation branch is feature/property-management-assistant-mvp; deployments use reviewed release branches.

## Verified deployment and activation — 2026-10-22

Dedicated test number **(702) 935-1414** now has Voice HTTP POST saved to **https://ai4-pma-bridge-staging.fly.dev/api/ivr/main**. Twilio Configure was re-read after save; the URL persisted and Save configuration was disabled. Only this dedicated test number was changed. Caller allowlisting remains active. A real inbound telephone test through each choice is still pending.

- Application source: e71cdad546caef323c7d0dadca772ce5c6a49b3d.
- Fly release branch: release/voice-demo-ivr-staging-20261022; app ai4-pma-bridge-staging; machine 83d3d6f733d658, shared CPU / 512 MB; health passing.
- Netlify release branch: release/pma-staging-validation; workflow 39826603537 succeeded; ready deploy 6ada4dc0dcdaf74ec21786a8 at https://pma-validation--ai4cc-staging.netlify.app.
- Runtime alias uses branch:pma-validation. Earlier channels-disabled/503 configuration is resolved.
- CI 39826604575 and browser validation 39826596618 succeeded. Protected release passed 18 focused tests (15 routing/security, two actual Twilio SDK, one concurrent operation-context), TypeScript/full CI and optimized Next build.
- Unsigned Fly main/router returned 403; unsigned gateway/status returned 401/403.
- Authenticated synthetic streams returned real OpenAI audio for Support (two media packets), Sales (one), PMA (two). SQL independently verified selected-agent persistence and end timestamps for all three.
- Support loaded two approved public KB entries and 46 catalog intents; Sales loaded four approved public entries and 58 intents; PMA loaded its 25-intent catalog and uses authorized property/unit knowledge retrieval. Catalog membership is not proof every action is executable.
- Support case eff2fe1c-2810-4eca-b472-d3a96b3c3bf5 persisted through the existing orchestrator; replay returned the same case and COMPLETED state.
- Sales lead 229b42a8-13b7-454c-b4cd-b7d79124cf57 persisted through the canonical CRM RPC; replay deduplicated to the same lead without ending its parent call.
- PMA routine request db02c623-dd03-4a4d-8013-b3eee33cb9da persisted with normal/plumbing classification; replay reused interaction 4d163e9f-fcee-4d3d-ad34-8996be96ff54.
- No provider notifications, technician follow-up, production SMS/email or emergency dispatch are claimed.

Support permission repair uses the existing stellar_orch_lookup_staging RPC with exact session/workflow/operation checks. No direct grant on the protected orchestration table or RLS relaxation was introduced. The earlier failed synthetic Support workflow 1ecedbdb-b4df-4dc9-9993-fd1182f654c8 remains an ACCEPTED failure fixture, separate from the successful replay test.

## Remaining acceptance and limitations

1. Call the dedicated test number from the approved caller and verify 0 repeat plus 1/2/3 audio, conversation and hangup logging. Positive real Twilio ingress is not established by the synthetic stream probe.
2. Verify real authenticated web roles, private attachments, knowledge review/publication, channel reconnect and sandbox notification receipts before wider staging acceptance.
3. Emergency classification matched the phrase "no flooding" as MAJOR_FLOODING in an earlier synthetic test. Negation-aware classification needs review and regression coverage while preserving safety escalation.
4. Draft/research/HVAC knowledge remains withheld. Four already published VERIFIED business entries were reviewed and explicitly scoped; this is not blanket publication of the full Vault. PMA property-fact publication-state consistency still needs review.
5. Existing production Sales/Support DIDs and their Railway dependencies have not been migrated. Railway staging was offline/trial expired and its health URL returned 404. The shared staging IVR provides a separate test path.
6. PR #91 remains draft/unmerged. Production release requires separate authorization.

Repository ID 1296163902 is now named Aproposchpt2/CUSTOMER-ENGAGEMENT_OPERATIONS-CENTER (formerly ai4-contact-center); this is the same repository, not a parallel implementation.

## Resume safely

Read VOICE-DEMO-IVR-STAGING.md for endpoint/security details and PROPERTY-MANAGEMENT-STAGING-RUNBOOK.md for broader PMA acceptance. Do not replay migrations or republish blank knowledge templates. Staging project is hvzauakkhlivzeqatfqm. Existing PMA knowledge v1 and intent migrations are already applied, as are voice_demo_entry_and_workflows_staging (20261022173611) and trusted private-schema USAGE repair (20261022171622). No production voice/SMS/email during testing.

Knowledge hierarchy remains Platform → existing owner tenant_id → property_id → unit_id. Unknown fields remain unknown; platform safety cannot be overridden by retrieved content. No housing decisions, legal/financial advice, invented availability or guaranteed repairs/vendor arrival. Emergency/provider claims require actual verified results.
