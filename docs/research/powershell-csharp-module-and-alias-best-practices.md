# PowerShell Module Development in C# and Alias Conventions (Primary-Source Research)

## 1) Best practices for developing PowerShell modules in C#

### Cmdlet design and naming
- Use **Verb-Noun** naming and approved verbs; avoid unapproved synonyms.  
  Source: [Approved Verbs for PowerShell Commands](https://learn.microsoft.com/powershell/scripting/developer/cmdlet/approved-verbs-for-windows-powershell-commands)
- Decorate each cmdlet class with `[Cmdlet(...)]` including verb and noun.  
  Source: [Cmdlet Attribute Declaration](https://learn.microsoft.com/powershell/scripting/developer/cmdlet/cmdlet-attribute-declaration)
- Prefer specific singular nouns and consistent PascalCase naming for cmdlets and parameters.  
  Sources: [Cmdlet Class Declaration](https://learn.microsoft.com/powershell/scripting/developer/cmdlet/cmdlet-class-declaration), [Strongly Encouraged Development Guidelines](https://learn.microsoft.com/powershell/scripting/developer/cmdlet/strongly-encouraged-development-guidelines)

### Runtime behavior and safety
- Derive cmdlets from `Cmdlet` or `PSCmdlet` (use `PSCmdlet` when runtime/session services are needed).  
  Source: [Required Development Guidelines](https://learn.microsoft.com/powershell/scripting/developer/cmdlet/required-development-guidelines)
- Implement appropriate processing lifecycle methods (`BeginProcessing`, `ProcessRecord`, `EndProcessing`).  
  Sources: [Required Development Guidelines](https://learn.microsoft.com/powershell/scripting/developer/cmdlet/required-development-guidelines), [Cmdlet Input Processing Methods](https://learn.microsoft.com/powershell/scripting/developer/cmdlet/cmdlet-input-processing-methods)
- For state-changing commands, set `SupportsShouldProcess = true` and call `ShouldProcess`; use `ShouldContinue` sparingly and pair with `Force` for automation scenarios.  
  Sources: [Cmdlet Attribute Declaration](https://learn.microsoft.com/powershell/scripting/developer/cmdlet/cmdlet-attribute-declaration), [Requesting Confirmation from Cmdlets](https://learn.microsoft.com/powershell/scripting/developer/cmdlet/requesting-confirmation-from-cmdlets), [Required Development Guidelines](https://learn.microsoft.com/powershell/scripting/developer/cmdlet/required-development-guidelines)
- Distinguish terminating vs non-terminating errors (`ThrowTerminatingError` vs `WriteError`).  
  Source: [Required Development Guidelines](https://learn.microsoft.com/powershell/scripting/developer/cmdlet/required-development-guidelines)

### Module packaging and portability
- Ship C# cmdlets as a binary module (`.dll`), with a module manifest for metadata and exports.  
  Source: [How to Write a PowerShell Binary Module](https://learn.microsoft.com/powershell/scripting/developer/module/how-to-write-a-powershell-binary-module)
- Prefer explicit export control (`CmdletsToExport`, `AliasesToExport`, etc.) in the manifest.  
  Sources: [How to Write a PowerShell Module Manifest](https://learn.microsoft.com/powershell/scripting/developer/module/how-to-write-a-powershell-module-manifest), [about_Module_Manifests](https://learn.microsoft.com/powershell/module/microsoft.powershell.core/about/about_module_manifests)
- For cross-platform modules, validate APIs and declare compatibility for target editions.  
  Source: [Writing Portable Modules](https://learn.microsoft.com/powershell/scripting/dev-cross-plat/writing-portable-modules)

## 2) Lightweight alias-centric notation for agent instructions

Microsoft guidance is to treat aliases as interactive convenience and use full command names in scripts.  
Source: [Using aliases](https://learn.microsoft.com/powershell/scripting/learn/shell/using-aliases)

Practical model for concise AI scripting:
1. Allow shorthand aliases in instruction text (`gci`, `gc`, `?`, `%`, `iwr`, `irm`) to reduce prompt/typing overhead.  
   Sources: [Using aliases](https://learn.microsoft.com/powershell/scripting/learn/shell/using-aliases), [about_Aliases](https://learn.microsoft.com/powershell/module/microsoft.powershell.core/about/about_aliases)
2. Expand to canonical cmdlet names before persisting scripts or durable runbooks.  
   Source: [Using aliases](https://learn.microsoft.com/powershell/scripting/learn/shell/using-aliases)
3. Anchor vocabulary to approved verb semantics for predictable intent mapping.  
   Sources: [Approved Verbs](https://learn.microsoft.com/powershell/scripting/developer/cmdlet/approved-verbs-for-windows-powershell-commands), [Get-Verb](https://learn.microsoft.com/powershell/module/microsoft.powershell.utility/get-verb)

## 3) Alias/command conflict resolution (at least 3 remediation strategies)

### Strategy A — Prevent clobbering at import time
- Use `Import-Module -NoClobber` to avoid importing commands that would hide existing ones.  
  Source: [Import-Module](https://learn.microsoft.com/powershell/module/microsoft.powershell.core/import-module)

### Strategy B — Prefix imported command names
- Use `Import-Module -Prefix <X>` to namespace imported command nouns and reduce collisions.  
  Sources: [Import-Module](https://learn.microsoft.com/powershell/module/microsoft.powershell.core/import-module), [about_Modules](https://learn.microsoft.com/powershell/module/microsoft.powershell.core/about/about_modules)

### Strategy C — Module-qualified invocation
- Invoke as `ModuleName\CommandName` (for example `Microsoft.PowerShell.Utility\Get-Date`) to force a specific implementation.  
  Sources: [about_Command_Precedence](https://learn.microsoft.com/powershell/module/microsoft.powershell.core/about/about_command_precedence), [about_Modules](https://learn.microsoft.com/powershell/module/microsoft.powershell.core/about/about_modules)

### Strategy D — Inspect precedence and duplicates explicitly
- Run `Get-Command <name> -All` to enumerate all matching commands and precedence.  
  Source: [about_Command_Precedence](https://learn.microsoft.com/powershell/module/microsoft.powershell.core/about/about_command_precedence)

### Strategy E — Rebind or remove aliases deliberately
- Use `Set-Alias` and `Remove-Alias`/`Remove-Item Alias:` to control alias bindings, respecting `ReadOnly`/`Constant` behavior and `-Force`.  
  Sources: [Set-Alias](https://learn.microsoft.com/powershell/module/microsoft.powershell.utility/set-alias), [about_Aliases](https://learn.microsoft.com/powershell/module/microsoft.powershell.core/about/about_aliases)

## 4) Alias survey for frequently used core modules/cmdlets (concise AI-scripting format)

| Canonical command | Common aliases | Module | Source |
|---|---|---|---|
| `Get-ChildItem` | `dir`, `gci`, `ls` | Microsoft.PowerShell.Management | [Get-ChildItem](https://learn.microsoft.com/powershell/module/microsoft.powershell.management/get-childitem) |
| `Set-Location` | `cd`, `chdir`, `sl` | Microsoft.PowerShell.Management | [Set-Location](https://learn.microsoft.com/powershell/module/microsoft.powershell.management/set-location) |
| `Get-Content` | `cat`, `gc`, `type` | Microsoft.PowerShell.Management | [Get-Content](https://learn.microsoft.com/powershell/module/microsoft.powershell.management/get-content) |
| `Copy-Item` | `copy`, `cp`, `cpi` | Microsoft.PowerShell.Management | [Copy-Item](https://learn.microsoft.com/powershell/module/microsoft.powershell.management/copy-item) |
| `Move-Item` | `mi`, `move`, `mv` | Microsoft.PowerShell.Management | [Move-Item](https://learn.microsoft.com/powershell/module/microsoft.powershell.management/move-item) |
| `Remove-Item` | `del`, `erase`, `rd`, `ri`, `rm` | Microsoft.PowerShell.Management | [Remove-Item](https://learn.microsoft.com/powershell/module/microsoft.powershell.management/remove-item) |
| `Get-Process` | `gps`, `ps` | Microsoft.PowerShell.Management | [Get-Process](https://learn.microsoft.com/powershell/module/microsoft.powershell.management/get-process) |
| `Stop-Process` | `kill`, `spps` | Microsoft.PowerShell.Management | [Stop-Process](https://learn.microsoft.com/powershell/module/microsoft.powershell.management/stop-process) |
| `ForEach-Object` | `%`, `foreach` | Microsoft.PowerShell.Core | [ForEach-Object](https://learn.microsoft.com/powershell/module/microsoft.powershell.core/foreach-object) |
| `Where-Object` | `?`, `where` | Microsoft.PowerShell.Core | [Where-Object](https://learn.microsoft.com/powershell/module/microsoft.powershell.core/where-object) |
| `Get-Command` | `gcm` | Microsoft.PowerShell.Core | [Get-Command](https://learn.microsoft.com/powershell/module/microsoft.powershell.core/get-command) |
| `Import-Module` | `ipmo` | Microsoft.PowerShell.Core | [Import-Module](https://learn.microsoft.com/powershell/module/microsoft.powershell.core/import-module) |
| `Select-Object` | `select` | Microsoft.PowerShell.Utility | [Select-Object](https://learn.microsoft.com/powershell/module/microsoft.powershell.utility/select-object) |
| `Sort-Object` | `sort` | Microsoft.PowerShell.Utility | [Sort-Object](https://learn.microsoft.com/powershell/module/microsoft.powershell.utility/sort-object) |
| `Measure-Object` | `measure` | Microsoft.PowerShell.Utility | [Measure-Object](https://learn.microsoft.com/powershell/module/microsoft.powershell.utility/measure-object) |
| `Invoke-WebRequest` | `iwr` | Microsoft.PowerShell.Utility | [Invoke-WebRequest](https://learn.microsoft.com/powershell/module/microsoft.powershell.utility/invoke-webrequest) |
| `Invoke-RestMethod` | `irm` | Microsoft.PowerShell.Utility | [Invoke-RestMethod](https://learn.microsoft.com/powershell/module/microsoft.powershell.utility/invoke-restmethod) |

PowerShell source also defines built-in aliases centrally (for example `%`, `?`, `ipmo`, `irm`, `iwr`, `cat`, `cp`, `ls`, `ps`, `rm`, `cd`, `dir`, `type`).  
Source: [PowerShell source: InitialSessionState alias entries](https://github.com/PowerShell/PowerShell/blob/a6d50f4744310025d6cf316ab8bb466db1b5dd55/src/System.Management.Automation/engine/InitialSessionState.cs#L4714-L4878)

## 5) Recommended profile for efficient Copilot-style PowerShell agent execution

- Keep a small, explicit alias allowlist for interactive prompts; expand to canonical cmdlets for stored scripts.
- Guard module imports with `-NoClobber` or `-Prefix` by default in automation contexts.
- Detect ambiguity with `Get-Command -All`, then use module-qualified invocation where determinism matters.
- For C# modules, enforce approved verbs + explicit manifest exports to keep vocabulary stable for both humans and agents.

Primary sources above support these defaults for concise but deterministic automation.
