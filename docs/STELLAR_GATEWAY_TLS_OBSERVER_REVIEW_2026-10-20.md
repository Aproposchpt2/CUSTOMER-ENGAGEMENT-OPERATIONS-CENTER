# STELLAR INTELLIGENT TECHNOLOGIES — observer TLS review
Operated by Apropos Group LLC

October 20,2026. Isolated staging; production NO-GO.

## Verified findings
Read-only run #13 https://github.com/Aproposchpt2/ai4-contact-center/actions/runs/39453309398 succeeded. Job118733550465; source b2b3ef9483db3cf395d6784a77e054c46452e5a9. Workers2454/2455, PostgreSQL backends2717588/2717590, observed16:05:31.601Z/16:05:31.590Z. Both actual role postgres, transaction read_only=on, clientEncrypted=true,clientAuthorized=true,rejectUnauthorized=true,TLSv1.3. Both databaseBackendTls=false. No Auth fixtures,business RPCs,table mutation or acceptance execution. Evidence docs/evidence/stellar-gateway-connection-review-run13-2026-10-20.json,commitf58a7b4d219fbb4d148769a18d8ce3aa7db1818a.

The prior observer guard conflated client-to-session-pooler TLS with the pooler's separate database-side connection. It rejected both valid client TLS connections because pg_stat_ssl described the backend hop as non-TLS. This identifies the observed condition; it does not establish encryption on that internal hop.

## Prepared correction for owner execution review
Reviewed source978711e308539e7a1c2007c0ea9d19746d1aef49 replaces that pooled-client inference with actual TLS socket encryption and certificate authorization checks. Requires rejectUnauthorized=true,TLS1.2/1.3,rolepostgres,exact existing session-pooler hostaws-0-us-west-1.pooler.supabase.com:5432 and project-qualifiedpostgres user. Direct database connections still require backendTLS=true. Unknown host,incorrect role,unencrypted or unverified client socket,disabled certificate verification and obsoleteTLS remain rejected. Existing staging URL/tenant/DB-target validators unchanged. No TLS/RLS/grant/credential/server setting changed. This intentionally accepts a verified client-to-approved-pooler connection while separately recording backendTLS=false; it must not be described as end-to-end TLS. Internal-hop encryption remains a separate production security review item.

Local expanded suite64/64PASS (61gateway/Auth/process checks plus3read-only diagnostic classifications). Real G04/G05 still not accepted; no unit test substitutes for live acceptance. Run14 will run61 existing gateway/Auth/process guards before credentials; read-only diagnostic is not repeated.

## Concrete next run
Workflowbeb11d65972d7cb5218bea2f222a53a66eacaa34 pins source978711e308539e7a1c2007c0ea9d19746d1aef49. Run #14 https://github.com/Aproposchpt2/ai4-contact-center/actions/runs/39454780216 gateway-process job118738659480 WAITING for owner review in existing stellar-staging-access environment. Approval releases the reviewed correction and existing temporary Auth fixture/G04/G05 test mechanism; no deployment steps. Read-only and historical acceptance suites skipped. No new fixtures for this run yet. Owner must review and approve; do not click approval on owner's behalf. No production/Railway/telephone/notifications/approvedagent change or PR77merge.

Fresh independent staging counts remain20cases,13contacts,0workflows,0events,0syntheticAuthusers. Earlier run12 Auth/application/security cleanup matched baseline. No new credentials or password reset required for this observed failure. G06 invalid association gateway test remains pending. Production NO-GO.
