# STELLAR UC — STAGING DISPATCHER IMPLEMENTATION VERIFICATION

> Acceptance update (October 19): protected run #6 completed D01–D11 with successful cleanup independently verified. See [acceptance report and coverage limits](./STELLAR_DISPATCHER_ACCEPTANCE_2026-10-19.md). Simultaneous SQL claim contention remains untested; production remains NO-GO. Earlier status text below is retained as historical implementation/design evidence.

Date: October 19, 2026. **Implementation verified; durable dispatcher acceptance remains PENDING. Production NO-GO.**

## Authorized changes completed
Owner approved proceeding with the dispatcher design at 14:56 PDT after the design-review brief. Changes were limited to Supabase project `hvzauakkhlivzeqatfqm` and development branch `feature/staging-orchestrator-trigger-gateway`; PR #77 remains unmerged.

Applied staging migration **20261019220006 — stellar_dispatcher_staging_leases_receipts**. The repository migration filename matches the version independently read from Supabase migration history. Supabase CLI generated the migration artifact; its timestamp was aligned with the server-assigned migration version.

The migration adds:
- Outbox delivery state, claim token/owner, lease expiry and payload hash; due-retry and expired-lease indexes.
- RLS-protected test receiver receipts and effect tables.
- Five restricted RPCs: claim, verify, receive, acknowledge, and fail/retry.
- Explicit denial of RPC execution to PUBLIC, anon and authenticated; execution granted to service_role.
- No broader direct table privileges for service_role; it still cannot directly SELECT or UPDATE the outbox or either new table.
- Fixed empty search_path and explicit staging tenant/session/case checks in privileged functions.

The claim RPC uses short transactions, FOR UPDATE SKIP LOCKED, server time, bounded leases and five-attempt exhaustion. Acknowledgement requires a current unexpired claim and an existing matching receiver receipt/effect. The receiver RPC deduplicates receipt and test effect in one transaction. Retry updates are fenced by the same current claim token; invalid identities/acknowledgements are quarantined.

Added database adapter and loopback-only HTTP receiver. The adapter opens a fresh connection for each RPC transaction, uses SET LOCAL ROLE service_role, COMMITs before reporting a durable receiver acknowledgement, and redacts unexpected database errors. The test HTTP receiver binds only 127.0.0.1, verifies HMAC signatures and accepts only canonical identifier-only payloads. No real email/SMS/telephone integration is connected.

## Tests actually executed
**17/17 local tests PASS**: thirteen dispatcher-core tests and four adapter/transport tests. Two adapter tests make real loopback HTTP requests; the remaining database adapter tests inject dependencies. These tests do not establish durable database/process acceptance.

Rollback-only SQL verification executed both before migration application (including proposed DDL, then ROLLBACK) and against the applied staging functions (data-only fixtures, then ROLLBACK). Neither run is claimed as committed-restart acceptance.

The SQL checks verified:
1. Creation of a synthetic matching support case/workflow using existing approved staging RPCs.
2. Exactly one current claim; a second claim during the lease returns NULL.
3. Authoritative case/tenant/session verification succeeds.
4. Acknowledgement without a durable receipt/effect is rejected with DURABLE_RECEIPT_REQUIRED.
5. Repeated receipt submission yields one receipt and one test effect.
6. The same event identity with a conflicting hash is rejected with RECEIVER_PAYLOAD_CONFLICT.
7. A stale random claim token cannot acknowledge.
8. A valid claim plus matching receipt/effect records delivery once.
9. Delivered events cannot be reclaimed.
10. A foreign tenant is rejected with DISPATCH_SCOPE_REJECTED.

Actual post-migration rollback SQL response:
```json
{
  "evidence": {
    "status": "ROLLBACK_SQL_CHECKS_PASS",
    "caseId": "94e36569-310a-4382-8dd8-3aa7d35203f2",
    "workflowId": "8a02e724-11d7-4b17-9444-2f08c3751054",
    "eventId": "54",
    "ack": {
      "accepted": true,
      "durable": true,
      "eventId": "54",
      "caseId": "94e36569-310a-4382-8dd8-3aa7d35203f2",
      "idempotencyKey": "stellar:hvzauakkhlivzeqatfqm:5885a020-d363-4c27-910a-c035eda132f5:54",
      "payloadSha256": "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa"
    }
  },
  "receipt_count": 1,
  "effect_count": 1,
  "delivered_count": 1
}
```

The fixed hash above was a controlled SQL fixture; it is not a production payload proof. The response was captured inside a transaction that subsequently rolled back. The SQL RPC sets durable=true to denote its transaction contract; only a committed adapter/receiver integration test can establish durable delivery. Full executed SQL is preserved in [dispatcher-rollback-regression.sql](../twilio-bridge/tests/staging-runner/dispatcher-rollback-regression.sql).

## Independent rollback/cleanup evidence
After the first rollback, a separate SQL call confirmed the new table/function did not exist and counts remained 20/13/0/0. The migration was then applied once. After post-migration fixture rollback, a separate SQL call returned:

| Table | Original count | Final count | Row fingerprint |
|---|---:|---:|---|
| Support cases | 20 | 20 | ddeb4729999cd8a90965ab2197b4355c |
| Contacts | 13 | 13 | a67f355fc8bc1a3e258ab772b308c485 |
| Workflows | 0 | 0 | d41d8cd98f00b204e9800998ecf8427e |
| Outbox events | 0 | 0 | d41d8cd98f00b204e9800998ecf8427e |
| Receiver receipts (new) | 0 after creation | 0 | d41d8cd98f00b204e9800998ecf8427e |
| Test effects (new) | 0 after creation | 0 | d41d8cd98f00b204e9800998ecf8427e |

All synthetic fixtures were rolled back. Sequence positions may advance under PostgreSQL transaction rollback; no sequence reset was attempted. The intended schema/RPC migration remains installed in staging.

A separate privileges query verified all five RPCs are SECURITY DEFINER with empty search_path, service_role EXECUTE=true, anon/authenticated EXECUTE=false. RLS is enabled on the outbox and both new tables. service_role direct SELECT/UPDATE=false for all three. No authentication, RLS or tenant checks were disabled.

## Security-advisor findings
No new WARN-level finding was introduced by this migration. Two pre-existing warnings remain unchanged:
- The older authenticated support-test intake SECURITY DEFINER function is executable by signed-in users. Review its existing tenant authorization separately; this work did not modify the approved agent's authentication path. [Advisor guidance](https://supabase.com/docs/guides/database/database-linter?lint=0029_authenticated_security_definer_function_executable).
- Supabase Auth leaked-password protection is disabled. [Password-security guidance](https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection).

The new tables add two INFO notices for RLS with no policies. This is intentional deny-by-default: direct table access is revoked and access is through narrow RPCs. Do not add permissive policies to silence these notices. [Advisor explanation](https://supabase.com/docs/guides/database/database-linter?lint=0008_rls_enabled_no_policy).

## Limits and next gate
D01–D11 in the [design review](./STELLAR_DISPATCHER_DESIGN_REVIEW_2026-10-19.md) remain PENDING as full database/process acceptance cases. In particular, this milestone did not execute committed dispatcher/receiver restart, crash-after-receiver-commit-before-ack, simultaneous live dispatchers, real retry exhaustion/backoff or expired-lease reclamation against the database.

Next: prepare/run that bounded GitHub acceptance harness with a local receiver, committed synthetic fixtures and exact cleanup. Receiver effects are synthetic database markers, not customer notifications. The existing protected GitHub environment and credentials suffice; no paid infrastructure or production deployment is required. Its existing reviewer gate must remain enabled.

Production remains NO-GO. The database password disclosed earlier requires rotation and GitHub secret update before production/wider access. Do not restore the disclosed password.

## Rollback readiness
If the new dispatcher schema must be removed, first stop all dispatcher test workers and independently confirm outbox/receipt/effect tables are empty. Use a new reviewed reverse migration to remove only these five dispatcher RPCs, the two test receiver tables, new indexes/constraints/columns, and restore the original next_attempt_at NOT NULL definition. Do not drop workflows/cases/contacts, remove V5, rewrite migration history, or delete populated outbox data. No rollback was required or executed.

No production database/application changes, Railway deployment, telephone routing, customer notification, PR merge, or approved voice/model/greeting/persona modification was performed.
