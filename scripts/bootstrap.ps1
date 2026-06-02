# project-starter remote bootstrap (Windows / PowerShell)
#
# Usage:
#   irm https://raw.githubusercontent.com/kimyeonsik/project-starter/main/scripts/bootstrap.ps1 | iex
#
# Env vars (set before piping, e.g. `$env:SCOPE="global"`):
#   TARGET       Where to clone this repo (default: $HOME\projects\project-starter)
#   BRANCH       Git branch to clone (default: main)
#   SCOPE        "project" (default) or "global" — install target scope
#   PROJECT_ROOT For SCOPE=project, the directory to install into (default: current dir)
#   LANG_CHOICE  Pre-select language ("en" or "ko"); skips installer prompt
#   SKILL_BUNDLE essential | full | minimal
#   SKIP_PREREQ  Set "1" to bypass prerequisite checks
#
# The actual installer is cross-platform Node (scripts/install.mjs); this script
# only clones the repo and dispatches to it.

$ErrorActionPreference = 'Stop'

function Info($m) { Write-Host "▸ $m" -ForegroundColor Blue }
function Ok($m)   { Write-Host "✓ $m" -ForegroundColor Green }
function Fail($m) { Write-Host "✗ $m" -ForegroundColor Red; exit 1 }

$RepoUrl = if ($env:REPO_URL) { $env:REPO_URL } else { 'https://github.com/kimyeonsik/project-starter.git' }
$Target  = if ($env:TARGET)   { $env:TARGET }   else { Join-Path $HOME 'projects\project-starter' }
$Branch  = if ($env:BRANCH)   { $env:BRANCH }   else { 'main' }

# Caller's working directory — natural default for project-scoped installs.
$InvocationCwd = (Get-Location).Path

if (-not (Get-Command git -ErrorAction SilentlyContinue)) {
  Fail "git is required but not found in PATH. Install from https://git-scm.com/ or 'winget install Git.Git'."
}
if (-not (Get-Command node -ErrorAction SilentlyContinue)) {
  Fail "node is required but not found in PATH. Install Node 20+ (see docs/prereq.md) or 'winget install OpenJS.NodeJS.LTS'."
}

$parent = Split-Path -Parent $Target
if ($parent -and -not (Test-Path $parent)) {
  New-Item -ItemType Directory -Force -Path $parent | Out-Null
}

if (Test-Path (Join-Path $Target '.git')) {
  Info "Existing checkout found at $Target; pulling latest..."
  git -C $Target fetch --quiet origin $Branch
  git -C $Target checkout --quiet $Branch
  git -C $Target pull --ff-only --quiet
} else {
  Info "Cloning $RepoUrl -> $Target"
  git clone --quiet --branch $Branch $RepoUrl $Target 2>$null
  if ($LASTEXITCODE -ne 0) {
    if (Get-Command gh -ErrorAction SilentlyContinue) {
      Info "Direct clone failed; retrying via gh..."
      $slug = $RepoUrl -replace '^https://github.com/', ''
      gh repo clone $slug $Target -- --branch $Branch --quiet
    } else {
      Fail "Clone failed. For private repos: install gh CLI and run 'gh auth login' first."
    }
  }
}
Ok "Source ready at $Target"

# Default SCOPE=project so the installer doesn't prompt twice.
if (-not $env:SCOPE) { $env:SCOPE = 'project' }
if ($env:SCOPE -eq 'project' -and -not $env:PROJECT_ROOT) {
  $env:PROJECT_ROOT = $InvocationCwd
}

$rootMsg = if ($env:PROJECT_ROOT) { ", project root: $($env:PROJECT_ROOT)" } else { '' }
Info "Running installer (scope: $($env:SCOPE)$rootMsg)..."
Set-Location $Target
node scripts/install.mjs
exit $LASTEXITCODE
