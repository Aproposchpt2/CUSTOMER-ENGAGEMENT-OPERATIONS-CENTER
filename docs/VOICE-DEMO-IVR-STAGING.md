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

## Validation evidence before deployment

- 15 local routing/security tests passed. Two additional tests use the actual installed Twilio SDK in protected CI.
- Staging SQL acceptance passed and rolled back: immutable route, idempotent Sales lead creation, parent call lifetime, ended-session rejection, cross-agent rejection, foreign workspace rejection and anonymous RPC rejection.
- Migration voice_demo_entry_and_workflows_staging applied to staging as version 20261022173611. Functions are SECURITY INVOKER with EXECUTE granted only to service_role. No new table or policy relaxation.
- Existing direct PMA signed maintenance save and replay passed before this IVR change.

Deployment, positive provider-signed IVR requests, audio for each routed agent and actual telephone acceptance must still be verified. This document does not claim production activation or that draft knowledge has been approved.
