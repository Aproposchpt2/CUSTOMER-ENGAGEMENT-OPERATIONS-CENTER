# Carol SIP validation evidence — October 26, 2026

Local complete application suite: 316 passed, 0 failed, 0 skipped.
Local complete bridge suite: 72 passed, 0 failed, 0 skipped (includes 12 new SIP protocol tests).
New isolated PostgreSQL authority test: 1 passed (included in application suite).
Optimized Next build and TypeScript/lint stage: passed.
Root and bridge production dependency audit: zero reported vulnerabilities in each.
Actual direct-SIP image build: delegated to the attached GitHub CI workflow; no local Docker executable.
Live calls, hosted persistence and SIP configuration: not performed; candidate is not live.

The protocol test connects a simulated signed SIP webhook to the actual admission/controller and backend domain code, with fake network and database adapters. It verifies signatures, caller/trunk binding, durable-claim behavior, phase-restricted tools, verified receipts, deduplication, honest failure, full creation/preference/close sequence, matching farewell drain and interrupted close.
The PostgreSQL test executes the existing real incident/preference SQL functions in isolated PGlite, verifies one persisted case, generated case number, stable replay, changed-facts conflict, exact description, consented preference, foreign SIP session denial and anon/authenticated execution denial. This is not a separate-connection concurrency or hosted test.
