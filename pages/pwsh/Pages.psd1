@{
    # Script module or binary module file associated with this manifest.
    RootModule = 'Pages.psm1'

    # Version number of this module.
    ModuleVersion = '0.1.0'

    # Supported PSEditions
    CompatiblePSEditions = @('Core', 'Desktop')

    # ID used to uniquely identify this module
    GUID = 'a1f8c7e2-4321-4def-9876-000000000001'

    # Author of this module
    Author = 'Burt Harris'

    # Description of the functionality provided by this module
    Description = 'PowerShell module for Microsoft 365 Copilot Pages: deterministic editing, canonical versioning, and CommonMark conversion.'

    # Functions to export from this module, for best performance, do not use wildcards.
    FunctionsToExport = @(
        'Get-CopilotPage',
        'Set-CopilotPageSection',
        'Set-CopilotPageLiteral',
        'Set-CopilotPageCanonical',
        'ConvertTo-CopilotPage',
        'ConvertFrom-CopilotPage'
    )

    # Cmdlets to export from this module
    CmdletsToExport = @()

    # Variables to export from this module
    VariablesToExport = @()

    # Aliases to export from this module
    AliasesToExport = @()

    # Private data to pass to the module specified in RootModule
    PrivateData = @{
        PSData = @{
            Tags = @('M365', 'Copilot', 'Pages', 'CommonMark', 'Markdown')
            ProjectUri = 'https://github.com/BurtHarris/global'
        }
    }
}
