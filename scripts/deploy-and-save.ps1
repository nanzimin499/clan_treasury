$ErrorActionPreference = "Stop"

$ProjectRoot = Split-Path -Parent $PSScriptRoot
$ContractWasm = Join-Path $ProjectRoot "target\wasm32v1-none\release\clan_treasury.wasm"
$ContractIdFile = Join-Path $ProjectRoot "CONTRACT_ID.txt"
$FrontendConfig = Join-Path $ProjectRoot "frontend\src\contractConfig.ts"
$IdentityName = "clan-treasury-deployer"

function Invoke-Step {
  param([string]$Title, [scriptblock]$Command)
  Write-Host ""
  Write-Host "==> $Title" -ForegroundColor Cyan
  & $Command
}

Set-Location $ProjectRoot

Invoke-Step "Rust format" { cargo fmt --all -- --check }
Invoke-Step "Smart contract tests" { cargo test --workspace }
Invoke-Step "Build Soroban contract" { stellar contract build }

if (-not (Test-Path $ContractWasm)) {
  throw "WASM file not found: $ContractWasm"
}

Invoke-Step "Check Stellar identity" {
  $Identities = stellar keys ls
  if ($Identities -notmatch $IdentityName) {
    stellar keys generate --global $IdentityName --network testnet
  }
}

Invoke-Step "Fund Stellar identity" {
  stellar keys fund $IdentityName --network testnet
}

Invoke-Step "Deploy contract to Stellar Testnet" {
  $DeployOutput = stellar contract deploy --wasm $ContractWasm --source $IdentityName --network testnet
  $ContractId = ($DeployOutput | Select-String -Pattern "C[A-Z0-9]{55}" | Select-Object -First 1).Matches.Value

  if (-not $ContractId) {
    $ContractId = $DeployOutput.Trim()
  }

  if (-not $ContractId.StartsWith("C")) {
    Write-Host $DeployOutput
    throw "Could not parse deployed contract ID."
  }

  Set-Content -Path $ContractIdFile -Value $ContractId -Encoding ascii

  $Utf8NoBom = New-Object System.Text.UTF8Encoding($false)
  $ConfigLines = @(
    "export const CONTRACT_CONFIG = {",
    "  network: ""Stellar Testnet"",",
    "  networkPassphrase: ""Test SDF Network ; September 2015"",",
    "  rpcUrl: ""https://soroban-testnet.stellar.org"",",
    "  explorerBaseUrl: ""https://stellar.expert/explorer/testnet"",",
    "  contractId: ""$ContractId"",",
    "  projectName: ""Clan Treasury Protocol"",",
    "  repository: ""https://github.com/nanzimin499/clan_treasury""",
    "} as const;",
    "",
    "export type ContractConfig = typeof CONTRACT_CONFIG;",
    "",
    "export function isDeployedContractConfigured() {",
    "  return /^C[A-Z0-9]{55}$/.test(CONTRACT_CONFIG.contractId);",
    "}"
  )

  [System.IO.File]::WriteAllLines($FrontendConfig, $ConfigLines, $Utf8NoBom)
  Write-Host "Contract ID: $ContractId" -ForegroundColor Green
}

Write-Host ""
Write-Host "Deploy script completed." -ForegroundColor Green
