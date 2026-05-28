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

  it('filters and clones catalog entries so callers cannot mutate package truth', () => {
    const seniorTrigonometry = listMathKnowledgePoints({ stage: 'senior-high', area: 'trigonometry' });
    expect(seniorTrigonometry.map((point) => point.id)).toContain('trigonometry.angle-triangle');

    const entry = getMathKnowledgePoint('sequence.arithmetic-geometric');
    expect(entry?.kernelExports).toContain('arithmeticSequenceTerm');

    seniorTrigonometry[0].title = 'mutated';
    expect(getMathKnowledgePoint('trigonometry.angle-triangle')?.title).not.toBe('mutated');
  });
});
