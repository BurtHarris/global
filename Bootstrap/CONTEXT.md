# Bootstrap

Machine bootstrap context for preparing a workstation shell environment and developer toolchain from this repository.

## Language

**Bootstrap Package**:
The package that provisions required machine tools and wires the user's shell profile to this repository.
_Avoid_: Setup script bundle, installer project

**Profile Loader**:
The `$PROFILE` entry that dot-sources the repository-managed profile script.
_Avoid_: Inline profile logic, manual copy profile

**Sandbox Harness**:
A disposable Windows Sandbox execution path used to validate bootstrap behavior without changing the host machine.
_Avoid_: Container test, host install dry run
