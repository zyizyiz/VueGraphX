import { describe, expect, it } from 'vitest';
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
      'dynamic-point',
      'backend-status'
    ]);
    expect(subjectToolsRepresentativeDemos.every((demo) => demo.commands.length > 0 && demo.modelSummary.length > 0)).toBe(true);
    const geometryOverlay = subjectToolsRepresentativeDemos.find((demo) => demo.category === 'geometry-overlay');
    expect(geometryOverlay?.modelSummary).toContain('visible auxiliary');
    expect(geometryOverlay?.commands.some((command) => (typeof command === 'string' ? command : command.expr).includes('tri_aux'))).toBe(true);
  });

  it('documents active backends and deferred placeholder backend degradation', () => {
    const rows = getSubjectToolsBackendStatusRows();
    expect(rows.filter((row) => row.active).map((row) => row.backendId)).toEqual(['jsxgraph', 'canvas2d']);
    expect(rows.find((row) => row.backendId === 'babylon')?.active).toBe(false);
    expect(rows.find((row) => row.backendId === 'babylon')?.reason).toContain('native 3D');
    expect(rows.filter((row) => !row.active).map((row) => row.backendId)).toEqual(['babylon', 'pixi', 'konva', 'three', 'fabric']);
    expect(rows.filter((row) => !row.active).every((row) => Object.values(row.categories).every((status) => status === 'unsupported'))).toBe(true);
  });
});
