import { assertEquals } from "@std/assert";

import { Fuzz } from "../src/index.ts";

Deno.test("constructs and projects bounded Rat values", () => {
  assertEquals(Fuzz.fromFloat(Number.NaN), Fuzz.ZERO);
  assertEquals(Fuzz.fromFloat(-1), Fuzz.ZERO);
  assertEquals(Fuzz.fromFloat(2), Fuzz.ONE);
  assertEquals(Fuzz.fromRatio(1, 2), 0x80000000);
  assertEquals(Fuzz.fromPercent(50), 0x80000000);
  assertEquals(Fuzz.toFloat(Fuzz.ZERO), 0);
  assertEquals(Fuzz.toFloat(Fuzz.ONE), 1);
  assertEquals(Fuzz.toPercent(Fuzz.ONE), 100);
});

Deno.test("satisfies complement and De Morgan lattice laws exactly", () => {
  const values = [
    Fuzz.ZERO,
    Fuzz.fromRatio(1, 4),
    Fuzz.fromRatio(1, 2),
    Fuzz.fromRatio(3, 4),
    Fuzz.ONE,
  ];

  for (const left of values) {
    assertEquals(Fuzz.not(Fuzz.not(left)), left);
    for (const right of values) {
      assertEquals(
        Fuzz.not(Fuzz.and(left, right)),
        Fuzz.or(Fuzz.not(left), Fuzz.not(right)),
      );
      assertEquals(
        Fuzz.not(Fuzz.or(left, right)),
        Fuzz.and(Fuzz.not(left), Fuzz.not(right)),
      );
    }
  }
});

Deno.test("implements product, blend, and Lukasiewicz norms", () => {
  const half = Fuzz.fromRatio(1, 2);
  const quarter = Fuzz.fromRatio(1, 4);

  assertEquals(Fuzz.productAnd(half, half), quarter);
  assertEquals(Fuzz.very(half), quarter);
  assertEquals(Fuzz.blend(Fuzz.ZERO, half), half);
  assertEquals(Fuzz.boundedAnd(half, half), 1);
  assertEquals(Fuzz.boundedOr(half, half), Fuzz.ONE);
  assertEquals(Fuzz.implies(quarter, half), quarter);
});

Deno.test("supports thresholds, vectors, and exact 16-bit endpoint scaling", () => {
  const half = Fuzz.fromRatio(1, 2);

  assertEquals(Fuzz.cut(half, half), true);
  assertEquals(Fuzz.cut(Fuzz.ZERO, half), false);
  assertEquals(
    Fuzz.createVector([Fuzz.ZERO, half, Fuzz.ONE]),
    new Uint32Array([0, half, 0xffffffff]),
  );
  assertEquals(Fuzz.pack16(Fuzz.ONE), 0xffff);
  assertEquals(Fuzz.unpack16(0xffff), Fuzz.ONE);
  assertEquals(Fuzz.unpack16(0x1234), 0x12341234);
});
