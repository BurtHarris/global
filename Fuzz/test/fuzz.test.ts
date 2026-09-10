import { assertEquals, assertThrows } from "@std/assert";

import { create16Vector, createVector, ff, from16Vector, rational } from "../src/index.ts";

Deno.test("constructs and projects bounded Degree values", () => {
  assertEquals(ff.DENOMINATOR, 1_000_000_000_000_000);
  assertEquals(ff.degree(0.5), ff.degree(rational(1, 2)));
  assertEquals(ff.degree("0.5"), ff.degree("50%"));
  assertEquals(ff.degree("1/2"), ff.degree("50%"));
  assertEquals(ff.toFloat(ff.ZERO), 0);
  assertEquals(ff.toFloat(ff.ONE), 1);
  assertEquals(ff.toPercent(ff.ONE), 100);
});

Deno.test("normalizes Rational values", () => {
  assertEquals(rational(2, 4), rational(1, 2));
  assertEquals(rational(150, 100).numerator, 3);
  assertEquals(rational(150, 100).denominator, 2);
  assertThrows(() => ff.degree(rational(150, 100)), RangeError);
  assertThrows(() => ff.degree("150%"), RangeError);
  assertThrows(() => ff.degree(rational(-1, 2)), RangeError);
  assertThrows(() => ff.degree(rational(2, 1)), RangeError);
});

Deno.test("satisfies complement and De Morgan lattice laws exactly", () => {
  const values = [
    ff.degree(0),
    ff.degree("1/4"),
    ff.degree("1/2"),
    ff.degree("3/4"),
    ff.degree(1),
  ];

  for (const left of values) {
    assertEquals(ff.not(ff.not(left)), left);
    for (const right of values) {
      assertEquals(
        ff.not(ff.and(left, right)),
        ff.or(ff.not(left), ff.not(right)),
      );
      assertEquals(
        ff.not(ff.or(left, right)),
        ff.and(ff.not(left), ff.not(right)),
      );
    }
  }
});

Deno.test("implements product, blend, and Łukasiewicz norms", () => {
  const half = ff.degree("1/2");
  const quarter = ff.degree("1/4");

  assertEquals(ff.productAnd(half, half), quarter);
  assertEquals(ff.very(half), quarter);
  assertEquals(ff.blend(ff.ZERO, half), half);
  assertEquals(ff.boundedAnd(half, half), ff.ZERO);
  assertEquals(ff.boundedOr(half, half), ff.ONE);
  assertEquals(ff.implies(quarter, half), quarter);
});

Deno.test("supports thresholds and branded fixed-size vectors", () => {
  const half = ff.degree("1/2");

  assertEquals(ff.cut(half, half), true);
  assertEquals(ff.cut(ff.ZERO, half), false);
  assertEquals(
    Array.from(createVector([ff.ZERO, half, ff.ONE])),
    [0, half, 1_000_000_000_000_000],
  );
  const compact = create16Vector([ff.ZERO, half, ff.ONE]);
  assertEquals(Array.from(compact), [0, 0x8000, 0xffff]);
  assertEquals(Array.from(from16Vector(compact)), [
    0,
    500007629510948.4,
    1_000_000_000_000_000,
  ]);
});
