import * as math from 'mathjs';
import {
  clipSegmentsToBounds2D,
  sampleFunctionSegments,
  sampleImplicitEquationSegments,
  sampleParametricClosedCurve,
  type SceneSamplePoint2D
} from './sceneSampling';

export type SubjectFunctionFamilyKind =
  | 'linear'
  | 'quadratic'
  | 'inverse'
  | 'power'
  | 'exponential'
  | 'logarithmic'
  | 'normal-density'
  | 'sine'
  | 'cosine'
  | 'tangent'
  | 'piecewise'
  | 'composite'
  | 'line-equation'
  | 'circle-equation'
  | 'ellipse-equation'
  | 'hyperbola-equation'
  | 'parabola-equation'
  | 'custom';

export type SubjectConicAxis = 'x' | 'y';
export type SubjectParabolaDirection = 'right' | 'left' | 'up' | 'down';

export type SubjectDomainEndpoint = number | null;
export type SubjectFunctionAnnotationKind =
  | 'expression'
  | 'property'
  | 'intercept'
  | 'axis'
  | 'vertex'
  | 'center'
  | 'focus'
  | 'asymptote'
  | 'directrix'
  | 'radius'
  | 'dynamic-point';

export interface SubjectDomainInterval {
  min: SubjectDomainEndpoint;
  max: SubjectDomainEndpoint;
  minClosed: boolean;
  maxClosed: boolean;
  label?: string;
}

export interface SubjectDomain {
  intervals: readonly SubjectDomainInterval[];
}

export interface SubjectFunctionParameter {
  id: string;
  label: string;
  value: number;
  min?: number;
  max?: number;
  step?: number;
}

export interface SubjectPiecewiseSegment {
  id: string;
  expression: string;
  domain: SubjectDomain;
  label?: string;
}

export interface CreateSubjectPiecewiseSegmentInput {
  id?: string;
  expression: string;
  domain: SubjectDomain | readonly SubjectDomainInterval[] | readonly [number, number];
  label?: string;
}

export interface SubjectFunctionFamilyDescriptor {
  id: string;
  kind: SubjectFunctionFamilyKind;
  variable: string;
  expression: string;
  parameters: Record<string, number>;
  parameterControls: readonly SubjectFunctionParameter[];
  domain: SubjectDomain;
  pieces?: readonly SubjectPiecewiseSegment[];
  inner?: SubjectFunctionFamilyDescriptor;
  outer?: SubjectFunctionFamilyDescriptor;
  meta?: Record<string, unknown>;
}

export interface SubjectFunctionProperty {
  id: string;
  label: string;
  value: number | string | readonly SceneSamplePoint2D[] | SceneSamplePoint2D | null;
  kind?: SubjectFunctionAnnotationKind;
}

export interface SubjectFunctionAnnotation {
  id: string;
  kind: SubjectFunctionAnnotationKind;
  label: string;
  text: string;
  anchor?: SceneSamplePoint2D;
  targetPropertyId?: string;
}

export interface SubjectFunctionSampleOptions {
  min?: number;
  max?: number;
  steps?: number;
  yMin?: number;
  yMax?: number;
}

export interface SubjectDynamicPointState {
  id: string;
  descriptorId: string;
  parameter: number;
  range: readonly [number, number];
  speed: number;
  direction: 1 | -1;
  playing: boolean;
  point: SceneSamplePoint2D | null;
}

export interface CreateSubjectDomainIntervalOptions {
  minClosed?: boolean;
  maxClosed?: boolean;
  label?: string;
}

export interface CreateSubjectFunctionDescriptorOptions {
  id?: string;
  variable?: string;
  domain?: SubjectDomain | readonly SubjectDomainInterval[] | readonly [number, number];
  parameters?: Record<string, number>;
  parameterControls?: readonly SubjectFunctionParameter[];
  meta?: Record<string, unknown>;
}

const DEFAULT_DOMAIN: SubjectDomain = {
  intervals: [{ min: null, max: null, minClosed: false, maxClosed: false }]
};

const DEFAULT_SAMPLE_WINDOW: Required<Pick<SubjectFunctionSampleOptions, 'min' | 'max' | 'steps' | 'yMin' | 'yMax'>> = {
  min: -10,
  max: 10,
  steps: 120,
  yMin: -10,
  yMax: 10
};

export const createSubjectDomainInterval = (
  min: SubjectDomainEndpoint,
  max: SubjectDomainEndpoint,
  options: CreateSubjectDomainIntervalOptions = {}
): SubjectDomainInterval => {
  const interval = normalizeInterval({
    min,
    max,
    minClosed: options.minClosed ?? min !== null,
    maxClosed: options.maxClosed ?? max !== null,
    label: options.label
  });
  return cloneInterval(interval);
};

export const createSubjectDomain = (
  intervals: readonly SubjectDomainInterval[] = DEFAULT_DOMAIN.intervals
): SubjectDomain => ({
  intervals: normalizeSubjectDomainIntervals(intervals).map(cloneInterval)
});

export const normalizeSubjectDomain = (
  input?: SubjectDomain | readonly SubjectDomainInterval[] | readonly [number, number]
): SubjectDomain => {
  if (!input) return cloneDomain(DEFAULT_DOMAIN);
  if (Array.isArray(input) && input.length === 2 && typeof input[0] === 'number' && typeof input[1] === 'number') {
    return createSubjectDomain([createSubjectDomainInterval(input[0], input[1])]);
  }
  if (Array.isArray(input)) return createSubjectDomain(input as readonly SubjectDomainInterval[]);
  const domainInput = input as SubjectDomain;
  return createSubjectDomain(domainInput.intervals);
};

export const containsSubjectDomainValue = (domain: SubjectDomain, value: number): boolean => (
  Number.isFinite(value) && domain.intervals.some((interval) => valueInInterval(interval, value))
);

export const clipSubjectDomainToWindow = (
  domain: SubjectDomain,
  window: readonly [number, number]
): SubjectDomain => {
  const left = Math.min(window[0], window[1]);
  const right = Math.max(window[0], window[1]);
  return createSubjectDomain(domain.intervals.flatMap((interval) => {
    const min = Math.max(interval.min ?? left, left);
    const max = Math.min(interval.max ?? right, right);
    if (min > max) return [];
    if (min === max && !(containsEndpoint(interval, min) && min >= left && min <= right)) return [];
    return [{
      min,
      max,
      minClosed: interval.min === null || min !== interval.min ? true : interval.minClosed,
      maxClosed: interval.max === null || max !== interval.max ? true : interval.maxClosed,
      label: interval.label
    }];
  }));
};

export const createLinearSubjectFunction = (
  options: CreateSubjectFunctionDescriptorOptions & { a?: number; b?: number } = {}
): SubjectFunctionFamilyDescriptor => {
  const a = finiteNumber(options.a, options.parameters?.a ?? 1);
  const b = finiteNumber(options.b, options.parameters?.b ?? 0);
  return createDescriptor({
    id: options.id ?? 'linear',
    kind: 'linear',
    variable: options.variable ?? 'x',
    expression: `${a} * ${options.variable ?? 'x'} + ${b}`,
    parameters: { a, b, ...(options.parameters ?? {}) },
    parameterControls: options.parameterControls ?? defaultParameterControls({ a, b }),
    domain: normalizeSubjectDomain(options.domain),
    meta: options.meta
  });
};

export const createQuadraticSubjectFunction = (
  options: CreateSubjectFunctionDescriptorOptions & { a?: number; b?: number; c?: number } = {}
): SubjectFunctionFamilyDescriptor => {
  const a = finiteNumber(options.a, options.parameters?.a ?? 1);
  const b = finiteNumber(options.b, options.parameters?.b ?? 0);
  const c = finiteNumber(options.c, options.parameters?.c ?? 0);
  const variable = options.variable ?? 'x';
  return createDescriptor({
    id: options.id ?? 'quadratic',
    kind: 'quadratic',
    variable,
    expression: `${a} * ${variable}^2 + ${b} * ${variable} + ${c}`,
    parameters: { a, b, c, ...(options.parameters ?? {}) },
    parameterControls: options.parameterControls ?? defaultParameterControls({ a, b, c }),
    domain: normalizeSubjectDomain(options.domain),
    meta: options.meta
  });
};

export const createInverseSubjectFunction = (
  options: CreateSubjectFunctionDescriptorOptions & { scale?: number; horizontalShift?: number; verticalShift?: number } = {}
): SubjectFunctionFamilyDescriptor => {
  const a = finiteNumber(options.scale, options.parameters?.a ?? 1);
  const h = finiteNumber(options.horizontalShift, options.parameters?.h ?? 0);
  const k = finiteNumber(options.verticalShift, options.parameters?.k ?? 0);
  const variable = options.variable ?? 'x';
  return createDescriptor({
    id: options.id ?? 'inverse',
    kind: 'inverse',
    variable,
    expression: `${a} / (${variable} - ${h}) + ${k}`,
    parameters: { a, h, k, ...(options.parameters ?? {}) },
    parameterControls: options.parameterControls ?? defaultParameterControls({ a, h, k }),
    domain: normalizeSubjectDomain(options.domain ?? createPuncturedDomain(h)),
    meta: options.meta
  });
};

export const createPowerSubjectFunction = (
  options: CreateSubjectFunctionDescriptorOptions & { coefficient?: number; exponent?: number; verticalShift?: number } = {}
): SubjectFunctionFamilyDescriptor => {
  const a = finiteNumber(options.coefficient, options.parameters?.a ?? 1);
  const n = finiteNumber(options.exponent, options.parameters?.n ?? 3);
  const k = finiteNumber(options.verticalShift, options.parameters?.k ?? 0);
  const variable = options.variable ?? 'x';
  return createDescriptor({
    id: options.id ?? 'power',
    kind: 'power',
    variable,
    expression: `${a} * ${variable}^${n} + ${k}`,
    parameters: { a, n, k, ...(options.parameters ?? {}) },
    parameterControls: options.parameterControls ?? defaultParameterControls({ a, n, k }),
    domain: normalizeSubjectDomain(options.domain),
    meta: options.meta
  });
};

export const createExponentialSubjectFunction = (
  options: CreateSubjectFunctionDescriptorOptions & { coefficient?: number; base?: number; verticalShift?: number } = {}
): SubjectFunctionFamilyDescriptor => {
  const a = finiteNumber(options.coefficient, options.parameters?.a ?? 1);
  const base = finiteLogBase(options.base, options.parameters?.base ?? 2);
  const k = finiteNumber(options.verticalShift, options.parameters?.k ?? 0);
  const variable = options.variable ?? 'x';
  return createDescriptor({
    id: options.id ?? 'exponential',
    kind: 'exponential',
    variable,
    expression: `${a} * ${base}^${variable} + ${k}`,
    parameters: { a, base, k, ...(options.parameters ?? {}) },
    parameterControls: options.parameterControls ?? defaultParameterControls({ a, base, k }),
    domain: normalizeSubjectDomain(options.domain),
    meta: options.meta
  });
};

export const createLogarithmicSubjectFunction = (
  options: CreateSubjectFunctionDescriptorOptions & { coefficient?: number; base?: number; horizontalShift?: number; verticalShift?: number } = {}
): SubjectFunctionFamilyDescriptor => {
  const a = finiteNumber(options.coefficient, options.parameters?.a ?? 1);
  const base = finiteLogBase(options.base, options.parameters?.base ?? 2);
  const h = finiteNumber(options.horizontalShift, options.parameters?.h ?? 0);
  const k = finiteNumber(options.verticalShift, options.parameters?.k ?? 0);
  const variable = options.variable ?? 'x';
  return createDescriptor({
    id: options.id ?? 'logarithmic',
    kind: 'logarithmic',
    variable,
    expression: `${a} * log(${variable} - ${h}) / log(${base}) + ${k}`,
    parameters: { a, base, h, k, ...(options.parameters ?? {}) },
    parameterControls: options.parameterControls ?? defaultParameterControls({ a, base, h, k }),
    domain: normalizeSubjectDomain(options.domain ?? createSubjectDomain([createSubjectDomainInterval(h, null, { minClosed: false })])),
    meta: options.meta
  });
};

export const createNormalDensitySubjectFunction = (
  options: CreateSubjectFunctionDescriptorOptions & { mean?: number; standardDeviation?: number } = {}
): SubjectFunctionFamilyDescriptor => {
  const mu = finiteNumber(options.mean, options.parameters?.mu ?? 0);
  const sigma = Math.max(1e-9, finiteNumber(options.standardDeviation, options.parameters?.sigma ?? 1));
  const variable = options.variable ?? 'x';
  return createDescriptor({
    id: options.id ?? 'normal-density',
    kind: 'normal-density',
    variable,
    expression: `1 / (${sigma} * sqrt(2 * pi)) * exp(-1 * (${variable} - ${mu})^2 / (2 * ${sigma}^2))`,
    parameters: { mu, sigma, ...(options.parameters ?? {}) },
    parameterControls: options.parameterControls ?? defaultParameterControls({ mu, sigma }),
    domain: normalizeSubjectDomain(options.domain),
    meta: options.meta
  });
};

export const createTrigonometricSubjectFunction = (
  kind: Extract<SubjectFunctionFamilyKind, 'sine' | 'cosine' | 'tangent'>,
  options: CreateSubjectFunctionDescriptorOptions & { amplitude?: number; frequency?: number; phase?: number; verticalShift?: number } = {}
): SubjectFunctionFamilyDescriptor => {
  const a = finiteNumber(options.amplitude, options.parameters?.a ?? 1);
  const b = finiteNumber(options.frequency, options.parameters?.b ?? 1);
  const c = finiteNumber(options.phase, options.parameters?.c ?? 0);
  const d = finiteNumber(options.verticalShift, options.parameters?.d ?? 0);
  const variable = options.variable ?? 'x';
  const fn = kind === 'sine' ? 'sin' : kind === 'cosine' ? 'cos' : 'tan';
  return createDescriptor({
    id: options.id ?? kind,
    kind,
    variable,
    expression: `${a} * ${fn}(${b} * ${variable} + ${c}) + ${d}`,
    parameters: { a, b, c, d, ...(options.parameters ?? {}) },
    parameterControls: options.parameterControls ?? defaultParameterControls({ a, b, c, d }),
    domain: normalizeSubjectDomain(options.domain),
    meta: options.meta
  });
};

export const createSineSubjectFunction = (
  options: Parameters<typeof createTrigonometricSubjectFunction>[1] = {}
): SubjectFunctionFamilyDescriptor => createTrigonometricSubjectFunction('sine', options);

export const createCosineSubjectFunction = (
  options: Parameters<typeof createTrigonometricSubjectFunction>[1] = {}
): SubjectFunctionFamilyDescriptor => createTrigonometricSubjectFunction('cosine', options);

export const createTangentSubjectFunction = (
  options: Parameters<typeof createTrigonometricSubjectFunction>[1] = {}
): SubjectFunctionFamilyDescriptor => createTrigonometricSubjectFunction('tangent', options);

export const createCustomSubjectFunction = (
  expression: string,
  options: CreateSubjectFunctionDescriptorOptions & { kind?: SubjectFunctionFamilyKind } = {}
): SubjectFunctionFamilyDescriptor => createDescriptor({
  id: options.id ?? 'custom',
  kind: options.kind ?? 'custom',
  variable: options.variable ?? 'x',
  expression,
  parameters: { ...(options.parameters ?? {}) },
  parameterControls: options.parameterControls ?? defaultParameterControls(options.parameters ?? {}),
  domain: normalizeSubjectDomain(options.domain),
  meta: options.meta
});

export const createPiecewiseSubjectFunction = (
  pieces: readonly CreateSubjectPiecewiseSegmentInput[],
  options: CreateSubjectFunctionDescriptorOptions = {}
): SubjectFunctionFamilyDescriptor => {
  const normalizedPieces = pieces.map((piece, index) => ({
    id: piece.id || `piece-${index + 1}`,
    expression: piece.expression,
    domain: normalizeSubjectDomain(piece.domain),
    label: piece.label
  }));
  return createDescriptor({
    id: options.id ?? 'piecewise',
    kind: 'piecewise',
    variable: options.variable ?? 'x',
    expression: normalizedPieces.map((piece) => `${piece.expression} @ ${formatSubjectDomain(piece.domain)}`).join('; '),
    parameters: { ...(options.parameters ?? {}) },
    parameterControls: options.parameterControls ?? defaultParameterControls(options.parameters ?? {}),
    domain: createSubjectDomain(normalizedPieces.flatMap((piece) => piece.domain.intervals)),
    pieces: normalizedPieces,
    meta: options.meta
  });
};

export const createCompositeSubjectFunction = (
  outer: SubjectFunctionFamilyDescriptor,
  inner: SubjectFunctionFamilyDescriptor,
  options: CreateSubjectFunctionDescriptorOptions = {}
): SubjectFunctionFamilyDescriptor => createDescriptor({
  id: options.id ?? `${outer.id}-of-${inner.id}`,
  kind: 'composite',
  variable: options.variable ?? inner.variable,
  expression: `${outer.expression} ∘ (${inner.expression})`,
  parameters: { ...inner.parameters, ...outer.parameters, ...(options.parameters ?? {}) },
  parameterControls: options.parameterControls ?? [...inner.parameterControls, ...outer.parameterControls],
  domain: normalizeSubjectDomain(options.domain ?? inner.domain),
  inner,
  outer,
  meta: options.meta
});

export const createLineEquationSubjectFunction = (
  options: CreateSubjectFunctionDescriptorOptions & { slope?: number; intercept?: number } = {}
): SubjectFunctionFamilyDescriptor => {
  const slope = finiteNumber(options.slope, options.parameters?.m ?? 1);
  const intercept = finiteNumber(options.intercept, options.parameters?.b ?? 0);
  const variable = options.variable ?? 'x';
  return createDescriptor({
    id: options.id ?? 'line-equation',
    kind: 'line-equation',
    variable,
    expression: `y = ${slope} * ${variable} + ${intercept}`,
    parameters: { m: slope, b: intercept, ...(options.parameters ?? {}) },
    parameterControls: options.parameterControls ?? defaultParameterControls({ m: slope, b: intercept }),
    domain: normalizeSubjectDomain(options.domain),
    meta: options.meta
  });
};

export const createCircleEquationSubjectFunction = (
  options: CreateSubjectFunctionDescriptorOptions & { centerX?: number; centerY?: number; radius?: number } = {}
): SubjectFunctionFamilyDescriptor => {
  const h = finiteNumber(options.centerX, options.parameters?.h ?? 0);
  const k = finiteNumber(options.centerY, options.parameters?.k ?? 0);
  const r = Math.max(1e-9, finiteNumber(options.radius, options.parameters?.r ?? 1));
  return createDescriptor({
    id: options.id ?? 'circle-equation',
    kind: 'circle-equation',
    variable: options.variable ?? 'theta',
    expression: `${formatSquaredOffset('x', h)} + ${formatSquaredOffset('y', k)} = ${formatNumber(r ** 2)}`,
    parameters: { h, k, r, ...(options.parameters ?? {}) },
    parameterControls: options.parameterControls ?? defaultParameterControls({ h, k, r }),
    domain: normalizeSubjectDomain(options.domain ?? [0, Math.PI * 2]),
    meta: options.meta
  });
};

export const createEllipseEquationSubjectFunction = (
  options: CreateSubjectFunctionDescriptorOptions & { centerX?: number; centerY?: number; semiMajor?: number; semiMinor?: number; axis?: SubjectConicAxis } = {}
): SubjectFunctionFamilyDescriptor => {
  const h = finiteNumber(options.centerX, options.parameters?.h ?? 0);
  const k = finiteNumber(options.centerY, options.parameters?.k ?? 0);
  const a = Math.max(1e-9, finiteNumber(options.semiMajor, options.parameters?.a ?? 3));
  const b = Math.max(1e-9, Math.min(a, finiteNumber(options.semiMinor, options.parameters?.b ?? 2)));
  const axis = normalizeConicAxis(options.axis ?? options.meta?.axis);
  return createDescriptor({
    id: options.id ?? 'ellipse-equation',
    kind: 'ellipse-equation',
    variable: options.variable ?? 'theta',
    expression: ellipseExpression(h, k, a, b, axis),
    parameters: { h, k, a, b, ...(options.parameters ?? {}) },
    parameterControls: options.parameterControls ?? defaultParameterControls({ h, k, a, b }),
    domain: normalizeSubjectDomain(options.domain ?? [0, Math.PI * 2]),
    meta: { ...(options.meta ?? {}), axis }
  });
};

export const createHyperbolaEquationSubjectFunction = (
  options: CreateSubjectFunctionDescriptorOptions & { centerX?: number; centerY?: number; transverseSemiAxis?: number; conjugateSemiAxis?: number; axis?: SubjectConicAxis } = {}
): SubjectFunctionFamilyDescriptor => {
  const h = finiteNumber(options.centerX, options.parameters?.h ?? 0);
  const k = finiteNumber(options.centerY, options.parameters?.k ?? 0);
  const a = Math.max(1e-9, finiteNumber(options.transverseSemiAxis, options.parameters?.a ?? 2));
  const b = Math.max(1e-9, finiteNumber(options.conjugateSemiAxis, options.parameters?.b ?? 1));
  const axis = normalizeConicAxis(options.axis ?? options.meta?.axis);
  return createDescriptor({
    id: options.id ?? 'hyperbola-equation',
    kind: 'hyperbola-equation',
    variable: options.variable ?? 't',
    expression: hyperbolaExpression(h, k, a, b, axis),
    parameters: { h, k, a, b, ...(options.parameters ?? {}) },
    parameterControls: options.parameterControls ?? defaultParameterControls({ h, k, a, b }),
    domain: normalizeSubjectDomain(options.domain ?? [-2, 2]),
    meta: { ...(options.meta ?? {}), axis }
  });
};

export const createParabolaEquationSubjectFunction = (
  options: CreateSubjectFunctionDescriptorOptions & { vertexX?: number; vertexY?: number; focalParameter?: number; direction?: SubjectParabolaDirection } = {}
): SubjectFunctionFamilyDescriptor => {
  const h = finiteNumber(options.vertexX, options.parameters?.h ?? 0);
  const k = finiteNumber(options.vertexY, options.parameters?.k ?? 0);
  const p = Math.max(1e-9, Math.abs(finiteNumber(options.focalParameter, options.parameters?.p ?? 1)));
  const direction = normalizeParabolaDirection(options.direction ?? options.meta?.direction);
  return createDescriptor({
    id: options.id ?? 'parabola-equation',
    kind: 'parabola-equation',
    variable: options.variable ?? 't',
    expression: parabolaExpression(h, k, p, direction),
    parameters: { h, k, p, ...(options.parameters ?? {}) },
    parameterControls: options.parameterControls ?? defaultParameterControls({ h, k, p }),
    domain: normalizeSubjectDomain(options.domain ?? [-10, 10]),
    meta: { ...(options.meta ?? {}), direction }
  });
};

export const updateSubjectFunctionParameters = (
  descriptor: SubjectFunctionFamilyDescriptor,
  parameters: Record<string, number>
): SubjectFunctionFamilyDescriptor => {
  const mergedParameters = { ...descriptor.parameters, ...filterFiniteNumberRecord(parameters) };
  const nextParameters = normalizeUpdatedSubjectFunctionParameters(descriptor, mergedParameters);
  const nextDescriptor: SubjectFunctionFamilyDescriptor = {
    ...cloneDescriptor(descriptor),
    parameters: nextParameters,
    domain: refreshUpdatedSubjectFunctionDomain(descriptor, nextParameters),
    parameterControls: descriptor.parameterControls.map((control) => ({
      ...control,
      value: finiteNumber(nextParameters[control.id], control.value)
    }))
  };
  return {
    ...nextDescriptor,
    expression: refreshSubjectFunctionExpression(nextDescriptor)
  };
};

export const formatSubjectFunctionExpression = (descriptor: SubjectFunctionFamilyDescriptor): string => {
  if (descriptor.kind === 'piecewise' && descriptor.pieces) {
    return descriptor.pieces.map((piece) => `${piece.expression}, ${formatSubjectDomain(piece.domain)}`).join(' ; ');
  }
  return descriptor.expression;
};

export const formatSubjectDomain = (domain: SubjectDomain): string => (
  domain.intervals.map((interval) => {
    const left = interval.minClosed ? '[' : '(';
    const right = interval.maxClosed ? ']' : ')';
    const min = interval.min === null ? '-∞' : formatNumber(interval.min);
    const max = interval.max === null ? '+∞' : formatNumber(interval.max);
    return `${left}${min}, ${max}${right}`;
  }).join(' ∪ ')
);

export const evaluateSubjectFunctionDescriptor = (
  descriptor: SubjectFunctionFamilyDescriptor,
  value: number
): number => {
  if (!Number.isFinite(value) || !containsSubjectDomainValue(descriptor.domain, value)) return NaN;
  if (descriptor.kind === 'piecewise') {
    const piece = descriptor.pieces?.find((candidate) => containsSubjectDomainValue(candidate.domain, value));
    return piece ? evaluateExpression(piece.expression, descriptor.variable, value, descriptor.parameters) : NaN;
  }
  if (descriptor.kind === 'composite' && descriptor.inner && descriptor.outer) {
    const innerValue = evaluateSubjectFunctionDescriptor(descriptor.inner, value);
    return Number.isFinite(innerValue) ? evaluateSubjectFunctionDescriptor(descriptor.outer, innerValue) : NaN;
  }
  if (descriptor.kind === 'circle-equation') {
    const { k, r } = circleParameters(descriptor);
    const h = descriptor.parameters.h ?? 0;
    const dx = value - h;
    const dySquared = r ** 2 - dx ** 2;
    return dySquared >= 0 ? k + Math.sqrt(Math.max(0, dySquared)) : NaN;
  }
  if (descriptor.kind === 'ellipse-equation') {
    return evaluateEllipseUpperBranch(descriptor, value);
  }
  if (descriptor.kind === 'parabola-equation') {
    return evaluateParabolaBranch(descriptor, value);
  }
  const expression = descriptor.kind === 'line-equation'
    ? `${descriptor.parameters.m ?? 1} * ${descriptor.variable} + ${descriptor.parameters.b ?? 0}`
    : descriptor.expression;
  return evaluateExpression(expression, descriptor.variable, value, descriptor.parameters);
};

export const sampleSubjectFunctionDescriptor = (
  descriptor: SubjectFunctionFamilyDescriptor,
  options: SubjectFunctionSampleOptions = {}
): SceneSamplePoint2D[][] => {
  const bounds = subjectSampleBounds(options);
  if (descriptor.kind === 'circle-equation') {
    const { h, k, r } = circleParameters(descriptor);
    return clipSegmentsToBounds2D([
      sampleParametricClosedCurve((theta) => ({ x: h + r * Math.cos(theta), y: k + r * Math.sin(theta) }))
    ], bounds);
  }
  if (descriptor.kind === 'ellipse-equation') return sampleEllipseEquation(descriptor, bounds);
  if (descriptor.kind === 'hyperbola-equation') return sampleHyperbolaEquation(descriptor, bounds);
  if (descriptor.kind === 'parabola-equation') return sampleParabolaEquation(descriptor, bounds);

  const min = options.min ?? DEFAULT_SAMPLE_WINDOW.min;
  const max = options.max ?? DEFAULT_SAMPLE_WINDOW.max;
  const clipped = clipSubjectDomainToWindow(descriptor.domain, [min, max]);
  const segments = clipped.intervals.flatMap((interval) => {
    const intervalMin = interval.min ?? min;
    const intervalMax = interval.max ?? max;
    if (intervalMax <= intervalMin) return [];
    return sampleFunctionSegments(
      (x) => evaluateSubjectFunctionDescriptor(descriptor, x),
      {
        min: intervalMin,
        max: intervalMax,
        steps: options.steps ?? DEFAULT_SAMPLE_WINDOW.steps,
        yMin: options.yMin ?? DEFAULT_SAMPLE_WINDOW.yMin,
        yMax: options.yMax ?? DEFAULT_SAMPLE_WINDOW.yMax
      }
    );
  });
  return clipSegmentsToBounds2D(segments, bounds);
};

export const sampleSubjectEquationDescriptor = (
  descriptor: SubjectFunctionFamilyDescriptor,
  options: SubjectFunctionSampleOptions = {}
): SceneSamplePoint2D[][] => {
  if (
    descriptor.kind === 'circle-equation'
    || descriptor.kind === 'ellipse-equation'
    || descriptor.kind === 'hyperbola-equation'
    || descriptor.kind === 'parabola-equation'
  ) {
    return sampleSubjectFunctionDescriptor(descriptor, options);
  }
  return sampleImplicitEquationSegments(descriptor.expression, {
    bounds: subjectSampleBounds(options)
  });
};

const subjectSampleBounds = (options: SubjectFunctionSampleOptions): { left: number; right: number; top: number; bottom: number } => ({
  left: options.min ?? DEFAULT_SAMPLE_WINDOW.min,
  right: options.max ?? DEFAULT_SAMPLE_WINDOW.max,
  top: options.yMax ?? DEFAULT_SAMPLE_WINDOW.yMax,
  bottom: options.yMin ?? DEFAULT_SAMPLE_WINDOW.yMin
});

export const computeSubjectFunctionProperties = (
  descriptor: SubjectFunctionFamilyDescriptor
): SubjectFunctionProperty[] => {
  if (descriptor.kind === 'quadratic') return quadraticProperties(descriptor);
  if (descriptor.kind === 'inverse') return inverseProperties(descriptor);
  if (descriptor.kind === 'exponential' || descriptor.kind === 'logarithmic' || descriptor.kind === 'power') return commonParameterProperties(descriptor);
  if (descriptor.kind === 'normal-density') return normalDensityProperties(descriptor);
  if (descriptor.kind === 'sine' || descriptor.kind === 'cosine' || descriptor.kind === 'tangent') return trigonometricProperties(descriptor);
  if (descriptor.kind === 'linear' || descriptor.kind === 'line-equation') return lineProperties(descriptor);
  if (descriptor.kind === 'circle-equation') return circleProperties(descriptor);
  if (descriptor.kind === 'ellipse-equation') return ellipseProperties(descriptor);
  if (descriptor.kind === 'hyperbola-equation') return hyperbolaProperties(descriptor);
  if (descriptor.kind === 'parabola-equation') return parabolaProperties(descriptor);
  if (descriptor.kind === 'piecewise') {
    return [{ id: 'pieces', label: '分段数量', value: descriptor.pieces?.length ?? 0, kind: 'property' }];
  }
  if (descriptor.kind === 'composite') {
    return [{ id: 'composition', label: '复合函数', value: descriptor.expression, kind: 'expression' }];
  }
  return [{ id: 'expression', label: '表达式', value: descriptor.expression, kind: 'expression' }];
};

export const createSubjectFunctionAnnotations = (
  descriptor: SubjectFunctionFamilyDescriptor
): SubjectFunctionAnnotation[] => {
  const annotations: SubjectFunctionAnnotation[] = [{
    id: `${descriptor.id}:expression`,
    kind: 'expression',
    label: '表达式',
    text: formatSubjectFunctionExpression(descriptor)
  }];

  for (const property of computeSubjectFunctionProperties(descriptor)) {
    annotations.push({
      id: `${descriptor.id}:${property.id}`,
      kind: property.kind ?? 'property',
      label: property.label,
      text: `${property.label}: ${formatPropertyValue(property.value)}`,
      anchor: pointPropertyAnchor(property.value),
      targetPropertyId: property.id
    });
  }

  return annotations;
};

export const createSubjectDynamicPoint = (
  descriptor: SubjectFunctionFamilyDescriptor,
  options: Partial<Omit<SubjectDynamicPointState, 'descriptorId' | 'point'>> = {}
): SubjectDynamicPointState => {
  const range = options.range ?? finiteDynamicRange(descriptor);
  const start = clampNumber(options.parameter ?? range[0], range[0], range[1]);
  const state: SubjectDynamicPointState = {
    id: options.id ?? `${descriptor.id}:P`,
    descriptorId: descriptor.id,
    parameter: start,
    range,
    speed: Math.max(0, finiteNumber(options.speed, 1)),
    direction: options.direction ?? 1,
    playing: options.playing ?? false,
    point: null
  };
  return evaluateSubjectDynamicPoint(descriptor, state);
};

export const evaluateSubjectDynamicPoint = (
  descriptor: SubjectFunctionFamilyDescriptor,
  state: SubjectDynamicPointState
): SubjectDynamicPointState => ({
  ...state,
  point: dynamicPointForParameter(descriptor, state.parameter)
});

export const tickSubjectDynamicPoint = (
  descriptor: SubjectFunctionFamilyDescriptor,
  state: SubjectDynamicPointState,
  deltaSeconds: number
): SubjectDynamicPointState => {
  if (!state.playing || state.speed === 0 || !Number.isFinite(deltaSeconds)) return evaluateSubjectDynamicPoint(descriptor, state);
  const [min, max] = state.range;
  const span = max - min;
  if (span <= 1e-9) return evaluateSubjectDynamicPoint(descriptor, { ...state, parameter: min });
  let parameter = state.parameter + state.direction * state.speed * Math.max(0, deltaSeconds);
  while (parameter > max) parameter -= span;
  while (parameter < min) parameter += span;
  return evaluateSubjectDynamicPoint(descriptor, { ...state, parameter });
};

export const resetSubjectDynamicPoint = (
  descriptor: SubjectFunctionFamilyDescriptor,
  state: SubjectDynamicPointState
): SubjectDynamicPointState => evaluateSubjectDynamicPoint(descriptor, { ...state, parameter: state.direction === 1 ? state.range[0] : state.range[1], playing: false });

export const reverseSubjectDynamicPoint = (state: SubjectDynamicPointState): SubjectDynamicPointState => ({
  ...state,
  direction: state.direction === 1 ? -1 : 1
});

const createDescriptor = (descriptor: SubjectFunctionFamilyDescriptor): SubjectFunctionFamilyDescriptor => cloneDescriptor(descriptor);

const refreshSubjectFunctionExpression = (descriptor: SubjectFunctionFamilyDescriptor): string => {
  const variable = descriptor.variable;
  if (descriptor.kind === 'linear') {
    const a = finiteNumber(descriptor.parameters.a, 1);
    const b = finiteNumber(descriptor.parameters.b, 0);
    return `${a} * ${variable} + ${b}`;
  }
  if (descriptor.kind === 'quadratic') {
    const a = finiteNumber(descriptor.parameters.a, 1);
    const b = finiteNumber(descriptor.parameters.b, 0);
    const c = finiteNumber(descriptor.parameters.c, 0);
    return `${a} * ${variable}^2 + ${b} * ${variable} + ${c}`;
  }
  if (descriptor.kind === 'inverse') {
    const a = finiteNumber(descriptor.parameters.a, 1);
    const h = finiteNumber(descriptor.parameters.h, 0);
    const k = finiteNumber(descriptor.parameters.k, 0);
    return `${a} / (${variable} - ${h}) + ${k}`;
  }
  if (descriptor.kind === 'power') {
    const a = finiteNumber(descriptor.parameters.a, 1);
    const n = finiteNumber(descriptor.parameters.n, 3);
    const k = finiteNumber(descriptor.parameters.k, 0);
    return `${a} * ${variable}^${n} + ${k}`;
  }
  if (descriptor.kind === 'exponential') {
    const a = finiteNumber(descriptor.parameters.a, 1);
    const base = finiteLogBase(descriptor.parameters.base, 2);
    const k = finiteNumber(descriptor.parameters.k, 0);
    return `${a} * ${base}^${variable} + ${k}`;
  }
  if (descriptor.kind === 'logarithmic') {
    const a = finiteNumber(descriptor.parameters.a, 1);
    const base = finiteLogBase(descriptor.parameters.base, 2);
    const h = finiteNumber(descriptor.parameters.h, 0);
    const k = finiteNumber(descriptor.parameters.k, 0);
    return `${a} * log(${variable} - ${h}) / log(${base}) + ${k}`;
  }
  if (descriptor.kind === 'normal-density') {
    const mu = finiteNumber(descriptor.parameters.mu, 0);
    const sigma = Math.max(1e-9, finiteNumber(descriptor.parameters.sigma, 1));
    return `1 / (${sigma} * sqrt(2 * pi)) * exp(-1 * (${variable} - ${mu})^2 / (2 * ${sigma}^2))`;
  }
  if (descriptor.kind === 'sine' || descriptor.kind === 'cosine' || descriptor.kind === 'tangent') {
    const a = finiteNumber(descriptor.parameters.a, 1);
    const b = finiteNumber(descriptor.parameters.b, 1);
    const c = finiteNumber(descriptor.parameters.c, 0);
    const d = finiteNumber(descriptor.parameters.d, 0);
    const fn = descriptor.kind === 'sine' ? 'sin' : descriptor.kind === 'cosine' ? 'cos' : 'tan';
    return `${a} * ${fn}(${b} * ${variable} + ${c}) + ${d}`;
  }
  if (descriptor.kind === 'line-equation') {
    const slope = finiteNumber(descriptor.parameters.m, 1);
    const intercept = finiteNumber(descriptor.parameters.b, 0);
    return `y = ${slope} * ${variable} + ${intercept}`;
  }
  if (descriptor.kind === 'circle-equation') {
    const { h, k, r } = circleParameters(descriptor);
    return `${formatSquaredOffset('x', h)} + ${formatSquaredOffset('y', k)} = ${formatNumber(r ** 2)}`;
  }
  if (descriptor.kind === 'ellipse-equation') {
    const { h, k, a, b, axis } = ellipseParameters(descriptor);
    return ellipseExpression(h, k, a, b, axis);
  }
  if (descriptor.kind === 'hyperbola-equation') {
    const { h, k, a, b, axis } = hyperbolaParameters(descriptor);
    return hyperbolaExpression(h, k, a, b, axis);
  }
  if (descriptor.kind === 'parabola-equation') {
    const { h, k, p, direction } = parabolaParameters(descriptor);
    return parabolaExpression(h, k, p, direction);
  }
  return descriptor.expression;
};

const cloneDescriptor = (descriptor: SubjectFunctionFamilyDescriptor): SubjectFunctionFamilyDescriptor => ({
  id: descriptor.id,
  kind: descriptor.kind,
  variable: descriptor.variable,
  expression: descriptor.expression,
  parameters: { ...descriptor.parameters },
  parameterControls: descriptor.parameterControls.map((control) => ({ ...control })),
  domain: cloneDomain(descriptor.domain),
  pieces: descriptor.pieces?.map((piece) => ({ ...piece, domain: cloneDomain(piece.domain) })),
  inner: descriptor.inner ? cloneDescriptor(descriptor.inner) : undefined,
  outer: descriptor.outer ? cloneDescriptor(descriptor.outer) : undefined,
  meta: descriptor.meta ? { ...descriptor.meta } : undefined
});

const normalizeSubjectDomainIntervals = (intervals: readonly SubjectDomainInterval[]): SubjectDomainInterval[] => {
  const normalized = intervals.map(normalizeInterval).filter((interval) => compareEndpoint(interval.min, interval.max) <= 0);
  return normalized.sort((left, right) => (
    compareIntervalStartEndpoint(left.min, right.min) || compareIntervalEndEndpoint(left.max, right.max)
  ));
};

const normalizeInterval = (interval: SubjectDomainInterval): SubjectDomainInterval => {
  const min = normalizeEndpoint(interval.min);
  const max = normalizeEndpoint(interval.max);
  if (compareEndpoint(min, max) > 0) {
    return {
      min: max,
      max: min,
      minClosed: interval.maxClosed,
      maxClosed: interval.minClosed,
      label: interval.label
    };
  }
  return {
    min,
    max,
    minClosed: min === null ? false : interval.minClosed,
    maxClosed: max === null ? false : interval.maxClosed,
    label: interval.label
  };
};

const cloneDomain = (domain: SubjectDomain): SubjectDomain => ({ intervals: domain.intervals.map(cloneInterval) });
const cloneInterval = (interval: SubjectDomainInterval): SubjectDomainInterval => ({ ...interval });

const normalizeEndpoint = (value: SubjectDomainEndpoint): SubjectDomainEndpoint => (
  typeof value === 'number' && Number.isFinite(value) ? value : null
);

const compareEndpoint = (left: SubjectDomainEndpoint, right: SubjectDomainEndpoint): number => {
  const leftValue = left === null ? -Infinity : left;
  const rightValue = right === null ? Infinity : right;
  return leftValue === rightValue ? 0 : leftValue < rightValue ? -1 : 1;
};

const compareIntervalStartEndpoint = (left: SubjectDomainEndpoint, right: SubjectDomainEndpoint): number => {
  const leftValue = left === null ? -Infinity : left;
  const rightValue = right === null ? -Infinity : right;
  return leftValue === rightValue ? 0 : leftValue < rightValue ? -1 : 1;
};

const compareIntervalEndEndpoint = (left: SubjectDomainEndpoint, right: SubjectDomainEndpoint): number => {
  const leftValue = left === null ? Infinity : left;
  const rightValue = right === null ? Infinity : right;
  return leftValue === rightValue ? 0 : leftValue < rightValue ? -1 : 1;
};

const valueInInterval = (interval: SubjectDomainInterval, value: number): boolean => {
  const aboveMin = interval.min === null || (interval.minClosed ? value >= interval.min : value > interval.min);
  const belowMax = interval.max === null || (interval.maxClosed ? value <= interval.max : value < interval.max);
  return aboveMin && belowMax;
};

const containsEndpoint = (interval: SubjectDomainInterval, value: number): boolean => valueInInterval(interval, value);

const defaultParameterControls = (parameters: Record<string, number>): SubjectFunctionParameter[] => (
  Object.entries(parameters).map(([id, value]) => ({ id, label: id, value, step: 0.1 }))
);

const filterFiniteNumberRecord = (record: Record<string, number>): Record<string, number> => (
  Object.fromEntries(Object.entries(record).filter((entry): entry is [string, number] => Number.isFinite(entry[1])))
);

const normalizeUpdatedSubjectFunctionParameters = (
  descriptor: SubjectFunctionFamilyDescriptor,
  parameters: Record<string, number>
): Record<string, number> => {
  if (descriptor.kind === 'circle-equation') {
    return { ...parameters, r: Math.max(1e-9, finiteNumber(parameters.r, 1)) };
  }
  if (descriptor.kind === 'ellipse-equation') {
    const a = Math.max(1e-9, finiteNumber(parameters.a, 3));
    return { ...parameters, a, b: Math.max(1e-9, Math.min(a, finiteNumber(parameters.b, 2))) };
  }
  if (descriptor.kind === 'hyperbola-equation') {
    return {
      ...parameters,
      a: Math.max(1e-9, finiteNumber(parameters.a, 2)),
      b: Math.max(1e-9, finiteNumber(parameters.b, 1))
    };
  }
  if (descriptor.kind === 'parabola-equation') {
    return { ...parameters, p: Math.max(1e-9, Math.abs(finiteNumber(parameters.p, 1))) };
  }
  if (descriptor.kind === 'exponential' || descriptor.kind === 'logarithmic') {
    return { ...parameters, base: finiteLogBase(parameters.base, finiteLogBase(descriptor.parameters.base, 2)) };
  }
  if (descriptor.kind === 'normal-density') {
    return { ...parameters, sigma: Math.max(1e-9, finiteNumber(parameters.sigma, 1)) };
  }
  return parameters;
};

const refreshUpdatedSubjectFunctionDomain = (
  descriptor: SubjectFunctionFamilyDescriptor,
  nextParameters: Record<string, number>
): SubjectDomain => {
  if (descriptor.kind === 'inverse') {
    const currentH = finiteNumber(descriptor.parameters.h, 0);
    const nextH = finiteNumber(nextParameters.h, currentH);
    return sameDomain(descriptor.domain, createPuncturedDomain(currentH)) ? createPuncturedDomain(nextH) : cloneDomain(descriptor.domain);
  }
  if (descriptor.kind === 'logarithmic') {
    const currentH = finiteNumber(descriptor.parameters.h, 0);
    const nextH = finiteNumber(nextParameters.h, currentH);
    const currentAutoDomain = createSubjectDomain([createSubjectDomainInterval(currentH, null, { minClosed: false })]);
    return sameDomain(descriptor.domain, currentAutoDomain)
      ? createSubjectDomain([createSubjectDomainInterval(nextH, null, { minClosed: false })])
      : cloneDomain(descriptor.domain);
  }
  return cloneDomain(descriptor.domain);
};

const sameDomain = (left: SubjectDomain, right: SubjectDomain): boolean => {
  if (left.intervals.length !== right.intervals.length) return false;
  const unmatched = [...right.intervals];
  return left.intervals.every((interval) => {
    const matchIndex = unmatched.findIndex((candidate) => sameInterval(interval, candidate));
    if (matchIndex < 0) return false;
    unmatched.splice(matchIndex, 1);
    return true;
  });
};

const sameInterval = (left: SubjectDomainInterval, right: SubjectDomainInterval): boolean => (
  sameEndpoint(left.min, right.min)
    && sameEndpoint(left.max, right.max)
    && left.minClosed === right.minClosed
    && left.maxClosed === right.maxClosed
);

const sameEndpoint = (left: SubjectDomainEndpoint, right: SubjectDomainEndpoint): boolean => (
  left === null || right === null ? left === right : Math.abs(left - right) < 1e-9
);

const finiteNumber = (value: unknown, fallback: number): number => (
  typeof value === 'number' && Number.isFinite(value) ? value : fallback
);

const evaluateExpression = (expression: string, variable: string, value: number, parameters: Record<string, number>): number => {
  try {
    const compiled = math.parse(expression).compile();
    const result = compiled.evaluate({ e: Math.E, pi: Math.PI, ...parameters, [variable]: value, x: value });
    return typeof result === 'number' && Number.isFinite(result) ? result : NaN;
  } catch {
    return NaN;
  }
};

const quadraticProperties = (descriptor: SubjectFunctionFamilyDescriptor): SubjectFunctionProperty[] => {
  const a = descriptor.parameters.a ?? 1;
  const b = descriptor.parameters.b ?? 0;
  const c = descriptor.parameters.c ?? 0;
  const discriminant = b ** 2 - 4 * a * c;
  const vertexX = -b / (2 * a);
  const vertexY = evaluateSubjectFunctionDescriptor(descriptor, vertexX);
  const roots = discriminant < 0
    ? []
    : discriminant === 0
      ? [{ x: vertexX, y: 0 }]
      : [
          { x: (-b - Math.sqrt(discriminant)) / (2 * a), y: 0 },
          { x: (-b + Math.sqrt(discriminant)) / (2 * a), y: 0 }
        ];
  return [
    { id: 'vertex', label: '顶点', value: { x: vertexX, y: vertexY }, kind: 'vertex' },
    { id: 'axis', label: '对称轴', value: `${descriptor.variable} = ${formatNumber(vertexX)}`, kind: 'axis' },
    { id: 'discriminant', label: '判别式', value: discriminant, kind: 'property' },
    { id: 'x-intercepts', label: 'x 轴交点', value: roots, kind: 'intercept' },
    { id: 'y-intercept', label: 'y 轴交点', value: { x: 0, y: c }, kind: 'intercept' }
  ];
};

const lineProperties = (descriptor: SubjectFunctionFamilyDescriptor): SubjectFunctionProperty[] => {
  const slope = descriptor.kind === 'line-equation' ? descriptor.parameters.m ?? 1 : descriptor.parameters.a ?? 1;
  const intercept = descriptor.kind === 'line-equation' ? descriptor.parameters.b ?? 0 : descriptor.parameters.b ?? 0;
  return [
    { id: 'slope', label: '斜率', value: slope, kind: 'property' },
    { id: 'y-intercept', label: 'y 轴截距', value: { x: 0, y: intercept }, kind: 'intercept' },
    { id: 'x-intercept', label: 'x 轴截距', value: slope === 0 ? null : { x: -intercept / slope, y: 0 }, kind: 'intercept' }
  ];
};

const inverseProperties = (descriptor: SubjectFunctionFamilyDescriptor): SubjectFunctionProperty[] => {
  const h = finiteNumber(descriptor.parameters.h, 0);
  const k = finiteNumber(descriptor.parameters.k, 0);
  return [
    { id: 'vertical-asymptote', label: '竖直渐近线', value: `${descriptor.variable} = ${formatNumber(h)}`, kind: 'asymptote' },
    { id: 'horizontal-asymptote', label: '水平渐近线', value: `y = ${formatNumber(k)}`, kind: 'asymptote' }
  ];
};

const commonParameterProperties = (descriptor: SubjectFunctionFamilyDescriptor): SubjectFunctionProperty[] => (
  Object.entries(descriptor.parameters).map(([id, value]) => ({ id, label: id, value, kind: 'property' }))
);

const normalDensityProperties = (descriptor: SubjectFunctionFamilyDescriptor): SubjectFunctionProperty[] => {
  const mu = finiteNumber(descriptor.parameters.mu, 0);
  const sigma = Math.max(1e-9, finiteNumber(descriptor.parameters.sigma, 1));
  return [
    { id: 'mean', label: '均值', value: mu, kind: 'property' },
    { id: 'standard-deviation', label: '标准差', value: sigma, kind: 'property' },
    { id: 'peak', label: '峰值', value: { x: mu, y: evaluateSubjectFunctionDescriptor(descriptor, mu) }, kind: 'vertex' }
  ];
};

const trigonometricProperties = (descriptor: SubjectFunctionFamilyDescriptor): SubjectFunctionProperty[] => {
  const properties = commonParameterProperties(descriptor);
  if (descriptor.kind !== 'tangent') return properties;
  const b = finiteNumber(descriptor.parameters.b, 1);
  const c = finiteNumber(descriptor.parameters.c, 0);
  return [
    ...properties,
    {
      id: 'asymptotes',
      label: '渐近线',
      value: `${descriptor.variable} = (π/2 - ${formatNumber(c)} + kπ) / ${formatNumber(b)}`,
      kind: 'asymptote'
    }
  ];
};

const circleProperties = (descriptor: SubjectFunctionFamilyDescriptor): SubjectFunctionProperty[] => {
  const { h, k, r } = circleParameters(descriptor);
  return [
    { id: 'center', label: '圆心', value: { x: h, y: k }, kind: 'center' },
    { id: 'radius', label: '半径', value: r, kind: 'radius' },
    { id: 'x-intercepts', label: 'x 轴交点', value: circleAxisIntersections(h, k, r, 'x'), kind: 'intercept' },
    { id: 'y-intercepts', label: 'y 轴交点', value: circleAxisIntersections(h, k, r, 'y'), kind: 'intercept' }
  ];
};

const ellipseProperties = (descriptor: SubjectFunctionFamilyDescriptor): SubjectFunctionProperty[] => {
  const { h, k, a, b, axis } = ellipseParameters(descriptor);
  const c = Math.sqrt(Math.max(0, a ** 2 - b ** 2));
  const vertices = axis === 'x'
    ? [{ x: h - a, y: k }, { x: h + a, y: k }]
    : [{ x: h, y: k - a }, { x: h, y: k + a }];
  const foci = axis === 'x'
    ? [{ x: h - c, y: k }, { x: h + c, y: k }]
    : [{ x: h, y: k - c }, { x: h, y: k + c }];
  return [
    { id: 'center', label: '中心', value: { x: h, y: k }, kind: 'center' },
    { id: 'vertices', label: '长轴顶点', value: vertices, kind: 'vertex' },
    { id: 'foci', label: '焦点', value: foci, kind: 'focus' },
    { id: 'semi-major-axis', label: '长半轴', value: a, kind: 'property' },
    { id: 'semi-minor-axis', label: '短半轴', value: b, kind: 'property' }
  ];
};

const hyperbolaProperties = (descriptor: SubjectFunctionFamilyDescriptor): SubjectFunctionProperty[] => {
  const { h, k, a, b, axis } = hyperbolaParameters(descriptor);
  const c = Math.sqrt(a ** 2 + b ** 2);
  const vertices = axis === 'x'
    ? [{ x: h - a, y: k }, { x: h + a, y: k }]
    : [{ x: h, y: k - a }, { x: h, y: k + a }];
  const foci = axis === 'x'
    ? [{ x: h - c, y: k }, { x: h + c, y: k }]
    : [{ x: h, y: k - c }, { x: h, y: k + c }];
  return [
    { id: 'center', label: '中心', value: { x: h, y: k }, kind: 'center' },
    { id: 'vertices', label: '实轴顶点', value: vertices, kind: 'vertex' },
    { id: 'foci', label: '焦点', value: foci, kind: 'focus' },
    { id: 'asymptotes', label: '渐近线', value: hyperbolaAsymptoteExpression(h, k, a, b, axis), kind: 'asymptote' }
  ];
};

const parabolaProperties = (descriptor: SubjectFunctionFamilyDescriptor): SubjectFunctionProperty[] => {
  const { h, k, p, direction } = parabolaParameters(descriptor);
  const focus = direction === 'right'
    ? { x: h + p, y: k }
    : direction === 'left'
      ? { x: h - p, y: k }
      : direction === 'up'
        ? { x: h, y: k + p }
        : { x: h, y: k - p };
  const directrix = direction === 'right'
    ? `x = ${formatNumber(h - p)}`
    : direction === 'left'
      ? `x = ${formatNumber(h + p)}`
      : direction === 'up'
        ? `y = ${formatNumber(k - p)}`
        : `y = ${formatNumber(k + p)}`;
  return [
    { id: 'vertex', label: '顶点', value: { x: h, y: k }, kind: 'vertex' },
    { id: 'focus', label: '焦点', value: focus, kind: 'focus' },
    { id: 'directrix', label: '准线', value: directrix, kind: 'directrix' }
  ];
};

const circleAxisIntersections = (h: number, k: number, r: number, axis: 'x' | 'y'): SceneSamplePoint2D[] => {
  const offset = axis === 'x' ? k : h;
  const remaining = r ** 2 - offset ** 2;
  if (remaining < 0) return [];
  const delta = Math.sqrt(Math.max(0, remaining));
  return axis === 'x'
    ? [{ x: h - delta, y: 0 }, { x: h + delta, y: 0 }]
    : [{ x: 0, y: k - delta }, { x: 0, y: k + delta }];
};

const circleParameters = (descriptor: SubjectFunctionFamilyDescriptor): { h: number; k: number; r: number } => ({
  h: finiteNumber(descriptor.parameters.h, 0),
  k: finiteNumber(descriptor.parameters.k, 0),
  r: Math.max(1e-9, finiteNumber(descriptor.parameters.r, 1))
});

const ellipseParameters = (
  descriptor: SubjectFunctionFamilyDescriptor
): { h: number; k: number; a: number; b: number; axis: SubjectConicAxis } => ({
  h: finiteNumber(descriptor.parameters.h, 0),
  k: finiteNumber(descriptor.parameters.k, 0),
  a: Math.max(1e-9, finiteNumber(descriptor.parameters.a, 3)),
  b: Math.max(1e-9, finiteNumber(descriptor.parameters.b, 2)),
  axis: normalizeConicAxis(descriptor.meta?.axis)
});

const hyperbolaParameters = (
  descriptor: SubjectFunctionFamilyDescriptor
): { h: number; k: number; a: number; b: number; axis: SubjectConicAxis } => ({
  h: finiteNumber(descriptor.parameters.h, 0),
  k: finiteNumber(descriptor.parameters.k, 0),
  a: Math.max(1e-9, finiteNumber(descriptor.parameters.a, 2)),
  b: Math.max(1e-9, finiteNumber(descriptor.parameters.b, 1)),
  axis: normalizeConicAxis(descriptor.meta?.axis)
});

const parabolaParameters = (
  descriptor: SubjectFunctionFamilyDescriptor
): { h: number; k: number; p: number; direction: SubjectParabolaDirection } => ({
  h: finiteNumber(descriptor.parameters.h, 0),
  k: finiteNumber(descriptor.parameters.k, 0),
  p: Math.max(1e-9, Math.abs(finiteNumber(descriptor.parameters.p, 1))),
  direction: normalizeParabolaDirection(descriptor.meta?.direction)
});

const sampleEllipseEquation = (
  descriptor: SubjectFunctionFamilyDescriptor,
  bounds: { left: number; right: number; top: number; bottom: number }
): SceneSamplePoint2D[][] => {
  const { h, k, a, b, axis } = ellipseParameters(descriptor);
  return clipSegmentsToBounds2D([
    sampleParametricClosedCurve((theta) => axis === 'x'
      ? { x: h + a * Math.cos(theta), y: k + b * Math.sin(theta) }
      : { x: h + b * Math.cos(theta), y: k + a * Math.sin(theta) })
  ], bounds);
};

const sampleHyperbolaEquation = (
  descriptor: SubjectFunctionFamilyDescriptor,
  bounds: { left: number; right: number; top: number; bottom: number }
): SceneSamplePoint2D[][] => {
  const { h, k, a, b, axis } = hyperbolaParameters(descriptor);
  const domain = finiteDynamicRange(descriptor);
  const branches = [-1, 1].map((sign) => {
    const points: SceneSamplePoint2D[] = [];
    const steps = 120;
    for (let index = 0; index < steps; index += 1) {
      const t = domain[0] + ((domain[1] - domain[0]) * index) / (steps - 1);
      if (axis === 'x') points.push({ x: h + sign * a * Math.cosh(t), y: k + b * Math.sinh(t) });
      else points.push({ x: h + b * Math.sinh(t), y: k + sign * a * Math.cosh(t) });
    }
    return points;
  });
  return clipSegmentsToBounds2D(branches, bounds);
};

const sampleParabolaEquation = (
  descriptor: SubjectFunctionFamilyDescriptor,
  bounds: { left: number; right: number; top: number; bottom: number }
): SceneSamplePoint2D[][] => {
  const { h, k, p, direction } = parabolaParameters(descriptor);
  const domain = finiteDynamicRange(descriptor);
  const points: SceneSamplePoint2D[] = [];
  const steps = 160;
  for (let index = 0; index < steps; index += 1) {
    const t = domain[0] + ((domain[1] - domain[0]) * index) / (steps - 1);
    if (direction === 'right') points.push({ x: h + (t ** 2) / (4 * p), y: k + t });
    else if (direction === 'left') points.push({ x: h - (t ** 2) / (4 * p), y: k + t });
    else if (direction === 'up') points.push({ x: h + t, y: k + (t ** 2) / (4 * p) });
    else points.push({ x: h + t, y: k - (t ** 2) / (4 * p) });
  }
  return clipSegmentsToBounds2D([points], bounds);
};

const finiteDynamicRange = (descriptor: SubjectFunctionFamilyDescriptor): readonly [number, number] => {
  if (descriptor.kind === 'circle-equation' || descriptor.kind === 'ellipse-equation') return [0, Math.PI * 2];
  const interval = descriptor.domain.intervals.find((candidate) => candidate.min !== null && candidate.max !== null);
  if (interval && interval.min !== null && interval.max !== null) return [interval.min, interval.max];
  return [DEFAULT_SAMPLE_WINDOW.min, DEFAULT_SAMPLE_WINDOW.max];
};

const dynamicPointForParameter = (
  descriptor: SubjectFunctionFamilyDescriptor,
  parameter: number
): SceneSamplePoint2D | null => {
  if (descriptor.kind === 'circle-equation') {
    const { h, k, r } = circleParameters(descriptor);
    return { x: h + r * Math.cos(parameter), y: k + r * Math.sin(parameter) };
  }
  if (descriptor.kind === 'ellipse-equation') {
    const { h, k, a, b, axis } = ellipseParameters(descriptor);
    return axis === 'x'
      ? { x: h + a * Math.cos(parameter), y: k + b * Math.sin(parameter) }
      : { x: h + b * Math.cos(parameter), y: k + a * Math.sin(parameter) };
  }
  if (descriptor.kind === 'hyperbola-equation') {
    const { h, k, a, b, axis } = hyperbolaParameters(descriptor);
    return axis === 'x'
      ? { x: h + a * Math.cosh(parameter), y: k + b * Math.sinh(parameter) }
      : { x: h + b * Math.sinh(parameter), y: k + a * Math.cosh(parameter) };
  }
  if (descriptor.kind === 'parabola-equation') {
    const { h, k, p, direction } = parabolaParameters(descriptor);
    if (direction === 'right') return { x: h + (parameter ** 2) / (4 * p), y: k + parameter };
    if (direction === 'left') return { x: h - (parameter ** 2) / (4 * p), y: k + parameter };
    if (direction === 'up') return { x: h + parameter, y: k + (parameter ** 2) / (4 * p) };
    return { x: h + parameter, y: k - (parameter ** 2) / (4 * p) };
  }
  const y = evaluateSubjectFunctionDescriptor(descriptor, parameter);
  return Number.isFinite(y) ? { x: parameter, y } : null;
};

const pointPropertyAnchor = (value: SubjectFunctionProperty['value']): SceneSamplePoint2D | undefined => {
  if (isPoint(value)) return value;
  if (Array.isArray(value) && value.length > 0 && isPoint(value[0])) return value[0];
  return undefined;
};

const isPoint = (value: unknown): value is SceneSamplePoint2D => {
  if (typeof value !== 'object' || value === null) return false;
  const point = value as Record<string, unknown>;
  return typeof point.x === 'number' && Number.isFinite(point.x) && typeof point.y === 'number' && Number.isFinite(point.y);
};

const formatPropertyValue = (value: SubjectFunctionProperty['value']): string => {
  if (value === null) return '无';
  if (typeof value === 'number') return formatNumber(value);
  if (typeof value === 'string') return value;
  if (Array.isArray(value)) return (value as readonly SceneSamplePoint2D[]).map(formatPoint).join(', ');
  return formatPoint(value as SceneSamplePoint2D);
};

const formatPoint = (point: SceneSamplePoint2D): string => `(${formatNumber(point.x)}, ${formatNumber(point.y)})`;

const createPuncturedDomain = (center: number): SubjectDomain => createSubjectDomain([
  createSubjectDomainInterval(null, center, { maxClosed: false }),
  createSubjectDomainInterval(center, null, { minClosed: false })
]);

const finiteLogBase = (value: unknown, fallback: number): number => {
  const base = finiteNumber(value, fallback);
  return base > 0 && Math.abs(base - 1) > 1e-9 ? base : fallback;
};

const normalizeConicAxis = (value: unknown): SubjectConicAxis => value === 'y' ? 'y' : 'x';

const normalizeParabolaDirection = (value: unknown): SubjectParabolaDirection => (
  value === 'left' || value === 'up' || value === 'down' ? value : 'right'
);

const ellipseExpression = (h: number, k: number, a: number, b: number, axis: SubjectConicAxis): string => {
  const xDenominator = axis === 'x' ? a ** 2 : b ** 2;
  const yDenominator = axis === 'x' ? b ** 2 : a ** 2;
  return `${formatSquaredOffset('x', h)} / ${formatNumber(xDenominator)} + ${formatSquaredOffset('y', k)} / ${formatNumber(yDenominator)} = 1`;
};

const hyperbolaExpression = (h: number, k: number, a: number, b: number, axis: SubjectConicAxis): string => (
  axis === 'x'
    ? `${formatSquaredOffset('x', h)} / ${formatNumber(a ** 2)} - ${formatSquaredOffset('y', k)} / ${formatNumber(b ** 2)} = 1`
    : `${formatSquaredOffset('y', k)} / ${formatNumber(a ** 2)} - ${formatSquaredOffset('x', h)} / ${formatNumber(b ** 2)} = 1`
);

const parabolaExpression = (h: number, k: number, p: number, direction: SubjectParabolaDirection): string => {
  const coefficient = formatNumber(4 * p);
  if (direction === 'right') return `${formatSquaredOffset('y', k)} = ${coefficient} * (${formatOffset('x', h)})`;
  if (direction === 'left') return `${formatSquaredOffset('y', k)} = -${coefficient} * (${formatOffset('x', h)})`;
  if (direction === 'up') return `${formatSquaredOffset('x', h)} = ${coefficient} * (${formatOffset('y', k)})`;
  return `${formatSquaredOffset('x', h)} = -${coefficient} * (${formatOffset('y', k)})`;
};

const hyperbolaAsymptoteExpression = (h: number, k: number, a: number, b: number, axis: SubjectConicAxis): string => {
  const slope = axis === 'x' ? b / a : a / b;
  return `y - ${formatNumber(k)} = ±${formatNumber(slope)} * (x - ${formatNumber(h)})`;
};

const evaluateEllipseUpperBranch = (descriptor: SubjectFunctionFamilyDescriptor, x: number): number => {
  const { h, k, a, b, axis } = ellipseParameters(descriptor);
  const horizontalRadius = axis === 'x' ? a : b;
  const verticalRadius = axis === 'x' ? b : a;
  const dx = x - h;
  const remaining = 1 - (dx ** 2) / (horizontalRadius ** 2);
  return remaining >= 0 ? k + verticalRadius * Math.sqrt(Math.max(0, remaining)) : NaN;
};

const evaluateParabolaBranch = (descriptor: SubjectFunctionFamilyDescriptor, x: number): number => {
  const { h, k, p, direction } = parabolaParameters(descriptor);
  if (direction === 'up') return k + ((x - h) ** 2) / (4 * p);
  if (direction === 'down') return k - ((x - h) ** 2) / (4 * p);
  const signed = direction === 'right' ? x - h : h - x;
  return signed >= 0 ? k + Math.sqrt(4 * p * signed) : NaN;
};

const formatSquaredOffset = (variable: string, center: number): string => {
  if (center === 0) return `${variable}^2`;
  return center < 0
    ? `(${variable} + ${formatNumber(Math.abs(center))})^2`
    : `(${variable} - ${formatNumber(center)})^2`;
};
const formatOffset = (variable: string, center: number): string => {
  if (center === 0) return variable;
  return center < 0
    ? `${variable} + ${formatNumber(Math.abs(center))}`
    : `${variable} - ${formatNumber(center)}`;
};
const formatNumber = (value: number): string => Number.isInteger(value) ? String(value) : value.toFixed(4).replace(/0+$/, '').replace(/\.$/, '');
const clampNumber = (value: number, min: number, max: number): number => Math.min(Math.max(value, min), max);
