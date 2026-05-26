import {
  okResult,
  type GraphLayerId,
  type GraphOperationDiagnostic,
  type GraphOperationResult,
  type GraphViewportSize,
  type GraphWorldPoint3D
} from './contracts';

export const GRAPH_VIEWPORT_COORDINATE_MODEL_VERSION = 1;

export type GraphViewportCoordinateMode = '2d' | 'dual-layer-2_5d' | '3d';
export type GraphViewportWorldDimensions = '2d' | '3d';
export type GraphViewportDepthPolicy = 'flat' | 'ordered-layers' | 'camera-depth';
export type GraphViewportCoordinateDiagnosticCode =
  | 'viewport-coordinate.unsupported-mode'
  | 'viewport-coordinate.invalid-model';

export interface GraphViewportCoordinateDiagnostic extends GraphOperationDiagnostic {
  code: GraphViewportCoordinateDiagnosticCode;
  details?: Record<string, unknown>;
}

export interface GraphViewportCamera3D {
  position: GraphWorldPoint3D;
  target: GraphWorldPoint3D;
  up?: GraphWorldPoint3D;
  fieldOfViewDegrees?: number;
  near?: number;
  far?: number;
}

export interface GraphViewportCoordinateModelBase {
  version: typeof GRAPH_VIEWPORT_COORDINATE_MODEL_VERSION;
  viewportId: string;
  mode: GraphViewportCoordinateMode;
  size?: GraphViewportSize;
  layerIds: GraphLayerId[];
  worldDimensions: GraphViewportWorldDimensions;
  meta?: Record<string, unknown>;
}

export interface GraphViewportCoordinateModel2D extends GraphViewportCoordinateModelBase {
  mode: '2d';
  worldDimensions: '2d';
  depthPolicy: 'flat';
}

export interface GraphViewportCoordinateModelDualLayer25D extends GraphViewportCoordinateModelBase {
  mode: 'dual-layer-2_5d';
  worldDimensions: '2d';
  layerIds: [GraphLayerId, GraphLayerId];
  depthPolicy: 'ordered-layers';
}

export interface GraphViewportCoordinateModel3D extends GraphViewportCoordinateModelBase {
  mode: '3d';
  worldDimensions: '3d';
  depthPolicy: 'camera-depth';
  camera?: GraphViewportCamera3D;
}

export type GraphViewportCoordinateModel =
  | GraphViewportCoordinateModel2D
  | GraphViewportCoordinateModelDualLayer25D
  | GraphViewportCoordinateModel3D;

export interface CreateGraphViewportCoordinateModelInput {
  viewportId: string;
  mode: string;
  size?: GraphViewportSize;
  layerIds?: readonly GraphLayerId[];
  depthPolicy?: GraphViewportDepthPolicy;
  camera?: GraphViewportCamera3D;
  meta?: Record<string, unknown>;
}

const GRAPH_LAYER_IDS = new Set<GraphLayerId>(['background', 'content', 'overlay', 'interaction', 'ui', 'debug']);
const SUPPORTED_VIEWPORT_COORDINATE_MODES = new Set<string>(['2d', 'dual-layer-2_5d', '3d']);

export const createGraphViewportCoordinateModel = (
  input: CreateGraphViewportCoordinateModelInput
): GraphOperationResult<GraphViewportCoordinateModel> => {
  if (!SUPPORTED_VIEWPORT_COORDINATE_MODES.has(input.mode)) {
    return {
      ok: false,
      diagnostics: [unsupportedViewportCoordinateModeDiagnostic(input.viewportId, input.mode)]
    };
  }

  const commonError = validateCommonViewportCoordinateInput(input);
  if (commonError) return { ok: false, diagnostics: [commonError] };

  const layerIds = [...(input.layerIds ?? ['content'])];
  if (input.mode === 'dual-layer-2_5d') {
    if (layerIds.length !== 2 || layerIds[0] === layerIds[1] || input.depthPolicy === 'flat' || input.depthPolicy === 'camera-depth') {
      return {
        ok: false,
        diagnostics: [invalidViewportCoordinateModelDiagnostic(
          input.viewportId,
          'dual-layer-2_5d requires exactly two distinct ordered layers and the ordered-layers depth policy',
          'layerIds/depthPolicy'
        )]
      };
    }

    return okResult({
      version: GRAPH_VIEWPORT_COORDINATE_MODEL_VERSION,
      viewportId: input.viewportId,
      mode: 'dual-layer-2_5d',
      size: cloneViewportSize(input.size),
      layerIds: [layerIds[0], layerIds[1]],
      worldDimensions: '2d',
      depthPolicy: 'ordered-layers',
      meta: cloneMeta(input.meta)
    });
  }

  if (input.mode === '3d') {
    if (input.depthPolicy === 'flat' || input.depthPolicy === 'ordered-layers') {
      return {
        ok: false,
        diagnostics: [invalidViewportCoordinateModelDiagnostic(
          input.viewportId,
          '3d requires the camera-depth depth policy',
          'depthPolicy'
        )]
      };
    }
    if (input.camera !== undefined && !isGraphViewportCamera3D(input.camera)) {
      return {
        ok: false,
        diagnostics: [invalidViewportCoordinateModelDiagnostic(input.viewportId, 'valid 3D camera vectors', 'camera')]
      };
    }

    return okResult({
      version: GRAPH_VIEWPORT_COORDINATE_MODEL_VERSION,
      viewportId: input.viewportId,
      mode: '3d',
      size: cloneViewportSize(input.size),
      layerIds,
      worldDimensions: '3d',
      depthPolicy: 'camera-depth',
      camera: input.camera ? cloneCamera(input.camera) : undefined,
      meta: cloneMeta(input.meta)
    });
  }

  if (input.depthPolicy === 'ordered-layers' || input.depthPolicy === 'camera-depth') {
    return {
      ok: false,
      diagnostics: [invalidViewportCoordinateModelDiagnostic(
        input.viewportId,
        '2d requires the flat depth policy',
        'depthPolicy'
      )]
    };
  }

  return okResult({
    version: GRAPH_VIEWPORT_COORDINATE_MODEL_VERSION,
    viewportId: input.viewportId,
    mode: '2d',
    size: cloneViewportSize(input.size),
    layerIds,
    worldDimensions: '2d',
    depthPolicy: 'flat',
    meta: cloneMeta(input.meta)
  });
};

const validateCommonViewportCoordinateInput = (
  input: CreateGraphViewportCoordinateModelInput
): GraphViewportCoordinateDiagnostic | null => {
  if (!isNonEmptyString(input.viewportId)) {
    return invalidViewportCoordinateModelDiagnostic(input.viewportId, 'non-empty viewport id', 'viewportId');
  }
  if (input.size !== undefined && !isViewportSize(input.size)) {
    return invalidViewportCoordinateModelDiagnostic(input.viewportId, 'finite positive viewport size', 'size');
  }
  if (input.layerIds !== undefined && (!Array.isArray(input.layerIds) || input.layerIds.length === 0 || !input.layerIds.every(isGraphLayerId))) {
    return invalidViewportCoordinateModelDiagnostic(input.viewportId, 'one or more known graph layer ids', 'layerIds');
  }
  if (input.meta !== undefined && !isRecord(input.meta)) {
    return invalidViewportCoordinateModelDiagnostic(input.viewportId, 'record metadata', 'meta');
  }
  return null;
};

const unsupportedViewportCoordinateModeDiagnostic = (
  viewportId: string,
  mode: string
): GraphViewportCoordinateDiagnostic => ({
  code: 'viewport-coordinate.unsupported-mode',
  message: `Graph viewport coordinate mode "${mode}" is not part of the M1 core contract.`,
  severity: 'warning',
  target: { scope: 'viewport', viewportId },
  details: {
    mode,
    supportedModes: [...SUPPORTED_VIEWPORT_COORDINATE_MODES]
  }
});

const invalidViewportCoordinateModelDiagnostic = (
  viewportId: string,
  expected: string,
  path: string
): GraphViewportCoordinateDiagnostic => ({
  code: 'viewport-coordinate.invalid-model',
  message: `Graph viewport coordinate model field "${path}" must be ${expected}.`,
  severity: 'error',
  target: { scope: 'viewport', viewportId },
  details: {
    path,
    expected
  }
});

const isGraphLayerId = (value: unknown): value is GraphLayerId => (
  typeof value === 'string' && GRAPH_LAYER_IDS.has(value as GraphLayerId)
);

const isViewportSize = (value: unknown): value is GraphViewportSize => {
  const size = asRecord(value);
  return !!size && isFinitePositiveNumber(size.width) && isFinitePositiveNumber(size.height);
};

const isGraphViewportCamera3D = (value: unknown): value is GraphViewportCamera3D => {
  const camera = asRecord(value);
  return !!camera
    && isWorldPoint3D(camera.position)
    && isWorldPoint3D(camera.target)
    && (camera.up === undefined || isWorldPoint3D(camera.up))
    && isOptionalFinitePositiveNumber(camera.fieldOfViewDegrees)
    && isOptionalFinitePositiveNumber(camera.near)
    && isOptionalFinitePositiveNumber(camera.far);
};

const isWorldPoint3D = (value: unknown): value is GraphWorldPoint3D => {
  const point = asRecord(value);
  return !!point
    && point.dimension === '3d'
    && isFiniteNumber(point.x)
    && isFiniteNumber(point.y)
    && isFiniteNumber(point.z);
};

const isNonEmptyString = (value: unknown): value is string => (
  typeof value === 'string' && value.length > 0
);

const isRecord = (value: unknown): value is Record<string, unknown> => (
  typeof value === 'object' && value !== null && !Array.isArray(value)
);

const asRecord = (value: unknown): Record<string, unknown> | null => (
  isRecord(value) ? value : null
);

const isFiniteNumber = (value: unknown): value is number => (
  typeof value === 'number' && Number.isFinite(value)
);

const isFinitePositiveNumber = (value: unknown): value is number => (
  isFiniteNumber(value) && value > 0
);

const isOptionalFinitePositiveNumber = (value: unknown): boolean => (
  value === undefined || isFinitePositiveNumber(value)
);

const cloneViewportSize = (size: GraphViewportSize | undefined): GraphViewportSize | undefined => (
  size ? { width: size.width, height: size.height } : undefined
);

const cloneCamera = (camera: GraphViewportCamera3D): GraphViewportCamera3D => ({
  position: { ...camera.position },
  target: { ...camera.target },
  up: camera.up ? { ...camera.up } : undefined,
  fieldOfViewDegrees: camera.fieldOfViewDegrees,
  near: camera.near,
  far: camera.far
});

const cloneMeta = (meta: Record<string, unknown> | undefined): Record<string, unknown> | undefined => (
  meta ? { ...meta } : undefined
);
