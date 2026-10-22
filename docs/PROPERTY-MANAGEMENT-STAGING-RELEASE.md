# PMA staging web release

Release branch: `release/pma-staging-validation`.
Reviewed application source: `c23b58349af7018e7e0497ae8ec083d3eeb32ada`.
Preview target: https://pma-validation--ai4cc-staging.netlify.app
Netlify site: ai4cc-staging (`06deb5c7-83b8-401c-bdc5-745d802e3f26`).

The release workflow checks out the exact validated application source and uses the existing `stellaruc-voice-poc` protected GitHub environment solely for its Netlify token. Existing approval/branch restrictions must remain in place. It builds a draft alias in deploy-preview context; it never publishes to the site's main URL. Deployment success requires a ready deploy ID and route/authorization evidence, not merely a successful workflow submission.

CI and PMA Browser Validation passed for the reviewed source. Both Knowledge Base/catalog migrations and live rolled-back database suites passed on Supabase staging. No migration rerun is required. The initial preview URL returned 404, so a real web release is needed.

Current blockers and limits:
- Railway connector returned UNAUTHORIZED and requires reauthentication. The existing staging bridge health endpoint is reachable and reports stagingOnly=true, but its running source is an older commit. No bridge settings or deployments were changed.
- Existing Netlify PMA property/contact/unit/actor bindings and dedicated test DID/caller settings are present. PMA_CHANNELS_ENABLED is absent and defaults off; keep it off until dedicated bridge and signed webhook validation are complete.
- The Netlify staging HMAC variable was converted from unsealed storage to a secret with standard dev/branch-deploy/deploy-preview/production contexts. Its existing value was retained; it has not been rotated. Do not print it or reconstruct masked credentials.
- Actual owner/resident/vendor sign-in, private storage and real voice/SMS delivery remain unverified. Browser CI uses mocked sessions; database SQL role tests do not prove real login/provider operation.
- Do not alter production Sales/Support DIDs, production deployments, main or PR #91 merge state. Use only synthetic staging data. No production outbound traffic.
