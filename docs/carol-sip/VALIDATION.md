# Carol SIP validation evidence — October 26, 2026

Local complete application suite: 316 passed, 0 failed, 0 skipped.
Local complete bridge suite: 75 passed, 0 failed, 0 skipped (includes 15 new SIP/control protocol tests).
New isolated PostgreSQL authority test: 1 passed (included in application suite).
Optimized Next build and TypeScript/lint stage: passed.
Root and bridge production dependency audit: zero reported vulnerabilities in each.
Netlify background controller bundle and Node syntax check: passed (151,490-byte bundle).
Live calls, hosted persistence and SIP configuration: not performed; candidate is not live.

Deployment correction: Fly.io and Railway have been removed from the Carol candidate. Twilio-to-OpenAI remains the direct media path; the existing Netlify staging deployment provides only the signed webhook and bounded background sideband controller. The dedicated Twilio trunk exists with Secure Trunking enabled, but has no authorized Origination URI or number association yet.

Read-only Railway preflight found an unrelated failed service with older staged changes. It was not modified or reused, and is not part of the final design. Netlify plan eligibility for 15-minute Background Functions and a deployed one-call sideband test remain environmental validation gates.

The protocol test connects a simulated signed SIP webhook to the actual admission/controller and backend domain code, with fake network and database adapters. It verifies signatures, caller/trunk binding, durable-claim behavior, phase-restricted tools, verified receipts, deduplication, honest failure, full creation/preference/close sequence, matching farewell drain and interrupted close.
The PostgreSQL test executes the existing real incident/preference SQL functions in isolated PGlite, verifies one persisted case, generated case number, stable replay, changed-facts conflict, exact description, consented preference, foreign SIP session denial and anon/authenticated execution denial. This is not a separate-connection concurrency or hosted test.
