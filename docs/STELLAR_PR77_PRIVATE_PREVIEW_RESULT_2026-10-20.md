# STELLAR INTELLIGENT TECHNOLOGIES
Operated by Apropos Group LLC

## PR #77 private preview deployment — October 20, 2026

**Deployment: VERIFIED READY. Authenticated gateway acceptance: NOT EXECUTED. Production: NO-GO.**

- Project: stellaruc-private-voice-poc, site a98fcd5a-893e-4eb7-835b-146f516ff47d.
- Preview: https://deploy-preview-77--stellaruc-private-voice-poc.netlify.app
- Test entry: /experimental-staging-orchestration-test.
- Successful deploy ID: 6ad73d3b43df9970ecf81146.
- Exact deployed commit: f0553ac7290cfe0ade53a2300f416f5b25fcdd37.
- Context: deploy-preview, review ID 77.
- Native Netlify GitHub integration; no Actions deployment token.
- Netlify UI reports successful deploy, 48-second total build/deploy time, one server function and one edge function deployed, five redirects and two header rules processed.
- Netlify API independently confirms state ready, exact commit, deploy-preview context and review 77.

### Configuration and repair evidence

Owner-approved six nonsecret variables were created only in deploy-preview scope. The temporary branch pattern repair/restore-approved-support* was separately approved, applied for the initial PR event, then removed. Branch deploys were independently observed restored to None; published branch remains experiment/gpt-live-voice-poc.

Initial preview 6ad73cbfe3fbaece5d47e1f4 compiled and bundled successfully but failed scanning because the public staging SUPABASE_URL was classified as secret and appeared in existing source. netlify.toml now excludes only SUPABASE_URL from scanning in deploy-preview context. Actual API-key and service-role credential scanning remains enabled. No credential value was changed or copied. The corrected build passed and was retried through this specific PR preview's native dashboard control.

### Protection and preservation

Netlify project API confirms requiresSSOTeamLogin=true and whichProjectsRequireSSOTeamLogin=all. The signed-in browser shows the Private toolbar on the preview. Application middleware redirects the test entry to /login?next=%2Fexperimental-staging-orchestration-test. The application sign-in offers an email one-time code. The secure sign-in request was declined; no further authentication attempt was made.

Existing published staging deploy remains 6ad2f281dee36c05b86ec0b8, ready/current. PR #77 remains open, draft and unmerged. No production, Railway, telephone routing or approved-agent change was made.

### Testing boundary / next step

Previously recorded local validation: 43 gateway tests, 110 regression tests and Next.js build passed. This publication attempt ran no authenticated gateway submission, support-case write, fixture creation, notification or live voice test. No cleanup is required for this attempt because no fixtures were created; database counts/fingerprints were not remeasured and are not represented as verified unchanged.

Next: complete authorized staging administrator application sign-in, capture fresh baseline/security evidence, then perform approved fictional gateway submission/recovery/idempotency/negative tests with manifest-bound cleanup. Genuine concurrency, process restart and notification scenarios must retain separate executed evidence. No new owner infrastructure approval is needed for the existing isolated scope; application authentication remains pending.
