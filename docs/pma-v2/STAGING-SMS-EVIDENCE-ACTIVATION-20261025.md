# PMA staging SMS evidence activation

Authorized staging-only configuration update on 2026-10-25.

Netlify ai4cc-staging branch-deploy context: PMA_STAGING_NOTIFICATION_EVIDENCE_ENABLED=true.

The application guards enforce exact staging Supabase project, tenant, property, sender, and channel authorization. Three additional SMS preferences remain inactive. This documentation-only commit requests a fresh `pma-validation` branch deployment so the runtime picks up updated Netlify configuration.

This change does not alter IVR, message routing, Twilio webhooks, vendor dispatch, production, or send any SMS. Before controlled T-027, independently verify the deployed commit and read-only authenticated readiness/evidence endpoints, configure Twilio receiving routes, and obtain separate owner authorization for recipient activation/live sending.
