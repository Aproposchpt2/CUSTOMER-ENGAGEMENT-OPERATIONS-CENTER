# Stellar UC — staging runner access preparation

This runner checks access only. It creates no workflows, contacts, cases, or outbox events. ACCESS_READY does not mean C1 or R1 passed. PR #77 stays draft/unmerged; no Railway deployment, production change, or voice-agent change is part of this setup.

## Prepared and verified on October 19, 2026

- Isolated Node >=20 package, separate from bridge production dependencies.
- PostgreSQL client pg pinned to 8.16.3, with package lock.
- Eight guard/unit tests passed. These tests use fictional configuration and a mocked HTTP response; they are not acceptance evidence.
- Actual local access check: BLOCKED / CREDENTIALS_NOT_CONFIGURED, missing STAGING_DATABASE_URL and STAGING_SUPABASE_SERVICE_ROLE_KEY. No authenticated database/worker access was attempted.
- No staging fixtures were created by this runner setup.

## Private configuration in an existing authorized test runtime

Provide these variables through the runtime's private environment/secret mechanism, never through chat, committed files, command-line arguments containing values, or evidence logs:

- STAGING_DATABASE_URL: existing authorized PostgreSQL connection for project hvzauakkhlivzeqatfqm. Direct host db.hvzauakkhlivzeqatfqm.supabase.co with user postgres, or Supabase session pooler port 5432 with user postgres.hvzauakkhlivzeqatfqm. The runner rejects transaction-pooler port 6543, other project identities, other database names, and connection-URI query options.
- STAGING_SUPABASE_SERVICE_ROLE_KEY: existing staging service-role key for the REST reconciliation worker. Do not issue a new key or expand permissions just to run this check.
- Optional STAGING_DATABASE_CA_PEM: the staging server's trusted CA certificate if required. Certificate validation remains enabled. Never use NODE_TLS_REJECT_UNAUTHORIZED=0.

Also set these non-secret safeguards:

```sh
export STELLAR_BRIDGE_STAGING=true
export CSS_TENANT_ID=5885a020-d363-4c27-910a-c035eda132f5
export STAGING_SUPABASE_URL=https://hvzauakkhlivzeqatfqm.supabase.co
```

The database connection must already permit assuming service_role and calling the existing reconciliation RPC. A denial is a blocker; do not grant new permissions. Confirm the selected connection belongs to the authorized staging project before configuring it. Do not export Railway credentials into another runtime without explicit owner authorization.

## Install and run

From repository root:

```sh
cd twilio-bridge/tests/staging-runner
npm ci --ignore-scripts --no-fund
npm test
npm run check
```

Keep the secret values in environment variables only. Errors are deliberately reduced to fixed codes; full raw driver/HTTP errors are never printed. Exit code 2 means BLOCKED.

## What a successful access check demonstrates

1. The pinned staging REST reconciliation endpoint accepts the existing backend credential and rejects a NULL workflow argument with STAGING_WORKFLOW_REJECTED / P0001. NULL cannot match a workflow primary key, so the probe cannot reconcile an actual workflow. No ticket-creation RPC is invoked.
2. Two distinct Node child processes each open a fresh PostgreSQL connection, enter BEGIN READ ONLY, and assume the existing service_role.
3. Both children report ready with distinct OS PIDs and backend PIDs before the parent releases an IPC barrier.
4. Their read-only probe intervals must overlap. Each transaction is rolled back and each connection closed.

The child environment is restricted to required staging configuration and TLS/path variables. Secrets are never sent over IPC or in process arguments. IPC carries only control messages and non-secret connection/process timing metadata.

## Next acceptance work, after access is verified

The access runner is not the C1/R1 acceptance controller. Retain the original acceptance requirements:

- C1: approved committed RUNNING fixture and matching test-only case; verified two-client barrier; real overlapping reconciliations; exact original case; one COMPLETED event. Also execute the missing-case variant.
- R1: distinct worker A/B processes; controlled interruption before A completes; committed case survives; B uses the original workflow/session/case and never calls ticket creation; repeated execution remains idempotent.
- Capture SQL connection IDs, OS PIDs, transaction and call timestamps, operation ID, case ID, versions, and event counts. Include lock-crash and timeout cases or explicitly mark them pending.
- Validate deterministic cleanup before creating fixtures, especially since prior connector cleanup returned request-state errors. Do not leave new committed fixtures without a working authorized cleanup path.
- Compare independent baseline/final counts, full original-row fingerprints, RLS, effective grants, policies, and deployed function definitions.

No automatic fixture creation, migration, CI secret provisioning, infrastructure creation, deployment, merge, or live call is included. Any access or infrastructure change outside current authorization needs owner approval.

References used for the driver configuration: https://node-postgres.com/features/connecting and https://node-postgres.com/features/ssl . TLS settings are supplied programmatically so URI parameters cannot replace the verified configuration.

## Windows desktop (owner-run)

This chat session cannot execute commands on the owner's Windows desktop. Windows verification and ACCESS_READY remain unexecuted until the owner runs the launcher locally. The launcher has been prepared/reviewed; it has not been executed or PowerShell-parser-validated in this session because no PowerShell runtime is available here.

Use an isolated checkout of feature/staging-orchestrator-trigger-gateway. Do not switch or modify a working production checkout. If you need a new checkout, Git can create a separate folder:

```powershell
git clone --single-branch --branch feature/staging-orchestrator-trigger-gateway https://github.com/Aproposchpt2/ai4-contact-center.git ai4-contact-center-staging-runner
if ($LASTEXITCODE -ne 0) { throw 'Clone failed; stop here.' }
Set-Location .\ai4-contact-center-staging-runner
.\twilio-bridge\tests\staging-runner\setup-windows.ps1 -RepositoryPath (Get-Location).Path
```

From an existing clean checkout on the correct branch, run just the final launcher command. Do not use execution-policy bypass flags or change execution policy; if script execution is blocked, stop and report that blocker.

The launcher:
- Requires Windows, PowerShell 5.1+, Node 20+, npm, Git, expected origin, correct branch, and a clean runner directory.
- Runs npm ci --ignore-scripts --no-fund and npm test before asking for secrets.
- Uses masked local Read-Host -AsSecureString prompts for missing credentials. A blank credential stops with CREDENTIALS_NOT_CONFIGURED.
- Supplies staging flags only for the check and restores the original process environment afterward. It never writes credentials to an environment file, Git, a report, or command-line arguments.
- Runs the existing access checker directly through Node and records its controlled JSON result.
- Writes windows-access-evidence.json (gitignored) once the runner directory is located. Share only that generated redacted file/result, never the entered values.

If either credential is unavailable, stop; do not copy/export Railway secrets automatically. If a CA certificate is needed, use the existing STAGING_DATABASE_CA_PEM option with the correct public staging CA; never disable certificate verification.

A Windows result must supply actual OS/PowerShell/Node/npm/Git verification, dependency/test statuses, access-check status, two distinct OS process IDs and PostgreSQL backend IDs, and overlap metadata before ACCESS_READY can be claimed. No fixtures, C1/R1 acceptance, deployment, or production activity are performed by this launcher.
