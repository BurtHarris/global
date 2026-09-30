# ----------------------------------------------------------------------------
# 🪦 TOMBSTONE: /global is dead and no longer maintained.
# Development and shell architecture have migrated to /guild (D:\guild).
# ----------------------------------------------------------------------------
# Profile.ps1 — canonical PowerShell profile source, version-controlled here.
# The real $PROFILE (in Documents\PowerShell, which OneDrive syncs) just dot-sources
# this file, so the actual logic lives in source control on D:\ instead of C:\Users.
#
# Wired up automatically by Setup.ps1.

$script:DevProfileRoot = $PSScriptRoot

$env:EDITOR = "code --wait"

# --- UTF-8 Console Encoding -------------------------------------------------
# Ensure full Unicode / Nerd Font glyph fidelity in terminal output.
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8
[Console]::InputEncoding = [System.Text.Encoding]::UTF8
$OutputEncoding = [System.Text.Encoding]::UTF8

# --- Default working directory ----------------------------------------------
# All projects live on D:\, so start every new shell there.
Set-Location -LiteralPath 'D:\'

# --- mise (tool version manager) --------------------------------------------
if (Get-Command mise -ErrorAction SilentlyContinue) {
    mise activate pwsh | Out-String | Invoke-Expression
} else {
    Write-Warning "mise not found on PATH. Run $script:DevProfileRoot\Setup.ps1 to bootstrap it."
}

# --- DevTools (Ensure-Docker / Test-DockerReady / Reset-DevTools) -----------
Import-Module (Join-Path $script:DevProfileRoot 'DevTools\DevTools.psd1') -Force

# --- RunspacePool (Invoke-PooledScript / Start-Pool) -------------------------
# Not started automatically (keeps shell start fast) — the server is launched
# on demand the first time Invoke-PooledScript is called.
Import-Module (Join-Path $script:DevProfileRoot 'RunspacePool\RunspacePool.psd1') -Force
