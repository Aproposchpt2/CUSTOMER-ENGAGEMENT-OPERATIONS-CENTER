#requires -Version 5.1
[CmdletBinding()]
param([Parameter(Mandatory=$true)][string]$RepositoryPath)

# Owner-run Windows launcher. No infrastructure, SQL fixtures, or deployment.
Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'
$stageVariables = @('STAGING_DATABASE_URL','STAGING_SUPABASE_SERVICE_ROLE_KEY',
 'STELLAR_BRIDGE_STAGING','CSS_TENANT_ID','STAGING_SUPABASE_URL')
$originalEnvironment = @{}
foreach ($name in $stageVariables) {
 $originalEnvironment[$name] = [Environment]::GetEnvironmentVariable($name, 'Process')
}
$report = [ordered]@{
 status = 'BLOCKED'; code = 'WINDOWS_SETUP_NOT_COMPLETED'
 recordedAt = [DateTime]::UtcNow.ToString('o')
 windowsVerified = $false; powerShellVersion = $PSVersionTable.PSVersion.ToString()
 nodeVersion = $null; npmVersion = $null; gitVersion = $null
 branch = $null; commit = $null
 dependencyInstallation = 'NOT_EXECUTED'; unitTests = 'NOT_EXECUTED'
 accessCheck = $null; acceptanceExecuted = $false
}
$runnerDirectory = $null
$locationChanged = $false

function Read-PrivateStagingValue([string]$Name) {
 $secureValue = Read-Host -Prompt ("Enter " + $Name + " privately; blank means unavailable") -AsSecureString
 $pointer = [IntPtr]::Zero
 try {
  $pointer = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($secureValue)
  return [Runtime.InteropServices.Marshal]::PtrToStringBSTR($pointer)
 } finally {
  if ($pointer -ne [IntPtr]::Zero) { [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($pointer) }
  $secureValue.Dispose()
 }
}

try {
 if ([Environment]::OSVersion.Platform -ne [PlatformID]::Win32NT) { throw 'WINDOWS_REQUIRED' }
 $report.windowsVerified = $true
 $nodeCommand = (Get-Command node.exe -ErrorAction Stop).Source
 $npmCommand = (Get-Command npm.cmd -ErrorAction Stop).Source
 $gitCommand = (Get-Command git.exe -ErrorAction Stop).Source
 $report.nodeVersion = (& $nodeCommand --version | Out-String).Trim()
 if ($LASTEXITCODE -ne 0 -or $report.nodeVersion -notmatch '^v(\d+)\.') { throw 'NODE_VERSION_UNVERIFIED' }
 if ([int]$Matches[1] -lt 20) { throw 'NODE_20_OR_LATER_REQUIRED' }
 $report.npmVersion = (& $npmCommand --version 2>$null | Out-String).Trim()
 if ($LASTEXITCODE -ne 0) { throw 'NPM_UNAVAILABLE' }
 $report.gitVersion = (& $gitCommand --version 2>$null | Out-String).Trim()
 if ($LASTEXITCODE -ne 0) { throw 'GIT_UNAVAILABLE' }

 $root = (Resolve-Path -LiteralPath $RepositoryPath -ErrorAction Stop).Path
 $gitRoot = (& $gitCommand -C $root rev-parse --show-toplevel 2>$null | Out-String).Trim()
 if ($LASTEXITCODE -ne 0 -or -not $gitRoot) { throw 'REPOSITORY_UNAVAILABLE' }
 $root = (Resolve-Path -LiteralPath $gitRoot).Path
 $remote = (& $gitCommand -C $root remote get-url origin 2>$null | Out-String).Trim()
 if ($LASTEXITCODE -ne 0 -or $remote -notmatch '^(https://github\.com/|git@github\.com:)Aproposchpt2/ai4-contact-center(\.git)?/?$') { throw 'REPOSITORY_IDENTITY_REJECTED' }
 $report.branch = (& $gitCommand -C $root branch --show-current 2>$null | Out-String).Trim()
 if ($LASTEXITCODE -ne 0 -or $report.branch -ne 'feature/staging-orchestrator-trigger-gateway') { throw 'DEVELOPMENT_BRANCH_REQUIRED' }
 $report.commit = (& $gitCommand -C $root rev-parse HEAD 2>$null | Out-String).Trim()
 if ($LASTEXITCODE -ne 0) { throw 'COMMIT_UNVERIFIED' }
 $runnerRelative = 'twilio-bridge/tests/staging-runner'
 $dirty = (& $gitCommand -C $root status --porcelain -- $runnerRelative 2>$null | Out-String).Trim()
 if ($LASTEXITCODE -ne 0 -or $dirty) { throw 'RUNNER_WORKTREE_NOT_CLEAN' }
 $runnerDirectory = Join-Path $root $runnerRelative
 foreach ($file in @('package.json','package-lock.json','access-check.cjs','access-check.test.cjs')) {
  if (-not (Test-Path -LiteralPath (Join-Path $runnerDirectory $file) -PathType Leaf)) { throw 'RUNNER_FILE_MISSING' }
 }

 Push-Location -LiteralPath $runnerDirectory
 $locationChanged = $true
 # Install and test before prompting for secrets. Raw npm output is not published.
 $installOutput = & $npmCommand ci --ignore-scripts --no-fund 2>&1
 if ($LASTEXITCODE -ne 0) { $report.dependencyInstallation = 'FAILED'; throw 'DEPENDENCY_INSTALL_FAILED' }
 $installOutput = $null
 $report.dependencyInstallation = 'PASS'
 $unitOutput = & $npmCommand test 2>&1
 if ($LASTEXITCODE -ne 0) { $report.unitTests = 'FAILED'; throw 'UNIT_TESTS_FAILED' }
 $unitOutput = $null
 $report.unitTests = 'PASS'

 $env:STELLAR_BRIDGE_STAGING = 'true'
 $env:CSS_TENANT_ID = '5885a020-d363-4c27-910a-c035eda132f5'
 $env:STAGING_SUPABASE_URL = 'https://hvzauakkhlivzeqatfqm.supabase.co'
 foreach ($name in @('STAGING_DATABASE_URL','STAGING_SUPABASE_SERVICE_ROLE_KEY')) {
  $value = [Environment]::GetEnvironmentVariable($name, 'Process')
  if ([string]::IsNullOrWhiteSpace($value)) { $value = Read-PrivateStagingValue $name }
  if ([string]::IsNullOrWhiteSpace($value)) { throw 'CREDENTIALS_NOT_CONFIGURED' }
  [Environment]::SetEnvironmentVariable($name, $value, 'Process')
  $value = $null
 }

 # Direct node invocation preserves JSON output without npm banners.
 $accessOutput = (& $nodeCommand (Join-Path $runnerDirectory 'access-check.cjs') 2>$null | Out-String).Trim()
 $accessExitCode = $LASTEXITCODE
 $access = $accessOutput | ConvertFrom-Json -ErrorAction Stop
 if ($access.status -notin @('ACCESS_READY','BLOCKED') -or $access.acceptanceExecuted -ne $false) { throw 'ACCESS_RESULT_INVALID' }
 $report.accessCheck = $access
 $report.status = $access.status
 if ($accessExitCode -eq 0 -and $access.status -eq 'ACCESS_READY') {
  $report.code = 'READ_ONLY_ACCESS_VERIFIED'
 } else {
  $report.status = 'BLOCKED'
  $report.code = 'ACCESS_CHECK_BLOCKED'
 }
} catch {
 $allowed = @('WINDOWS_REQUIRED','NODE_VERSION_UNVERIFIED','NODE_20_OR_LATER_REQUIRED',
 'NPM_UNAVAILABLE','GIT_UNAVAILABLE','REPOSITORY_UNAVAILABLE','REPOSITORY_IDENTITY_REJECTED',
 'DEVELOPMENT_BRANCH_REQUIRED','COMMIT_UNVERIFIED','RUNNER_WORKTREE_NOT_CLEAN','RUNNER_FILE_MISSING',
 'DEPENDENCY_INSTALL_FAILED','UNIT_TESTS_FAILED','CREDENTIALS_NOT_CONFIGURED','ACCESS_RESULT_INVALID')
 $safeCode = $_.Exception.Message
 if ($safeCode -notin $allowed) { $safeCode = 'WINDOWS_SETUP_BLOCKED' }
 $report.status = 'BLOCKED'
 $report.code = $safeCode
} finally {
 foreach ($name in $stageVariables) {
  [Environment]::SetEnvironmentVariable($name, $originalEnvironment[$name], 'Process')
 }
 $originalEnvironment.Clear()
 if ($locationChanged) { Pop-Location }
}

# The access runner emits only controlled status/process/connection metadata.
$json = $report | ConvertTo-Json -Depth 12
if ($runnerDirectory) {
 $evidencePath = Join-Path $runnerDirectory 'windows-access-evidence.json'
 try { $json | Set-Content -LiteralPath $evidencePath -Encoding UTF8 } catch { }
}
Write-Output $json
