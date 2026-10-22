# Property Management Staging Runbook

## Source and database
Repository: Aproposchpt2/ai4-contact-center. Implementation branch: feature/property-management-assistant-mvp. Supabase staging: hvzauakkhlivzeqatfqm. All PMA migrations in supabase/migrations are additive; they have been applied to that project. Never apply the local test baseline to Supabase. The baseline and transactional fixtures are for isolated testing only.

## Required application settings
Reuse existing NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY, SUPABASE_SERVICE_ROLE_KEY and AI4CC_SCHEMA_MODEL=stellar. PMA requires PMA_ENABLED=true, PMA_ENVIRONMENT=staging, NEXT_PUBLIC_PMA_ENABLED=true and KNOWLEDGE_PERSISTENCE_ENABLED=true. Values must be configured for Builds and Functions in the staging deploy context, not stored in the repository. The service-role secret stays server-side.

Run npm ci, npx tsc --noEmit, npm test and npm run build. Browser smoke requires npx playwright install --with-deps chromium --only-shell, a local application on port 3033 and node scripts/pma-browser-smoke.cjs. Its generated artifacts are ignored by git.

## Deploy policy
The implementation branch is blocked by scripts/netlify-build-guard.cjs. A reviewed release branch must pass all checks before a separate staging deployment. Never use a production deployment flag or merge to main for this work. Existing ai4cc-staging can host a separate draft alias pma-validation without replacing its published admin site. The transport allowlist permits only https://pma-validation--ai4cc-staging.netlify.app.

The connected GitHub tools do not expose workflow dispatch, and the Netlify tools do not expose artifact upload. A release workflow can use the existing protected environment credential if available; its environment approval/branch restrictions must be respected. Never reveal, disable protection on, or reconstruct masked secrets.

## Owner workflow
Sign in with an existing authorized owner account. Open /property-management. Create synthetic contacts, property and units; add occupancy relationships. Link existing resident/vendor accounts by their verified IDs; do not create broad staff membership for them. Property staff must already have an active platform membership before a property grant is useful.

Create vendor contact/profile, link the vendor to the property, create a maintenance request and assign the vendor. Schedule, start, verify completion and close in order. Upload synthetic PDF/JPEG/PNG attachments. Test a notification using the Communications view; it records SIMULATED and never sends a message.

Publish property information only after content review. Knowledge entries require approval and an explicit audience. Enabling property inquiries permits signed-in prospects to read curated approved public information and submit an inquiry/showing request. Conversion is recorded by a manager after human approval; the AI does not select applicants.

## Voice and SMS staging settings
PMA_CHANNELS_ENABLED defaults off. To configure isolated inbound acceptance, provide PMA_STAGING_BASE_URL, PMA_STAGING_PROPERTY_ID, PMA_STAGING_CONTACT_ID, optional PMA_STAGING_UNIT_ID and PMA_CHANNEL_ACTOR_USER_ID. Bind only a synthetic contact whose metadata.synthetic is true and an existing active authorized staff actor. The gateway verifies the property/contact workspace and database authorizer verifies actor grants.

Netlify needs BRIDGE_HMAC_SECRET_STAGING, TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, PMA_STAGING_DID, PMA_STAGING_TEST_CALLER and PMA_STAGING_BRIDGE_WS_URL. These credentials must not appear in logs or commits. The current Sales and Support numbers are explicitly rejected as the PMA test DID.

Railway needs STELLAR_BRIDGE_STAGING=true, PMA_CHANNELS_ENABLED=true, PMA_STAGING_BASE_URL set to the allowed draft alias and BRIDGE_HMAC_SECRET matching the staging gateway secret. Existing OpenAI model/voice settings are reused. The added PMA profile is /ws/pma and does not enable production transfer or outbound calling.

Dedicated Twilio endpoints: /api/twilio/pma-voice-staging and /api/twilio/pma-sms-staging. Bridge workflow gateway: /api/intake/pma-staging. Do not configure an existing production DID to these endpoints. Backend simulation: /api/property-management/channel; it requires an authenticated property operator and explicit confirmed=true.

## Recovery
A timeout returns UNKNOWN/unconfirmed. Preserve the original operation identity and recover it with the same inputs; never invent a reference or blindly create a new operation. Disable PMA_CHANNELS_ENABLED to isolate the PMA adapters. Preserve the existing Sales/Support configuration and database evidence. Failed deployments do not publish; fix the failed change and validate again.
