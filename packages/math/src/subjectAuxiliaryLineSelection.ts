import type {
  SubjectAuxiliaryLineDescriptor,
  SubjectOverlayState,
  SubjectOverlayStyle
} from './subjectOverlays';

export type SubjectAuxiliaryLineSelectionMode = 'single' | 'multiple';

export type SubjectAuxiliaryLineSelectionStatus = 'idle' | 'hovered' | 'selected' | 'confirmed';

export interface SubjectAuxiliaryLineSelectionState {
  hoveredId?: string | null;
  selectedIds?: readonly string[];
  confirmedIds?: readonly string[];
}

export type SubjectAuxiliaryLineSelectionAction =
  | { kind: 'sync' }
  | { kind: 'hover'; lineId?: string | null }
  | { kind: 'clear-hover' }
  | { kind: 'select'; lineId: string }
  | { kind: 'deselect'; lineId: string }
  | { kind: 'toggle'; lineId: string }
  | { kind: 'replace-selection'; lineIds: readonly string[] }
  | { kind: 'clear-selection' }
  | { kind: 'confirm'; lineIds?: readonly string[] }
  | { kind: 'clear-confirmed' }
  | { kind: 'reset' };

export interface SubjectAuxiliaryLineSelectionOptions {
  mode?: SubjectAuxiliaryLineSelectionMode;
  maxSelected?: number;
  confirmMode?: 'append' | 'replace';
  clearSelectionOnConfirm?: boolean;
  allowConfirmedSelection?: boolean;
}

export interface SubjectAuxiliaryLineSelectionEntry {
  lineId: string;
  status: SubjectAuxiliaryLineSelectionStatus;
  hovered: boolean;
  selected: boolean;
  confirmed: boolean;
}

export interface SubjectAuxiliaryLineSelectionDiagnostic {
  code:
    | 'subject-auxiliary-selection.unknown-line'
    | 'subject-auxiliary-selection.not-selectable'
    | 'subject-auxiliary-selection.already-confirmed'
    | 'subject-auxiliary-selection.limit-reached'
    | 'subject-auxiliary-selection.duplicate-line-id'
    | 'subject-auxiliary-selection.no-selection';
  severity: 'info' | 'warning' | 'error';
  message: string;
  lineId?: string;
  data?: Record<string, unknown>;
}

export interface SubjectAuxiliaryLineSelectionModel {
  state: SubjectAuxiliaryLineSelectionState;
  lines: readonly SubjectAuxiliaryLineDescriptor[];
  entries: readonly SubjectAuxiliaryLineSelectionEntry[];
  hoveredId?: string | null;
  selectedIds: readonly string[];
  confirmedIds: readonly string[];
  hoveredLine?: SubjectAuxiliaryLineDescriptor;
  selectedLines: readonly SubjectAuxiliaryLineDescriptor[];
  confirmedLines: readonly SubjectAuxiliaryLineDescriptor[];
  diagnostics: readonly SubjectAuxiliaryLineSelectionDiagnostic[];
}

interface SubjectAuxiliaryLineSelectionContext {
  lineIndex: Map<string, SubjectAuxiliaryLineDescriptor>;
  diagnostics: SubjectAuxiliaryLineSelectionDiagnostic[];
}

interface NormalizedSelectionState {
  hoveredId: string | null;
  selectedIds: string[];
  confirmedIds: string[];
}

export const createSubjectAuxiliaryLineSelectionModel = (
  lines: readonly SubjectAuxiliaryLineDescriptor[],
  state: SubjectAuxiliaryLineSelectionState = {},
  options: SubjectAuxiliaryLineSelectionOptions = {}
): SubjectAuxiliaryLineSelectionModel => buildSelectionModel(lines, state, options, []);

export const applySubjectAuxiliaryLineSelection = (
  lines: readonly SubjectAuxiliaryLineDescriptor[],
  state: SubjectAuxiliaryLineSelectionState,
  action: SubjectAuxiliaryLineSelectionAction,
  options: SubjectAuxiliaryLineSelectionOptions = {}
): SubjectAuxiliaryLineSelectionModel => {
  const context = createSelectionContext(lines);
  const current = normalizeSelectionState(state, context, options);
  const next = reduceSelectionState(current, action, context, options);
  return buildSelectionModel(lines, next, options, context.diagnostics);
};

const buildSelectionModel = (
  lines: readonly SubjectAuxiliaryLineDescriptor[],
  state: SubjectAuxiliaryLineSelectionState,
  options: SubjectAuxiliaryLineSelectionOptions,
  baseDiagnostics: readonly SubjectAuxiliaryLineSelectionDiagnostic[]
): SubjectAuxiliaryLineSelectionModel => {
  const context = createSelectionContext(lines, baseDiagnostics);
  const normalized = normalizeSelectionState(state, context, options);
  const selected = new Set(normalized.selectedIds);
  const confirmed = new Set(normalized.confirmedIds);
  const decoratedLines = lines.map((line) => decorateLine(line, normalized.hoveredId, selected, confirmed));
  const decoratedIndex = new Map(decoratedLines.map((line) => [line.id, line]));
  const entries = decoratedLines.map((line) => createSelectionEntry(line.id, normalized.hoveredId, selected, confirmed));
  const hoveredLine = normalized.hoveredId ? decoratedIndex.get(normalized.hoveredId) : undefined;
  const selectedLines = normalized.selectedIds.flatMap((id) => {
    const line = decoratedIndex.get(id);
    return line ? [line] : [];
  });
  const confirmedLines = normalized.confirmedIds.flatMap((id) => {
    const line = decoratedIndex.get(id);
    return line ? [line] : [];
  });
  const modelState: SubjectAuxiliaryLineSelectionState = {
    hoveredId: normalized.hoveredId,
    selectedIds: normalized.selectedIds,
    confirmedIds: normalized.confirmedIds
  };

  return {
    state: modelState,
    lines: decoratedLines,
    entries,
    hoveredId: normalized.hoveredId,
    selectedIds: normalized.selectedIds,
    confirmedIds: normalized.confirmedIds,
    hoveredLine,
    selectedLines,
    confirmedLines,
    diagnostics: context.diagnostics
  };
};

const reduceSelectionState = (
  state: NormalizedSelectionState,
  action: SubjectAuxiliaryLineSelectionAction,
  context: SubjectAuxiliaryLineSelectionContext,
  options: SubjectAuxiliaryLineSelectionOptions
): NormalizedSelectionState => {
  if (action.kind === 'sync') return state;
  if (action.kind === 'reset') return { hoveredId: null, selectedIds: [], confirmedIds: [] };
  if (action.kind === 'clear-hover') return { ...state, hoveredId: null };
  if (action.kind === 'clear-selection') return { ...state, selectedIds: [] };
  if (action.kind === 'clear-confirmed') return { ...state, confirmedIds: [] };

  if (action.kind === 'hover') {
    const hoveredId = action.lineId ? readKnownLineId(action.lineId, context, { checkSelectable: true }) : null;
    return { ...state, hoveredId };
  }

  if (action.kind === 'deselect') {
    return { ...state, selectedIds: state.selectedIds.filter((id) => id !== action.lineId) };
  }

  if (action.kind === 'replace-selection') {
    const selectedIds = normalizeSelectableIds(action.lineIds, context, options, state.confirmedIds);
    return { ...state, selectedIds };
  }

  if (action.kind === 'confirm') {
    const sourceIds = action.lineIds ?? state.selectedIds;
    if (sourceIds.length === 0) {
      context.diagnostics.push({
        code: 'subject-auxiliary-selection.no-selection',
        severity: 'info',
        message: 'Confirming auxiliary lines requires at least one selected line.'
      });
      return state;
    }
    const confirmedIds = normalizeConfirmableIds(sourceIds, context);
    if (confirmedIds.length === 0) return state;
    const nextConfirmedIds = options.confirmMode === 'replace'
      ? confirmedIds
      : uniqueIds([...state.confirmedIds, ...confirmedIds]);
    return {
      hoveredId: state.hoveredId,
      selectedIds: options.clearSelectionOnConfirm === false ? state.selectedIds : [],
      confirmedIds: nextConfirmedIds
    };
  }

  const lineId = readKnownLineId(action.lineId, context, {
    checkSelectable: true,
    confirmedIds: state.confirmedIds,
    allowConfirmedSelection: options.allowConfirmedSelection === true
  });
  if (!lineId) return state;

  if (action.kind === 'select') {
    return { ...state, selectedIds: addSelectedId(state.selectedIds, lineId, context, options) };
  }

  const alreadySelected = state.selectedIds.includes(lineId);
  return {
    ...state,
    selectedIds: alreadySelected
      ? state.selectedIds.filter((id) => id !== lineId)
      : addSelectedId(state.selectedIds, lineId, context, options)
  };
};

const normalizeSelectionState = (
  state: SubjectAuxiliaryLineSelectionState,
  context: SubjectAuxiliaryLineSelectionContext,
  options: SubjectAuxiliaryLineSelectionOptions
): NormalizedSelectionState => {
  const confirmedIds = normalizeKnownIds(state.confirmedIds ?? [], context);
  const selectedIds = normalizeSelectableIds(state.selectedIds ?? [], context, options, confirmedIds);
  const hoveredId = state.hoveredId
    ? readKnownLineId(state.hoveredId, context, { checkSelectable: true })
    : null;
  return { hoveredId, selectedIds, confirmedIds };
};

const normalizeKnownIds = (
  lineIds: readonly string[],
  context: SubjectAuxiliaryLineSelectionContext
): string[] => {
  const normalized: string[] = [];
  for (const lineId of uniqueIds(lineIds)) {
    if (!context.lineIndex.has(lineId)) {
      pushUnknownLineDiagnostic(context, lineId);
      continue;
    }
    normalized.push(lineId);
  }
  return normalized;
};

const normalizeSelectableIds = (
  lineIds: readonly string[],
  context: SubjectAuxiliaryLineSelectionContext,
  options: SubjectAuxiliaryLineSelectionOptions,
  confirmedIds: readonly string[]
): string[] => {
  const normalized: string[] = [];
  for (const lineId of uniqueIds(lineIds)) {
    const selectedId = readKnownLineId(lineId, context, {
      checkSelectable: true,
      confirmedIds,
      allowConfirmedSelection: options.allowConfirmedSelection === true
    });
    if (!selectedId) continue;
    normalized.push(selectedId);
  }
  return capSelectedIds(normalized, context, options);
};

const normalizeConfirmableIds = (
  lineIds: readonly string[],
  context: SubjectAuxiliaryLineSelectionContext
): string[] => {
  const normalized: string[] = [];
  for (const lineId of uniqueIds(lineIds)) {
    const selectedId = readKnownLineId(lineId, context, { checkSelectable: true });
    if (selectedId) normalized.push(selectedId);
  }
  return normalized;
};

const addSelectedId = (
  selectedIds: readonly string[],
  lineId: string,
  context: SubjectAuxiliaryLineSelectionContext,
  options: SubjectAuxiliaryLineSelectionOptions
): string[] => {
  const maxSelected = readMaxSelected(options);
  if (maxSelected <= 0) {
    pushLimitDiagnostic(context, maxSelected);
    return [];
  }
  if (options.mode === 'single' || maxSelected === 1) return [lineId];
  if (selectedIds.includes(lineId)) return [...selectedIds];
  if (selectedIds.length >= maxSelected) {
    pushLimitDiagnostic(context, maxSelected);
    return [...selectedIds];
  }
  return [...selectedIds, lineId];
};

const capSelectedIds = (
  selectedIds: readonly string[],
  context: SubjectAuxiliaryLineSelectionContext,
  options: SubjectAuxiliaryLineSelectionOptions
): string[] => {
  const maxSelected = readMaxSelected(options);
  if (maxSelected <= 0) {
    if (selectedIds.length > 0) pushLimitDiagnostic(context, maxSelected);
    return [];
  }
  if (selectedIds.length <= maxSelected) return [...selectedIds];
  pushLimitDiagnostic(context, maxSelected);
  return selectedIds.slice(0, maxSelected);
};

const readMaxSelected = (options: SubjectAuxiliaryLineSelectionOptions): number => {
  if (options.mode === 'single') return 1;
  const configured = options.maxSelected ?? Number.POSITIVE_INFINITY;
  return Number.isFinite(configured) ? Math.max(0, Math.floor(configured)) : Number.POSITIVE_INFINITY;
};

const readKnownLineId = (
  lineId: string,
  context: SubjectAuxiliaryLineSelectionContext,
  options: {
    checkSelectable?: boolean;
    confirmedIds?: readonly string[];
    allowConfirmedSelection?: boolean;
  } = {}
): string | null => {
  const line = context.lineIndex.get(lineId);
  if (!line) {
    pushUnknownLineDiagnostic(context, lineId);
    return null;
  }
  if (options.checkSelectable && line.selectable === false) {
    context.diagnostics.push({
      code: 'subject-auxiliary-selection.not-selectable',
      severity: 'warning',
      message: `Auxiliary line ${lineId} is not selectable.`,
      lineId
    });
    return null;
  }
  if (options.confirmedIds?.includes(lineId) && !options.allowConfirmedSelection) {
    context.diagnostics.push({
      code: 'subject-auxiliary-selection.already-confirmed',
      severity: 'info',
      message: `Auxiliary line ${lineId} is already confirmed.`,
      lineId
    });
    return null;
  }
  return lineId;
};

const createSelectionContext = (
  lines: readonly SubjectAuxiliaryLineDescriptor[],
  baseDiagnostics: readonly SubjectAuxiliaryLineSelectionDiagnostic[] = []
): SubjectAuxiliaryLineSelectionContext => {
  const diagnostics = [...baseDiagnostics];
  const lineIndex = new Map<string, SubjectAuxiliaryLineDescriptor>();
  const duplicateIds = new Set<string>();
  for (const line of lines) {
    if (lineIndex.has(line.id)) {
      duplicateIds.add(line.id);
      continue;
    }
    lineIndex.set(line.id, line);
  }
  for (const lineId of duplicateIds) {
    diagnostics.push({
      code: 'subject-auxiliary-selection.duplicate-line-id',
      severity: 'warning',
      message: `Auxiliary line id ${lineId} appears more than once.`,
      lineId
    });
  }
  return { lineIndex, diagnostics };
};

const decorateLine = (
  line: SubjectAuxiliaryLineDescriptor,
  hoveredId: string | null,
  selected: ReadonlySet<string>,
  confirmed: ReadonlySet<string>
): SubjectAuxiliaryLineDescriptor => {
  const entry = createSelectionEntry(line.id, hoveredId, selected, confirmed);
  const active = entry.hovered || entry.selected || entry.confirmed;
  return {
    ...line,
    visible: active ? true : line.visible,
    state: readDecoratedOverlayState(line.state, entry),
    style: decorateLineStyle(line.style, entry),
    meta: {
      ...line.meta,
      auxiliaryLineSelection: entry
    }
  };
};

const createSelectionEntry = (
  lineId: string,
  hoveredId: string | null,
  selected: ReadonlySet<string>,
  confirmed: ReadonlySet<string>
): SubjectAuxiliaryLineSelectionEntry => {
  const hovered = hoveredId === lineId;
  const isSelected = selected.has(lineId);
  const isConfirmed = confirmed.has(lineId);
  return {
    lineId,
    status: readSelectionStatus(hovered, isSelected, isConfirmed),
    hovered,
    selected: isSelected,
    confirmed: isConfirmed
  };
};

const readSelectionStatus = (
  hovered: boolean,
  selected: boolean,
  confirmed: boolean
): SubjectAuxiliaryLineSelectionStatus => {
  if (selected) return 'selected';
  if (hovered) return 'hovered';
  if (confirmed) return 'confirmed';
  return 'idle';
};

const readDecoratedOverlayState = (
  state: SubjectOverlayState | undefined,
  entry: SubjectAuxiliaryLineSelectionEntry
): SubjectOverlayState | undefined => {
  if (entry.confirmed) return 'confirmed';
  if (entry.hovered || entry.selected) return 'preview';
  return state;
};

const decorateLineStyle = (
  style: SubjectOverlayStyle | undefined,
  entry: SubjectAuxiliaryLineSelectionEntry
): SubjectOverlayStyle | undefined => {
  const cloned = cloneStyle(style);
  if (!entry.hovered && !entry.selected) return cloned;
  return { ...cloned, emphasis: 'highlight' };
};

const cloneStyle = (style: SubjectOverlayStyle | undefined): SubjectOverlayStyle | undefined => (
  style ? { ...style, lineDash: style.lineDash ? [...style.lineDash] : undefined } : undefined
);

const uniqueIds = (lineIds: readonly string[]): string[] => {
  const seen = new Set<string>();
  const unique: string[] = [];
  for (const lineId of lineIds) {
    if (seen.has(lineId)) continue;
    seen.add(lineId);
    unique.push(lineId);
  }
  return unique;
};

const pushUnknownLineDiagnostic = (
  context: SubjectAuxiliaryLineSelectionContext,
  lineId: string
): void => {
  context.diagnostics.push({
    code: 'subject-auxiliary-selection.unknown-line',
    severity: 'warning',
    message: `Auxiliary line ${lineId} does not exist in the candidate set.`,
    lineId
  });
};

const pushLimitDiagnostic = (
  context: SubjectAuxiliaryLineSelectionContext,
  maxSelected: number
): void => {
  context.diagnostics.push({
    code: 'subject-auxiliary-selection.limit-reached',
    severity: 'info',
    message: `Auxiliary line selection is limited to ${maxSelected}.`,
    data: { maxSelected }
  });
};
