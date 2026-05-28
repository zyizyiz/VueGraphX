import type { MathPoint3D } from './geometry';
import {
  failMathResult,
  normalizeMathTolerance,
  okMathResult,
  type MathResult,
  type MathResultMetaInput,
  type MathTolerance
} from './diagnostics';

export type GraphSolidFamily =
  | 'cylinder'
  | 'rectangular-prism'
  | 'cube'
  | 'triangular-prism'
  | 'pentagonal-prism'
  | 'hexagonal-prism'
  | 'triangular-pyramid'
  | 'quadrangular-pyramid'
  | 'triangular-frustum'
  | 'quadrangular-frustum'
  | 'cone'
  | 'conical-frustum'
  | 'sphere';

export interface GraphSolidDescriptor {
  family: GraphSolidFamily;
  parameters: Record<string, number>;
  origin?: MathPoint3D;
  rotation?: MathPoint3D;
}

export interface GraphSolidMetrics {
  volume: number;
  surfaceArea: number;
  lateralArea?: number;
  baseArea?: number;
}

export interface GraphSolidMetricOptions {
  tolerance?: MathTolerance;
  epsilon?: number;
}

const toleranceForOptions = (options: GraphSolidMetricOptions = {}) => normalizeMathTolerance({
  ...options.tolerance,
  epsilon: options.epsilon ?? options.tolerance?.epsilon
});

const metaForOptions = (
  options: GraphSolidMetricOptions = {},
  target: string,
  method = 'analytic'
): MathResultMetaInput => ({
  tolerance: toleranceForOptions(options),
  target,
  method
});

export const createSolidDescriptor = (
  family: GraphSolidFamily,
  parameters: Record<string, number>,
  origin?: MathPoint3D
): GraphSolidDescriptor => ({
  family,
  parameters: { ...parameters },
  origin: origin ? { ...origin } : undefined
});

export const getSolidDefaultParameters = (family: GraphSolidFamily): Record<string, number> => {
  switch (family) {
    case 'sphere':
      return { radius: 1 };
    case 'cylinder':
    case 'cone':
      return { radius: 1, height: 2 };
    case 'conical-frustum':
      return { topRadius: 0.5, bottomRadius: 1, height: 2 };
    case 'cube':
      return { size: 1 };
    case 'rectangular-prism':
      return { width: 2, depth: 1, height: 1 };
    case 'triangular-prism':
      return { baseArea: Math.sqrt(3) / 4, basePerimeter: 3, height: 2 };
    case 'pentagonal-prism':
      return { baseArea: 1.720477400588967, basePerimeter: 5, height: 2 };
    case 'hexagonal-prism':
      return { baseArea: (3 * Math.sqrt(3)) / 2, basePerimeter: 6, height: 2 };
    case 'triangular-pyramid':
      return { baseArea: Math.sqrt(3) / 4, basePerimeter: 3, height: 1, slantHeight: 1 };
    case 'quadrangular-pyramid':
      return { baseArea: 1, basePerimeter: 4, height: 1, slantHeight: 1 };
    case 'triangular-frustum':
    case 'quadrangular-frustum':
      return { topArea: 0.25, bottomArea: 1, topPerimeter: 2, bottomPerimeter: 4, height: 2, slantHeight: 2 };
    default:
      return { radius: 1, height: 2 };
  }
};

const readPositive = (
  descriptor: GraphSolidDescriptor,
  key: string,
  options: GraphSolidMetricOptions
): MathResult<number> => {
  const meta = metaForOptions(options, `solid.parameters.${key}`);
  const value = descriptor.parameters[key];
  if (!Number.isFinite(value)) {
    return failMathResult('MATH_INVALID_INPUT', `solid.parameters.${key}`, `Solid parameter "${key}" must be finite.`, meta, {
      family: descriptor.family,
      parameters: descriptor.parameters
    });
  }
  if (value <= toleranceForOptions(options).epsilon) {
    return failMathResult('MATH_DEGENERATE_GEOMETRY', `solid.parameters.${key}`, `Solid parameter "${key}" must be positive.`, meta, {
      family: descriptor.family,
      value
    });
  }
  return okMathResult(value, meta);
};

const readOptionalPositive = (
  descriptor: GraphSolidDescriptor,
  key: string,
  fallback: number,
  options: GraphSolidMetricOptions
): MathResult<number> => {
  if (!Object.prototype.hasOwnProperty.call(descriptor.parameters, key)) {
    return okMathResult(fallback, metaForOptions(options, `solid.parameters.${key}`));
  }
  return readPositive(descriptor, key, options);
};

const prismMetrics = (
  descriptor: GraphSolidDescriptor,
  options: GraphSolidMetricOptions
): MathResult<GraphSolidMetrics> => {
  const meta = metaForOptions(options, 'solid.metrics', 'prism');
  const baseArea = readPositive(descriptor, 'baseArea', options);
  if (!baseArea.ok) return baseArea;
  const basePerimeter = readPositive(descriptor, 'basePerimeter', options);
  if (!basePerimeter.ok) return basePerimeter;
  const height = readPositive(descriptor, 'height', options);
  if (!height.ok) return height;
  const lateralArea = basePerimeter.value * height.value;
  return okMathResult({
    volume: baseArea.value * height.value,
    surfaceArea: 2 * baseArea.value + lateralArea,
    lateralArea,
    baseArea: baseArea.value
  }, meta);
};

const pyramidMetrics = (
  descriptor: GraphSolidDescriptor,
  options: GraphSolidMetricOptions
): MathResult<GraphSolidMetrics> => {
  const meta = metaForOptions(options, 'solid.metrics', 'pyramid');
  const baseArea = readPositive(descriptor, 'baseArea', options);
  if (!baseArea.ok) return baseArea;
  const basePerimeter = readPositive(descriptor, 'basePerimeter', options);
  if (!basePerimeter.ok) return basePerimeter;
  const height = readPositive(descriptor, 'height', options);
  if (!height.ok) return height;
  const slantHeight = readPositive(descriptor, 'slantHeight', options);
  if (!slantHeight.ok) return slantHeight;
  const lateralArea = (basePerimeter.value * slantHeight.value) / 2;
  return okMathResult({
    volume: (baseArea.value * height.value) / 3,
    surfaceArea: baseArea.value + lateralArea,
    lateralArea,
    baseArea: baseArea.value
  }, meta);
};

const frustumMetrics = (
  descriptor: GraphSolidDescriptor,
  options: GraphSolidMetricOptions
): MathResult<GraphSolidMetrics> => {
  const meta = metaForOptions(options, 'solid.metrics', 'frustum');
  const topArea = readPositive(descriptor, 'topArea', options);
  if (!topArea.ok) return topArea;
  const bottomArea = readPositive(descriptor, 'bottomArea', options);
  if (!bottomArea.ok) return bottomArea;
  const topPerimeter = readPositive(descriptor, 'topPerimeter', options);
  if (!topPerimeter.ok) return topPerimeter;
  const bottomPerimeter = readPositive(descriptor, 'bottomPerimeter', options);
  if (!bottomPerimeter.ok) return bottomPerimeter;
  const height = readPositive(descriptor, 'height', options);
  if (!height.ok) return height;
  const slantHeight = readPositive(descriptor, 'slantHeight', options);
  if (!slantHeight.ok) return slantHeight;
  const lateralArea = ((topPerimeter.value + bottomPerimeter.value) * slantHeight.value) / 2;
  return okMathResult({
    volume: (height.value / 3) * (topArea.value + bottomArea.value + Math.sqrt(topArea.value * bottomArea.value)),
    surfaceArea: topArea.value + bottomArea.value + lateralArea,
    lateralArea,
    baseArea: bottomArea.value
  }, meta);
};

export const calculateSolidMetrics = (
  descriptor: GraphSolidDescriptor,
  options: GraphSolidMetricOptions = {}
): MathResult<GraphSolidMetrics> => {
  const meta = metaForOptions(options, 'solid.metrics');
  switch (descriptor.family) {
    case 'sphere': {
      const radius = readPositive(descriptor, 'radius', options);
      if (!radius.ok) return radius;
      return okMathResult({
        volume: (4 / 3) * Math.PI * radius.value ** 3,
        surfaceArea: 4 * Math.PI * radius.value ** 2
      }, meta);
    }
    case 'cylinder': {
      const radius = readPositive(descriptor, 'radius', options);
      if (!radius.ok) return radius;
      const height = readPositive(descriptor, 'height', options);
      if (!height.ok) return height;
      const baseArea = Math.PI * radius.value ** 2;
      const lateralArea = 2 * Math.PI * radius.value * height.value;
      return okMathResult({
        volume: baseArea * height.value,
        surfaceArea: 2 * baseArea + lateralArea,
        lateralArea,
        baseArea
      }, meta);
    }
    case 'cone': {
      const radius = readPositive(descriptor, 'radius', options);
      if (!radius.ok) return radius;
      const height = readPositive(descriptor, 'height', options);
      if (!height.ok) return height;
      const slantHeight = readOptionalPositive(descriptor, 'slantHeight', Math.hypot(radius.value, height.value), options);
      if (!slantHeight.ok) return slantHeight;
      const baseArea = Math.PI * radius.value ** 2;
      const lateralArea = Math.PI * radius.value * slantHeight.value;
      return okMathResult({
        volume: (baseArea * height.value) / 3,
        surfaceArea: baseArea + lateralArea,
        lateralArea,
        baseArea
      }, meta);
    }
    case 'conical-frustum': {
      const topRadius = readPositive(descriptor, 'topRadius', options);
      if (!topRadius.ok) return topRadius;
      const bottomRadius = readPositive(descriptor, 'bottomRadius', options);
      if (!bottomRadius.ok) return bottomRadius;
      const height = readPositive(descriptor, 'height', options);
      if (!height.ok) return height;
      const slantHeight = readOptionalPositive(descriptor, 'slantHeight', Math.hypot(bottomRadius.value - topRadius.value, height.value), options);
      if (!slantHeight.ok) return slantHeight;
      const lateralArea = Math.PI * (topRadius.value + bottomRadius.value) * slantHeight.value;
      const topArea = Math.PI * topRadius.value ** 2;
      const bottomArea = Math.PI * bottomRadius.value ** 2;
      return okMathResult({
        volume: (Math.PI * height.value * (bottomRadius.value ** 2 + bottomRadius.value * topRadius.value + topRadius.value ** 2)) / 3,
        surfaceArea: topArea + bottomArea + lateralArea,
        lateralArea,
        baseArea: bottomArea
      }, meta);
    }
    case 'cube': {
      const size = readPositive(descriptor, 'size', options);
      if (!size.ok) return size;
      return okMathResult({ volume: size.value ** 3, surfaceArea: 6 * size.value ** 2, baseArea: size.value ** 2 }, meta);
    }
    case 'rectangular-prism': {
      const width = readPositive(descriptor, 'width', options);
      if (!width.ok) return width;
      const depth = readPositive(descriptor, 'depth', options);
      if (!depth.ok) return depth;
      const height = readPositive(descriptor, 'height', options);
      if (!height.ok) return height;
      return okMathResult({
        volume: width.value * depth.value * height.value,
        surfaceArea: 2 * (width.value * depth.value + width.value * height.value + depth.value * height.value),
        baseArea: width.value * depth.value
      }, meta);
    }
    case 'triangular-prism':
    case 'pentagonal-prism':
    case 'hexagonal-prism':
      return prismMetrics(descriptor, options);
    case 'triangular-pyramid':
    case 'quadrangular-pyramid':
      return pyramidMetrics(descriptor, options);
    case 'triangular-frustum':
    case 'quadrangular-frustum':
      return frustumMetrics(descriptor, options);
  }
};
