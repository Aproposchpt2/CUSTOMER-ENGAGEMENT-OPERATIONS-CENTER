# Carol staging Netlify redeploy trigger — 2026-10-26

Documentation-only commit to request a fresh Netlify branch deployment of `pma-validation` after the owner updated `OPENAI_WEBHOOK_SECRET` in Netlify.

- No application, environment, routing, or production configuration is changed by this commit.
- Preserve `PMA_SIP_ENABLED=false` until full webhook, SIP authentication, and staging trunk readiness are verified.
- Verify Netlify branch deployment and endpoint before assigning (725) 201-0584.
- Do not treat a successful build as telephone acceptance.
