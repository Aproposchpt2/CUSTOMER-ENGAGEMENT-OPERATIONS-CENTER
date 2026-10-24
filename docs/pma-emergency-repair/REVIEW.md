# PMA emergency dispatch repair review

## Confirmed live blocker

On October 24, 2026, the authorized gas test returned HTTP 200 with ok=false, incidentId=null and channels=[]. The verification endpoint also returned empty database arrays. Direct staging database reads confirmed the expected tenant/property and active emergency preferences, including SMS to the owner's business line ending 8039. No preference change was needed.

Supabase API logs correlate the attempted POST /rest/v1/platform_incidents and GET /rest/v1/pm_notification_preferences with HTTP 403, PostgREST error 42501, role service_role. Catalog inspection confirms service_role lacks SELECT/INSERT on platform_incidents and SELECT on pm_notification_preferences. The code swallowed these permission errors, causing the misleading empty response. Authentication is successful; this is not evidence that the API credential should be rotated.

The severity constraint accepts SEV1–SEV4 and source 895f1e5 contains the correct SEV1/SEV2 mapping. Netlify branch deployment 6add13aafd7b1384a63861c6 is ready, alias pma-validation. It was uploaded using the CLI with no commit_ref, so the provider cannot prove that it contains exactly 895f1e5. It is not waiting for an automatic Git build; Git commit status has no Netlify checks.

## Prepared repair

- Add a restricted backend RPC for incident creation and emergency preference retrieval, hard-bound to tenant 5885a020-d363-4c27-910a-c035eda132f5 and property eead9ac5-b28b-4594-b75b-a9e9bbbd111f.
- Keep privileged implementation in private schema, with a public invoker wrapper. Revoke public/anon/authenticated execution; allow only existing service_role. Validate service-role claims, allowed emergency intent, active property, and real call/session/lifetime. Synthetic test mode requires the fixed test session and test endpoint generates a fresh call correlation.
- No raw table grants, no RLS changes, no production property support. SMS preferences are additionally restricted to the explicitly authorized staging destination ending 8039.
- Lock and reuse incidents for duplicate real-call intent execution instead of sending repeated notifications on a retry. Existing incidents require manual delivery review rather than blindly resending an uncertain SMS.
- Report database failures instead of swallowing them. Incident creation or logged email alone no longer counts as successful SMS dispatch.
- Await the bounded emergency dispatch in the voice workflow, avoiding loss of an unawaited request when the serverless invocation ends.
- Add a similarly restricted read-only verification RPC; remove secret-in-query-string acceptance and suppress unrelated SMS/message bodies from the verification response.

## Authorization boundary

staging-permission-repair.sql is PROPOSED ONLY. Nothing in it has been applied to staging. The initial owner assignment prohibited new database write permissions without separate authorization. This repair needs that explicit approval, because it adds a narrowly scoped backend ability to create an emergency incident. Existing raw table permissions remain unchanged.

After approval, apply the reviewed SQL to hvzauakkhlivzeqatfqm, deploy matching Netlify source to pma-validation, and rerun one staging gas test. A valid incident ID and SMS API acceptance are separate from actual delivery; verify Twilio delivery and the owner's handset before claiming successful notification. No calls to emergency services are made by this system.

## Validation

- Both new local PostgreSQL/runtime tests passed. They check permission denial on raw tables, allowed staging operation, SEV1 gas insert, foreign tenant/property rejection, active-call requirement, anon denial, duplicate suppression, scoped verification, and truthful no-SMS outcomes.
- Full application suite: 270 passed, 1 failed. The failing test is the pre-existing production-disable guard in tests/propertyManagementTransport.test.mts; source 895f1e5 removed STELLAR_BRIDGE_STAGING from adapter.enabled. Reproduced on the unchanged baseline. The bridge adapter and routing are not modified by this repair.
- TypeScript --noEmit and optimized Next build passed.
- No real SMS was created by the failing live verification; no permission changes, deployment, phone-number reconfiguration or production changes were performed.

## Revised service delivery

The attached revised product definition positions PMA as property operations coordination. This patch addresses the first incident/owner-SMS path only. Email remains logged/unsent, and tenant updates, maintenance vendor notification and completion tracking must not be marketed or reported as verified delivery until those integrations pass independent checks.
