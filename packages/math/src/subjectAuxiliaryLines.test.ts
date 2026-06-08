import { describe, expect, it } from 'vitest';
import {
  applySubjectAuxiliaryLineAction,
  createCircleEquationSubjectFunction,
  createQuadraticSubjectFunction,
  createSubjectAuxiliaryLineModel,
  createSubjectAuxiliaryLineWorkflow,
  point2D,
  segmentFromPoints,
  type SubjectOverlayTarget
} from './index';

const triangle: SubjectOverlayTarget = {
  id: 'workflow-triangle',
  kind: 'polygon',
  shapeKind: 'triangle',
  vertices: [point2D(0, 0), point2D(4, 0), point2D(0, 3)],
  coordinateSystemId: 'plane'
};

describe('subject auxiliary line workflow', () => {
  it('drives candidates, selection, free draw, and intersections from one model surface', () => {
    const initial = createSubjectAuxiliaryLineModel(triangle, {
      config: {
        auxiliaryLines: {
          includeKinds: ['altitude', 'median', 'free'],
          defaultVisibleKinds: ['altitude']
        },
        annotations: { includeKinds: ['helper-intersection'] },
        coordinates: { showForKinds: ['helper-intersection'] }
      }
    });

    expect(initial.generatedLines.map((line) => line.kind)).toEqual(expect.arrayContaining(['altitude', 'median']));
    expect(initial.generatedLines.find((line) => line.kind === 'altitude')).toMatchObject({
      source: 'generated',
      role: 'confirmed'
    });
    expect(initial.generatedLines.find((line) => line.kind === 'median')).toMatchObject({
      source: 'generated',
      role: 'candidate'
    });

    const medianId = initial.generatedLines.find((line) => line.kind === 'median')?.id;
    expect(medianId).toBeTruthy();

    const selected = applySubjectAuxiliaryLineAction(triangle, initial.state, {
      kind: 'toggle-line',
      lineId: medianId!
    }, {
      config: {
        auxiliaryLines: { includeKinds: ['altitude', 'median', 'free'] },
        annotations: { includeKinds: ['helper-intersection'] }
      }
    });
    expect(selected.selectedIds).toEqual([medianId]);
    expect(selected.selectedLines[0]).toMatchObject({ id: medianId, role: 'preview' });

    const confirmed = applySubjectAuxiliaryLineAction(triangle, selected.state, {
      kind: 'confirm-selection'
    }, {
      config: {
        auxiliaryLines: { includeKinds: ['altitude', 'median', 'free'] },
        annotations: { includeKinds: ['helper-intersection'] }
      }
    });
    expect(confirmed.confirmedIds).toEqual([medianId]);
    expect(confirmed.confirmedLines[0]).toMatchObject({ id: medianId, role: 'confirmed' });
    expect(confirmed.intersectionAnnotations.length).toBeGreaterThan(0);
    expect(confirmed.intersectionAnnotations.map((annotation) => annotation.meta?.lineId)).toContain(medianId);

    const drawing = applySubjectAuxiliaryLineAction(triangle, confirmed.state, {
      kind: 'begin-free-draw',
      point: point2D(-1, 1),
      source: 'drag'
    }, {
      config: {
        auxiliaryLines: { includeKinds: ['altitude', 'median', 'free'] },
        annotations: { includeKinds: ['helper-intersection'] }
      }
    });
    const preview = applySubjectAuxiliaryLineAction(triangle, drawing.state, {
      kind: 'update-free-draw',
      point: point2D(5, 1)
    }, {
      config: {
        auxiliaryLines: { includeKinds: ['altitude', 'median', 'free'] },
        annotations: { includeKinds: ['helper-intersection'] }
      }
    });
    expect(preview.draftLine).toMatchObject({
      source: 'free-draw',
      role: 'draft',
      kind: 'free'
    });

    const committed = applySubjectAuxiliaryLineAction(triangle, preview.state, {
      kind: 'commit-free-draw'
    }, {
      config: {
        auxiliaryLines: { includeKinds: ['altitude', 'median', 'free'] },
        annotations: { includeKinds: ['helper-intersection'] },
        coordinates: { showForKinds: ['helper-intersection'] }
      }
    });
    expect(committed.freeLines).toHaveLength(1);
    expect(committed.freeLines[0]).toMatchObject({
      source: 'free-draw',
      role: 'confirmed',
      meta: {
        clipped: true,
        diagnostics: expect.arrayContaining(['subject-construction.clipped'])
      }
    });
    expect(committed.intersectionAnnotations.length).toBeGreaterThan(2);
    expect(committed.intersectionAnnotations.map((annotation) => annotation.meta?.lineId)).toEqual(expect.arrayContaining([
      medianId,
      committed.freeLines[0].id
    ]));
    expect(committed.intersectionAnnotations[0].text).toContain('(');
  });

  it('classifies function and equation reference helpers without free-draw state', () => {
    const quadratic = createSubjectAuxiliaryLineModel({
      id: 'workflow-quadratic',
      kind: 'function',
      descriptor: createQuadraticSubjectFunction({ id: 'q', a: 1, b: -2, c: -3 }),
      sampleWindow: { minX: -4, maxX: 5, minY: -5, maxY: 5 }
    }, {
      config: { auxiliaryLines: { includeKinds: ['symmetry-axis'] } }
    });

    expect(quadratic.lines).toHaveLength(1);
    expect(quadratic.lines[0]).toMatchObject({
      kind: 'symmetry-axis',
      role: 'reference',
      source: 'function-reference'
    });

    const circleEquation = createSubjectAuxiliaryLineModel({
      id: 'workflow-circle-equation',
      kind: 'equation',
      descriptor: createCircleEquationSubjectFunction({ centerX: 1, centerY: -1, radius: 3 })
    }, {
      config: { auxiliaryLines: { includeKinds: ['radius', 'diameter'] } }
    });

    expect(circleEquation.lines.map((line) => line.source)).toEqual(['equation-reference', 'equation-reference']);
    expect(circleEquation.lines.map((line) => line.role)).toEqual(['reference', 'reference']);
  });

  it('annotates confirmed free-helper intersections for non-polygon geometry targets', () => {
    const config = {
      auxiliaryLines: { includeKinds: ['free'] },
      annotations: { includeKinds: ['helper-intersection'] }
    };
    const cases: Array<{
      target: SubjectOverlayTarget;
      start: ReturnType<typeof point2D>;
      end: ReturnType<typeof point2D>;
      expectedCount: number;
    }> = [
      {
        target: { id: 'workflow-segment', kind: 'segment', start: point2D(0, 0), end: point2D(4, 0) },
        start: point2D(2, -1),
        end: point2D(2, 1),
        expectedCount: 1
      },
      {
        target: { id: 'workflow-line', kind: 'line', point: point2D(0, 0), direction: point2D(1, 0) },
        start: point2D(2, -1),
        end: point2D(2, 1),
        expectedCount: 1
      },
      {
        target: { id: 'workflow-ray', kind: 'ray', origin: point2D(0, 0), direction: point2D(1, 0) },
        start: point2D(2, -1),
        end: point2D(2, 1),
        expectedCount: 1
      },
      {
        target: {
          id: 'workflow-parallel-lines',
          kind: 'parallel-lines',
          segments: [
            segmentFromPoints(point2D(0, 0), point2D(4, 0)),
            segmentFromPoints(point2D(0, 3), point2D(4, 3))
          ]
        },
        start: point2D(2, -1),
        end: point2D(2, 4),
        expectedCount: 2
      },
      {
        target: { id: 'workflow-angle', kind: 'angle', vertex: point2D(0, 0), first: point2D(4, 0), second: point2D(0, 3) },
        start: point2D(0, 1),
        end: point2D(3, 0),
        expectedCount: 2
      }
    ];

    for (const item of cases) {
      const model = applySubjectAuxiliaryLineAction(item.target, {}, {
        kind: 'add-free-line',
        start: item.start,
        end: item.end
      }, { config });
      const lineId = model.freeLines[0].id;

      expect(model.intersectionAnnotations).toHaveLength(item.expectedCount);
      expect(model.intersectionAnnotations.map((annotation) => annotation.meta?.lineId)).toEqual(expect.arrayContaining([lineId]));
    }
  });

  it('keeps rejected free-draw diagnostics after a failed commit', () => {
    const drawing = applySubjectAuxiliaryLineAction(triangle, {}, {
      kind: 'begin-free-draw',
      point: point2D(1, 1)
    }, {
      config: { auxiliaryLines: { includeKinds: ['free'] } }
    });
    const rejected = applySubjectAuxiliaryLineAction(triangle, drawing.state, {
      kind: 'commit-free-draw',
      point: point2D(1, 1)
    }, {
      config: { auxiliaryLines: { includeKinds: ['free'] } }
    });

    expect(rejected.freeLines).toEqual([]);
    expect(rejected.state.draft).toBeNull();
    expect(rejected.diagnostics).toEqual(expect.arrayContaining([
      expect.objectContaining({
        code: 'subject-auxiliary-line.free-draw-rejected',
        source: 'interaction'
      })
    ]));
  });

  it('honors free-line config gates for construction targets', () => {
    const drawing = applySubjectAuxiliaryLineAction(triangle, {}, {
      kind: 'begin-free-draw',
      point: point2D(-1, 1)
    }, {
      config: { auxiliaryLines: { includeKinds: ['altitude'] } }
    });

    const rejected = applySubjectAuxiliaryLineAction(triangle, drawing.state, {
      kind: 'commit-free-draw',
      point: point2D(5, 1)
    }, {
      config: { auxiliaryLines: { includeKinds: ['altitude'] } }
    });

    expect(rejected.freeLines).toEqual([]);
    expect(rejected.diagnostics).toEqual(expect.arrayContaining([
      expect.objectContaining({
        code: 'subject-auxiliary-line.free-draw-rejected',
        source: 'interaction'
      })
    ]));
  });

  it('does not preview disabled free-line drafts', () => {
    const drawing = applySubjectAuxiliaryLineAction(triangle, {}, {
      kind: 'begin-free-draw',
      point: point2D(-1, 1)
    }, {
      config: { auxiliaryLines: { includeKinds: ['altitude'] } }
    });

    const preview = applySubjectAuxiliaryLineAction(triangle, drawing.state, {
      kind: 'update-free-draw',
      point: point2D(5, 1)
    }, {
      config: { auxiliaryLines: { includeKinds: ['altitude'] } }
    });

    expect(preview.draftLine).toBeNull();
    expect(preview.diagnostics.map((diagnostic) => diagnostic.code)).not.toContain('subject-auxiliary-line.no-draft-candidate');
  });

  it('honors free-draw minimum distance for commit and direct add', () => {
    const options = {
      config: { auxiliaryLines: { includeKinds: ['free'] } },
      freeDraw: { minDistance: 1 }
    };
    const drawing = applySubjectAuxiliaryLineAction(triangle, {}, {
      kind: 'begin-free-draw',
      point: point2D(0, 0)
    }, options);

    const rejectedCommit = applySubjectAuxiliaryLineAction(triangle, drawing.state, {
      kind: 'commit-free-draw',
      point: point2D(0.25, 0)
    }, options);
    const rejectedAdd = applySubjectAuxiliaryLineAction(triangle, {}, {
      kind: 'add-free-line',
      start: point2D(0, 0),
      end: point2D(0.25, 0)
    }, options);

    expect(rejectedCommit.freeLines).toEqual([]);
    expect(rejectedAdd.freeLines).toEqual([]);
    expect(rejectedCommit.diagnostics.map((diagnostic) => diagnostic.code)).toContain('subject-auxiliary-line.free-draw-rejected');
    expect(rejectedAdd.diagnostics.map((diagnostic) => diagnostic.code)).toContain('subject-auxiliary-line.free-draw-rejected');
  });

  it('applies configured free-draw retention rules before storing helper lines', () => {
    const options = {
      config: {
        auxiliaryLines: {
          includeKinds: ['free'],
          retentionRule: 'boundary-contact'
        }
      }
    } as const;
    const rejected = applySubjectAuxiliaryLineAction(triangle, {}, {
      kind: 'add-free-line',
      start: point2D(1, 1),
      end: point2D(2, 1)
    }, options);
    const accepted = applySubjectAuxiliaryLineAction(triangle, {}, {
      kind: 'add-free-line',
      start: point2D(-1, 1),
      end: point2D(5, 1)
    }, options);

    expect(rejected.freeLines).toEqual([]);
    expect(rejected.diagnostics.map((diagnostic) => diagnostic.code)).toContain('subject-auxiliary-line.free-draw-rejected');
    expect(accepted.freeLines).toHaveLength(1);
    expect(accepted.freeLines[0].meta?.diagnostics).toContain('subject-construction.clipped');
  });

  it('supports custom free-draw retention predicates from workflow options', () => {
    const custom = createSubjectAuxiliaryLineWorkflow(triangle, {
      config: { auxiliaryLines: { includeKinds: ['free'] } },
      freeDraw: {
        retentionRule: ({ contacts }) => contacts.some((contact) => contact.kind === 'overlap')
      }
    });
    custom.apply({
      kind: 'add-free-line',
      start: point2D(-1, 1),
      end: point2D(5, 1)
    });
    expect(custom.model.freeLines).toEqual([]);

    custom.apply({
      kind: 'add-free-line',
      start: point2D(-1, 0),
      end: point2D(5, 0)
    });
    expect(custom.model.freeLines).toHaveLength(1);
    expect(custom.model.freeLines[0].meta?.diagnostics).toContain('subject-construction.overlap-detected');
  });

  it('honors shape-specific free-line config gates', () => {
    const drawing = applySubjectAuxiliaryLineAction(triangle, {}, {
      kind: 'begin-free-draw',
      point: point2D(-1, 1)
    }, {
      config: {
        auxiliaryLines: { includeKinds: ['free'] },
        shapes: { triangle: { auxiliaryLines: { allowFreeDraw: false } } }
      }
    });

    const rejected = applySubjectAuxiliaryLineAction(triangle, drawing.state, {
      kind: 'commit-free-draw',
      point: point2D(5, 1)
    }, {
      config: {
        auxiliaryLines: { includeKinds: ['free'] },
        shapes: { triangle: { auxiliaryLines: { allowFreeDraw: false } } }
      }
    });

    expect(rejected.freeLines).toEqual([]);
    expect(rejected.diagnostics.map((diagnostic) => diagnostic.code)).toContain('subject-auxiliary-line.free-draw-rejected');
  });

  it('applies free-line labels and styles from overlay config', () => {
    const added = applySubjectAuxiliaryLineAction(triangle, {}, {
      kind: 'add-free-line',
      start: point2D(-1, 1),
      end: point2D(5, 1)
    }, {
      config: {
        auxiliaryLines: {
          includeKinds: ['free'],
          labels: { free: '业务自由辅助线' },
          styles: { free: { strokeColor: '#7c3aed', strokeWidth: 2 } }
        }
      }
    });

    expect(added.freeLines[0]).toMatchObject({
      label: '业务自由辅助线',
      style: { strokeColor: '#7c3aed', strokeWidth: 2 }
    });
  });

  it('carries bound options through model actions without polluting persisted line state', () => {
    const workflow = createSubjectAuxiliaryLineWorkflow(triangle, {
      config: {
        auxiliaryLines: {
          includeKinds: ['free'],
          labels: { free: '业务自由辅助线' },
          styles: { free: { strokeColor: '#7c3aed', strokeWidth: 2 } }
        },
        annotations: { includeKinds: ['helper-intersection'] },
        coordinates: { showForKinds: ['helper-intersection'] }
      }
    });
    const drawing = workflow.apply({
      kind: 'begin-free-draw',
      point: point2D(-1, 1)
    });
    expect(drawing).toBe(workflow.model);

    workflow.apply({
      kind: 'update-free-draw',
      point: point2D(5, 1)
    });
    const committed = workflow.apply({
      kind: 'commit-free-draw'
    });

    expect(committed.freeLines[0]).toMatchObject({
      label: '业务自由辅助线',
      style: { strokeColor: '#7c3aed', strokeWidth: 2 }
    });
    expect(committed.intersectionAnnotations).toHaveLength(2);
    expect(committed.state.freeLines?.[0]).toMatchObject({
      id: committed.freeLines[0].id,
      start: committed.freeLines[0].start,
      end: committed.freeLines[0].end
    });
    expect(committed.state.freeLines?.[0]).not.toHaveProperty('label');
    expect(committed.state.freeLines?.[0]).not.toHaveProperty('style');
    expect(committed.state.freeLines?.[0]).not.toHaveProperty('state');
    expect(committed.state.freeLines?.[0]).not.toHaveProperty('selectable');
    expect(committed.state.freeLines?.[0]).not.toHaveProperty('meta');
    expect(committed.state.freeLines?.[0]).not.toHaveProperty('overrides');

    const restyled = createSubjectAuxiliaryLineModel(triangle, {
      state: committed.state,
      config: {
        auxiliaryLines: {
          includeKinds: ['free'],
          labels: { free: '重绘辅助线' },
          styles: { free: { strokeColor: '#0f766e', strokeWidth: 3 } }
        }
      }
    });
    expect(restyled.freeLines[0]).toMatchObject({
      label: '重绘辅助线',
      style: { strokeColor: '#0f766e', strokeWidth: 3 }
    });
  });

  it('persists workflow option overrides across later actions', () => {
    const workflow = createSubjectAuxiliaryLineWorkflow(triangle, {
      config: { auxiliaryLines: { includeKinds: ['altitude'] } }
    });

    workflow.apply({
      kind: 'begin-free-draw',
      point: point2D(-1, 1)
    }, {
      config: {
        auxiliaryLines: {
          includeKinds: ['free'],
          labels: { free: '单次配置后续沿用' }
        }
      }
    });
    workflow.apply({
      kind: 'update-free-draw',
      point: point2D(5, 1)
    });
    const committed = workflow.apply({ kind: 'commit-free-draw' });

    expect(workflow.options.config?.auxiliaryLines?.includeKinds).toEqual(['free']);
    expect(committed.freeLines[0]).toMatchObject({ label: '单次配置后续沿用' });
  });

  it('removes selected and confirmed free-line ids when deleting a free line', () => {
    const config = {
      auxiliaryLines: { includeKinds: ['free'] },
      annotations: { includeKinds: ['helper-intersection'] }
    };
    const added = applySubjectAuxiliaryLineAction(triangle, {}, {
      kind: 'add-free-line',
      id: 'manual-free-line',
      start: point2D(-1, 1),
      end: point2D(5, 1)
    }, { config });

    expect(added.freeLines.map((line) => line.id)).toEqual(['manual-free-line']);

    const selected = applySubjectAuxiliaryLineAction(triangle, added.state, {
      kind: 'select-line',
      lineId: 'manual-free-line'
    }, { config });
    const confirmed = applySubjectAuxiliaryLineAction(triangle, selected.state, {
      kind: 'confirm-selection'
    }, { config });

    expect(confirmed.confirmedIds).toEqual(['manual-free-line']);

    const removed = applySubjectAuxiliaryLineAction(triangle, confirmed.state, {
      kind: 'remove-free-line',
      lineId: 'manual-free-line'
    }, { config });

    expect(removed.freeLines).toEqual([]);
    expect(removed.confirmedIds).toEqual([]);
    expect(removed.state.selection?.confirmedIds).toEqual([]);
    expect(removed.diagnostics.map((diagnostic) => diagnostic.code)).not.toContain('subject-auxiliary-selection.unknown-line');
  });

  it('preserves line-aware selection diagnostics from workflow actions', () => {
    const workflow = createSubjectAuxiliaryLineWorkflow(triangle, {
      config: { auxiliaryLines: { includeKinds: ['free'] } }
    });
    const noSelection = workflow.apply({
      kind: 'confirm-selection'
    });
    expect(noSelection.confirmedIds).toEqual([]);
    expect(noSelection.diagnostics.map((diagnostic) => diagnostic.code)).toContain('subject-auxiliary-selection.no-selection');

    const draftWorkflow = createSubjectAuxiliaryLineWorkflow(triangle, {
      config: { auxiliaryLines: { includeKinds: ['free'] } }
    });
    draftWorkflow.apply({
      kind: 'begin-free-draw',
      point: point2D(-1, 1)
    });
    const preview = draftWorkflow.apply({
      kind: 'update-free-draw',
      point: point2D(5, 1)
    });
    expect(preview.draftLine?.selectable).toBe(false);

    const rejectedConfirm = draftWorkflow.apply({
      kind: 'confirm-selection',
      lineIds: [preview.draftLine!.id]
    });
    expect(rejectedConfirm.confirmedIds).toEqual([]);
    expect(rejectedConfirm.diagnostics.map((diagnostic) => diagnostic.code)).toContain('subject-auxiliary-selection.not-selectable');
  });

  it('matches selection reducer semantics for single-select and max-selected diagnostics', () => {
    const config = { auxiliaryLines: { includeKinds: ['altitude', 'median', 'angle-bisector'] } };
    const initial = createSubjectAuxiliaryLineModel(triangle, { config });
    const [firstId, secondId, thirdId] = initial.generatedLines.map((line) => line.id);

    const singleFirst = applySubjectAuxiliaryLineAction(triangle, initial.state, {
      kind: 'select-line',
      lineId: firstId
    }, { config, selection: { mode: 'single' } });
    const singleSecond = applySubjectAuxiliaryLineAction(triangle, singleFirst.state, {
      kind: 'select-line',
      lineId: secondId
    }, { config, selection: { mode: 'single' } });

    expect(singleSecond.selectedIds).toEqual([secondId]);

    const limitedFirst = applySubjectAuxiliaryLineAction(triangle, initial.state, {
      kind: 'select-line',
      lineId: firstId
    }, { config, selection: { mode: 'multiple', maxSelected: 2 } });
    const limitedSecond = applySubjectAuxiliaryLineAction(triangle, limitedFirst.state, {
      kind: 'select-line',
      lineId: secondId
    }, { config, selection: { mode: 'multiple', maxSelected: 2 } });
    const limitedThird = applySubjectAuxiliaryLineAction(triangle, limitedSecond.state, {
      kind: 'select-line',
      lineId: thirdId
    }, { config, selection: { mode: 'multiple', maxSelected: 2 } });

    expect(limitedThird.selectedIds).toEqual([firstId, secondId]);
    expect(limitedThird.diagnostics.map((diagnostic) => diagnostic.code)).toContain('subject-auxiliary-selection.limit-reached');
  });
});
