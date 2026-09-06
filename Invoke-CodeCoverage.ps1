#Requires -Modules Pester
<#
.SYNOPSIS
    Runs the Pester suite(s) with code coverage enabled and appends a row to
    a tracked history file, so coverage trend over time is visible in git log
    (coverage\history.csv) rather than only as a single point-in-time number.
.PARAMETER TestPath
    Path(s) to Pester test file(s)/directories. Defaults to every *.Tests.ps1
    in this repo.
.PARAMETER CoveragePaths
    Path(s)/globs to measure coverage over. Defaults to the RunspacePool and
    DevTools module source files.
.EXAMPLE
    D:\global\Invoke-CodeCoverage.ps1
#>
[CmdletBinding()]
param(
    [string[]]$TestPath = @((Join-Path $PSScriptRoot 'RunspacePool\RunspacePool.Tests.ps1')),
    [string[]]$CoveragePaths = @(
        (Join-Path $PSScriptRoot 'RunspacePool\RunspacePool.psm1'),
        (Join-Path $PSScriptRoot 'RunspacePool\Server.ps1'),
        (Join-Path $PSScriptRoot 'DevTools\DevTools.psm1'),
        (Join-Path $PSScriptRoot 'DevTools\Docker.ps1'),
        (Join-Path $PSScriptRoot 'DevTools\Reset-DevTools.ps1')
    ),
    [string]$HistoryPath = (Join-Path $PSScriptRoot 'coverage\history.csv'),
    [string]$ReportPath = (Join-Path $PSScriptRoot 'coverage\coverage.xml')
)

$ErrorActionPreference = 'Stop'

New-Item -ItemType Directory -Path (Split-Path $ReportPath -Parent) -Force | Out-Null

$config = New-PesterConfiguration
$config.Run.Path = $TestPath
$config.Run.PassThru = $true
$config.CodeCoverage.Enabled = $true
$config.CodeCoverage.Path = $CoveragePaths
$config.CodeCoverage.OutputPath = $ReportPath
$config.CodeCoverage.OutputFormat = 'JaCoCo'
$config.Output.Verbosity = 'Normal'

$result = Invoke-Pester -Configuration $config

$cov = $result.CodeCoverage
$analyzed = [int]$cov.CommandsAnalyzedCount
$executed = [int]$cov.CommandsExecutedCount
$percent = if ($analyzed -gt 0) { [Math]::Round(100 * $executed / $analyzed, 2) } else { 0 }

$commit = git -C $PSScriptRoot rev-parse --short HEAD 2>$null
$branch = git -C $PSScriptRoot rev-parse --abbrev-ref HEAD 2>$null

$row = [PSCustomObject]@{
    Timestamp        = (Get-Date -Format o)
    Commit           = $commit
    Branch           = $branch
    TestsPassed      = $result.PassedCount
    TestsFailed      = $result.FailedCount
    CommandsAnalyzed = $analyzed
    CommandsExecuted = $executed
    CoveragePercent  = $percent
}

New-Item -ItemType Directory -Path (Split-Path $HistoryPath -Parent) -Force | Out-Null
$row | Export-Csv -Path $HistoryPath -Append -NoTypeInformation

Write-Host "Coverage: $percent% ($executed/$analyzed commands). Tests: $($result.PassedCount) passed, $($result.FailedCount) failed." -ForegroundColor Cyan
Write-Host "History appended -> $HistoryPath" -ForegroundColor Cyan

if ($result.FailedCount -gt 0) { exit 1 }
