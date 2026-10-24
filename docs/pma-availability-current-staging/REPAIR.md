# PMA availability repair for the current staging release

This patch brings the existing reviewed availability reader from source 8db412f into the release containing approved greeting PR #110 (ca33d854600940364177e6d242af5c2ab967f94c). It deliberately does not replace the server wholesale with newer voice experiments or change the existing PMA write workflow.

## Repair

- Expose pma_check_availability only in the PMA tool set. Require a trusted PMA call/session for dispatch.
- Sign the bridge request to the existing staging voice gateway. Reject malformed bedroom filters, foreign routes, ended sessions and expired/missing session lifetimes.
- Query only the server-configured tenant and property in staging hvzauakkhlivzeqatfqm. Exact bedrooms=2 cannot return one- or three-bedroom units. Zero means studios; omitted bedrooms means any size.
- Read inventory without new database permissions, schema or inventory changes. The existing voice session recorder remains in use.
- Return distinct results for matching fresh vacant units, stale records, occupied/unavailable records, no verified match, invalid data and failed lookups. Do not manufacture availability or guarantee dates.
- Package the verifier in the existing bridge Dockerfile.
- Preserve the approved IVR/Support/Sales greetings, voice settings, routing and all current write gates.

## Read-only database evidence

A direct staging database read found Desert Ridge Apartments active, accepting inquiries, timezone America/Los_Angeles. Its two matching records are Unit 101 and Unit 205, both bedrooms=2, both status=occupied, updated October 22, 2026 and older than 24 hours at inspection. Unit 101 has no availability date. Unit 205 has a recorded October 22 date despite occupied status. Neither is a verified fresh vacancy. Records were not changed or artificially refreshed.

The corrected reader must therefore return INVENTORY_STALE for this current two-bedroom dataset and request property-team confirmation. This is not a promise that a two-bedroom apartment can be offered after deployment.

## Verification

- Application tests: 205 passed, including six staged API tests for exact bedroom filtering, trustworthy tenant/property scope, inventory validity/freshness and lookup failure handling.
- Bridge tests: 36 passed, including verifier, exact bedroom, date, stale/invalid/failure cases, signed request and existing three-route receptionist tests.
- TypeScript --noEmit passed.
- No live signed telephone query was possible without deployment access; synthetic API tests are not live acceptance.

## Release boundary and remaining blocker

Deploy the gateway and bridge from this same revision. Keep the gateway's existing VOICE_DEMO_WORKFLOWS_ENABLED gate unchanged; if disabled, report the gate as a blocker instead of silently enabling writes. No new permissions or write activation are authorized by this patch. No database migration is required for the availability-only reader; the required pm_properties/pm_units columns were verified in staging.

Only ai4-pma-bridge-staging and the pma-validation staging gateway are targets. Production and telephone-number configuration remain unchanged. No Fly deployment credential/tool is available in this Work session; no Fly.io plugin was found in the plugin search. Therefore source preparation alone does not make this repair live. A connected authorized deployment route is still needed, without requiring Ruflo specifically.
