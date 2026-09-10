/** A fixed-point representation of a normalized fuzzy Degree. */

declare const DegreeBrand: unique symbol;
export type Degree = number & { readonly [DegreeBrand]: typeof DegreeBrand };

/** Exact decimal denominator of the fixed-point Degree representation: 10^15. */
const FIXED_DENOMINATOR = 1_000_000_000_000_000;

function create(value: number): Degree {
  return Math.min(Math.max(Math.round(value), 0), FIXED_DENOMINATOR) as Degree;
}

/** Converts a normalized number in `[0, 1]` into a branded fixed-point Degree. */
export function Degree(value: number): Degree {
  return Degree.fromFloat(value);
}

/** Fixed-point Degree constants, conversions, and fuzzy operations. */
// The namespace intentionally merges with the branded Degree type.
// deno-lint-ignore no-namespace
export namespace Degree {
  export const DENOMINATOR = FIXED_DENOMINATOR;
  export const ZERO: Degree = create(0);
  export const ONE: Degree = create(FIXED_DENOMINATOR);

  export function fromRatio(numerator: number, denominator: number): Degree {
    if (
      !Number.isFinite(numerator) ||
      !Number.isFinite(denominator) ||
      denominator <= 0 ||
      numerator <= 0
    ) {
      return ZERO;
    }
    if (numerator >= denominator) {
      return ONE;
    }
    return create(Math.round((numerator / denominator) * DENOMINATOR));
  }

  export function fromFloat(value: number): Degree {
    if (Number.isNaN(value) || value <= 0) {
      return ZERO;
    }
    if (value >= 1) {
      return ONE;
    }
    return create(Math.round(value * DENOMINATOR));
  }

  export function toFloat(value: Degree): number {
    return value / DENOMINATOR;
  }

  export function fromPercent(percent: number): Degree {
    return fromRatio(percent, 100);
  }

  export function toPercent(value: Degree): number {
    return toFloat(value) * 100;
  }

  export function not(value: Degree): Degree {
    // Fuzzy NOT reverses the Degree.
    return create(DENOMINATOR - value);
  }

  export function and(left: Degree, right: Degree): Degree {
    // Fuzzy AND using the minimum operation.
    return left < right ? left : right;
  }

  export function or(left: Degree, right: Degree): Degree {
    // Fuzzy OR using the maximum operation.
    return left > right ? left : right;
  }

  export function productAnd(left: Degree, right: Degree): Degree {
    // Product operation, a product t-norm.
    return create(Math.round((left / DENOMINATOR) * right));
  }

  export function blend(left: Degree, right: Degree): Degree {
    return not(productAnd(not(left), not(right)));
  }

  export function boundedAnd(left: Degree, right: Degree): Degree {
    // Łukasiewicz AND operation, with a lower bound of zero.
    return left > DENOMINATOR - right ? create(left - (DENOMINATOR - right)) : ZERO;
  }

  export function boundedOr(left: Degree, right: Degree): Degree {
    // Łukasiewicz OR operation, with an upper bound of one.
    return left >= DENOMINATOR - right ? ONE : create(left + right);
  }

  export function very(value: Degree): Degree {
    // Linguistic hedge that strengthens a description.
    return productAnd(value, value);
  }

  export function somewhat(value: Degree): Degree {
    // Linguistic hedge that softens a description.
    return create(Math.round(Math.sqrt(toFloat(value)) * DENOMINATOR));
  }

  export function cut(degree: Degree, alpha: Degree): boolean {
    // Alpha-cut: keep the result when its Degree meets the cutoff.
    return degree >= alpha;
  }

  export function implies(antecedent: Degree, consequent: Degree): Degree {
    return and(antecedent, consequent);
  }
}
