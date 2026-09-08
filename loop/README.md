# Loop Workspace Automation

A preview-quality Playwright + TypeScript skill for automating supported Microsoft Loop UI workflows in a safe, copy-only default posture.

## Purpose

This project is intended to automate the_LOOP web experience for:

- Creating a Loop workspace.
- Naming and describing the workspace.
- Optionally adding members.
- Finding or opening existing Loop pages.
- Copying supported pages into a destination workspace.
- Arranging copied pages into a requested order or hierarchy.
- Verifying the destination workspace.
- Producing an execution report.
- Optionally removing source pages only after explicit authorization and validation.

## Safety by default

The default posture is intentionally conservative:

- dry run enabled unless an explicit override is provided,
- copy-only actions by default,
- no source-page deletion without explicit user approval,
- tolerant handling of UI variations and minor automation fragility.

## Project status

This repo is a working scaffold for the initial specification pass. It is designed to be extended into a real browser automation skill without assuming full UI stability.

## Local development

Use mise tasks for the project workflow instead of custom package.json scripts:

```bash
cd loop
mise install
mise run build
mise run dev -- --help
```

## Planned implementation shape

- Playwright browser automation against https://loop.cloud.microsoft/
- typed workflow steps for create/open/copy/verify/report
- explicit dry-run and verification gates
- structured execution report for warnings, mismatches, and failures
