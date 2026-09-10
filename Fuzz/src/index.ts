/**
 * @module Fuzz
 *
 * An exact, zero-drift fuzzy logic runtime implemented over a fixed-point
 * rational unit lattice (`Rat`). Every degree is represented as `n / M`, where
 * `M = 2^32 - 1` and `n` is an unsigned 32-bit integer in `[0, M]`.
 */

declare const RatBrand: unique symbol;

/** A nominal fixed-point rational representing a degree in `[0, 1]`. */
export type Rat = number & { readonly [RatBrand]: typeof RatBrand };

/** Public operations and constants exposed by the fuzzy logic runtime. */
export interface FuzzRuntime {
  readonly ZERO: Rat;
  readonly ONE: Rat;
  readonly MODULUS: number;
  fromRatio(numerator: number, denominator: number): Rat;
  fromFloat(value: number): Rat;
  toFloat(value: Rat): number;
  fromPercent(percent: number): Rat;
  toPercent(value: Rat): number;
  not(value: Rat): Rat;
  and(left: Rat, right: Rat): Rat;
  or(left: Rat, right: Rat): Rat;
  productAnd(left: Rat, right: Rat): Rat;
  blend(left: Rat, right: Rat): Rat;
  boundedAnd(left: Rat, right: Rat): Rat;
  boundedOr(left: Rat, right: Rat): Rat;
  very(value: Rat): Rat;
  somewhat(value: Rat): Rat;
  cut(degree: Rat, alpha: Rat): boolean;
  implies(antecedent: Rat, consequent: Rat): Rat;
  createVector(degrees: readonly Rat[]): Uint32Array;
  pack16(value: Rat): number;
  unpack16(value: number): Rat;
}

const MODULUS = 0xffffffff;
const BIG_MODULUS = BigInt(MODULUS);
const BIG_ROUNDING_OFFSET = BIG_MODULUS / 2n;

function rat(value: number): Rat {
  return (value >>> 0) as Rat;
}

/** Constants, factories, and fuzzy operators over the `Rat` lattice. */
export const Fuzz: FuzzRuntime = {
  /** Bottom element: absolute falsehood. */
  ZERO: rat(0),

  /** Top element: absolute truth. */
  ONE: rat(MODULUS),

  /** Implicit fixed-point denominator, `2^32 - 1`. */
  MODULUS,

  /** Maps `numerator / denominator` to the nearest lattice point. */
  fromRatio(numerator: number, denominator: number): Rat {
    if (
      !Number.isFinite(numerator) ||
      !Number.isFinite(denominator) ||
      denominator <= 0 ||
      numerator <= 0
    ) {
      return Fuzz.ZERO;
    }
    if (numerator >= denominator) {
      return Fuzz.ONE;
    }
    return rat(Math.round((numerator / denominator) * MODULUS));
  },

  /** Maps a floating-point scalar to the lattice, clamped to `[0, 1]`. */
  fromFloat(value: number): Rat {
    if (Number.isNaN(value) || value <= 0) {
      return Fuzz.ZERO;
    }
    if (value >= 1) {
      return Fuzz.ONE;
    }
    return rat(Math.round(value * MODULUS));
  },

  /** Projects a lattice value to an IEEE-754 scalar in `[0, 1]`. */
  toFloat(value: Rat): number {
    return (value >>> 0) / MODULUS;
  },

  /** Maps a percentage to the lattice, clamped to `[0, 100]`. */
  fromPercent(percent: number): Rat {
    return Fuzz.fromRatio(percent, 100);
  },

  /** Projects a lattice value to a percentage. */
  toPercent(value: Rat): number {
    return Fuzz.toFloat(value) * 100;
  },

  /** Standard fuzzy negation, `1 - a`. */
  not(value: Rat): Rat {
    return rat(~value);
  },

  /** Goedel/Zadeh conjunction, `min(a, b)`. */
  and(left: Rat, right: Rat): Rat {
    return (left >>> 0) < (right >>> 0) ? left : right;
  },

  /** Goedel/Zadeh disjunction, `max(a, b)`. */
  or(left: Rat, right: Rat): Rat {
    return (left >>> 0) > (right >>> 0) ? left : right;
  },

  /** Product t-norm, rounded exactly to the nearest lattice point. */
  productAnd(left: Rat, right: Rat): Rat {
    const product = BigInt(left >>> 0) * BigInt(right >>> 0);
    return rat(Number((product + BIG_ROUNDING_OFFSET) / BIG_MODULUS));
  },

  /** Probabilistic sum s-norm, derived by exact De Morgan duality. */
  blend(left: Rat, right: Rat): Rat {
    return Fuzz.not(Fuzz.productAnd(Fuzz.not(left), Fuzz.not(right)));
  },

  /** Lukasiewicz conjunction, `max(0, a + b - 1)`. */
  boundedAnd(left: Rat, right: Rat): Rat {
    const sum = (left >>> 0) + (right >>> 0);
    return sum > MODULUS ? rat(sum - MODULUS) : Fuzz.ZERO;
  },

  /** Lukasiewicz disjunction, `min(1, a + b)`. */
  boundedOr(left: Rat, right: Rat): Rat {
    const sum = (left >>> 0) + (right >>> 0);
    return sum >= MODULUS ? Fuzz.ONE : rat(sum);
  },

  /** Concentration hedge, `a^2`. */
  very(value: Rat): Rat {
    return Fuzz.productAnd(value, value);
  },

  /** Dilation hedge, `sqrt(a)`. */
  somewhat(value: Rat): Rat {
    return rat(Math.round(Math.sqrt(Fuzz.toFloat(value)) * MODULUS));
  },

  /** Returns whether `degree` belongs to the alpha-cut. */
  cut(degree: Rat, alpha: Rat): boolean {
    return (degree >>> 0) >= (alpha >>> 0);
  },

  /** Mamdani minimum implication. */
  implies(antecedent: Rat, consequent: Rat): Rat {
    return Fuzz.and(antecedent, consequent);
  },

  /** Packs values into a contiguous unsigned 32-bit vector. */
  createVector(degrees: readonly Rat[]): Uint32Array {
    const vector = new Uint32Array(degrees.length);
    for (let index = 0; index < degrees.length; index += 1) {
      vector[index] = degrees[index] >>> 0;
    }
    return vector;
  },

  /** Downsamples a `Rat` to its high 16 bits. */
  pack16(value: Rat): number {
    return (value >>> 16) & 0xffff;
  },

  /** Restores a 16-bit unit value by replicating it into both words. */
  unpack16(value: number): Rat {
    const clamped = value & 0xffff;
    return rat((clamped << 16) | clamped);
  },
};
