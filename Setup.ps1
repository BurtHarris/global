#Requires -Version 5.1
<#
.SYNOPSIS
    Idempotent bootstrap for this machine's dev toolchain:
    winget -> mise -> (pwsh, coreutils via winget; node/python/uv via mise) + wires up $PROFILE.
.DESCRIPTION
    Safe to re-run any time. Each step checks current state before acting.
    Architecture-agnostic: winget, mise, PowerShell, Coreutils, node, python
    (3.11+), and uv all ship native Windows builds for both x64 (Intel/AMD)
    and arm64 (Snapdragon), so this script and mise.config.toml work unchanged
    on either. No architecture-specific branching should be needed; if a step
    ever needs to differ by arch, branch on:
        [System.Runtime.InteropServices.RuntimeInformation]::OSArchitecture
    Run manually after cloning this repo anywhere on any machine, or after a
    fresh Windows/user setup:
        <path-to-this-repo>\Setup.ps1
#>
[CmdletBinding()]
param(
    [switch]$SkipInstall   # only wire up config/profile, don't run winget/mise installs
)

$ErrorActionPreference = 'Stop'
$repoRoot = $PSScriptRoot

function Write-Step($msg) { Write-Host "==> $msg" -ForegroundColor Cyan }

function Invoke-Winget {
    # Runs winget and fails loudly (rather than silently) if the install didn't succeed,
    # so problems surface immediately instead of masquerading as a clean run.
    param([Parameter(Mandatory)][string[]]$WingetArgs, [Parameter(Mandatory)][string]$What)
    & winget @WingetArgs
    if ($LASTEXITCODE -ne 0) {
        throw "winget failed to install $What (exit code $LASTEXITCODE). Try re-running in an elevated shell."
    }
}

$arch = [System.Runtime.InteropServices.RuntimeInformation]::OSArchitecture
Write-Step "Host architecture: $arch"

# 1. Ensure winget itself is available.
if (-not (Get-Command winget -ErrorAction SilentlyContinue)) {
    throw "winget (App Installer) is not available on this system. Install 'App Installer' from the Microsoft Store first."
}

# 2. Ensure mise is installed via winget.
if (-not $SkipInstall) {
    if (-not (Get-Command mise -ErrorAction SilentlyContinue)) {
        Write-Step "Installing mise via winget..."
        Invoke-Winget -What 'mise' -WingetArgs @('install', '--id', 'jdx.mise', '-e', '--silent', '--accept-package-agreements', '--accept-source-agreements')
    } else {
        Write-Step "mise already installed ($(mise --version))."
    }

    # 3. Ensure modern PowerShell (pwsh) is present via winget.
    if (-not (Get-Command pwsh -ErrorAction SilentlyContinue)) {
        Write-Step "Installing PowerShell 7 via winget..."
        Invoke-Winget -What 'PowerShell 7' -WingetArgs @('install', '--id', 'Microsoft.PowerShell', '-e', '--silent', '--accept-package-agreements', '--accept-source-agreements')
    } else {
        Write-Step "pwsh already installed ($((pwsh -v)))."
    }

    # 4. Ensure Coreutils is present via winget.
    #    (Not delegated to mise: the community mise-winget backend plugin
    #    panics/crashes `mise install` on the currently installed mise release
    #    -- see "Known issues / lessons learned" in README.md. Windows system
    #    apps are more reliably handled by winget directly anyway.)
    $coreutilsInstalled = winget list --id Microsoft.Coreutils -e --accept-source-agreements 2>$null | Select-String 'Microsoft.Coreutils' -Quiet
    if (-not $coreutilsInstalled) {
        Write-Step "Installing Coreutils for Windows via winget..."
        Invoke-Winget -What 'Coreutils' -WingetArgs @('install', '--id', 'Microsoft.Coreutils', '-e', '--silent', '--accept-package-agreements', '--accept-source-agreements')
    } else {
        Write-Step "Coreutils already installed."
    }
}

# 5. Deploy the global mise config (source of truth lives in this repo).
$miseConfigDir = Join-Path $HOME '.config\mise'
$miseConfigPath = Join-Path $miseConfigDir 'config.toml'
New-Item -ItemType Directory -Path $miseConfigDir -Force | Out-Null
Copy-Item -Path (Join-Path $repoRoot 'mise.config.toml') -Destination $miseConfigPath -Force
Write-Step "Deployed mise global config -> $miseConfigPath"

# 6. Install/update all mise-managed tools to match the config (node, python, uv).
if (-not $SkipInstall) {
    Write-Step "Running 'mise install' (node, python, uv)..."
    mise install
}

# 7. Wire up the real PowerShell $PROFILE to dot-source this repo's Profile.ps1.
$loaderLine = ". `"$repoRoot\Profile.ps1`""
$profileDir = Split-Path $PROFILE -Parent
New-Item -ItemType Directory -Path $profileDir -Force | Out-Null
if (-not (Test-Path $PROFILE)) {
    Set-Content -Path $PROFILE -Value $loaderLine -Encoding utf8
    Write-Step "Created $PROFILE and wired it to Profile.ps1."
} elseif (-not (Select-String -Path $PROFILE -Pattern ([Regex]::Escape($loaderLine)) -Quiet)) {
    Add-Content -Path $PROFILE -Value "`n$loaderLine" -Encoding utf8
    Write-Step "Appended loader line to existing $PROFILE."
} else {
    Write-Step "`$PROFILE already wired to Profile.ps1."
}

Write-Step "Done. Open a new PowerShell/pwsh session to pick up changes, or run: . `$PROFILE"
