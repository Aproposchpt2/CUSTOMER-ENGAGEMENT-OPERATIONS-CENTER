# Owner-approved voice demonstration routing

Updated 2026-10-22. Requested mapping; NOT activated in production.

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

Current main source differs: 1 Management (human dial), 2 Sales, 3 Support. Do not silently overwrite live behavior or assume this configuration is already wired. Both menu prompt and digit handler must change together in a reviewed staging release. Preserve Twilio signature validation, account/DID/caller restrictions for PMA staging, per-profile signed tokens and tenant boundaries. An unsigned cross-host redirect is not an acceptable PMA handoff: Twilio must make a fresh signed POST to the allowlisted gateway, or a verified server-side handoff must mint the appropriate token.

Current PMA dedicated test DID points directly to its staging voice route; a three-option staging IVR is not yet deployed. No production IVR release authorized.

## Diagnosed demo blockers
- PMA Fly bridge healthy; real authenticated synthetic audio received. Corrected dedicated PMA webhook saved.
- Named Netlify alias `pma-validation` is runtime context `branch-deploy` with branch `pma-validation`, even when CLI build used deploy-preview. Branch-specific flag, Fly URL and synthetic unit were configured; signing secret and rebuilt runtime are being synchronized.
- Sales DID temporary acceptance route in main source redirects to the Railway staging Support profile, not Sales. Existing `SALES_ORCHESTRATION_TEST_ROUTE=true` remains production-scoped. Do not announce Sales as restored while this is active.
- Railway staging service currently shows OFFLINE; account displays Trial expired, plus provider platform outage notice. Its referenced public health endpoint returned application-not-found/404.
- No Railway billing upgrade, production deployment, phone routing change, or shared bridge change was made for Sales/Support in this audit.

Completion requires separate verified readiness of each selected agent, persisted structured workflow results, and a real inbound call through each menu choice. Production activation remains separate.
