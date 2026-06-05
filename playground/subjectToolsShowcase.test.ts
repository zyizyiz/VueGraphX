import { describe, expect, it } from 'vitest';
import {
  SUBJECT_OVERLAY_DEFAULT_ANNOTATION_COLORS,
  SUBJECT_OVERLAY_DEFAULT_DASH_STROKE_COLOR,
  SUBJECT_OVERLAY_DASH_PATTERN,
  SUBJECT_OVERLAY_DASH_STROKE_WIDTH
} from '@vuegraphx/math';
import { getSubjectToolsBackendStatusRows, subjectToolsRepresentativeDemos } from './subjectToolsShowcase';

describe('subject tools representative playground demos', () => {
  it('lists one representative demo per required subject-tools category', () => {
    expect(subjectToolsRepresentativeDemos.map((demo) => demo.category)).toEqual([
      'canvas-coordinate-system',
      'parameter',
      'manage-function',
      'domain-piecewise',
      'equation',
      'annotation',
      'geometry-overlay',
      'geometry-transform',
      'geometry-editing',
      'geometry-construction',
      'dynamic-point',
      'backend-status'
    ]);
    expect(subjectToolsRepresentativeDemos.every((demo) => demo.commands.length > 0 && demo.modelSummary.length > 0)).toBe(true);
    const geometryOverlay = subjectToolsRepresentativeDemos.find((demo) => demo.category === 'geometry-overlay');
    expect(geometryOverlay?.modelSummary).toContain('visible auxiliary');
    expect(geometryOverlay?.commands.some((command) => (typeof command === 'string' ? command : command.expr).includes('tri_aux'))).toBe(true);

    const geometryTransform = subjectToolsRepresentativeDemos.find((demo) => demo.category === 'geometry-transform');
    expect(geometryTransform?.modelSummary).toContain('previewArcs');
    expect(geometryTransform?.commands.some((command) => (typeof command === 'string' ? command : command.expr).includes('transform_preview'))).toBe(true);
    expect(geometryTransform?.commands.some((command) => (typeof command === 'string' ? command : command.expr).includes('Arc('))).toBe(true);

    const geometryEditing = subjectToolsRepresentativeDemos.find((demo) => demo.category === 'geometry-editing');
    expect(geometryEditing?.modelSummary).toContain('handles=');
    expect(geometryEditing?.commands.some((command) => (typeof command === 'string' ? command : command.expr).includes('edit_path'))).toBe(true);

    const geometryConstruction = subjectToolsRepresentativeDemos.find((demo) => demo.category === 'geometry-construction');
    expect(geometryConstruction?.modelSummary).toContain('contacts=');
    expect(geometryConstruction?.commands.some((command) => (typeof command === 'string' ? command : command.expr).includes('construct_candidate'))).toBe(true);
  });

  it('documents active backends and deferred placeholder backend degradation', () => {
    const rows = getSubjectToolsBackendStatusRows();
    expect(rows.filter((row) => row.active).map((row) => row.backendId)).toEqual(['jsxgraph', 'canvas2d']);
    expect(rows.find((row) => row.backendId === 'babylon')?.active).toBe(false);
    expect(rows.find((row) => row.backendId === 'babylon')?.reason).toContain('native 3D');
    expect(rows.filter((row) => !row.active).map((row) => row.backendId)).toEqual(['babylon', 'pixi', 'konva', 'three', 'fabric']);
    expect(rows.filter((row) => !row.active).every((row) => Object.values(row.categories).every((status) => status === 'unsupported'))).toBe(true);
  });

  it('uses core annotation defaults and standard auxiliary-line style in the function annotation demo', () => {
    const annotationDemo = subjectToolsRepresentativeDemos.find((demo) => demo.category === 'annotation');
    expect(annotationDemo).toBeDefined();
    const commands = annotationDemo!.commands.filter((command): command is { expr: string; options?: Record<string, unknown> } => typeof command !== 'string');

    const symmetryAxis = commands.find((command) => command.expr.startsWith('q_aux_1 = Segment'));
    expect(symmetryAxis?.options).toMatchObject({
      strokeColor: SUBJECT_OVERLAY_DEFAULT_DASH_STROKE_COLOR,
      strokeWidth: SUBJECT_OVERLAY_DASH_STROKE_WIDTH,
      selectionStrokeScale: false,
      lineDash: SUBJECT_OVERLAY_DASH_PATTERN
    });

    const vertex = commands.find((command) => command.expr.includes('"顶点:'));
    const intercept = commands.find((command) => command.expr.includes('"x 轴交点:'));
    expect(vertex?.options?.strokeColor).toBe(SUBJECT_OVERLAY_DEFAULT_ANNOTATION_COLORS.vertex);
    expect(intercept?.options?.strokeColor).toBe(SUBJECT_OVERLAY_DEFAULT_ANNOTATION_COLORS.intercept);
  });
});
