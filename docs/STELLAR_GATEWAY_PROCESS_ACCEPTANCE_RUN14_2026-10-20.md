# STELLAR INTELLIGENT TECHNOLOGIES — Gateway process acceptance milestone
Operated by Apropos Group LLC

October20,2026. Isolated staging. Production NO-GO.

Run #14 https://github.com/Aproposchpt2/ai4-contact-center/actions/runs/39454780216 completed successfully. Job118738659480; executable source978711e308539e7a1c2007c0ea9d19746d1aef49. Owner approved existing protected environment. 61/61 live-run guard tests passed. Actual remote staging acceptance summary at16:21:21.697Z reports:

| Test | Actual runner result |
|---|---|
| G02 authenticated nonmember | PASS — HTTP403 STAGING_ACCESS_DENIED |
| G04 simultaneous first submissions in separate gateway OS processes | PASS |
| G05 committed case,actual process termination,fresh status-only recovery and repeated recovery | PASS |

G04/G05 assertions require original tenant/session/case linkage,exactly one support case and one completion event,with no recovery ticket write. They ran through the real gateway module and remote staging Auth/PostgREST. This is not control over Netlify internal worker processes and is not real voice acceptance. No completed prior suite was repeated beyond prerequisite guards and new disposable-identity rejection.

Actual job output: authCleanupVerified=true,applicationCleanupVerified=true,securityUnchanged=true. Independently queried final staging SQL confirms20cases/13contacts/0workflows/0events/0receipts/0effects,with unchanged whole-row fingerprints:ddeb4729999cd8a90965ab2197b4355c(cases),a67f355fc8bc1a3e258ab772b308c485(contacts),d41d8cd98f00b204e9800998ecf8427e(empty tables). Independent synthetic Auth user count0. These match the established original baseline.

Evidence summary: docs/evidence/stellar-gateway-process-run14-summary-2026-10-20.json. Full artifact12280931998: https://github.com/Aproposchpt2/ai4-contact-center/actions/runs/39454780216/artifacts/12280931998 . SHA2564dfb592e757dcc8d6e8cbc0446f8d2b91cc6ac2877290edc22c2e6a26d6bf2fc; expiresOctober27,2026. Full artifact contains process/case/operation IDs and timings. Its individual detailed values have not been independently unpacked this turn because the execution environment is unavailable; no invented IDs or latency results. Preserve the full artifact durably before expiry when execution access resumes. Summary and independent SQL are already preserved in GitHub.

Corrected engineering defect: observer tested the pooler's backend TLS flag as if it described the runner TLS socket. Run13 verified clientTLS1.3 with valid certificate and correctrole. Revised source verifies actual client encryption,certificate authorization,mandatory rejectUnauthorized,exact approved pooler host/project-qualified user and acceptable TLSprotocol;directDB still requires backendTLS. Internal pooler-to-DB TLS=false remains explicitly recorded; no end-to-end TLS claim. No serversecuritysetting altered.

Next gate: independently archive/review detailed artifact and prepare authorized G06 invalid completed case-association gateway test. G06 remains unexecuted. Internal-hop TLS/security review,real voice,performance and remaining integration gates remain separate. GO for next isolated staging review only; production NO-GO. No PR77merge,Railway/applicationdeployment,routing,outreach,notification or approved Support Specialist change.
