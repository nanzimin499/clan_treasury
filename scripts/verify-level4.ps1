$ErrorActionPreference = "Stop"

$ProjectRoot = Split-Path -Parent $PSScriptRoot

function Invoke-Step {
  param([string]$Title, [scriptblock]$Command)
  Write-Host ""
  Write-Host "==> $Title" -ForegroundColor Cyan
  & $Command
}

function Assert-File {
  param([string]$Path)
  if (-not (Test-Path $Path)) { throw "Missing required file: $Path" }
  Write-Host "OK: $Path" -ForegroundColor Green
}

Set-Location $ProjectRoot

Invoke-Step "Checking required files" {
  Assert-File ".\Cargo.toml"
  Assert-File ".\Cargo.lock"
  Assert-File ".\contracts\clan_treasury\Cargo.toml"
  Assert-File ".\contracts\clan_treasury\Makefile"
  Assert-File ".\contracts\clan_treasury\src\lib.rs"
  Assert-File ".\contracts\clan_treasury\src\test.rs"
  Assert-File ".\frontend\package.json"
  Assert-File ".\frontend\package-lock.json"
  Assert-File ".\frontend\src\App.tsx"
  Assert-File ".\frontend\src\App.css"
  Assert-File ".\frontend\src\contractConfig.ts"
  Assert-File ".\frontend\src\services\stellarContractClient.ts"
  Assert-File ".\frontend\src\services\contract.ts"
  Assert-File ".\frontend\src\services\api.ts"
  Assert-File ".\frontend\src\services\analytics.ts"
  Assert-File ".\server\package.json"
  Assert-File ".\server\package-lock.json"
  Assert-File ".\server\index.ts"
  Assert-File ".\server\services\contractService.ts"
  Assert-File ".\server\tests\contractService.test.ts"
  Assert-File ".\.github\workflows\ci.yml"
  Assert-File ".\docs\ARCHITECTURE.md"
  Assert-File ".\docs\FRONTEND_CONTRACT_INTEGRATION.md"
  Assert-File ".\docs\QUALITY_AND_DEPLOYMENT.md"
  Assert-File ".\vercel.json"
  Assert-File ".\railway.toml"
  Assert-File ".\Procfile"
  Assert-File ".\scripts\deploy-and-save.ps1"
  Assert-File ".\README.md"
}

Invoke-Step "Testing smart contract" {
  cargo fmt --all -- --check
  cargo check --workspace --target wasm32v1-none
  cargo test --workspace
  cargo build --workspace --target wasm32v1-none --release
  stellar contract build
}

Invoke-Step "Testing frontend" {
  Set-Location "$ProjectRoot\frontend"
  npm ci --audit=false --fund=false
  npm run type-check
  npm run build
  npm test
}

Invoke-Step "Testing backend" {
  Set-Location "$ProjectRoot\server"
  npm ci --audit=false --fund=false
  npm run type-check
  npm run build
  npm test
}

Invoke-Step "Checking public documentation terms" {
  Set-Location $ProjectRoot
  $Terms = @(
    ("AI " + "Review"),
    ("AI_" + "REVIEW"),
    ("le" + "ak"),
    ("ju" + "dge"),
    ("ban giám " + "khảo"),
    ("hid" + "den"),
    ("inter" + "nal")
  )
  $Paths = @(".\README.md", ".\docs\*.md", ".\.github\workflows\ci.yml", ".\scripts\*.ps1")
  foreach ($Term in $Terms) {
    $Matches = Select-String -Path $Paths -Pattern ([regex]::Escape($Term)) -CaseSensitive:$false -ErrorAction SilentlyContinue
    if ($Matches) {
      $Matches | ForEach-Object { Write-Host "$($_.Path):$($_.LineNumber):$($_.Line)" -ForegroundColor Red }
      throw "Public documentation term check failed."
    }
  }
}

Invoke-Step "Checking git working tree" {
  Set-Location $ProjectRoot
  git status
}

Set-Location $ProjectRoot
Write-Host ""
Write-Host "Level 4 local verification passed." -ForegroundColor Green
