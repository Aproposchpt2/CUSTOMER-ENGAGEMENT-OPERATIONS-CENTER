# Live-call repair deployment verification

PR #116 merged into pma-validation as e8396ebcc8afed64141892469730d7ed1092315c. Netlify branch deploy 6add281677cdf097a47cb060 is ready at that exact revision.

Five emergency tests and 39 IVR/receptionist/security tests passed. TypeScript and optimized build passed, with the existing Supabase Edge Runtime warning. The live-database rollback test passed for voice safety guidance plus restricted incident preparation using the existing property writer. Its synthetic call and incident rows were verified absent after rollback.

One exact staging tenant/property binding is enabled, reusing the actor's existing can_write=true assignment. No database permissions were added. The application gate is true only for staging branch-deploy functions. The original telephone session remains completed and has no correlated incident.

Automatic approval review blocked a verification request reusing the completed telephone session, citing possible duplicate incident/SMS risk and recommending a new call. No bypass or further replay is attempted; do not claim the live ended-session HTTP result was obtained. Use the source/security tests and read-only call/incident queries as evidence, and use a new owner-initiated telephone call for end-to-end verification.

Pending: new call to +17252010584 from the approved staging caller, select PMA and report the synthetic gas concern. Correlate its distinct call SID with a non-test emergency incident and a Twilio delivered receipt to the configured owner recipient. No live-call dispatch success is claimed yet. Registration work remains deferred at owner request; two-way SMS and complete v2 operations remain separate unfinished scope.
