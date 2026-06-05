import type {
  SubjectAuxiliaryLineKind,
  SubjectOverlayStyle
} from './subjectOverlays';

export const SUBJECT_OVERLAY_DASH_PATTERN = [4, 8] as const;
export const SUBJECT_OVERLAY_DASH_STROKE_WIDTH = 1;
export const SUBJECT_OVERLAY_DEFAULT_DASH_STROKE_COLOR = 'rgba(102, 102, 102, 1)';

export interface SubjectAuxiliaryLineStyleOptions {
  kind?: SubjectAuxiliaryLineKind;
  targetStrokeColor?: string;
  style?: SubjectOverlayStyle;
}

export const createSubjectAuxiliaryLineStyle = (
  options: SubjectAuxiliaryLineStyleOptions = {}
): SubjectOverlayStyle => {
  const base: SubjectOverlayStyle = {
    strokeColor: SUBJECT_OVERLAY_DEFAULT_DASH_STROKE_COLOR,
    textColor: SUBJECT_OVERLAY_DEFAULT_DASH_STROKE_COLOR,
    lineDash: SUBJECT_OVERLAY_DASH_PATTERN,
    strokeWidth: SUBJECT_OVERLAY_DASH_STROKE_WIDTH,
    selectionStrokeScale: false
  };
  if (!options.style) return base;
  return {
    ...base,
    ...options.style,
    lineDash: options.style.lineDash ? [...options.style.lineDash] : base.lineDash
  };
};
