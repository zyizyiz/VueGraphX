import {
  GRAPH_MATH_EPSILON,
  distance2D,
  type MathPoint2D
} from './geometry';
import {
  applySubjectAuxiliaryLineSelection,
  type SubjectAuxiliaryLineSelectionAction,
  type SubjectAuxiliaryLineSelectionDiagnostic,
  type SubjectAuxiliaryLineSelectionOptions,
  type SubjectAuxiliaryLineSelectionState
} from './subjectAuxiliaryLineSelection';
import {
  type SubjectAuxiliaryLineConstructionDiagnostic,
  type SubjectAuxiliaryLineConstructionOptions,
  type SubjectAuxiliaryLineRetentionRule
} from './subjectGeometryConstruction';
import {
  createDefaultSubjectOverlayRegistry,
  createFreeSubjectAuxiliaryLine,
  createSubjectAuxiliaryLineIntersectionAnnotations,
  createSubjectOverlayCache,
  createSubjectOverlayModel,
  type SubjectAuxiliaryLineDescriptor,
  type SubjectOverlayAnnotation,
  type SubjectOverlayComputationCache,
  type SubjectOverlayConfig,
  type SubjectOverlayModel,
  type SubjectOverlayRegistry,
  type SubjectOverlayShapeKind,
  type SubjectOverlayState,
  type SubjectOverlayStyle,
  type SubjectOverlayTarget,
  type SubjectFunctionOverlayTarget
} from './subjectOverlays';

export type SubjectAuxiliaryLineRole =
  | 'candidate'
  | 'preview'
  | 'confirmed'
  | 'reference'
  | 'draft';

export type SubjectAuxiliaryLineSource =
  | 'generated'
  | 'free-draw'
  | 'function-reference'
  | 'equation-reference'
  | 'business-provider';

export type SubjectAuxiliaryLineDiagnosticSource =
  | 'overlay'
  | 'construction'
  | 'selection'
  | 'interaction';

export interface SubjectAuxiliaryLineItem extends SubjectAuxiliaryLineDescriptor {
  role: SubjectAuxiliaryLineRole;
  source: SubjectAuxiliaryLineSource;
}

export interface SubjectAuxiliaryLineDraftState {
  start: MathPoint2D;
  current: MathPoint2D;
  source?: 'drag' | 'two-click' | 'programmatic';
}

export interface SubjectAuxiliaryLineFreeLineOverrides {
  label?: string;
  style?: SubjectOverlayStyle;
}

export interface SubjectAuxiliaryLineFreeLineState {
  id: string;
  start: MathPoint2D;
  end: MathPoint2D;
  draftStart?: MathPoint2D;
  draftEnd?: MathPoint2D;
  overrides?: SubjectAuxiliaryLineFreeLineOverrides;
}

export interface SubjectAuxiliaryLineState {
  selection?: SubjectAuxiliaryLineSelectionState;
  freeLines?: readonly SubjectAuxiliaryLineFreeLineState[];
  draft?: SubjectAuxiliaryLineDraftState | null;
  diagnostics?: readonly SubjectAuxiliaryLineDiagnostic[];
}

export interface SubjectAuxiliaryLineDiagnostic {
  code: string;
  severity: 'info' | 'warning' | 'error';
  message: string;
  source: SubjectAuxiliaryLineDiagnosticSource;
  targetId?: string;
  lineId?: string;
  data?: Record<string, unknown>;
}

export interface SubjectAuxiliaryLineModelOptions {
  config?: SubjectOverlayConfig;
  registry?: SubjectOverlayRegistry;
  cache?: SubjectAuxiliaryLineWorkflowCache;
  state?: SubjectAuxiliaryLineState;
  selection?: SubjectAuxiliaryLineSelectionOptions;
  freeDraw?: SubjectAuxiliaryLineFreeDrawOptions;
  includeIntersections?: boolean;
}

export type SubjectAuxiliaryLineBoundOptions = Omit<SubjectAuxiliaryLineModelOptions, 'state'>;

export interface SubjectAuxiliaryLineFreeDrawOptions {
  enabled?: boolean;
  minDistance?: number;
  allowSingleContact?: boolean;
  allowSingleIntersection?: boolean;
  retentionRule?: SubjectAuxiliaryLineRetentionRule;
  preserveDraftSpan?: boolean;
  snapDistance?: number;
  style?: SubjectOverlayStyle;
  label?: string;
}

export interface SubjectAuxiliaryLineWorkflowCache {
  overlay?: SubjectOverlayComputationCache;
}

export interface SubjectAuxiliaryLineModel {
  target: SubjectOverlayTarget;
  targetId: string;
  targetKind: SubjectOverlayTarget['kind'];
  shapeKind: string;
  version: string;
  state: SubjectAuxiliaryLineState;
  annotations: readonly SubjectOverlayAnnotation[];
  intersectionAnnotations: readonly SubjectOverlayAnnotation[];
  generatedLines: readonly SubjectAuxiliaryLineItem[];
  freeLines: readonly SubjectAuxiliaryLineItem[];
  draftLine: SubjectAuxiliaryLineItem | null;
  lines: readonly SubjectAuxiliaryLineItem[];
  selectedIds: readonly string[];
  confirmedIds: readonly string[];
  hoveredId: string | null;
  selectedLines: readonly SubjectAuxiliaryLineItem[];
  confirmedLines: readonly SubjectAuxiliaryLineItem[];
  diagnostics: readonly SubjectAuxiliaryLineDiagnostic[];
  providerIds: readonly string[];
  overlay: SubjectOverlayModel;
}

export interface SubjectAuxiliaryLineWorkflow {
  target: SubjectOverlayTarget;
  readonly options: SubjectAuxiliaryLineBoundOptions;
  readonly model: SubjectAuxiliaryLineModel;
  apply: (action: SubjectAuxiliaryLineAction, options?: SubjectAuxiliaryLineBoundOptions) => SubjectAuxiliaryLineModel;
}

export type SubjectAuxiliaryLineAction =
  | { kind: 'sync' }
  | { kind: 'hover-line'; lineId?: string | null }
  | { kind: 'clear-hover' }
  | { kind: 'select-line'; lineId: string }
  | { kind: 'deselect-line'; lineId: string }
  | { kind: 'toggle-line'; lineId: string }
  | { kind: 'replace-selection'; lineIds: readonly string[] }
  | { kind: 'confirm-selection'; lineIds?: readonly string[] }
  | { kind: 'clear-selection' }
  | { kind: 'clear-confirmed' }
  | { kind: 'reset-selection' }
  | { kind: 'begin-free-draw'; point: MathPoint2D; source?: SubjectAuxiliaryLineDraftState['source'] }
  | { kind: 'update-free-draw'; point: MathPoint2D }
  | { kind: 'commit-free-draw'; point?: MathPoint2D; id?: string; label?: string; style?: SubjectOverlayStyle }
  | { kind: 'cancel-free-draw' }
  | { kind: 'clear-diagnostics' }
  | { kind: 'add-free-line'; start: MathPoint2D; end: MathPoint2D; id?: string; label?: string; style?: SubjectOverlayStyle }
  | { kind: 'remove-free-line'; lineId: string };

export const createSubjectAuxiliaryLineModel = (
  target: SubjectOverlayTarget,
  options: SubjectAuxiliaryLineModelOptions = {}
): SubjectAuxiliaryLineModel => {
  const boundOptions = bindAuxiliaryOptions(options);
  const state = normalizeAuxiliaryState(options.state);
  const overlay = createSubjectOverlayModel(
    target,
    boundOptions.config ?? {},
    boundOptions.registry ?? createDefaultSubjectOverlayRegistry(),
    boundOptions.cache?.overlay
  );
  const diagnostics: SubjectAuxiliaryLineDiagnostic[] = overlay.diagnostics.map((diagnostic) => ({
    ...diagnostic,
    source: 'overlay'
  }));
  diagnostics.push(...(state.diagnostics ?? []));
  const generatedLines = overlay.auxiliaryLines.map((line) => decorateLine(line, inferLineSource(target, line), inferLineRole(target, line)));
  const freeLines = state.freeLines.flatMap((line) => {
    const descriptor = createStoredFreeLine(target, line, boundOptions);
    return descriptor ? [decorateLine(descriptor, 'free-draw', inferLineRole(target, descriptor))] : [];
  });
  const draftLine = createDraftLine(target, state.draft, boundOptions.freeDraw, boundOptions.config, diagnostics);
  const baseLines = [...generatedLines, ...freeLines, ...(draftLine ? [draftLine] : [])];
  const selection = applySubjectAuxiliaryLineSelection(
    baseLines,
    state.selection ?? {},
    { kind: 'sync' },
    boundOptions.selection
  );
  diagnostics.push(...selection.diagnostics.map(mapSelectionDiagnostic));
  const lineIndex = new Map(baseLines.map((line) => [line.id, line]));
  const selectedIds = selection.selectedIds;
  const confirmedIds = selection.confirmedIds;
  const lines = selection.lines.map((line) => {
    const decorated = lineIndex.get(line.id);
    return decorateLine(line, decorated?.source ?? inferLineSource(target, line), inferLineRole(target, line));
  });
  const decoratedIndex = new Map(lines.map((line) => [line.id, line]));
  const selectedLines = selectedIds.flatMap((lineId) => {
    const line = decoratedIndex.get(lineId);
    return line ? [line] : [];
  });
  const confirmedLines = confirmedIds.flatMap((lineId) => {
    const line = decoratedIndex.get(lineId);
    return line ? [line] : [];
  });
  const intersectionAnnotations = boundOptions.includeIntersections === false || isFunctionTarget(target)
    ? []
    : createSubjectAuxiliaryLineIntersectionAnnotations(target, uniqueLines(lines.filter(isConfirmedIntersectionLine)), boundOptions.config ?? {});

  const model: SubjectAuxiliaryLineModel = {
    target,
    targetId: overlay.targetId,
    targetKind: overlay.targetKind,
    shapeKind: overlay.shapeKind,
    version: overlay.version,
    state: {
      selection: selection.state,
      freeLines: state.freeLines.map(cloneFreeLineState),
      draft: state.draft ? cloneDraftState(state.draft) : null,
      diagnostics: state.diagnostics ? [...state.diagnostics] : []
    },
    annotations: overlay.annotations,
    intersectionAnnotations,
    generatedLines,
    freeLines,
    draftLine,
    lines,
    selectedIds,
    confirmedIds,
    hoveredId: selection.hoveredId ?? null,
    selectedLines,
    confirmedLines,
    diagnostics,
    providerIds: overlay.providerIds,
    overlay
  };
  return model;
};

export const createSubjectAuxiliaryLineWorkflow = (
  target: SubjectOverlayTarget,
  options: SubjectAuxiliaryLineModelOptions = {}
): SubjectAuxiliaryLineWorkflow => {
  let boundOptions = ensureOverlayCache(bindAuxiliaryOptions(options));
  let model = createSubjectAuxiliaryLineModel(target, { ...boundOptions, state: options.state });
  return {
    target,
    get options() {
      return boundOptions;
    },
    get model() {
      return model;
    },
    apply(action, actionOptions = {}) {
      boundOptions = ensureOverlayCache(bindAuxiliaryOptions({ ...boundOptions, ...actionOptions }));
      model = applySubjectAuxiliaryLineAction(target, model.state, action, boundOptions);
      return model;
    }
  };
};

export const applySubjectAuxiliaryLineAction = (
  target: SubjectOverlayTarget,
  state: SubjectAuxiliaryLineState,
  action: SubjectAuxiliaryLineAction,
  options: SubjectAuxiliaryLineBoundOptions = {}
): SubjectAuxiliaryLineModel => {
  const boundOptions = ensureOverlayCache(bindAuxiliaryOptions(options));
  return createSubjectAuxiliaryLineModel(target, {
    ...boundOptions,
    state: reduceAuxiliaryState(target, normalizeAuxiliaryState(state), action, boundOptions)
  });
};

const reduceAuxiliaryState = (
  target: SubjectOverlayTarget,
  state: Required<Pick<SubjectAuxiliaryLineState, 'freeLines'>> & SubjectAuxiliaryLineState,
  action: SubjectAuxiliaryLineAction,
  options: SubjectAuxiliaryLineBoundOptions
): SubjectAuxiliaryLineState => {
  if (action.kind === 'sync') return state;
  if (action.kind === 'begin-free-draw') {
    return {
      ...state,
      draft: { start: clonePoint(action.point), current: clonePoint(action.point), source: action.source ?? 'programmatic' }
    };
  }
  if (action.kind === 'update-free-draw') {
    if (!state.draft) return state;
    return { ...state, draft: { ...state.draft, current: clonePoint(action.point) } };
  }
  if (action.kind === 'cancel-free-draw') return { ...state, draft: null };
  if (action.kind === 'clear-diagnostics') return { ...state, diagnostics: [] };
  if (action.kind === 'commit-free-draw') {
    if (!state.draft) return state;
    const end = action.point ?? state.draft.current;
    const explicit = {
      label: action.label,
      style: action.style
    };
    const line = createFreeLine(target, state.draft.start, end, {
      ...options.freeDraw,
      id: action.id,
      label: action.label ?? options.freeDraw?.label,
      style: action.style ?? options.freeDraw?.style
    }, options.config);
    return {
      ...state,
      draft: null,
      freeLines: line ? upsertLine(state.freeLines, createFreeLineState(line, explicit, state.draft.start, end)) : state.freeLines,
      diagnostics: line ? state.diagnostics : appendDiagnostic(state.diagnostics, createFreeDrawFailureDiagnostic(target.id, 'commit'))
    };
  }
  if (action.kind === 'add-free-line') {
    const explicit = {
      label: action.label,
      style: action.style
    };
    const line = createFreeLine(target, action.start, action.end, {
      ...options.freeDraw,
      id: action.id,
      label: action.label ?? options.freeDraw?.label,
      style: action.style ?? options.freeDraw?.style
    }, options.config);
    return line
      ? { ...state, freeLines: upsertLine(state.freeLines, createFreeLineState(line, explicit, action.start, action.end)) }
      : { ...state, diagnostics: appendDiagnostic(state.diagnostics, createFreeDrawFailureDiagnostic(target.id, 'add')) };
  }
  if (action.kind === 'remove-free-line') {
    return {
      ...state,
      freeLines: state.freeLines.filter((line) => line.id !== action.lineId),
      selection: removeLineFromSelection(state.selection ?? {}, action.lineId)
    };
  }

  const selectionAction = mapSelectionAction(action);
  if (selectionAction.kind === 'sync') return state;
  return {
    ...state,
    ...reduceSelectionState(target, state, selectionAction, options)
  };
};

const reduceSelectionState = (
  target: SubjectOverlayTarget,
  state: Required<Pick<SubjectAuxiliaryLineState, 'freeLines'>> & SubjectAuxiliaryLineState,
  action: SubjectAuxiliaryLineSelectionAction,
  options: SubjectAuxiliaryLineBoundOptions
): Pick<SubjectAuxiliaryLineState, 'selection' | 'diagnostics'> => {
  const selection = applySubjectAuxiliaryLineSelection(
    createSelectionLines(target, state, options),
    state.selection ?? {},
    action,
    options.selection
  );
  return {
    selection: selection.state,
    diagnostics: selection.diagnostics.length > 0
      ? appendDiagnostics(state.diagnostics, selection.diagnostics.map(mapSelectionDiagnostic))
      : state.diagnostics
  };
};

const mapSelectionAction = (action: SubjectAuxiliaryLineAction): SubjectAuxiliaryLineSelectionAction => {
  if (action.kind === 'hover-line') return { kind: 'hover', lineId: action.lineId };
  if (action.kind === 'clear-hover') return { kind: 'clear-hover' };
  if (action.kind === 'select-line') return { kind: 'select', lineId: action.lineId };
  if (action.kind === 'deselect-line') return { kind: 'deselect', lineId: action.lineId };
  if (action.kind === 'toggle-line') return { kind: 'toggle', lineId: action.lineId };
  if (action.kind === 'replace-selection') return { kind: 'replace-selection', lineIds: action.lineIds };
  if (action.kind === 'confirm-selection') return { kind: 'confirm', lineIds: action.lineIds };
  if (action.kind === 'clear-selection') return { kind: 'clear-selection' };
  if (action.kind === 'clear-confirmed') return { kind: 'clear-confirmed' };
  if (action.kind === 'reset-selection') return { kind: 'reset' };
  return { kind: 'sync' };
};

const createDraftLine = (
  target: SubjectOverlayTarget,
  draft: SubjectAuxiliaryLineDraftState | null | undefined,
  options: SubjectAuxiliaryLineFreeDrawOptions | undefined,
  config: SubjectOverlayConfig | undefined,
  diagnostics: SubjectAuxiliaryLineDiagnostic[]
): SubjectAuxiliaryLineItem | null => {
  if (!draft) return null;
  if (options?.enabled === false || isFunctionTarget(target) || !freeAuxiliaryLineEnabled(target, config)) return null;
  if (distance2D(draft.start, draft.current) <= (options?.minDistance ?? GRAPH_MATH_EPSILON)) {
    return decorateLine({
      id: `${target.id}:free-draft`,
      kind: 'free',
      label: options?.label ?? '自由辅助线',
      start: clonePoint(draft.start),
      end: clonePoint(draft.current),
      targetId: target.id,
      visible: true,
      state: 'preview',
      selectable: false,
      style: options?.style,
      meta: { freeDraw: true, draft: true, tooShort: true }
    }, 'free-draw', 'draft');
  }
  const line = createFreeLine(target, draft.start, draft.current, {
    ...options,
    id: `${target.id}:free-draft`,
    label: options?.label,
    state: 'preview'
  }, config);
  if (!line) {
    diagnostics.push({
      code: 'subject-auxiliary-line.no-draft-candidate',
      severity: 'warning',
      message: 'Free-draw draft does not produce an auxiliary-line candidate.',
      source: 'interaction',
      targetId: target.id
    });
    return null;
  }
  return decorateLine({ ...line, id: `${target.id}:free-draft`, state: 'preview', selectable: false }, 'free-draw', 'draft');
};

const createFreeLine = (
  target: SubjectOverlayTarget,
  start: MathPoint2D,
  end: MathPoint2D,
  options: SubjectAuxiliaryLineFreeDrawOptions & Pick<SubjectAuxiliaryLineConstructionOptions, 'id' | 'label' | 'style' | 'state' | 'selectable'> = {},
  config?: SubjectOverlayConfig
): SubjectAuxiliaryLineDescriptor | null => {
  if (options.enabled === false || isFunctionTarget(target)) return null;
  if (distance2D(start, end) <= (options.minDistance ?? GRAPH_MATH_EPSILON)) return null;
  return createFreeSubjectAuxiliaryLine(target, start, end, {
    id: options.id,
    label: options.label,
    style: options.style,
    state: options.state,
    selectable: options.selectable,
    allowSingleContact: options.allowSingleContact,
    allowSingleIntersection: options.allowSingleIntersection,
    retentionRule: options.retentionRule,
    preserveDraftSpan: options.preserveDraftSpan,
    snapDistance: options.snapDistance,
    config
  });
};

const createStoredFreeLine = (
  target: SubjectOverlayTarget,
  line: SubjectAuxiliaryLineFreeLineState,
  options: SubjectAuxiliaryLineBoundOptions
): SubjectAuxiliaryLineDescriptor | null => createFreeLine(target, line.draftStart ?? line.start, line.draftEnd ?? line.end, {
  ...options.freeDraw,
  id: line.id,
  label: line.overrides?.label ?? options.freeDraw?.label,
  style: line.overrides?.style ?? options.freeDraw?.style
}, options.config);

const createFreeLineState = (
  line: SubjectAuxiliaryLineDescriptor,
  explicit: SubjectAuxiliaryLineFreeLineOverrides = {},
  draftStart?: MathPoint2D,
  draftEnd?: MathPoint2D
): SubjectAuxiliaryLineFreeLineState => {
  const state: SubjectAuxiliaryLineFreeLineState = {
    id: line.id,
    start: clonePoint(line.start),
    end: clonePoint(line.end)
  };
  if (draftStart) state.draftStart = clonePoint(draftStart);
  if (draftEnd) state.draftEnd = clonePoint(draftEnd);
  const overrides = cloneFreeLineOverrides(explicit);
  if (overrides) state.overrides = overrides;
  return state;
};

const createSelectionLines = (
  target: SubjectOverlayTarget,
  state: Required<Pick<SubjectAuxiliaryLineState, 'freeLines'>> & SubjectAuxiliaryLineState,
  options: SubjectAuxiliaryLineBoundOptions
): readonly SubjectAuxiliaryLineDescriptor[] => {
  const overlay = createSubjectOverlayModel(
    target,
    options.config ?? {},
    options.registry ?? createDefaultSubjectOverlayRegistry(),
    options.cache?.overlay
  );
  const generatedLines = overlay.auxiliaryLines.map((line) => decorateLine(line, inferLineSource(target, line), inferLineRole(target, line)));
  const freeLines = state.freeLines.flatMap((line) => {
    const descriptor = createStoredFreeLine(target, line, options);
    return descriptor ? [decorateLine(descriptor, 'free-draw', inferLineRole(target, descriptor))] : [];
  });
  const draftDiagnostics: SubjectAuxiliaryLineDiagnostic[] = [];
  const draftLine = createDraftLine(target, state.draft, options.freeDraw, options.config, draftDiagnostics);
  return [...generatedLines, ...freeLines, ...(draftLine ? [draftLine] : [])];
};

const removeLineFromSelection = (
  state: SubjectAuxiliaryLineSelectionState,
  lineId: string
): SubjectAuxiliaryLineSelectionState => ({
  ...state,
  hoveredId: state.hoveredId === lineId ? null : state.hoveredId,
  selectedIds: (state.selectedIds ?? []).filter((id) => id !== lineId),
  confirmedIds: (state.confirmedIds ?? []).filter((id) => id !== lineId)
});

const decorateLine = (
  line: SubjectAuxiliaryLineDescriptor,
  source: SubjectAuxiliaryLineSource,
  role: SubjectAuxiliaryLineRole
): SubjectAuxiliaryLineItem => ({
  ...line,
  role,
  source,
  meta: {
    ...line.meta,
    auxiliaryLineRole: role,
    auxiliaryLineSource: source
  }
});

const inferLineSource = (target: SubjectOverlayTarget, line: SubjectAuxiliaryLineDescriptor): SubjectAuxiliaryLineSource => {
  if (line.meta?.freeDraw) return 'free-draw';
  if (line.sourceProviderId && !line.sourceProviderId.startsWith('builtin.')) return 'business-provider';
  if (target.kind === 'function') return 'function-reference';
  if (target.kind === 'equation') return 'equation-reference';
  return 'generated';
};

const inferLineRole = (target: SubjectOverlayTarget, line: SubjectAuxiliaryLineDescriptor): SubjectAuxiliaryLineRole => {
  if (line.meta?.draft) return 'draft';
  if (line.state === 'preview') return 'preview';
  if ((target.kind === 'function' || target.kind === 'equation') && line.kind !== 'free') return 'reference';
  return mapOverlayStateToRole(line.state);
};

const mapOverlayStateToRole = (state?: SubjectOverlayState): SubjectAuxiliaryLineRole => {
  if (state === 'preview') return 'preview';
  if (state === 'confirmed') return 'confirmed';
  return 'candidate';
};

const isConfirmedIntersectionLine = (line: SubjectAuxiliaryLineItem): boolean => (
  line.role === 'confirmed'
);

const mapSelectionDiagnostic = (diagnostic: SubjectAuxiliaryLineSelectionDiagnostic): SubjectAuxiliaryLineDiagnostic => ({
  code: diagnostic.code,
  severity: diagnostic.severity,
  message: diagnostic.message,
  source: 'selection',
  lineId: diagnostic.lineId,
  data: diagnostic.data
});

export const mapAuxiliaryConstructionDiagnostic = (
  diagnostic: SubjectAuxiliaryLineConstructionDiagnostic
): SubjectAuxiliaryLineDiagnostic => ({
  code: diagnostic.code,
  severity: diagnostic.severity,
  message: diagnostic.message,
  source: 'construction',
  targetId: diagnostic.targetId,
  data: diagnostic.data
});

const normalizeAuxiliaryState = (
  state: SubjectAuxiliaryLineState | undefined
): Required<Pick<SubjectAuxiliaryLineState, 'freeLines'>> & SubjectAuxiliaryLineState => ({
  selection: state?.selection,
  freeLines: state?.freeLines ? state.freeLines.map(normalizeFreeLineState) : [],
  draft: state?.draft ? cloneDraftState(state.draft) : null,
  diagnostics: state?.diagnostics ? [...state.diagnostics] : []
});

const isFunctionTarget = (target: SubjectOverlayTarget): target is SubjectFunctionOverlayTarget => (
  target.kind === 'function' || target.kind === 'equation'
);

const freeAuxiliaryLineEnabled = (
  target: SubjectOverlayTarget,
  config: SubjectOverlayConfig | undefined
): boolean => {
  const shapeKind = inferAuxiliaryLineShapeKind(target);
  const global = config?.auxiliaryLines;
  const shapeRule = config?.shapes?.[shapeKind];
  const shape = shapeRule?.auxiliaryLines;
  const enabled = shape?.enabled ?? global?.enabled;
  if (enabled === false) return false;
  const allowFreeDraw = shape?.allowFreeDraw ?? shapeRule?.allowFreeDraw ?? global?.allowFreeDraw;
  if (allowFreeDraw === false) return false;
  const includeKinds = shape?.includeKinds ?? global?.includeKinds;
  if (includeKinds && !includeKinds.includes('free')) return false;
  const excludeKinds = shape?.excludeKinds ?? global?.excludeKinds;
  return !excludeKinds?.includes('free');
};

const inferAuxiliaryLineShapeKind = (target: SubjectOverlayTarget): SubjectOverlayShapeKind => {
  if (target.shapeKind) return target.shapeKind;
  if (target.kind === 'polygon') {
    if (target.vertices.length === 3) return 'triangle';
    if (target.vertices.length === 4) return 'quadrilateral';
    return 'polygon';
  }
  return target.kind;
};

const normalizeFreeLineState = (
  line: SubjectAuxiliaryLineFreeLineState
): SubjectAuxiliaryLineFreeLineState => {
  const normalized: SubjectAuxiliaryLineFreeLineState = {
    id: line.id,
    start: clonePoint(line.start),
    end: clonePoint(line.end)
  };
  if (line.draftStart) normalized.draftStart = clonePoint(line.draftStart);
  if (line.draftEnd) normalized.draftEnd = clonePoint(line.draftEnd);
  const overrides = cloneFreeLineOverrides(line.overrides);
  if (overrides) normalized.overrides = overrides;
  return normalized;
};

const cloneFreeLineState = (line: SubjectAuxiliaryLineFreeLineState): SubjectAuxiliaryLineFreeLineState => normalizeFreeLineState(line);

const stripDecoratedLine = (line: SubjectAuxiliaryLineItem): SubjectAuxiliaryLineDescriptor => {
  const { role: _role, source: _source, ...descriptor } = line;
  return stripWorkflowLineMetadata(descriptor);
};

const stripWorkflowLineMetadata = (line: SubjectAuxiliaryLineDescriptor): SubjectAuxiliaryLineDescriptor => {
  const { meta, ...descriptor } = line;
  const strippedMeta = stripAuxiliaryWorkflowMeta(meta);
  return strippedMeta ? { ...descriptor, meta: strippedMeta } : descriptor;
};

const stripAuxiliaryWorkflowMeta = (
  meta: Record<string, unknown> | undefined
): Record<string, unknown> | undefined => {
  if (!meta) return undefined;
  const {
    auxiliaryLineRole: _role,
    auxiliaryLineSource: _source,
    auxiliaryLineSelection: _selection,
    ...rest
  } = meta;
  return Object.keys(rest).length > 0 ? rest : undefined;
};

const upsertLine = (
  lines: readonly SubjectAuxiliaryLineFreeLineState[],
  line: SubjectAuxiliaryLineFreeLineState
): SubjectAuxiliaryLineFreeLineState[] => [
  ...lines.filter((candidate) => candidate.id !== line.id),
  line
];

const uniqueLines = (lines: readonly SubjectAuxiliaryLineItem[]): SubjectAuxiliaryLineDescriptor[] => {
  const seen = new Set<string>();
  const unique: SubjectAuxiliaryLineDescriptor[] = [];
  for (const line of lines) {
    if (seen.has(line.id)) continue;
    seen.add(line.id);
    unique.push(stripDecoratedLine(line));
  }
  return unique;
};

const bindAuxiliaryOptions = (options: SubjectAuxiliaryLineModelOptions = {}): SubjectAuxiliaryLineBoundOptions => ({
  config: options.config,
  registry: options.registry,
  cache: options.cache,
  selection: options.selection,
  freeDraw: options.freeDraw,
  includeIntersections: options.includeIntersections
});

const ensureOverlayCache = (options: SubjectAuxiliaryLineBoundOptions): SubjectAuxiliaryLineBoundOptions => (
  options.cache?.overlay
    ? options
    : { ...options, cache: { ...options.cache, overlay: createSubjectOverlayCache() } }
);

const cloneFreeLineOverrides = (
  overrides: SubjectAuxiliaryLineFreeLineOverrides | undefined
): SubjectAuxiliaryLineFreeLineOverrides | undefined => {
  if (!overrides) return undefined;
  const cloned: SubjectAuxiliaryLineFreeLineOverrides = {};
  if (overrides.label !== undefined) cloned.label = overrides.label;
  if (overrides.style) cloned.style = cloneStyle(overrides.style);
  return Object.keys(cloned).length > 0 ? cloned : undefined;
};

const cloneDraftState = (draft: SubjectAuxiliaryLineDraftState): SubjectAuxiliaryLineDraftState => ({
  start: clonePoint(draft.start),
  current: clonePoint(draft.current),
  source: draft.source
});

const clonePoint = (point: MathPoint2D): MathPoint2D => ({ x: point.x, y: point.y });

const cloneStyle = (style: SubjectOverlayStyle): SubjectOverlayStyle => ({
  ...style,
  lineDash: style.lineDash ? [...style.lineDash] : undefined
});

const appendDiagnostic = (
  diagnostics: readonly SubjectAuxiliaryLineDiagnostic[] | undefined,
  diagnostic: SubjectAuxiliaryLineDiagnostic
): SubjectAuxiliaryLineDiagnostic[] => [...(diagnostics ?? []), diagnostic];

const appendDiagnostics = (
  diagnostics: readonly SubjectAuxiliaryLineDiagnostic[] | undefined,
  nextDiagnostics: readonly SubjectAuxiliaryLineDiagnostic[]
): SubjectAuxiliaryLineDiagnostic[] => [...(diagnostics ?? []), ...nextDiagnostics];

const createFreeDrawFailureDiagnostic = (
  targetId: string,
  phase: 'add' | 'commit'
): SubjectAuxiliaryLineDiagnostic => ({
  code: 'subject-auxiliary-line.free-draw-rejected',
  severity: 'warning',
  message: 'Free-draw auxiliary line did not produce a valid helper line.',
  source: 'interaction',
  targetId,
  data: { phase }
});
