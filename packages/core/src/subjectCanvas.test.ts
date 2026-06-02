import { describe, expect, it } from 'vitest';
import {
  SUBJECT_CANVAS_COLOR_SEQUENCE,
  SUBJECT_CANVAS_DRAG_DISABLED_REASON,
  addManagedSubjectObject,
  addSubjectCoordinateSystem,
  changeManagedSubjectObjectType,
  createGraphSceneObjectIrNode,
  createSubjectCanvasState,
  createSubjectCoordinateSystemSceneNode,
  deleteManagedSubjectObject,
  getSubjectObjectEffectiveLayer,
  reorderManagedSubjectObjects,
  resizeSubjectCoordinateSystemAxisRange,
  selectSubjectObject,
  snapSubjectCanvasPoint
} from './index';

describe('subject canvas model', () => {
  it('creates a serializable global grid without visible global axes by default', () => {
    const state = createSubjectCanvasState();

    expect(state.viewport).toMatchObject({ scale: 1, unitPx: 30, minScale: 0.25, maxScale: 4 });
    expect(state.grid).toMatchObject({ visible: true, unitPx: 30, showGlobalAxes: false });
    expect(state.layers.fixedUiLayerIds).toEqual(['ui']);
    expect(state.coordinateSystems).toEqual([]);
    expect(JSON.stringify(state)).not.toMatch(/HTMLElement|JXG|BABYLON/);
  });

  it('adds independent coordinate systems with defaults and valid scene IR', () => {
    const { state, coordinateSystem } = addSubjectCoordinateSystem(createSubjectCanvasState(), { id: 'coord-A', origin: { x: 17, y: 44 } });

    expect(coordinateSystem).toMatchObject({
      id: 'coord-A',
      origin: { x: 30, y: 30 },
      size: { width: 360, height: 360 },
      unitPx: 30,
      xRange: { min: -6, max: 6 },
      yRange: { min: -6, max: 6 },
      showAxes: true,
      showTicks: true,
      showLabels: true,
      clipContent: true,
      snap: true
    });
    expect(state.activeCoordinateSystemId).toBe('coord-A');

    const node = createSubjectCoordinateSystemSceneNode(coordinateSystem);
    expect(node.type).toBe('coordinate-system');
    expect(node.payload).toMatchObject({
      objectType: 'coordinate-system',
      origin: { dimension: '2d', x: 30, y: 30 },
      geometry: { kind: 'coordinate-system' }
    });
    expect(node.meta).toMatchObject({ subjectCanvas: true, coordinateSystemId: 'coord-A', draggable: true });
    expect(node.meta?.dragDisabled).toBeUndefined();
    expect(node.renderHints).toMatchObject({ draggable: true });
    expect(node.capabilities?.find((capability) => capability.id === 'math.object.move')).toMatchObject({
      status: 'supported'
    });
    if (node.payload.objectType !== 'coordinate-system') {
      throw new Error('expected coordinate-system payload');
    }
    expect(((node.payload.geometry?.segments ?? []) as unknown[]).length).toBeGreaterThan(2);
  });

  it('validates coordinate-system scene IR shape', () => {
    const { coordinateSystem } = addSubjectCoordinateSystem(createSubjectCanvasState(), { id: 'coord-valid' });
    const valid = createSubjectCoordinateSystemSceneNode(coordinateSystem);

    expect(createGraphSceneObjectIrNode({ id: 'coord-valid-copy', objectType: 'coordinate-system', payload: valid.payload }).ok).toBe(true);
    const invalid = createGraphSceneObjectIrNode({
      id: 'coord-invalid',
      objectType: 'coordinate-system',
      payload: { ...valid.payload, unitPx: 0 }
    });
    expect(invalid.ok).toBe(false);
    expect(invalid.diagnostics[0]).toMatchObject({ code: 'scene-object-ir.invalid-payload', severity: 'error' });
  });

  it('snaps to global grid and coordinate-system units/origin', () => {
    expect(snapSubjectCanvasPoint(createSubjectCanvasState(), { x: 43, y: 61 }, { tolerancePx: 20 })).toMatchObject({
      point: { x: 30, y: 60 },
      target: { kind: 'global-grid' }
    });

    const { state } = addSubjectCoordinateSystem(createSubjectCanvasState(), { id: 'coord-A', origin: { x: 90, y: 90 } });
    expect(snapSubjectCanvasPoint(state, { x: 91, y: 88 }, { tolerancePx: 10 })).toMatchObject({
      point: { x: 90, y: 90 },
      target: { kind: 'coordinate-origin', coordinateSystemId: 'coord-A' }
    });
  });

  it('resizes axis ranges by snapped unit deltas while preserving minimum span', () => {
    const { state } = addSubjectCoordinateSystem(createSubjectCanvasState(), { id: 'coord-A' });
    const expanded = resizeSubjectCoordinateSystemAxisRange(state, 'coord-A', 'x-max', 2.4);
    expect(expanded.coordinateSystems[0].xRange).toEqual({ min: -6, max: 8 });

    const clamped = resizeSubjectCoordinateSystemAxisRange(expanded, 'coord-A', 'x-min', 20, { minSpan: 3 });
    expect(clamped.coordinateSystems[0].xRange.max - clamped.coordinateSystems[0].xRange.min).toBeGreaterThanOrEqual(3);
  });

  it('keeps color allocation stable across delete and reorder', () => {
    const { state: withCoord } = addSubjectCoordinateSystem(createSubjectCanvasState(), { id: 'coord-A' });
    const first = addManagedSubjectObject(withCoord, { id: 'f1', coordinateSystemId: 'coord-A', kind: 'function' });
    const second = addManagedSubjectObject(first.state, { id: 'f2', coordinateSystemId: 'coord-A', kind: 'function' });
    const third = addManagedSubjectObject(second.state, { id: 'f3', coordinateSystemId: 'coord-A', kind: 'function' });

    expect([first.object.color, second.object.color, third.object.color]).toEqual(SUBJECT_CANVAS_COLOR_SEQUENCE.slice(0, 3));
    expect(first.object.meta).toMatchObject({
      coordinateSystemId: 'coord-A',
      draggable: false,
      dragDisabled: true,
      dragDisabledReason: SUBJECT_CANVAS_DRAG_DISABLED_REASON
    });

    const withoutSecond = deleteManagedSubjectObject(third.state, 'coord-A', 'f2');
    const reordered = reorderManagedSubjectObjects(withoutSecond, 'coord-A', ['f3', 'f1']);
    const fourth = addManagedSubjectObject(reordered, { id: 'f4', coordinateSystemId: 'coord-A', kind: 'function' });
    const objects = fourth.state.coordinateSystems[0].objects;

    expect(objects.map((object) => [object.id, object.color])).toEqual([
      ['f3', SUBJECT_CANVAS_COLOR_SEQUENCE[2]],
      ['f1', SUBJECT_CANVAS_COLOR_SEQUENCE[0]],
      ['f4', SUBJECT_CANVAS_COLOR_SEQUENCE[3]]
    ]);
  });

  it('supports selection layer boost and type changes without mutating color identity', () => {
    const { state: withCoord } = addSubjectCoordinateSystem(createSubjectCanvasState(), { id: 'coord-A' });
    const first = addManagedSubjectObject(withCoord, { id: 'f1', coordinateSystemId: 'coord-A', kind: 'function', family: 'quadratic' });
    const second = addManagedSubjectObject(first.state, { id: 'f2', coordinateSystemId: 'coord-A', kind: 'function', family: 'linear' });
    const changed = changeManagedSubjectObjectType(second.state, 'coord-A', 'f2', 'equation', 'circle-equation');
    const selected = selectSubjectObject(changed, 'coord-A', 'f1');
    const system = selected.coordinateSystems[0];

    expect(system.objects.find((object) => object.id === 'f2')).toMatchObject({ kind: 'equation', family: 'circle-equation', color: SUBJECT_CANVAS_COLOR_SEQUENCE[1] });
    expect(getSubjectObjectEffectiveLayer(system, 'f1')).toBeGreaterThan(system.objects.find((object) => object.id === 'f2')?.dynamicPointLayer ?? 0);
    expect(JSON.parse(JSON.stringify(selected)).coordinateSystems[0].objects).toHaveLength(2);
  });
});
