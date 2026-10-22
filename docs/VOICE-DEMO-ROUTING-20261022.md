# Owner-approved voice demonstration routing

Updated 2026-10-22. Activated on the dedicated staging test number; production release remains separate.

```json
{
  "1": {
    "agent": "support-specialist",
    "displayName": "Support Specialist",
    "entryPrompt": "Connecting you with the Support Specialist."
  },
  "2": {
    "agent": "sales-specialist",
    "displayName": "Sales Specialist",
    "entryPrompt": "Connecting you with the Sales Specialist."
  },
  "3": {
    "agent": "property-management-assistant",
    "displayName": "Property Management Assistant",
    "entryPrompt": "Connecting you with the Property Management Assistant."
  }
}
```

Twilio number -> Main IVR -> selected existing voice engine.
Support and Sales use existing knowledge and workflows; PMA uses the PMA gateway and scoped Supabase assets. This is an entry-point routing change, not a replacement voice/authentication/CRM system.

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
