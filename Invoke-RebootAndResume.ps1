<#
.SYNOPSIS
    Reboots this machine and automatically resumes by running a chosen
    command the next time this user logs back in.
.DESCRIPTION
    Reusable, generic "reboot with resume" utility. Uses the standard Windows
    RunOnce registry mechanism
    (HKCU:\Software\Microsoft\Windows\CurrentVersion\RunOnce) to schedule a
    single command that fires automatically at the next interactive logon
    for the CURRENT user, then restarts the computer.

    Why RunOnce (not a scheduled task, not auto-logon):
      - It's per-user and interactive, so a GUI app (like Windows Sandbox)
        launched from it can actually show a window -- a SYSTEM-context
        scheduled task cannot.
      - It fires exactly once and then removes itself -- no cleanup needed.
      - It does NOT bypass the Windows login screen. Auto-logon would
        require storing the account password (in cleartext or trivially
        reversible form) in the registry, which is a real security risk this
        script deliberately avoids. You still log in as normal; RunOnce runs
        immediately after that logon completes.

    Safety: prints what will run and where it's registered, gives a
    cancellable countdown (Ctrl+C) before restarting, and supports -WhatIf.
.PARAMETER ResumeCommand
    The full command line to run automatically at next logon, e.g. a
    `powershell.exe -Command "..."` or `powershell.exe -File ...`
    invocation. Executed directly (not through cmd.exe), so quote it the
    way you would for CreateProcess.
.PARAMETER DelaySeconds
    Cancellable grace period (default 15s) before the restart actually
    happens. Press Ctrl+C during the countdown to abort -- the RunOnce
    entry stays registered even if you cancel, so you can just re-run
    `Restart-Computer` yourself later.
.PARAMETER Force
    Skip the interactive y/n confirmation (the countdown still applies).
.EXAMPLE
    # Reboot and reopen the Windows Sandbox test-harness once logged back in.
    .\Invoke-RebootAndResume.ps1 -Force -ResumeCommand `
        'powershell.exe -NoProfile -Command "Start-Process ''D:\global\TestInSandbox.wsb''"'
.EXAMPLE
    # Reboot and resume a build script.
    .\Invoke-RebootAndResume.ps1 -ResumeCommand 'powershell.exe -NoProfile -File D:\myproject\continue-build.ps1'
#>
[CmdletBinding(SupportsShouldProcess, ConfirmImpact = 'High')]
param(
    [Parameter(Mandatory)]
    [string]$ResumeCommand,

    [int]$DelaySeconds = 15,

    [switch]$Force
)

$ErrorActionPreference = 'Stop'

$runOnceKey = 'HKCU:\Software\Microsoft\Windows\CurrentVersion\RunOnce'
$valueName  = 'RebootAndResume'

if (-not (Test-Path $runOnceKey)) {
    New-Item -Path $runOnceKey -Force | Out-Null
}
Set-ItemProperty -Path $runOnceKey -Name $valueName -Value $ResumeCommand -Type String

Write-Host "Registered RunOnce resume command for user '$env:USERNAME':" -ForegroundColor Cyan
Write-Host "  $ResumeCommand" -ForegroundColor Gray
Write-Host "-> Fires automatically right after you next log back in (normal login screen still applies)." -ForegroundColor Yellow

if (-not $Force) {
    $answer = Read-Host "Restart this computer now? (y/N)"
    if ($answer -notmatch '^[Yy]') {
        Write-Host "Not restarting. The RunOnce entry above remains registered for next time you do." -ForegroundColor Yellow
        return
    }
}

if (-not $Force -and -not $PSCmdlet.ShouldProcess("$env:COMPUTERNAME", "Restart-Computer")) {
    return
}

Write-Host "Restarting in $DelaySeconds seconds -- press Ctrl+C now to cancel (RunOnce entry stays registered)." -ForegroundColor Yellow
for ($i = $DelaySeconds; $i -gt 0; $i--) {
    Write-Host -NoNewline "`r  Restarting in $i... "
    Start-Sleep -Seconds 1
}
Write-Host "`rRestarting now.                     "

Restart-Computer -Force
