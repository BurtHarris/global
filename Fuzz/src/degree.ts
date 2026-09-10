/** A fixed-point representation of a normalized fuzzy Degree. */

declare const DegreeBrand: unique symbol;
export type Degree = number & { readonly [DegreeBrand]: typeof DegreeBrand };
