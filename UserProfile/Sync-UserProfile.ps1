[CmdletBinding()]
param(
    [ValidateSet('ToRepo', 'FromRepo', 'Both')]
    [string]$Mode = 'Both',

    [string]$RepoRoot = (Split-Path -Parent $PSScriptRoot),

    [string]$UserProfileRoot = $HOME
)

$ErrorActionPreference = 'Stop'

function Write-Step([string]$Message) {
    Write-Host "==> $Message" -ForegroundColor Cyan
}

$repoProfileRoot = Join-Path $RepoRoot 'UserProfile'
$repoAgentsPath = Join-Path $repoProfileRoot 'AGENTS.md'
$repoCopilotPath = Join-Path $repoProfileRoot '.github\copilot-instructions.md'
$repoDotfilesRoot = Join-Path $repoProfileRoot 'dotfiles'

$homeAgentsPath = Join-Path $UserProfileRoot 'AGENTS.md'
$homeCopilotPath = Join-Path $UserProfileRoot '.github\copilot-instructions.md'
$homeDotfilesRoot = Join-Path $UserProfileRoot '.config'

function Copy-IfPresent {
    param(
        [string]$Source,
        [string]$Destination
    )

    if (Test-Path $Source) {
        $destDir = Split-Path $Destination -Parent
        New-Item -ItemType Directory -Path $destDir -Force | Out-Null
        Copy-Item -Path $Source -Destination $Destination -Force
        Write-Step "Synced $Source -> $Destination"
    }
}

function Ensure-Directory([string]$Path) {
    New-Item -ItemType Directory -Path $Path -Force | Out-Null
}

switch ($Mode) {
    'ToRepo' {
        Write-Step "Syncing active user profile into repo mirror..."
        Copy-IfPresent -Source $homeAgentsPath -Destination $repoAgentsPath
        Copy-IfPresent -Source $homeCopilotPath -Destination $repoCopilotPath

        if (Test-Path $homeDotfilesRoot) {
            Ensure-Directory -Path $repoDotfilesRoot
            Copy-Item -Path (Join-Path $homeDotfilesRoot '*') -Destination $repoDotfilesRoot -Recurse -Force
            Write-Step "Synced dotfiles from $homeDotfilesRoot -> $repoDotfilesRoot"
        }
    }
    'FromRepo' {
        Write-Step "Syncing repo profile mirror into active user profile..."
        Copy-IfPresent -Source $repoAgentsPath -Destination $homeAgentsPath
        Copy-IfPresent -Source $repoCopilotPath -Destination $homeCopilotPath

        if (Test-Path $repoDotfilesRoot) {
            Ensure-Directory -Path $homeDotfilesRoot
            Copy-Item -Path (Join-Path $repoDotfilesRoot '*') -Destination $homeDotfilesRoot -Recurse -Force
            Write-Step "Synced dotfiles from $repoDotfilesRoot -> $homeDotfilesRoot"
        }
    }
    'Both' {
        & $PSCommandPath -Mode FromRepo
        & $PSCommandPath -Mode ToRepo
    }
}

Write-Step "User profile sync complete."
