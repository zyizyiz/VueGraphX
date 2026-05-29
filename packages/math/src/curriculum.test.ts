import { describe, expect, it } from 'vitest';
import {
  getMathKnowledgePoint,
  listMathKnowledgePoints,
  mathKnowledgeCatalog,
  summarizeMathKnowledgeCoverage
} from './index';

describe('math knowledge catalog', () => {
  it('covers junior-high, senior-high, and common math areas with kernel-backed capabilities', () => {
    const summary = summarizeMathKnowledgeCoverage();

    expect(summary.total).toBe(mathKnowledgeCatalog.length);
    expect(summary.byStage['junior-high']).toBeGreaterThan(0);
    expect(summary.byStage['senior-high']).toBeGreaterThan(0);
    expect(summary.byStage.common).toBeGreaterThan(0);
    expect(summary.bySupport.computed).toBeGreaterThan(12);
    expect(summary.byArea['number-and-algebra']).toBeGreaterThan(0);
    expect(summary.byArea.functions).toBeGreaterThan(0);
    expect(summary.byArea.inequalities).toBeGreaterThan(0);
    expect(summary.byArea['plane-geometry']).toBeGreaterThan(0);
    expect(summary.byArea['analytic-geometry']).toBeGreaterThan(0);
    expect(summary.byArea.trigonometry).toBeGreaterThan(0);
    expect(summary.byArea['solid-geometry']).toBeGreaterThan(0);
    expect(summary.byArea.vectors).toBeGreaterThan(0);
    expect(summary.byArea['complex-numbers']).toBeGreaterThan(0);
    expect(summary.byArea['linear-algebra']).toBeGreaterThan(0);
    expect(summary.byArea.sequences).toBeGreaterThan(0);
    expect(summary.byArea['probability-statistics']).toBeGreaterThan(0);
    expect(summary.byArea['calculus-basics']).toBeGreaterThan(0);
  });

  it('declares standard-backed demo and backend evidence for every catalog entry', () => {
    for (const entry of mathKnowledgeCatalog) {
      expect(entry.sourceRefs.length).toBeGreaterThan(0);
      expect(entry.demoIds).toEqual([`curriculum.${entry.id}`]);
      const statuses = Object.values(entry.backendEvidence).map((evidence) => evidence.status);
      expect(statuses.every((status) => ['native', 'sampled', 'projected', 'dom-overlay'].includes(status))).toBe(true);
      expect(entry.backendEvidence.jsxgraph.demoIds).toEqual(entry.demoIds);
      expect(entry.backendEvidence.canvas2d.demoIds).toEqual(entry.demoIds);
      expect(entry.backendEvidence.babylon.demoIds).toEqual(entry.demoIds);
      expect(entry.visualObjectTypes.length).toBeGreaterThan(0);
      expect(entry.capabilityFamilies.length).toBeGreaterThan(0);
    }
  });

  it('uses honest backend evidence where rendering is sampled, projected, or DOM-overlayed', () => {
    expect(getMathKnowledgePoint('solid.ir-surface')?.backendEvidence.canvas2d.status).toBe('projected');
    expect(getMathKnowledgePoint('algebra.symbolic-derivative')?.backendEvidence.canvas2d.status).toBe('sampled');
    expect(getMathKnowledgePoint('statistics.descriptive')?.backendEvidence.babylon.status).toBe('dom-overlay');
  });

  it('filters and clones catalog entries so callers cannot mutate package truth', () => {
    const seniorTrigonometry = listMathKnowledgePoints({ stage: 'senior-high', area: 'trigonometry' });
    expect(seniorTrigonometry.map((point) => point.id)).toContain('trigonometry.angle-triangle');

    const entry = getMathKnowledgePoint('sequence.arithmetic-geometric');
    expect(entry?.kernelExports).toContain('arithmeticSequenceTerm');

    seniorTrigonometry[0].title = 'mutated';
    expect(getMathKnowledgePoint('trigonometry.angle-triangle')?.title).not.toBe('mutated');
  });
});
