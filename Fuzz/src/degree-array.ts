import type { Degree } from "./degree.ts";

declare const DegreeArrayBrand: unique symbol;
declare const Degree16ArrayBrand: unique symbol;

/** A full-precision fixed-point Degree vector backed by a Float64Array. */
export type DegreeArray = Float64Array & {
  readonly [DegreeArrayBrand]: typeof DegreeArrayBrand;
};

/** A compact, lossy Degree vector backed by a Uint16Array. */
export type Degree16Array = Uint16Array & {
  readonly [Degree16ArrayBrand]: typeof Degree16ArrayBrand;
};

const DENOMINATOR = 1_000_000_000_000_000;
const COMPACT_DENOMINATOR = 0xffff;

export function createVector(degrees: readonly Degree[]): DegreeArray {
  const vector = new Float64Array(degrees.length);
  for (let index = 0; index < degrees.length; index += 1) {
    vector[index] = degrees[index];
  }
  return vector as DegreeArray;
}

/** Creates a compact 16-bit representation of a Degree vector. */
export function create16Vector(degrees: readonly Degree[]): Degree16Array {
  const vector = new Uint16Array(degrees.length);
  for (let index = 0; index < degrees.length; index += 1) {
    vector[index] = Math.round((degrees[index] / DENOMINATOR) * COMPACT_DENOMINATOR);
  }
  return vector as Degree16Array;
}

/** Expands a compact 16-bit Degree vector back onto the fixed denominator. */
export function from16Vector(values: Degree16Array): DegreeArray {
  const degrees = new Float64Array(values.length);
  for (let index = 0; index < values.length; index += 1) {
    degrees[index] = (values[index] / COMPACT_DENOMINATOR) * DENOMINATOR;
  }
  return degrees as DegreeArray;
}
