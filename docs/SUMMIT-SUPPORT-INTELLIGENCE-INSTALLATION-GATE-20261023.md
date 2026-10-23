# Summit Comfort Support Specialist — Intelligence Installation Gate
Date: 2026-10-23
Scope: synthetic Support staging tenant only. NOT a deployment authorization for PMA, Sales, or production.

## Verified inventory
- Tenant id: d7e80001-0000-4000-b000-000000000001; name: Summit Comfort Heating & Air.
- public.ai4cc_knowledge_entries has 45 tenant rows: 4 published/approved; 24 Co-Pilot source-review drafts; 16 recovery research drafts; 1 additional PMA-agent-model row.
- Approved KB: gas leak emergency, carbon monoxide emergency, basic checks, fictional service hours.
- Drafts remain unpublished pending factual/safety review. Do not promote en masse.
- New catalog: twilio-bridge/support-intent-catalog-v1.json, 19 scenario intents; declarative ONLY, not yet mounted in active voice runtime.
- Test: twilio-bridge/tests/support-intent-catalog.test.cjs checks unique ids, tenant, emergency intents, verified-tool gates.
- The orchestrator voice adapter currently uses Apropos tenant 5885a020-d363-4c27-910a-c035eda132f5; do NOT substitute Summit data into that flow without correcting authenticated tenant/session bindings and tests.

## Deployment isolation — BLOCKER
- twilio-bridge/fly.pma-staging.toml points to ai4-pma-bridge-staging; never use it for Support.
- twilio-bridge/fly.toml points to stellar-twilio-bridge, described by source as shared bridge, NOT verified as the owner-designated independent Support Fly application.
- No dedicated Support-only Fly application config or release workflow was verified in the inspected repository tree.
- Before any release, identify correct Fly app, confirm service/process secrets by NAMES only, confirm its target Git SHA and Support tenant binding, then create app-specific config and protected deployment workflow. Never infer host from historical Railway records.

## Implementation acceptance gates
1. Resolve tenant/call routing and allowlisted RPC mismatch, keeping authenticated tenant context immutable and preventing cross-tenant KB/case queries.
2. Review 40 research KB drafts individually, suppress conflicting/demo-inappropriate content, publish only source-verified policy/safety entries; log approvals.
3. Compile the intent catalog into classifier/dispatcher with emergency-priority tests, tenant-scoped KB retrieval, required-field tracking, authorized tool mappings, fallback.
4. Verify support ticket creation returns persisted case reference before voice confirmation; no claim for unknown result.
5. Run isolation tests, safety tests, synthetic no-cooling/no-heat/CO/gas calls, interruption/recovery, unmatched intent, duplicate submission and backend failure cases.
6. Deploy only to identified independent Support Fly staging application, verify /health release SHA, then owner telephone acceptance. No change to PMA/Sales until independently approved.

## Current disposition
Catalog file and validation test committed to development branch. Deployment BLOCKED due to unverified dedicated Support Fly target and backend tenant mismatch. No KB publication or Fly deployment performed by this change.

## 2026-10-23 owner Fly bridge evidence and additional implementation
- Owner supplied Fly overview showing `stellar-twilio-bridge` with one LAX app machine, 256 MB. Existing `twilio-bridge/fly.toml` targets this Fly app. **Not proven Support-exclusive:** this config and source are historically shared; confirm call DID / health metadata / actual routes before deploying.
- `twilio-bridge/voice-entry.cjs` in this branch still hardcodes PMA bridge `ai4-pma-bridge-staging.fly.dev` for IVR routing, demonstrating shared source can route cross-app. Do not deploy it blindly to `stellar-twilio-bridge`.
- Existing `voice-agent-catalog.json` has 71 transcribed entries: 13 Support and 8 safety. The 19-intent HVAC file is a supplemental staging draft, not a replacement and not yet active in runtime.
- Added `twilio-bridge/support-intelligence.cjs` with a pure authenticated tenant-locked projection; only approved, published, verified/demo, effective, unexpired Summit KB rows can reach model context. No database write or runtime activation.
- Added `twilio-bridge/tests/support-intelligence.test.cjs` to reject cross-tenant, draft, unknown and expired records. Tests are committed but the repository's automated CI has not run on this feature branch yet.
- The old Support adapter hardcoded tenant `5885a020-d363-4c27-910a-c035eda132f5`. Must replace with authenticated routing for Summit tenant before enabling ticket writes or Knowledge API.
