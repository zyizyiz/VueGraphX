import {
  createGraphObjectNode,
  okResult,
  type GraphLayerId,
  type GraphObjectKind,
  type GraphObjectNode,
  type GraphOperationDiagnostic,
  type GraphOperationResult,
  type GraphRuntimeTargetRef,
  type GraphWorldPoint
} from './contracts';

export const GRAPH_SCENE_OBJECT_IR_VERSION = 1;

export const SUPPORTED_GRAPH_SCENE_OBJECT_IR_TYPES = [
  'point',
  'line',
  'segment',
  'ray',
  'polygon',
  'conic',
  'text',
  'function',
  'parametric',
  'implicit',
  'vector',
  'transform',
  'measurement',
  'solid',
  'coordinate-system'
] as const;

export type GraphSceneObjectIrType = typeof SUPPORTED_GRAPH_SCENE_OBJECT_IR_TYPES[number];
export type GraphSceneObjectIrDiagnosticCode =
  | 'scene-object-ir.unsupported-object-type'
  | 'scene-object-ir.invalid-payload';

export interface GraphSceneObjectIrDiagnostic extends GraphOperationDiagnostic {
  code: GraphSceneObjectIrDiagnosticCode;
  details?: Record<string, unknown>;
}

export type GraphSceneCoordinate = GraphWorldPoint;

export interface GraphSceneObjectRef {
  objectId: string;
  componentId?: string;
  relationId?: string;
  role?: string;
}

export interface GraphSceneCoordinateRef {
  coordinates: GraphSceneCoordinate;
}

export type GraphScenePointSource = GraphSceneObjectRef | GraphSceneCoordinateRef;

export interface GraphSceneNumericDomain {
  min?: number;
  max?: number;
  step?: number;
}

export interface GraphSceneAxisRange {
  min: number;
  max: number;
}

export interface GraphSceneViewportSize {
  width: number;
  height: number;
}

export interface GraphSceneVectorComponents {
  dimension: '2d' | '3d';
  x: number;
  y: number;
  z?: number;
}

export interface GraphSceneStyleIr {
  strokeColor?: string;
  fillColor?: string;
  strokeWidth?: number;
  opacity?: number;
  visible?: boolean;
  lineDash?: readonly number[];
}

export interface GraphSceneObjectIrBase<Type extends GraphSceneObjectIrType> {
  schemaVersion?: typeof GRAPH_SCENE_OBJECT_IR_VERSION;
  objectType: Type;
  label?: string;
  style?: GraphSceneStyleIr;
  meta?: Record<string, unknown>;
}

export interface GraphPointSceneObjectIr extends GraphSceneObjectIrBase<'point'> {
  position: GraphSceneCoordinate;
}

export type GraphLineDefinitionIr =
  | {
      mode: 'through-points';
      points: readonly [GraphScenePointSource, GraphScenePointSource];
    }
  | {
      mode: 'point-direction';
      point: GraphScenePointSource;
      direction: GraphSceneVectorComponents;
    }
  | {
      mode: 'equation';
      coefficients: { a: number; b: number; c: number };
    };

export interface GraphLineSceneObjectIr extends GraphSceneObjectIrBase<'line'> {
  definition: GraphLineDefinitionIr;
}

export interface GraphSegmentSceneObjectIr extends GraphSceneObjectIrBase<'segment'> {
  endpoints: readonly [GraphScenePointSource, GraphScenePointSource];
}

export type GraphRayDefinitionIr =
  | {
      origin: GraphScenePointSource;
      through: GraphScenePointSource;
      direction?: never;
    }
  | {
      origin: GraphScenePointSource;
      direction: GraphSceneVectorComponents;
      through?: never;
    };

export type GraphRaySceneObjectIr = GraphSceneObjectIrBase<'ray'> & GraphRayDefinitionIr;

export interface GraphPolygonSceneObjectIr extends GraphSceneObjectIrBase<'polygon'> {
  vertices: readonly GraphScenePointSource[];
  closed?: boolean;
  holes?: readonly (readonly GraphScenePointSource[])[];
}

export type GraphConicKind = 'circle' | 'ellipse' | 'hyperbola' | 'parabola' | 'general-conic';

export type GraphConicDefinitionIr =
  | {
      mode: 'center-radii';
      center: GraphScenePointSource;
      radiusX: number;
      radiusY?: number;
      rotationRadians?: number;
    }
  | {
      mode: 'equation';
      expression: string;
      variables?: readonly [string, string];
    }
  | {
      mode: 'through-points';
      points: readonly GraphScenePointSource[];
    }
  | {
      mode: 'focus-directrix';
      focus: GraphScenePointSource;
      directrix: GraphSceneObjectRef;
      eccentricity?: number;
    };

export interface GraphConicSceneObjectIr extends GraphSceneObjectIrBase<'conic'> {
  conicKind: GraphConicKind;
  definition: GraphConicDefinitionIr;
}

export interface GraphTextSceneObjectIr extends GraphSceneObjectIrBase<'text'> {
  content: string;
  anchor: GraphScenePointSource;
  format?: 'plain' | 'latex' | 'markdown';
}

export interface GraphFunctionSceneObjectIr extends GraphSceneObjectIrBase<'function'> {
  expression: string;
  variable?: string;
  domain?: GraphSceneNumericDomain;
  parameters?: Record<string, number>;
}

export interface GraphParametricSceneObjectIr extends GraphSceneObjectIrBase<'parametric'> {
  parameter: string;
  xExpression: string;
  yExpression: string;
  zExpression?: string;
  domain?: GraphSceneNumericDomain;
  parameters?: Record<string, number>;
}

export interface GraphImplicitSceneObjectIr extends GraphSceneObjectIrBase<'implicit'> {
  expression: string;
  variables?: readonly [string, string] | readonly [string, string, string];
  domain?: Record<string, GraphSceneNumericDomain>;
  parameters?: Record<string, number>;
}

export interface GraphVectorSceneObjectIr extends GraphSceneObjectIrBase<'vector'> {
  start?: GraphScenePointSource;
  end?: GraphScenePointSource;
  components?: GraphSceneVectorComponents;
}

export type GraphTransformKind = 'translation' | 'rotation' | 'reflection' | 'scale' | 'matrix' | 'custom';

export interface GraphTransformSceneObjectIr extends GraphSceneObjectIrBase<'transform'> {
  transformKind: GraphTransformKind;
  target: GraphSceneObjectRef;
  parameters: Record<string, unknown>;
}

export type GraphMeasurementKind = 'distance' | 'angle' | 'length' | 'area' | 'slope' | 'dot-product' | 'cross-product' | 'volume';

export interface GraphMeasurementSceneObjectIr extends GraphSceneObjectIrBase<'measurement'> {
  measurementKind: GraphMeasurementKind;
  targets: readonly GraphSceneObjectRef[];
  unit?: string;
  expression?: string;
}

export type GraphSolidKind = 'polyhedron' | 'sphere' | 'cylinder' | 'cone' | 'prism' | 'pyramid' | 'surface' | 'custom';

export interface GraphSolidSceneObjectIr extends GraphSceneObjectIrBase<'solid'> {
  solidKind: GraphSolidKind;
  vertices?: readonly Extract<GraphWorldPoint, { dimension: '3d' }>[];
  faces?: readonly (readonly number[])[];
  parameters?: Record<string, unknown>;
}

export interface GraphCoordinateSystemSceneObjectIr extends GraphSceneObjectIrBase<'coordinate-system'> {
  dimension: 'plane' | 'space';
  origin: Extract<GraphSceneCoordinate, { dimension: '2d' }>;
  size: GraphSceneViewportSize;
  unitPx: number;
  xRange: GraphSceneAxisRange;
  yRange: GraphSceneAxisRange;
  showAxes?: boolean;
  showTicks?: boolean;
  showLabels?: boolean;
  clipContent?: boolean;
  snap?: boolean;
  colorSequence?: readonly string[];
  geometry?: Record<string, unknown>;
}

export type GraphSceneObjectIr =
  | GraphPointSceneObjectIr
  | GraphLineSceneObjectIr
  | GraphSegmentSceneObjectIr
  | GraphRaySceneObjectIr
  | GraphPolygonSceneObjectIr
  | GraphConicSceneObjectIr
  | GraphTextSceneObjectIr
  | GraphFunctionSceneObjectIr
  | GraphParametricSceneObjectIr
  | GraphImplicitSceneObjectIr
  | GraphVectorSceneObjectIr
  | GraphTransformSceneObjectIr
  | GraphMeasurementSceneObjectIr
  | GraphSolidSceneObjectIr
  | GraphCoordinateSystemSceneObjectIr;

export type GraphSceneObjectIrNode = GraphObjectNode<GraphSceneObjectIr> & {
  type: GraphSceneObjectIrType;
};

export interface CreateGraphSceneObjectIrNodeInput {
  id: string;
  objectType: string;
  payload: unknown;
  kind?: GraphObjectKind;
  layerId?: GraphLayerId;
  backendHint?: GraphObjectNode['backendHint'];
  dependencies?: string[];
  children?: string[];
  relations?: string[];
  capabilities?: GraphObjectNode['capabilities'];
  renderHints?: Record<string, unknown>;
  meta?: Record<string, unknown>;
}

const supportedSceneObjectIrTypeSet = new Set<string>(SUPPORTED_GRAPH_SCENE_OBJECT_IR_TYPES);

export const isSupportedGraphSceneObjectIrType = (value: string): value is GraphSceneObjectIrType => (
  supportedSceneObjectIrTypeSet.has(value)
);

export const unsupportedGraphSceneObjectIrDiagnostic = (
  objectType: string,
  objectId?: string
): GraphSceneObjectIrDiagnostic => ({
  code: 'scene-object-ir.unsupported-object-type',
  message: `Graph scene object IR type "${objectType}" is not part of the M1 core contract.`,
  severity: 'warning',
  target: objectTarget(objectId),
  details: {
    objectType,
    supportedObjectTypes: [...SUPPORTED_GRAPH_SCENE_OBJECT_IR_TYPES]
  }
});

export const invalidGraphSceneObjectIrPayloadDiagnostic = (
  expectedObjectType: GraphSceneObjectIrType,
  receivedObjectType: string | undefined,
  objectId?: string,
  details?: Record<string, unknown>
): GraphSceneObjectIrDiagnostic => ({
  code: 'scene-object-ir.invalid-payload',
  message: `Graph scene object ${objectId ?? '<unknown>'} payload must use objectType "${expectedObjectType}".`,
  severity: 'error',
  target: objectTarget(objectId),
  details: {
    expectedObjectType,
    receivedObjectType,
    ...(details ?? {})
  }
});

export const validateGraphSceneObjectIrPayload = (
  expectedObjectType: GraphSceneObjectIrType,
  payload: unknown,
  objectId?: string
): GraphOperationResult<GraphSceneObjectIr> => {
  const payloadObjectType = readGraphSceneObjectIrPayloadType(payload);
  if (payloadObjectType !== expectedObjectType) {
    return { ok: false, diagnostics: [invalidGraphSceneObjectIrPayloadDiagnostic(expectedObjectType, payloadObjectType, objectId)] };
  }

  const payloadRecord = asRecord(payload);
  const commonError = payloadRecord ? validateCommonSceneObjectIrFields(payloadRecord) : invalidPayload('payload', 'object');
  const shapeError = commonError ?? validateSceneObjectIrShape(expectedObjectType, payloadRecord);
  if (shapeError) {
    return {
      ok: false,
      diagnostics: [
        invalidGraphSceneObjectIrPayloadDiagnostic(expectedObjectType, payloadObjectType, objectId, shapeError)
      ]
    };
  }

  return okResult({
    ...(payload as GraphSceneObjectIr),
    schemaVersion: GRAPH_SCENE_OBJECT_IR_VERSION
  } as GraphSceneObjectIr);
};

export const createGraphSceneObjectIrNode = (
  input: CreateGraphSceneObjectIrNodeInput
): GraphOperationResult<GraphSceneObjectIrNode> => {
  if (!isSupportedGraphSceneObjectIrType(input.objectType)) {
    return { ok: false, diagnostics: [unsupportedGraphSceneObjectIrDiagnostic(input.objectType, input.id)] };
  }

  const payloadResult = validateGraphSceneObjectIrPayload(input.objectType, input.payload, input.id);
  if (!payloadResult.ok || !payloadResult.value) {
    return { ok: false, diagnostics: payloadResult.diagnostics };
  }

  return okResult(createGraphObjectNode({
    id: input.id,
    kind: input.kind ?? defaultGraphObjectKindForSceneObjectIr(input.objectType),
    type: input.objectType,
    payload: payloadResult.value,
    backendHint: input.backendHint,
    layerId: input.layerId ?? defaultLayerForSceneObjectIr(input.objectType),
    dependencies: input.dependencies,
    children: input.children,
    relations: input.relations,
    capabilities: input.capabilities,
    renderHints: input.renderHints,
    meta: input.meta
  }) as GraphSceneObjectIrNode);
};

const objectTarget = (objectId: string | undefined): GraphRuntimeTargetRef => (
  objectId ? { scope: 'object', objectId } : { scope: 'scene' }
);

const readGraphSceneObjectIrPayloadType = (payload: unknown): string | undefined => {
  if (typeof payload !== 'object' || payload === null) return undefined;
  const objectType = (payload as { objectType?: unknown }).objectType;
  return typeof objectType === 'string' ? objectType : undefined;
};

type PlainRecord = Record<string, unknown>;
type ValidationFailure = {
  path: string;
  expected: string;
};

const CONIC_KINDS = new Set<string>(['circle', 'ellipse', 'hyperbola', 'parabola', 'general-conic']);
const TEXT_FORMATS = new Set<string>(['plain', 'latex', 'markdown']);
const TRANSFORM_KINDS = new Set<string>(['translation', 'rotation', 'reflection', 'scale', 'matrix', 'custom']);
const MEASUREMENT_KINDS = new Set<string>(['distance', 'angle', 'length', 'area', 'slope', 'dot-product', 'cross-product', 'volume']);
const SOLID_KINDS = new Set<string>(['polyhedron', 'sphere', 'cylinder', 'cone', 'prism', 'pyramid', 'surface', 'custom']);

const invalidPayload = (path: string, expected: string): ValidationFailure => ({ path, expected });

const asRecord = (value: unknown): PlainRecord | null => (
  typeof value === 'object' && value !== null && !Array.isArray(value) ? value as PlainRecord : null
);

const isFiniteNumber = (value: unknown): value is number => typeof value === 'number' && Number.isFinite(value);

const isString = (value: unknown): value is string => typeof value === 'string' && value.length > 0;

const isOptionalString = (value: unknown): boolean => value === undefined || typeof value === 'string';

const isOptionalNumber = (value: unknown): boolean => value === undefined || isFiniteNumber(value);

const isOptionalBoolean = (value: unknown): boolean => value === undefined || typeof value === 'boolean';

const isFinitePositiveNumber = (value: unknown): value is number => isFiniteNumber(value) && value > 0;

const validateCommonSceneObjectIrFields = (payload: PlainRecord): ValidationFailure | null => {
  if (payload.schemaVersion !== undefined && payload.schemaVersion !== GRAPH_SCENE_OBJECT_IR_VERSION) {
    return invalidPayload('schemaVersion', `${GRAPH_SCENE_OBJECT_IR_VERSION}`);
  }
  if (!isOptionalString(payload.label)) return invalidPayload('label', 'string');
  if (payload.style !== undefined && !isSceneStyleIr(payload.style)) return invalidPayload('style', 'GraphSceneStyleIr');
  if (payload.meta !== undefined && !asRecord(payload.meta)) return invalidPayload('meta', 'record');
  return null;
};

const validateSceneObjectIrShape = (
  objectType: GraphSceneObjectIrType,
  payload: PlainRecord | null
): ValidationFailure | null => {
  if (!payload) return invalidPayload('payload', 'object');

  switch (objectType) {
    case 'point':
      return isGraphSceneCoordinate(payload.position) ? null : invalidPayload('position', 'GraphSceneCoordinate');
    case 'line':
      return isLineDefinition(payload.definition) ? null : invalidPayload('definition', 'GraphLineDefinitionIr');
    case 'segment':
      return isPointSourceTuple(payload.endpoints, 2) ? null : invalidPayload('endpoints', 'two GraphScenePointSource values');
    case 'ray':
      return isRayDefinition(payload) ? null : invalidPayload('origin/through|direction', 'ray origin plus through point or direction vector');
    case 'polygon':
      return isPointSourceArray(payload.vertices, 3) && (payload.holes === undefined || isPointSourceArrayArray(payload.holes, 3))
        ? null
        : invalidPayload('vertices', 'at least three GraphScenePointSource values');
    case 'conic':
      return CONIC_KINDS.has(String(payload.conicKind)) && isConicDefinition(payload.definition)
        ? null
        : invalidPayload('conicKind/definition', 'valid conic kind and definition');
    case 'text':
      return isString(payload.content)
        && isGraphScenePointSource(payload.anchor)
        && (payload.format === undefined || TEXT_FORMATS.has(String(payload.format)))
        ? null
        : invalidPayload('content/anchor', 'text content and GraphScenePointSource anchor');
    case 'function':
      return isString(payload.expression)
        && isOptionalString(payload.variable)
        && (payload.domain === undefined || isNumericDomain(payload.domain))
        && (payload.parameters === undefined || isNumberRecord(payload.parameters))
        ? null
        : invalidPayload('expression', 'function expression with optional domain/parameters');
    case 'parametric':
      return isString(payload.parameter)
        && isString(payload.xExpression)
        && isString(payload.yExpression)
        && isOptionalString(payload.zExpression)
        && (payload.domain === undefined || isNumericDomain(payload.domain))
        && (payload.parameters === undefined || isNumberRecord(payload.parameters))
        ? null
        : invalidPayload('parameter/xExpression/yExpression', 'parametric expressions');
    case 'implicit':
      return isString(payload.expression)
        && (payload.variables === undefined || isStringTuple(payload.variables, 2, 3))
        && (payload.domain === undefined || isNumericDomainRecord(payload.domain))
        && (payload.parameters === undefined || isNumberRecord(payload.parameters))
        ? null
        : invalidPayload('expression', 'implicit expression with optional variables/domain/parameters');
    case 'vector':
      return isVectorDefinition(payload) ? null : invalidPayload('start/end|components', 'vector endpoints or components');
    case 'transform':
      return TRANSFORM_KINDS.has(String(payload.transformKind))
        && isGraphSceneObjectRef(payload.target)
        && !!asRecord(payload.parameters)
        ? null
        : invalidPayload('transformKind/target/parameters', 'transform kind, target, and parameter record');
    case 'measurement':
      return MEASUREMENT_KINDS.has(String(payload.measurementKind))
        && isObjectRefArray(payload.targets, 1)
        && isOptionalString(payload.unit)
        && isOptionalString(payload.expression)
        ? null
        : invalidPayload('measurementKind/targets', 'measurement kind and one or more targets');
    case 'solid':
      return SOLID_KINDS.has(String(payload.solidKind))
        && (payload.vertices === undefined || isWorldPointArray(payload.vertices, '3d'))
        && (payload.faces === undefined || isNumberArrayArray(payload.faces))
        && (payload.parameters === undefined || !!asRecord(payload.parameters))
        ? null
        : invalidPayload('solidKind', 'solid kind with optional 3D vertices/faces/parameters');
    case 'coordinate-system':
      return (payload.dimension === 'plane' || payload.dimension === 'space')
        && isGraphSceneCoordinate(payload.origin)
        && asRecord(payload.origin)?.dimension === '2d'
        && isViewportSize(payload.size)
        && isFinitePositiveNumber(payload.unitPx)
        && isAxisRange(payload.xRange)
        && isAxisRange(payload.yRange)
        && isOptionalBoolean(payload.showAxes)
        && isOptionalBoolean(payload.showTicks)
        && isOptionalBoolean(payload.showLabels)
        && isOptionalBoolean(payload.clipContent)
        && isOptionalBoolean(payload.snap)
        && (payload.colorSequence === undefined || isStringArray(payload.colorSequence))
        && (payload.geometry === undefined || !!asRecord(payload.geometry))
        ? null
        : invalidPayload('coordinate-system', 'dimension, 2D origin, size, positive unitPx, axis ranges, flags, and optional proxy geometry');
  }
};

const isGraphSceneCoordinate = (value: unknown): value is GraphSceneCoordinate => {
  const point = asRecord(value);
  if (!point) return false;
  if (point.dimension === '2d') return isFiniteNumber(point.x) && isFiniteNumber(point.y);
  if (point.dimension === '3d') return isFiniteNumber(point.x) && isFiniteNumber(point.y) && isFiniteNumber(point.z);
  return false;
};

const isGraphSceneObjectRef = (value: unknown): value is GraphSceneObjectRef => {
  const ref = asRecord(value);
  return !!ref
    && isString(ref.objectId)
    && isOptionalString(ref.componentId)
    && isOptionalString(ref.relationId)
    && isOptionalString(ref.role);
};

const isGraphScenePointSource = (value: unknown): value is GraphScenePointSource => {
  const source = asRecord(value);
  return !!source && (
    isGraphSceneObjectRef(source)
    || ('coordinates' in source && isGraphSceneCoordinate(source.coordinates))
  );
};

const isSceneVectorComponents = (value: unknown): value is GraphSceneVectorComponents => {
  const vector = asRecord(value);
  if (!vector || (vector.dimension !== '2d' && vector.dimension !== '3d')) return false;
  if (!isFiniteNumber(vector.x) || !isFiniteNumber(vector.y)) return false;
  return vector.dimension === '2d' ? isOptionalNumber(vector.z) : isFiniteNumber(vector.z);
};

const isNumericDomain = (value: unknown): value is GraphSceneNumericDomain => {
  const domain = asRecord(value);
  return !!domain && isOptionalNumber(domain.min) && isOptionalNumber(domain.max) && isOptionalNumber(domain.step);
};

const isAxisRange = (value: unknown): value is GraphSceneAxisRange => {
  const range = asRecord(value);
  return !!range && isFiniteNumber(range.min) && isFiniteNumber(range.max) && range.min < range.max;
};

const isViewportSize = (value: unknown): value is GraphSceneViewportSize => {
  const size = asRecord(value);
  return !!size && isFinitePositiveNumber(size.width) && isFinitePositiveNumber(size.height);
};

const isSceneStyleIr = (value: unknown): value is GraphSceneStyleIr => {
  const style = asRecord(value);
  return !!style
    && isOptionalString(style.strokeColor)
    && isOptionalString(style.fillColor)
    && isOptionalNumber(style.strokeWidth)
    && isOptionalNumber(style.opacity)
    && (style.visible === undefined || typeof style.visible === 'boolean')
    && (style.lineDash === undefined || isNumberArray(style.lineDash));
};

const isLineDefinition = (value: unknown): value is GraphLineDefinitionIr => {
  const definition = asRecord(value);
  if (!definition) return false;
  if (definition.mode === 'through-points') return isPointSourceTuple(definition.points, 2);
  if (definition.mode === 'point-direction') return isGraphScenePointSource(definition.point) && isSceneVectorComponents(definition.direction);
  if (definition.mode === 'equation') {
    const coefficients = asRecord(definition.coefficients);
    return !!coefficients && isFiniteNumber(coefficients.a) && isFiniteNumber(coefficients.b) && isFiniteNumber(coefficients.c);
  }
  return false;
};

const isRayDefinition = (value: PlainRecord): boolean => {
  if (!isGraphScenePointSource(value.origin)) return false;
  const hasThrough = value.through !== undefined;
  const hasDirection = value.direction !== undefined;
  if (hasThrough === hasDirection) return false;
  return hasThrough ? isGraphScenePointSource(value.through) : isSceneVectorComponents(value.direction);
};

const isConicDefinition = (value: unknown): value is GraphConicDefinitionIr => {
  const definition = asRecord(value);
  if (!definition) return false;
  if (definition.mode === 'center-radii') {
    return isGraphScenePointSource(definition.center)
      && isFiniteNumber(definition.radiusX)
      && isOptionalNumber(definition.radiusY)
      && isOptionalNumber(definition.rotationRadians);
  }
  if (definition.mode === 'equation') {
    return isString(definition.expression) && (definition.variables === undefined || isStringTuple(definition.variables, 2, 2));
  }
  if (definition.mode === 'through-points') return isPointSourceArray(definition.points, 3);
  if (definition.mode === 'focus-directrix') {
    return isGraphScenePointSource(definition.focus)
      && isGraphSceneObjectRef(definition.directrix)
      && isOptionalNumber(definition.eccentricity);
  }
  return false;
};

const isVectorDefinition = (value: PlainRecord): boolean => {
  const hasStart = value.start !== undefined;
  const hasEnd = value.end !== undefined;
  const hasComponents = value.components !== undefined;
  return (hasStart && hasEnd && !hasComponents && isGraphScenePointSource(value.start) && isGraphScenePointSource(value.end))
    || (!hasStart && !hasEnd && hasComponents && isSceneVectorComponents(value.components));
};

const isPointSourceTuple = (value: unknown, length: number): boolean => (
  Array.isArray(value) && value.length === length && value.every(isGraphScenePointSource)
);

const isPointSourceArray = (value: unknown, minLength: number): boolean => (
  Array.isArray(value) && value.length >= minLength && value.every(isGraphScenePointSource)
);

const isPointSourceArrayArray = (value: unknown, minLength: number): boolean => (
  Array.isArray(value) && value.every((entry) => isPointSourceArray(entry, minLength))
);

const isObjectRefArray = (value: unknown, minLength: number): boolean => (
  Array.isArray(value) && value.length >= minLength && value.every(isGraphSceneObjectRef)
);

const isStringTuple = (value: unknown, minLength: number, maxLength: number): boolean => (
  Array.isArray(value)
  && value.length >= minLength
  && value.length <= maxLength
  && value.every(isString)
);

const isNumberRecord = (value: unknown): value is Record<string, number> => {
  const record = asRecord(value);
  return !!record && Object.values(record).every(isFiniteNumber);
};

const isNumericDomainRecord = (value: unknown): value is Record<string, GraphSceneNumericDomain> => {
  const record = asRecord(value);
  return !!record && Object.values(record).every(isNumericDomain);
};

const isNumberArray = (value: unknown): value is number[] => (
  Array.isArray(value) && value.every(isFiniteNumber)
);

const isNumberArrayArray = (value: unknown): boolean => (
  Array.isArray(value) && value.every(isNumberArray)
);

const isStringArray = (value: unknown): value is string[] => (
  Array.isArray(value) && value.every(isString)
);

const isWorldPointArray = (value: unknown, dimension: GraphWorldPoint['dimension']): boolean => (
  Array.isArray(value) && value.every((point) => isGraphSceneCoordinate(point) && point.dimension === dimension)
);

const defaultGraphObjectKindForSceneObjectIr = (objectType: GraphSceneObjectIrType): GraphObjectKind => {
  if (objectType === 'text') return 'overlay';
  if (objectType === 'transform' || objectType === 'measurement') return 'relation';
  return 'shape';
};

const defaultLayerForSceneObjectIr = (objectType: GraphSceneObjectIrType): GraphLayerId => {
  if (objectType === 'text' || objectType === 'measurement') return 'overlay';
  return 'content';
};
