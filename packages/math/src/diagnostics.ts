import { GRAPH_MATH_EPSILON } from './geometry';

export type MathDiagnosticSeverity = 'error' | 'warning' | 'info';

export type MathDiagnosticCode =
  | 'MATH_INVALID_INPUT'
  | 'MATH_PARSE_ERROR'
  | 'MATH_DOMAIN_EMPTY'
  | 'MATH_DOMAIN_OUT_OF_RANGE'
  | 'MATH_NON_FINITE_RESULT'
  | 'MATH_DEGENERATE_GEOMETRY'
  | 'MATH_PARALLEL_OR_COINCIDENT'
  | 'MATH_NO_REAL_SOLUTION'
  | 'MATH_MULTIPLE_SOLUTIONS'
  | 'MATH_TOLERANCE_EXCEEDED'
  | 'MATH_NUMERIC_METHOD_FAILED'
  | 'MATH_UNSUPPORTED_OPERATION';

export type MathTarget = string;

export interface MathInterval {
  min: number;
  max: number;
  minClosed?: boolean;
  maxClosed?: boolean;
}

export interface MathTolerance {
  epsilon?: number;
  relative?: number;
  maxIterations?: number;
}

export interface NormalizedMathTolerance {
  epsilon: number;
  relative?: number;
  maxIterations?: number;
}

export interface MathResultMeta {
  tolerance: NormalizedMathTolerance;
  domain?: MathInterval | MathInterval[];
  target?: MathTarget;
  method?: string;
}

export interface MathResultMetaInput {
  tolerance?: MathTolerance;
  domain?: MathInterval | MathInterval[];
  target?: MathTarget;
  method?: string;
}

export interface MathDiagnostic<C extends MathDiagnosticCode = MathDiagnosticCode> {
  code: C;
  severity: MathDiagnosticSeverity;
  target: MathTarget;
  message: string;
  tolerance?: NormalizedMathTolerance;
  domain?: MathInterval | MathInterval[];
  data?: Record<string, unknown>;
}

export type MathResult<T, C extends MathDiagnosticCode = MathDiagnosticCode> =
  | { ok: true; value: T; diagnostics: MathDiagnostic[]; meta: MathResultMeta }
  | { ok: false; error: MathDiagnostic<C>; diagnostics: MathDiagnostic[]; meta: MathResultMeta };

export const DEFAULT_MATH_TOLERANCE: NormalizedMathTolerance = {
  epsilon: GRAPH_MATH_EPSILON
};

export const normalizeMathTolerance = (tolerance: MathTolerance = {}): NormalizedMathTolerance => {
  const normalized: NormalizedMathTolerance = {
    epsilon: Number.isFinite(tolerance.epsilon) && tolerance.epsilon !== undefined && tolerance.epsilon > 0
      ? tolerance.epsilon
      : DEFAULT_MATH_TOLERANCE.epsilon
  };

  if (Number.isFinite(tolerance.relative) && tolerance.relative !== undefined && tolerance.relative > 0) {
    normalized.relative = tolerance.relative;
  }
  if (Number.isFinite(tolerance.maxIterations) && tolerance.maxIterations !== undefined && tolerance.maxIterations > 0) {
    normalized.maxIterations = Math.floor(tolerance.maxIterations);
  }

  return normalized;
};

export const createMathResultMeta = (input: MathResultMetaInput = {}): MathResultMeta => {
  const meta: MathResultMeta = {
    tolerance: normalizeMathTolerance(input.tolerance)
  };
  if (input.domain) meta.domain = input.domain;
  if (input.target) meta.target = input.target;
  if (input.method) meta.method = input.method;
  return meta;
};

export const createMathDiagnostic = <C extends MathDiagnosticCode>(
  code: C,
  severity: MathDiagnosticSeverity,
  target: MathTarget,
  message: string,
  meta: MathResultMetaInput = {},
  data?: Record<string, unknown>
): MathDiagnostic<C> => {
  const diagnostic: MathDiagnostic<C> = {
    code,
    severity,
    target,
    message,
    tolerance: normalizeMathTolerance(meta.tolerance)
  };
  if (meta.domain) diagnostic.domain = meta.domain;
  if (data) diagnostic.data = data;
  return diagnostic;
};

export const okMathResult = <T>(
  value: T,
  meta: MathResultMetaInput = {},
  diagnostics: MathDiagnostic[] = []
): MathResult<T> => ({
  ok: true,
  value,
  diagnostics,
  meta: createMathResultMeta(meta)
});

export const failMathResult = <T = never, C extends MathDiagnosticCode = MathDiagnosticCode>(
  code: C,
  target: MathTarget,
  message: string,
  meta: MathResultMetaInput = {},
  data?: Record<string, unknown>
): MathResult<T, C> => {
  const error = createMathDiagnostic(code, 'error', target, message, meta, data);
  return {
    ok: false,
    error,
    diagnostics: [error],
    meta: createMathResultMeta(meta)
  };
};

export const infoMathDiagnostic = <C extends MathDiagnosticCode>(
  code: C,
  target: MathTarget,
  message: string,
  meta: MathResultMetaInput = {},
  data?: Record<string, unknown>
): MathDiagnostic<C> => createMathDiagnostic(code, 'info', target, message, meta, data);

export const warningMathDiagnostic = <C extends MathDiagnosticCode>(
  code: C,
  target: MathTarget,
  message: string,
  meta: MathResultMetaInput = {},
  data?: Record<string, unknown>
): MathDiagnostic<C> => createMathDiagnostic(code, 'warning', target, message, meta, data);
