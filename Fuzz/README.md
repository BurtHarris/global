# Fuzz

An exact fixed-point fuzzy logic runtime for Deno and TypeScript. `Rat` values are nominally typed
unsigned 32-bit integers over the unit lattice `n / (2^32 - 1)`.

```ts
import { Fuzz, type Rat } from "jsr:@burtharris/fuzz";

const warm: Rat = Fuzz.fromPercent(70);
const bright: Rat = Fuzz.fromPercent(80);
const active = Fuzz.and(warm, bright);

console.log(Fuzz.toPercent(active));
```

The package is configured for the JavaScript Registry (JSR), a package registry that publishes
TypeScript source directly for runtimes such as Deno. No build step is required.

Run `deno task check` to type-check the package and `deno task test` to exercise the lattice laws
and interop helpers.
