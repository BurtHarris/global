# Pool

Runspace execution context for reusable background shell execution packages.

## Language

**Pool Context**:
The bounded context that owns implementations of pooled runspace execution behavior.
_Avoid_: Runspace project, shell daemon repo

**Package**:
An independent implementation unit inside this context, with its own language/runtime and operational tasks.
_Avoid_: Context, project

**Legacy Package**:
A package retained for compatibility and prototyping while a newer production package coexists in the same context.
_Avoid_: Deprecated context, retired implementation

**Production Package**:
The package designated as the primary implementation for ongoing use and future feature work.
_Avoid_: Prototype package, experimental fork
