# STELLAR UC — APPROVED LOOKUP & HEADLESS INTEGRATION PREPARATION

October 19, 2026 (PDT). **Lookup installed/verified; I01–I07 acceptance PENDING. Production NO-GO.**

The owner explicitly approved the canonical read-only lookup and headless staging integration plan. Staging migration `20261020005433_stellar_orchestrator_staging_lookup.sql` is applied to `hvzauakkhlivzeqatfqm` only; it was not reapplied. Verified function `stellar_orch_lookup_staging(uuid,text)` has body hash `83b86abef8590434d473c32ee9284460`, STABLE volatility, SECURITY DEFINER, empty search_path, service_role EXECUTE, and denied anon/authenticated EXECUTE. No table grants or RLS policies changed.

The function accepts only the approved tenant and a bounded operation identifier; returns canonical original workflow/session/state; and verifies exact test-only case, same-tenant test-only contact and unique original-session case before exposing verified case/customer IDs on COMPLETED. A missing operation returned found=false in an actual service-role READ ONLY transaction. No customer PII is returned. Upstream authentication/operation ownership must be enforced by the eventual authenticated gateway; this headless module's trusted context flags are an internal contract, not authentication by themselves.

Source added under `twilio-bridge/tests/staging-runner/`:
- support-orchestration-integration.staging.cjs and regression tests.
- headless-integration-acceptance.cjs and authorization/RPC guards.

The adapter combines existing accept/transition/intake/reconcile RPCs with canonical lookup. A new confirmed intake writes once using original session; duplicates/reconnects reconcile only. Verified results include exact customer/case identifiers with notifications/follow-up false. Uncertain completion response checks canonical authoritative state without an invalid fallback transition or a repeated intake write. It does not wire or modify server.js, approved prompts/models/voice or production.

Local verification: nine new integration/harness tests plus fourteen relevant dispatcher regressions, **23/23 PASS**. Other completed staging suites are not being repeated. The manually dispatched workflow also runs the existing local guards against pinned source.

[Protected run #10](https://github.com/Aproposchpt2/ai4-contact-center/actions/runs/39350800287) is queued with only headless selected. Pinned code: `46c82b6efecc844bbac426e46c6f4e3f5e815a6c`. The existing stellar-staging-access required owner-review gate remains enabled. No headless fixtures have yet been created by this waiting run.

I01–I07 cover real database end-to-end completion/local delivery, distinct reconnect session without repeat writes, actual process SIGKILL after ticket COMMIT and fresh-process recovery, controlled post-COMMIT completion-response suppression, missing-case/identity/role rejection, delivery failure separated from ticket success, and independent cleanup/security. I04 deliberately withholds a real committed RPC return at the application adapter boundary; it is not a new TCP loss test. Real network commit-loss evidence remains separately in run #8.

Security advisors before and after the lookup have the same warnings: older authenticated SECURITY DEFINER intake access ([remediation](https://supabase.com/docs/guides/database/database-linter?lint=0029_authenticated_security_definer_function_executable)) and disabled leaked-password protection ([remediation](https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection)). Four INFO notices identify existing RLS tables with no policies, consistent with denied direct access. The new lookup caused no additional warning. See [installation evidence](./evidence/stellar-lookup-installation-2026-10-19.json).

Rollback, if the owner requires it: stop future test executions; revoke service_role EXECUTE and remove only the new lookup function via a reviewed staging migration after checking dependencies. Do not disable V5, remove unrelated functions/tables, reset identity sequences, or alter the approved voice bridge.

No Railway/application deployment, PR merge, real notifications, live routing or production database changes. Production remains NO-GO. I01–I07 must produce actual evidence and clean up all synthetic fixtures before acceptance.
