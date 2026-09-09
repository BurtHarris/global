# ADR 0002: Context to package monorepo convention

Adopt a Context → Package convention across `global`: each top-level bounded context may contain one or more packages, where each package is an independent language/deployment unit. A context remains flat while it has exactly one package, and it reorganizes into per-package subfolders once a second package is introduced. In this pass, `RunspacePool` is renamed to `Pool` with `pwsh/` (legacy/prototype) and `csharp/` (production), and bootstrap assets move into a dedicated `Bootstrap/` context.
