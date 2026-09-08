# Pages.Tests.ps1 — Pester test suite for the Pages PowerShell module

BeforeAll {
    $modulePath = Join-Path $PSScriptRoot 'Pages.psd1'
    Import-Module $modulePath -Force
}

Describe 'Pages Module' {
    Context 'Deterministic Literal Replacement (DEF-PAGES-01)' {
        It 'Replaces text with brackets, asterisks, and currency without regex errors' {
            $sample = @'
# Sample Document
Price is $100 for [Standard Tier] with *asterisks*.
Unrelated text remains intact.
'@
            $target = 'Price is $100 for [Standard Tier] with *asterisks*.'
            $replacement = 'Price is verified at $100 flat.'

            $result = Set-CopilotPageLiteral -Page $sample -TargetText $target -ReplacementText $replacement

            $result | Should -BeLike "*Price is verified at `$100 flat.*"
            $result | Should -Not -Match '\[Standard Tier\]'
            $result | Should -BeLike "*Unrelated text remains intact.*"
        }
    }

    Context 'Deterministic Section Replacement' {
        It 'Replaces a bounded section without modifying adjacent sections' {
            $sample = @'
# Root Document

## Section Alpha
Alpha original content.

## Section Beta
Beta original content.

## Section Gamma
Gamma original content.
'@
            $newBeta = @'
## Section Beta
Beta updated content with high fidelity.
'@

            $result = Set-CopilotPageSection -Page $sample -Heading 'Section Beta' -NewSectionContent $newBeta

            $result | Should -BeLike "*Beta updated content with high fidelity.*"
            $result | Should -BeLike "*Alpha original content.*"
            $result | Should -BeLike "*Gamma original content.*"
            $result | Should -Not -BeLike "*Beta original content.*"
        }
    }

    Context 'Format Conversion Pipeline' {
        It 'Converts HTML to CommonMark' {
            $html = "<h1>MaxGirls</h1><p>Welcome to <strong>governance</strong>.</p>"
            $md = ConvertTo-CopilotPage -InputObject $html -SourceFormat HTML

            $md | Should -BeLike "*# MaxGirls*"
            $md | Should -Match '\*\*governance\*\*'
        }

        It 'Converts CommonMark to HTML' {
            $md = "# Title`n`nParagraph content."
            $html = ConvertFrom-CopilotPage -Page $md -TargetFormat HTML

            $html | Should -BeLike "*<h1>Title</h1>*"
            $html | Should -BeLike "*<p>Paragraph content.</p>*"
        }
    }
}
