import {
  createSubjectOverlayModel,
  type SubjectOverlayComputationCache,
  type SubjectOverlayConfig,
  type SubjectOverlayDiagnostic,
  type SubjectOverlayModel,
  type SubjectOverlayRegistry
} from './subjectOverlays';
import {
  createSubjectShapeEditModel,
  type SubjectShapeEditDiagnostic,
  type SubjectShapeEditHandleDescriptor,
  type SubjectShapeEditModel,
  type SubjectShapeEditOperation,
  type SubjectShapeEditOptions,
  type SubjectShapeEditTarget
} from './subjectShapeEditing';

export interface SubjectShapeEditOverlayOptions {
  edit?: SubjectShapeEditOptions;
  overlay?: SubjectOverlayConfig;
  includeBeforeOverlay?: boolean;
  registry?: SubjectOverlayRegistry;
  cache?: SubjectOverlayComputationCache;
  meta?: Record<string, unknown>;
}

export interface SubjectShapeEditOverlayHandles {
  active?: SubjectShapeEditHandleDescriptor;
  before: readonly SubjectShapeEditHandleDescriptor[];
  after: readonly SubjectShapeEditHandleDescriptor[];
}

export interface SubjectShapeEditOverlayDiagnostics {
  edit: readonly SubjectShapeEditDiagnostic[];
  beforeOverlay?: readonly SubjectOverlayDiagnostic[];
  afterOverlay: readonly SubjectOverlayDiagnostic[];
}

export interface SubjectShapeEditOverlayModel<Target extends SubjectShapeEditTarget = SubjectShapeEditTarget> {
  targetId: string;
  edit: SubjectShapeEditModel<Target>;
  overlay: SubjectOverlayModel;
  afterOverlay: SubjectOverlayModel;
  beforeOverlay?: SubjectOverlayModel;
  handles: SubjectShapeEditOverlayHandles;
  diagnostics: SubjectShapeEditOverlayDiagnostics;
  meta?: Record<string, unknown>;
}

export const createSubjectShapeEditOverlayModel = <Target extends SubjectShapeEditTarget>(
  target: Target,
  operation: SubjectShapeEditOperation,
  options: SubjectShapeEditOverlayOptions = {}
): SubjectShapeEditOverlayModel<Target> => {
  const edit = createSubjectShapeEditModel(target, operation, options.edit);
  const overlayConfig = options.overlay ?? {};
  const afterOverlay = createSubjectOverlayModel(edit.after, overlayConfig, options.registry, options.cache);
  const beforeOverlay = options.includeBeforeOverlay
    ? createSubjectOverlayModel(edit.before, overlayConfig, options.registry, options.cache)
    : undefined;

  return {
    targetId: target.id,
    edit,
    overlay: afterOverlay,
    afterOverlay,
    beforeOverlay,
    handles: {
      active: edit.activeHandle,
      before: edit.beforeHandles,
      after: edit.afterHandles
    },
    diagnostics: {
      edit: edit.diagnostics,
      beforeOverlay: beforeOverlay?.diagnostics,
      afterOverlay: afterOverlay.diagnostics
    },
    meta: options.meta
  };
};
