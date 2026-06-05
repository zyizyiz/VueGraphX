import { describe, expect, it } from 'vitest';
import {
  applySubjectAuxiliaryLineSelection,
  createSubjectAuxiliaryLineSelectionModel,
  point2D,
  type SubjectAuxiliaryLineDescriptor,
  type SubjectAuxiliaryLineSelectionState
} from './index';

const line = (
  id: string,
  options: Partial<SubjectAuxiliaryLineDescriptor> = {}
): SubjectAuxiliaryLineDescriptor => ({
  id,
  kind: 'altitude',
  label: id,
  start: point2D(0, 0),
  end: point2D(1, 1),
  targetId: 'triangle-selection',
  visible: false,
  state: 'candidate',
  selectable: true,
  ...options
});

const candidateLines = [
  line('altitude-a'),
  line('median-b', { kind: 'median' }),
  line('diagonal-c', { kind: 'diagonal' })
] as const;

describe('subject auxiliary line selection', () => {
  it('decorates a hovered candidate without mutating selection state', () => {
    const model = applySubjectAuxiliaryLineSelection(candidateLines, {}, {
      kind: 'hover',
      lineId: 'altitude-a'
    });

    expect(model.hoveredId).toBe('altitude-a');
    expect(model.selectedIds).toEqual([]);
    expect(model.confirmedIds).toEqual([]);
    expect(model.hoveredLine?.state).toBe('preview');
    expect(model.hoveredLine?.visible).toBe(true);
    expect(model.hoveredLine?.style?.emphasis).toBe('highlight');
    expect(model.entries.find((entry) => entry.lineId === 'altitude-a')).toMatchObject({
      hovered: true,
      selected: false,
      confirmed: false,
      status: 'hovered'
    });
  });

  it('supports multi-select toggling with a configurable limit', () => {
    const first = applySubjectAuxiliaryLineSelection(candidateLines, {}, {
      kind: 'toggle',
      lineId: 'altitude-a'
    }, { mode: 'multiple', maxSelected: 2 });
    const second = applySubjectAuxiliaryLineSelection(candidateLines, first.state, {
      kind: 'toggle',
      lineId: 'median-b'
    }, { mode: 'multiple', maxSelected: 2 });
    const limited = applySubjectAuxiliaryLineSelection(candidateLines, second.state, {
      kind: 'toggle',
      lineId: 'diagonal-c'
    }, { mode: 'multiple', maxSelected: 2 });

    expect(second.selectedIds).toEqual(['altitude-a', 'median-b']);
    expect(limited.selectedIds).toEqual(['altitude-a', 'median-b']);
    expect(limited.diagnostics.map((diagnostic) => diagnostic.code)).toContain('subject-auxiliary-selection.limit-reached');
    expect(limited.selectedLines.map((selectedLine) => selectedLine.state)).toEqual(['preview', 'preview']);
  });

  it('keeps single-select replacement deterministic', () => {
    const first = applySubjectAuxiliaryLineSelection(candidateLines, {}, {
      kind: 'select',
      lineId: 'altitude-a'
    }, { mode: 'single' });
    const second = applySubjectAuxiliaryLineSelection(candidateLines, first.state, {
      kind: 'select',
      lineId: 'median-b'
    }, { mode: 'single' });

    expect(second.selectedIds).toEqual(['median-b']);
    expect(second.lines.find((candidate) => candidate.id === 'altitude-a')?.state).toBe('candidate');
    expect(second.lines.find((candidate) => candidate.id === 'median-b')?.state).toBe('preview');
  });

  it('confirms selected lines and clears transient selection by default', () => {
    const selected: SubjectAuxiliaryLineSelectionState = {
      selectedIds: ['altitude-a', 'median-b']
    };
    const model = applySubjectAuxiliaryLineSelection(candidateLines, selected, {
      kind: 'confirm'
    });

    expect(model.selectedIds).toEqual([]);
    expect(model.confirmedIds).toEqual(['altitude-a', 'median-b']);
    expect(model.confirmedLines.map((confirmedLine) => confirmedLine.state)).toEqual(['confirmed', 'confirmed']);
    expect(model.lines.find((candidate) => candidate.id === 'altitude-a')?.meta?.auxiliaryLineSelection).toMatchObject({
      confirmed: true,
      status: 'confirmed'
    });
  });

  it('can replace confirmed lines and keep the current selection for business reducers', () => {
    const model = applySubjectAuxiliaryLineSelection(candidateLines, {
      selectedIds: ['altitude-a'],
      confirmedIds: ['median-b']
    }, {
      kind: 'confirm',
      lineIds: ['diagonal-c']
    }, {
      confirmMode: 'replace',
      clearSelectionOnConfirm: false
    });

    expect(model.selectedIds).toEqual(['altitude-a']);
    expect(model.confirmedIds).toEqual(['diagonal-c']);
  });

  it('reports unknown, duplicate, and non-selectable candidates without selecting them', () => {
    const linesWithInvalidCandidates = [
      ...candidateLines,
      line('locked-helper', { selectable: false }),
      line('median-b', { kind: 'median' })
    ];
    const model = createSubjectAuxiliaryLineSelectionModel(linesWithInvalidCandidates, {
      hoveredId: 'missing-helper',
      selectedIds: ['locked-helper', 'median-b', 'median-b', 'ghost-helper'],
      confirmedIds: ['ghost-helper']
    });

    expect(model.selectedIds).toEqual(['median-b']);
    expect(model.hoveredId).toBeNull();
    expect(model.confirmedIds).toEqual([]);
    expect(model.diagnostics.map((diagnostic) => diagnostic.code)).toEqual(expect.arrayContaining([
      'subject-auxiliary-selection.unknown-line',
      'subject-auxiliary-selection.not-selectable',
      'subject-auxiliary-selection.duplicate-line-id'
    ]));
  });

  it('blocks selecting already confirmed candidates unless configured otherwise', () => {
    const blocked = applySubjectAuxiliaryLineSelection(candidateLines, {
      confirmedIds: ['altitude-a']
    }, {
      kind: 'select',
      lineId: 'altitude-a'
    });
    expect(blocked.selectedIds).toEqual([]);
    expect(blocked.diagnostics.map((diagnostic) => diagnostic.code)).toContain('subject-auxiliary-selection.already-confirmed');

    const allowed = applySubjectAuxiliaryLineSelection(candidateLines, {
      confirmedIds: ['altitude-a']
    }, {
      kind: 'select',
      lineId: 'altitude-a'
    }, {
      allowConfirmedSelection: true
    });
    expect(allowed.selectedIds).toEqual(['altitude-a']);
    expect(allowed.confirmedIds).toEqual(['altitude-a']);
    expect(allowed.lines.find((candidate) => candidate.id === 'altitude-a')?.state).toBe('confirmed');
  });
});
