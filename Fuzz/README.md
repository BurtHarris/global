# global-fuzz

`global-fuzz` is a DOGEtech.co package for deterministic fuzzy logic in Deno and TypeScript.

## Degrees

The basic value in fuzzy logic is a **degree**. A degree is a number from `0` to `1`:

- `0` means none or false.
- `1` means full or true.
- Values between them express partial membership or partial truth.

The TypeScript API exposes `Degree` as a type and uses the `ff` factory object to create values. A
Degree is not an angle; it is a normalized fuzzy value. Its meaning depends on context: it can
describe how much something belongs to a fuzzy set, or how true a fuzzy statement is.

The package stores each Degree as a fixed-point value. This gives the fuzzy operations deterministic
results while the public conversions use the simpler `0` to `1` scale.

## Fuzzy operations

The `ff` factory object has the stable schema name `Fuzz` and a SemVer schema version, starting at
`1.0.0`. It uses familiar names and standard fuzzy-logic ideas:

- `ff.not` is the fuzzy NOT operation. It reverses the degree.
- `ff.and` is fuzzy AND using the lower of two degrees (the minimum operation).
- `ff.or` is fuzzy OR using the higher of two degrees (the maximum operation).
- `ff.productAnd` is the product operation, a softer form of fuzzy AND.
- `ff.blend` is the matching product-based OR operation.
- `ff.boundedAnd` and `ff.boundedOr` are the Łukasiewicz AND and OR operations. They combine degrees
  and stop at the bounds `0` and `1`.
- `ff.very` and `ff.somewhat` are linguistic hedges. They change a degree in the way that words such
  as "very" and "somewhat" change a description.
- `ff.cut` is an alpha-cut. It keeps a result when its degree meets or exceeds a chosen cutoff,
  producing a yes/no decision.

The API also exposes `ff.implies`. For now, it returns the lower of its two inputs, the same result
as `ff.and`. Its formal implication meaning remains an open design question.

## Creating values

`ff.degree` accepts a normalized number, a string, or a `Rational`:

```ts
ff.degree(0.5);
ff.degree("50%");
ff.degree("1/2");
ff.degree(ff.rational(1, 2));
```

The equivalent forms produce the same Degree. A `Rational` is an exact fraction with a numerator and
positive denominator. `ff.rational(150, 100)` is valid and is reduced to `3 / 2`, but converting it
to a Degree throws `RangeError` because Degrees must stay between `0` and `1`. Negative values also
throw.

Parameterized linguistic hedges, such as choosing how strongly `very` or `somewhat` changes a
degree, may be added later. They are not part of the current API.

## Development

The package is configured for the JavaScript Registry (JSR), a package registry that publishes
TypeScript source directly for runtimes such as Deno. No build step is required.

The package uses mise to install the pinned Deno runtime and run development tasks:

```sh
mise install
mise run check
mise run test
```

Run `mise run publish-check` to validate the package for publication without publishing it.
