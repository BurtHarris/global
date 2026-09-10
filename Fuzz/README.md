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

The package uses mise to install the pinned Deno runtime and run development tasks:

```sh
mise install
mise run check
mise run test
```

Run `mise run publish-check` to validate the package for publication without publishing it.
