# Pages.psm1 — Native PowerShell implementation for M365 Copilot Pages (UKF / OKF format)

Set-StrictMode -Version Latest

function Get-CopilotPage {
    [CmdletBinding()]
    param (
        [Parameter(Mandatory = $true, ValueFromPipeline = $true, Position = 0)]
        [string]$Path
    )

    process {
        if (-not (Test-Path -LiteralPath $Path)) {
            Write-Error "Page file not found at path: $Path"
            return
        }

        $rawContent = Get-Content -LiteralPath $Path -Raw -Encoding utf8
        $body = $rawContent
        $meta = @{}

        # Parse UKF / OKF frontmatter
        if ($rawContent -match '(?s)^---\r?\n(.*?)\r?\n---\r?\n?(.*)$') {
            $yamlBlock = $Matches[1]
            $body = $Matches[2]

            foreach ($line in ($yamlBlock -split "`r?`n")) {
                if ($line -match '^\s*([a-zA-Z0-9_]+)\s*:\s*(.*)$') {
                    $key = $Matches[1].Trim()
                    $val = $Matches[2].Trim().Trim('"').Trim("'")
                    $meta[$key] = $val
                }
            }
        }

        $lines = $body -split "`r?`n"
        $title = if ($meta['title']) { $meta['title'] } elseif ($lines.Count -gt 0 -and $lines[0] -match '^#+\s+(.+)$') { $Matches[1] } else { [System.IO.Path]::GetFileNameWithoutExtension($Path) }

        # Extract sections
        $sections = [System.Collections.Generic.List[PSCustomObject]]::new()
        $headingRegex = '^(#{1,6})\s+(.+)$'
        $currentHeading = $null
        $currentLevel = 0
        $currentBuffer = [System.Collections.Generic.List[string]]::new()

        foreach ($line in $lines) {
            if ($line -match $headingRegex) {
                if ($null -ne $currentHeading) {
                    $sections.Add([PSCustomObject]@{
                        Heading = $currentHeading
                        Level   = $currentLevel
                        Content = ($currentBuffer -join "`n").Trim()
                    })
                    $currentBuffer.Clear()
                }
                $currentLevel = $Matches[1].Length
                $currentHeading = $Matches[2].Trim()
                $currentBuffer.Add($line)
            } elseif ($null -ne $currentHeading) {
                $currentBuffer.Add($line)
            }
        }

        if ($null -ne $currentHeading) {
            $sections.Add([PSCustomObject]@{
                Heading = $currentHeading
                Level   = $currentLevel
                Content = ($currentBuffer -join "`n").Trim()
            })
        }

        [PSCustomObject]@{
            PSTypeName  = 'CopilotPage.Document'
            Path        = (Resolve-Path -LiteralPath $Path).Path
            Id          = if ($meta['id']) { $meta['id'] } else { [System.IO.Path]::GetFileNameWithoutExtension($Path) }
            Title       = $title
            Content     = $body
            Raw         = $rawContent
            IsCanonical = ($meta['canonical'] -ne 'false')
            Revision    = $meta['revision']
            Sections    = $sections.ToArray()
            Length      = $body.Length
        }
    }
}

function Set-CopilotPageLiteral {
    [CmdletBinding(SupportsShouldProcess = $true)]
    param (
        [Parameter(Mandatory = $true, ValueFromPipeline = $true)]
        [psobject]$Page,

        [Parameter(Mandatory = $true, Position = 0)]
        [string]$TargetText,

        [Parameter(Mandatory = $true, Position = 1)]
        [string]$ReplacementText,

        [Parameter(Mandatory = $false)]
        [switch]$InPlace
    )

    process {
        $content = if ($Page -is [string]) { $Page } else { $Page.Content }

        # Zero-regex string replacement
        $idx = $content.IndexOf($TargetText, [System.StringComparison]::Ordinal)
        if ($idx -lt 0) {
            Write-Error "Target text not found: '$TargetText'"
            return
        }

        $newContent = $content.Substring(0, $idx) + $ReplacementText + $content.Substring($idx + $TargetText.Length)

        if ($InPlace -and ($Page -isnot [string]) -and $Page.Path) {
            if ($PSCmdlet.ShouldProcess($Page.Path, "Replace literal passage")) {
                # Preserve frontmatter if present
                $fullFile = if ($Page.Raw -and $Page.Raw -match '(?s)^(---\r?\n.*?\r?\n---\r?\n?)') {
                    $Matches[1] + $newContent
                } else {
                    $newContent
                }
                Set-Content -LiteralPath $Page.Path -Value $fullFile -Encoding utf8
                $Page.Content = $newContent
            }
        }

        if ($Page -is [string]) {
            return $newContent
        } else {
            $Page.Content = $newContent
            return $Page
        }
    }
}

function Set-CopilotPageSection {
    [CmdletBinding(SupportsShouldProcess = $true)]
    param (
        [Parameter(Mandatory = $true, ValueFromPipeline = $true)]
        [psobject]$Page,

        [Parameter(Mandatory = $true, Position = 0)]
        [string]$Heading,

        [Parameter(Mandatory = $true, Position = 1)]
        [string]$NewSectionContent,

        [Parameter(Mandatory = $false)]
        [switch]$InPlace
    )

    process {
        $content = if ($Page -is [string]) { $Page } else { $Page.Content }
        $lines = $content -split "`r?`n"

        $startIdx = -1
        $endIdx = -1
        $targetLevel = 0

        for ($i = 0; $i -lt $lines.Count; $i++) {
            if ($lines[$i] -match '^(#{1,6})\s+(.+)$') {
                $level = $Matches[1].Length
                $title = $Matches[2].Trim()

                if ($startIdx -lt 0 -and $title -eq $Heading) {
                    $startIdx = $i
                    $targetLevel = $level
                } elseif ($startIdx -ge 0 -and $level -le $targetLevel) {
                    $endIdx = $i
                    break
                }
            }
        }

        if ($startIdx -lt 0) {
            Write-Error "Section with heading '$Heading' not found."
            return
        }

        if ($endIdx -lt 0) {
            $endIdx = $lines.Count
        }

        $before = if ($startIdx -gt 0) { $lines[0..($startIdx - 1)] -join "`n" } else { "" }
        $after = if ($endIdx -lt $lines.Count) { $lines[$endIdx..($lines.Count - 1)] -join "`n" } else { "" }

        $combined = @()
        if ($before) { $combined += $before }
        $combined += $NewSectionContent.TrimEnd()
        if ($after) { $combined += $after }

        $newContent = $combined -join "`n`n"

        if ($InPlace -and ($Page -isnot [string]) -and $Page.Path) {
            if ($PSCmdlet.ShouldProcess($Page.Path, "Replace section '$Heading'")) {
                $fullFile = if ($Page.Raw -and $Page.Raw -match '(?s)^(---\r?\n.*?\r?\n---\r?\n?)') {
                    $Matches[1] + $newContent
                } else {
                    $newContent
                }
                Set-Content -LiteralPath $Page.Path -Value $fullFile -Encoding utf8
                $Page.Content = $newContent
            }
        }

        if ($Page -is [string]) {
            return $newContent
        } else {
            $Page.Content = $newContent
            return $Page
        }
    }
}

function Set-CopilotPageCanonical {
    [CmdletBinding(SupportsShouldProcess = $true)]
    param (
        [Parameter(Mandatory = $true, Position = 0)]
        [string]$CanonicalPath,

        [Parameter(Mandatory = $false, Position = 1)]
        [string[]]$DuplicatePaths = @()
    )

    process {
        if (-not (Test-Path -LiteralPath $CanonicalPath)) {
            Write-Error "Canonical path does not exist: $CanonicalPath"
            return
        }

        $content = Get-Content -LiteralPath $CanonicalPath -Raw -Encoding utf8
        $body = $content
        if ($content -match '(?s)^---\r?\n.*?\r?\n---\r?\n?(.*)$') {
            $body = $Matches[1]
        }

        $id = [System.IO.Path]::GetFileNameWithoutExtension($CanonicalPath)
        $newFm = @"
---
id: "$id"
canonical: true
updated_at: "$((Get-Date).ToString("o"))"
---

"@

        if ($PSCmdlet.ShouldProcess($CanonicalPath, "Embed canonical metadata in frontmatter")) {
            Set-Content -LiteralPath $CanonicalPath -Value ($newFm + $body.TrimStart()) -Encoding utf8
        }
    }
}

function ConvertTo-CopilotPage {
    [CmdletBinding()]
    param (
        [Parameter(Mandatory = $true, ValueFromPipeline = $true)]
        [string]$InputObject,

        [Parameter(Mandatory = $false)]
        [ValidateSet('HTML', 'PlainText', 'CommonMark')]
        [string]$SourceFormat = 'HTML'
    )

    process {
        if ($SourceFormat -eq 'CommonMark') {
            return $InputObject
        }

        if ($SourceFormat -eq 'HTML') {
            $md = $InputObject
            $md = [System.Text.RegularExpressions.Regex]::Replace($md, '<h1[^>]*>(.*?)<\/h1>', "`n# `$1`n", 'IgnoreCase')
            $md = [System.Text.RegularExpressions.Regex]::Replace($md, '<h2[^>]*>(.*?)<\/h2>', "`n## `$1`n", 'IgnoreCase')
            $md = [System.Text.RegularExpressions.Regex]::Replace($md, '<p[^>]*>(.*?)<\/p>', "`n`$1`n", 'IgnoreCase')
            $md = [System.Text.RegularExpressions.Regex]::Replace($md, '<strong[^>]*>(.*?)<\/strong>', '**$1**', 'IgnoreCase')
            $md = [System.Text.RegularExpressions.Regex]::Replace($md, '<em[^>]*>(.*?)<\/em>', '*$1*', 'IgnoreCase')
            $md = [System.Text.RegularExpressions.Regex]::Replace($md, '<[^>]+>', '')
            return $md.Trim()
        }

        return $InputObject.Trim()
    }
}

function ConvertFrom-CopilotPage {
    [CmdletBinding()]
    param (
        [Parameter(Mandatory = $true, ValueFromPipeline = $true)]
        [psobject]$Page,

        [Parameter(Mandatory = $false)]
        [ValidateSet('HTML', 'PlainText', 'JSON')]
        [string]$TargetFormat = 'HTML'
    )

    process {
        $content = if ($Page -is [string]) { $Page } else { $Page.Content }

        if ($TargetFormat -eq 'JSON') {
            return ($Page | ConvertTo-Json -Depth 5)
        }

        if ($TargetFormat -eq 'PlainText') {
            return ($content -replace '[#*`_>]', '').Trim()
        }

        if ($TargetFormat -eq 'HTML') {
            $lines = $content -split "`r?`n"
            $html = [System.Collections.Generic.List[string]]::new()
            foreach ($line in $lines) {
                if ($line -match '^#\s+(.+)$') {
                    $html.Add("<h1>$($Matches[1])</h1>")
                } elseif ($line -match '^##\s+(.+)$') {
                    $html.Add("<h2>$($Matches[1])</h2>")
                } elseif ($line.Trim().Length -gt 0) {
                    $html.Add("<p>$($line.Trim())</p>")
                }
            }
            return ($html -join "`n")
        }

        return $content
    }
}
