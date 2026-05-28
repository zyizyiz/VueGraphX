import { GRAPH_MATH_EPSILON, type MathPoint3D, type MathVector2D, type MathVector3D } from './geometry';
import {
  failMathResult,
  normalizeMathTolerance,
  okMathResult,
  type MathResult,
  type MathResultMetaInput,
  type MathTolerance
} from './diagnostics';

export interface MathVectorOptions {
  tolerance?: MathTolerance;
  epsilon?: number;
}

const toleranceForOptions = (options: MathVectorOptions = {}) => normalizeMathTolerance({
  ...options.tolerance,
  epsilon: options.epsilon ?? options.tolerance?.epsilon
});

const metaForOptions = (options: MathVectorOptions = {}, target: string): MathResultMetaInput => ({
  tolerance: toleranceForOptions(options),
  target,
  method: 'analytic'
});

export const point3D = (x: number, y: number, z: number): MathPoint3D => ({ x, y, z });

export const vector3D = (x: number, y: number, z: number): MathVector3D => ({ x, y, z });

export const isFinitePoint3D = (point: MathPoint3D): boolean => Number.isFinite(point.x) && Number.isFinite(point.y) && Number.isFinite(point.z);

export const add3D = (left: MathPoint3D, right: MathVector3D): MathPoint3D => ({
  x: left.x + right.x,
  y: left.y + right.y,
  z: left.z + right.z
});

export const subtract3D = (left: MathPoint3D, right: MathPoint3D): MathVector3D => ({
  x: left.x - right.x,
  y: left.y - right.y,
  z: left.z - right.z
});

export const scale3D = (vector: MathVector3D, factor: number): MathVector3D => ({
  x: vector.x * factor,
  y: vector.y * factor,
  z: vector.z * factor
});

export const dot3D = (left: MathVector3D, right: MathVector3D): number => left.x * right.x + left.y * right.y + left.z * right.z;

export const cross3D = (left: MathVector3D, right: MathVector3D): MathVector3D => ({
  x: left.y * right.z - left.z * right.y,
  y: left.z * right.x - left.x * right.z,
  z: left.x * right.y - left.y * right.x
});

export const length3D = (vector: MathVector3D): number => Math.hypot(vector.x, vector.y, vector.z);

export const distance3D = (left: MathPoint3D, right: MathPoint3D): number => length3D(subtract3D(left, right));

export const normalize3D = (vector: MathVector3D, epsilon = GRAPH_MATH_EPSILON): MathVector3D => {
  const length = length3D(vector);
  return length <= epsilon ? { x: 0, y: 0, z: 0 } : { x: vector.x / length, y: vector.y / length, z: vector.z / length };
};

export const angleBetweenVectors2D = (
  left: MathVector2D,
  right: MathVector2D,
  options: MathVectorOptions = {}
): MathResult<number> => {
  const meta = metaForOptions(options, 'vector.angle2d');
  const leftLength = Math.hypot(left.x, left.y);
  const rightLength = Math.hypot(right.x, right.y);
  if (leftLength <= toleranceForOptions(options).epsilon || rightLength <= toleranceForOptions(options).epsilon) {
    return failMathResult('MATH_DEGENERATE_GEOMETRY', 'vector.angle2d', 'Vector angle requires non-zero vectors.', meta, { left, right });
  }
  const cosine = (left.x * right.x + left.y * right.y) / (leftLength * rightLength);
  return okMathResult(Math.acos(Math.min(1, Math.max(-1, cosine))), meta);
};

export const angleBetweenVectors3D = (
  left: MathVector3D,
  right: MathVector3D,
  options: MathVectorOptions = {}
): MathResult<number> => {
  const meta = metaForOptions(options, 'vector.angle3d');
  const leftLength = length3D(left);
  const rightLength = length3D(right);
  if (leftLength <= toleranceForOptions(options).epsilon || rightLength <= toleranceForOptions(options).epsilon) {
    return failMathResult('MATH_DEGENERATE_GEOMETRY', 'vector.angle3d', 'Vector angle requires non-zero vectors.', meta, { left, right });
  }
  const cosine = dot3D(left, right) / (leftLength * rightLength);
  return okMathResult(Math.acos(Math.min(1, Math.max(-1, cosine))), meta);
};
