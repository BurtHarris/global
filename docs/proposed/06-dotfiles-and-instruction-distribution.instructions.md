---
applyTo: "**"
---
# Dotfiles and Instruction Distribution

Use dotfiles tooling to deploy developer-local agent instructions, skills, PowerShell profiles, modules, and root configuration across machines.

## Ownership boundaries

- Developer-local configuration belongs under the user's home directory, such as `~/.agents/` and the platform-appropriate PowerShell profile and module paths.
- Repository instructions belong in the repository.
- Team and organization instructions remain governed shared assets and should not be silently copied into personal ownership.
- Dotfiles may configure references or mounts to governed team and organization roots.
- Do not place unencrypted credentials, access tokens, private keys, or organization secrets in a dotfiles repository.

## Suggested logical layout

```text
~/.agents/
├── AGENTS.md
├── roots.psd1
└── skills/

$TEAM/
├── AGENTS.md
└── skills/

$ORG/
└── AGENTS.md

$REPO/
├── AGENTS.md
└── skills/
```

## Deployment

- Permit established dotfiles managers, including chezmoi or yadm, to manage developer-local files.
- Keep the committed source canonical and generate machine-specific files only when platform differences require it.
- Preserve UTF-8 encoding and LF line endings for portable instruction files.
- Record provenance for imported third-party skills, including origin, version or commit, license, and local modifications.
- Prefer overlays and generated adapters over modifying vendored upstream content directly.

## GitHub Copilot adaptation

- GitHub Copilot-specific files should reference or faithfully adapt the neutral `AGENTS.md` and `SKILL.md` sources.
- Avoid maintaining independent copies whose semantics can drift.
- When GitHub Copilot cannot discover developer-local or team instructions directly, use a thin bootstrap instruction or workspace configuration to identify the applicable roots and composition rules.
