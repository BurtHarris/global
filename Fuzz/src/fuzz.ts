import type { Degree } from "./degree.ts";
import { type Rational, rational } from "./rational.ts";

const DENOMINATOR = 1_000_000_000_000_000;
const DECIMAL_PATTERN = /^[+-]?(?:\d+(?:\.\d*)?|\.\d+)$/;
const PERCENT_PATTERN = /^([+-]?(?:\d+(?:\.\d*)?|\.\d+))%$/;
const RATIO_PATTERN = /^([+-]?\d+)\s*\/\s*(\d+)$/;

export type DegreeInput = number | string | Rational;

function create(value: number): Degree {
  if (!Number.isFinite(value) || value < 0 || value > 1) {
    throw new RangeError("A Degree must be between 0 and 1");
  }
  return Math.round(value * DENOMINATOR) as Degree;
}

function fromString(value: string): Degree {
  const trimmed = value.trim();
  const percent = trimmed.match(PERCENT_PATTERN);
  if (percent) {
    return create(Number(percent[1]) / 100);
  }

  const ratio = trimmed.match(RATIO_PATTERN);
  if (ratio) {
    return fromRational(rational(Number(ratio[1]), Number(ratio[2])));
  }

  if (DECIMAL_PATTERN.test(trimmed)) {
    return create(Number(trimmed));
  }

  throw new TypeError(`Unsupported Degree format: ${value}`);
}

function fromRational(value: Rational): Degree {
  return create(value.numerator / value.denominator);
}

export const ff = {
  name: "Fuzz",
  version: "1.0.0",
  DENOMINATOR,
  ZERO: 0 as Degree,
  ONE: DENOMINATOR as Degree,

  rational,

  degree(value: DegreeInput): Degree {
    if (typeof value === "string") {
      return fromString(value);
    }
    if (typeof value === "number") {
      return create(value);
    }
    return fromRational(value);
  },

  toFloat(value: Degree): number {
    return value / DENOMINATOR;
  },

  toPercent(value: Degree): number {
    return this.toFloat(value) * 100;
  },

  not(value: Degree): Degree {
    return (DENOMINATOR - value) as Degree;
  },

  and(left: Degree, right: Degree): Degree {
    return left < right ? left : right;
  },

  or(left: Degree, right: Degree): Degree {
    return left > right ? left : right;
  },

  productAnd(left: Degree, right: Degree): Degree {
    return Math.round((left / DENOMINATOR) * right) as Degree;
  },

  blend(left: Degree, right: Degree): Degree {
    return this.not(this.productAnd(this.not(left), this.not(right)));
  },

  boundedAnd(left: Degree, right: Degree): Degree {
    return left > DENOMINATOR - right ? (left - (DENOMINATOR - right)) as Degree : this.ZERO;
  },

  boundedOr(left: Degree, right: Degree): Degree {
    return left >= DENOMINATOR - right ? this.ONE : (left + right) as Degree;
  },

  very(value: Degree): Degree {
    return this.productAnd(value, value);
  },

  somewhat(value: Degree): Degree {
    return Math.round(Math.sqrt(this.toFloat(value)) * DENOMINATOR) as Degree;
  },

  cut(value: Degree, alpha: Degree): boolean {
    return value >= alpha;
  },

  implies(antecedent: Degree, consequent: Degree): Degree {
    return this.and(antecedent, consequent);
  },
};
