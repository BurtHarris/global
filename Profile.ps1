# Profile.ps1 — canonical PowerShell profile source, version-controlled here.
# The real $PROFILE (in Documents\PowerShell, which OneDrive syncs) just dot-sources
# this file, so the actual logic lives in source control on D:\ instead of C:\Users.
#
# Wired up automatically by Setup.ps1.

$script:DevProfileRoot = $PSScriptRoot

$env:EDITOR = "code --wait"

# --- Default working directory ----------------------------------------------
# All projects live on D:\, so start every new shell there.
Set-Location -LiteralPath 'D:\'

# --- mise (tool version manager) --------------------------------------------
if (Get-Command mise -ErrorAction SilentlyContinue) {
    mise activate pwsh | Out-String | Invoke-Expression
} else {
    Write-Warning "mise not found on PATH. Run $script:DevProfileRoot\Setup.ps1 to bootstrap it."
}

# --- Docker helpers (Test-DockerReady / Ensure-Docker) -----------------------
. (Join-Path $script:DevProfileRoot 'Docker.ps1')

# --- Reset-DevTools -----------------------------------------------------------
. (Join-Path $script:DevProfileRoot 'Reset-DevTools.ps1')

# --- RunspacePool (Invoke-PooledScript / Start-RunspacePoolServer) -----------
# Not started automatically (keeps shell start fast) — the server is launched
# on demand the first time Invoke-PooledScript is called.
. (Join-Path $script:DevProfileRoot 'RunspacePool\RunspacePool.ps1')
