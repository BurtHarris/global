declare const RationalBrand: unique symbol;

export type Rational = {
  readonly numerator: number;
  readonly denominator: number;
  readonly [RationalBrand]: typeof RationalBrand;
};

function greatestCommonDivisor(left: number, right: number): number {
  let a = Math.abs(left);
  let b = right;
  while (b !== 0) {
    const remainder = a % b;
    a = b;
    b = remainder;
  }
  return a;
}

export function rational(numerator: number, denominator: number): Rational {
  if (
    !Number.isSafeInteger(numerator) ||
    !Number.isSafeInteger(denominator) ||
    denominator <= 0
  ) {
    throw new RangeError("A Rational needs safe integer parts and a positive denominator");
  }

  const divisor = greatestCommonDivisor(numerator, denominator);
  return {
    numerator: numerator / divisor,
    denominator: denominator / divisor,
  } as Rational;
}
