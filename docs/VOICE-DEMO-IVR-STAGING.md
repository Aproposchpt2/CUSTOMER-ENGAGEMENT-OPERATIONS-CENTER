> Current entry update, 2026-10-22: the owner confirmed a real call completed and routed through the preceding IVR. It has now been replaced on the same dedicated test number by the OpenAI Live conversational receptionist (Marin), accepting spoken destinations and keypad 1/2/3, with 0 repeat. No Polly/Say announcement remains in the active entry flow. See VOICE-RECEPTIONIST-STAGING.md for the current implementation and verification. Application source fbfc21adbb65e0bed73ba587fcc585e011252d0c; protected release 39835717943 succeeded; Netlify deploy 6ada5c76ca5471f175f93d08; Fly healthy on that source. Synthetic spoken Sales handoff and keypad Support/PMA handoffs returned specialist audio; all three route/end logs independently verified. Owner listening acceptance of the new conversational entry is pending. Repository is now Aproposchpt2/CUSTOMER-ENGAGEMENT-OPERATIONS-CENTER (same ID 1296163902). Older DTMF-only descriptions below are historical.

# Three-agent voice IVR — staging implementation

Owner mapping: 1 Support Specialist / support-specialist; 2 Sales Specialist / sales-specialist; 3 Property Management Assistant / property-management-assistant. Main menu says AI4Businesses, accepts one DTMF digit in eight seconds, 0 repeats, invalid selection repeats, empty selection hangs up. The IVR creates no applicant, housing, financial or emergency dispatch decision.

## Existing systems reused

- Fly shared Node audio engine and existing OpenAI Live / delegated reasoning sessions; no new speech engine or ElevenLabs integration.
- Existing Support persona, ticket tool and durable staging orchestrator. New routed Sales sessions use the supplied Sales voice system prompt v1.1. Direct existing profiles are preserved.
- Existing PMA adapter, knowledge model and 25-intent catalog.
- Existing ai4cc_interactions records for durable call/session state and the requested call_sid, caller_number, selected_route, selected_agent, session_id, start_time and end_time. Caller numbers remain in protected database records, not new console messages.
- Existing ai4cc_create_lead_from_interaction RPC, CRM tables and audit trail for confirmed synthetic Sales leads. A completed child intake interaction does not end the parent call log.
- Existing Knowledge Vault ai4cc_knowledge_entries; no parallel knowledge database or tenant model.

## Endpoints and binding

Fly POST /api/ivr/main and /api/ivr/router call the protected Netlify voice-demo-staging adapter. The existing HMAC gateway authentication protects the forwarding envelope. Official Twilio SDK validation uses the ORIGINAL fixed Fly URL and all original provider parameters; Twilio credentials remain on Netlify. Account, dedicated test DID and caller restrictions apply before session creation. Production Sales/Support DIDs are rejected.

Stream aliases are /support-stream, /sales-stream and /pma-stream. Tokens bind the exact call SID, account, agentRoute, session ID and expiry. A token for one route cannot start another profile or another call. The selected route is stored transactionally in ai4cc_interactions and cannot be changed by a second digit, caller prompt or reconnect. A new OpenAI session loads the selected prompt, approved scoped knowledge and relevant catalog before speaking. Backend and speaking-model instructions receive the same binding.

The direct Netlify POST /api/intake/voice-demo-status-staging verifies provider signatures and updates ONLY an existing synthetic session. This records stream completion independently of Fly availability. Fly cleanup also retries the signed end event. Duplicate completion callbacks preserve the first end timestamp. /api/ivr/complete hangs up after the stream ends.

## Knowledge readiness and limits

Support KB, Sales KB and PMA KB remain separate bindings. Only published, approved, VERIFIED public Vault entries with the exact agent:<agent-id> tag, correct workspace, no property/unit scope, and valid effective/expiration dates enter Support/Sales caller context. Draft, staff-only, future, expired and cross-agent entries are withheld. An empty result is explicitly treated as missing knowledge; never invent an answer. Existing unreviewed Sales/Support drafts are NOT automatically published. PMA keeps its existing property/unit authorization and trusted knowledge workflow.

The master Sales/Support intent source is SOURCE_TRANSCRIPTION_NOT_IMPLEMENTATION. Its definitions are supplied as a catalog, not a claim that every listed action is implemented. Only actual enabled tools execute. Generic Support does not silently become the HVAC specialist.

Staging Support can execute only the existing five allowlisted staging orchestration RPCs, with exact tenant, phone-staging CallSid session and workflow ownership checks. Sales uses a synthetic-only idempotent adapter around the canonical lead RPC. Other agent roles cannot invoke those tools. Notifications, technician follow-up, transfers and production messages remain disabled/unconfirmed unless an actual authorized result establishes them.

## Configuration and release

Named Netlify alias pma-validation uses runtime branch-deploy / branch pma-validation. Set branch:pma-validation VOICE_DEMO_IVR_ENABLED=true, VOICE_DEMO_WORKFLOWS_ENABLED=true and AI4CC_VOICE_DEMO_TENANT_ID to the existing synthetic fixture workspace. Existing PMA flags and dedicated HMAC remain required. Set VOICE_DEMO_IVR_ENABLED=true only on ai4-pma-bridge-staging. Preserve other apps, deployment contexts and production IVR.

Deploy only a reviewed staging release branch after unit tests, SQL acceptance and Next production build. Include voice-entry.cjs, both routing/catalog JSON files and voice-system-prompts.json in the bridge image/file manifest. Do not expose a Supabase service key or Twilio Auth Token on the bridge or in a browser.

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
