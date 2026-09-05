# Reset-DevTools.ps1
# Reset mise-managed tools (python, node, pwsh, coreutils, ...) back to the
# pristine versions pinned in the global mise config, discarding any drift
# (e.g. pip-installed packages leaked into a "system" python, npm globals, etc).

function Reset-DevTools {
    <#
    .SYNOPSIS
        Force-reinstalls mise-managed tools to match the pinned config, wiping
        any accumulated system-wide changes.
    .PARAMETER Tool
        Optional. One or more tool names (e.g. python, node) to reset.
        Defaults to every tool declared in the global mise config.
    .EXAMPLE
        Reset-DevTools
        Resets everything back to the config-pinned installs.
    .EXAMPLE
        Reset-DevTools -Tool python
        Resets only Python.
    #>
    [CmdletBinding(SupportsShouldProcess)]
    param(
        [Parameter(Position = 0)]
        [string[]]$Tool
    )

    if (-not (Get-Command mise -ErrorAction SilentlyContinue)) {
        Write-Warning "mise is not installed. Run Setup.ps1 first."
        return
    }

    $targets = $Tool
    if (-not $targets) {
        # Pull the list of declared tools straight from mise's own view of config.
        $cfg = mise config get 2>$null
        $targets = (mise ls --current 2>$null | ForEach-Object { ($_ -split '\s+')[0] } | Sort-Object -Unique)
    }

    if (-not $targets) {
        Write-Warning "No mise-managed tools found to reset."
        return
    }

    foreach ($t in $targets) {
        if ($PSCmdlet.ShouldProcess($t, "Force reinstall via mise")) {
            Write-Host "Resetting $t to pinned config version..." -ForegroundColor Cyan
            mise install --force $t
        }
    }

    mise reshim
    Write-Host "Done. Current versions:" -ForegroundColor Green
    mise current
}
