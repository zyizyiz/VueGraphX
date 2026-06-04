import { describe, expect, it, vi } from 'vitest';
import type { ShapeCapabilityTarget } from '../architecture/capabilities/contracts';
import type { GraphShapeDefinition, GraphShapeInstance } from '../architecture/shapes/contracts';
import type { GraphSelectionChangeEvent } from '../types/capabilities';
import type { EngineMode, GraphXOptions } from '../types/engine';
import { GraphXEngine } from './GraphXEngine';
import { GraphRelationState } from './relationState';
import { GraphSceneState } from './sceneState';
import { GraphSceneStore } from '@vuegraphx/core';

const createShapeInstance = (
  id: string,
  entityType: string,
  payload?: unknown,
  capabilityTarget?: ShapeCapabilityTarget | null
): GraphShapeInstance => ({
  id,
  entityType,
  setSelected: vi.fn(),
  getCapabilityTarget: () => capabilityTarget ?? null,
  getScenePayload: () => payload,
  destroy: vi.fn()
});

const createSerializableShapeDefinition = (type = 'serial-shape'): GraphShapeDefinition => ({
  type,
  supportedModes: 'all',
  scene: {
    normalizePayload(payload) {
      const data = payload as { value?: unknown };
      if (typeof data?.value !== 'number') {
        throw new Error('shape payload value must be numeric');
      }
      return { value: data.value };
    }
  },
  createShape(context, payload) {
    const data = payload as { value: number };
    return createShapeInstance(context.generateId(type), type, { value: data.value });
  }
});

const createNonSerializableShapeDefinition = (type = 'plain-shape'): GraphShapeDefinition => ({
  type,
  supportedModes: 'all',
  createShape(context) {
    return createShapeInstance(context.generateId(type), type);
  }
});

const createSelectableShapeDefinition = (type = 'selectable-shape'): GraphShapeDefinition => ({
  type,
  supportedModes: 'all',
  createShape(context) {
    const id = context.generateId(type);
    return createShapeInstance(id, type, undefined, {
      entityType: type,
      entityId: id,
      entity: { id, label: 'Selectable shape' },
      ui: { anchor: 'center' }
    });
  }
});

const createFakeEngine = () => {
  const board = {
    suspendUpdate: vi.fn(),
    unsuspendUpdate: vi.fn(),
    fullUpdate: vi.fn(),
    resizeContainer: vi.fn(),
    update: vi.fn(),
    on: vi.fn(),
    getAllObjectsUnderMouse: vi.fn(() => []),
    containerObj: null
  };

  const boardMgr = {
    board,
    mode: '2d' as EngineMode,
    view3d: null,
    setMode: vi.fn((mode: EngineMode, _options?: GraphXOptions) => {
      boardMgr.mode = mode;
      return true;
    }),
    resetBoard: vi.fn(),
    syncView3DToBoard: vi.fn(),
    destroy: vi.fn()
  };
  const mathScope = {
    data: {} as Record<string, number>,
    clear: vi.fn(() => {
      mathScope.data = {};
    })
  };

  const engine = Object.assign(Object.create(GraphXEngine.prototype), {
    boardMgr,
    currentOptions: undefined,
    entityMgr: {
      registerCommandElements: vi.fn(),
      registerNamedElement: vi.fn(),
      removeCommandElements: vi.fn(),
      clearAll: vi.fn()
    },
    hiddenLineMgr: {
      clearOwnerSources: vi.fn(),
      clearAllSources: vi.fn(),
      setOptions: vi.fn(),
      isEnabled: vi.fn(() => false),
      getOptions: vi.fn(() => ({ enabled: false }))
    },
    relationState: new GraphRelationState(),
    relationTargets: new Map(),
    relationSnapshots: [],
    relationTargetAssistDisposers: new Map(),
    relationAssistSessions: new Map(),
    activeRelationDragKey: null,
    isApplyingRelationAssist: false,
    sceneState: new GraphSceneState(),
    runtimeSceneStore: new GraphSceneStore('test-runtime-scene'),
    commandCoreObjectIds: new Map<string, string[]>(),
    commandSymbols: new Map(),
    commandNumericScope: new Map(),
    jsxGraphCommandBackend: null,
    jsxGraphCommandRuntime: null,
    jsxGraphCommandBoard: null,
    jsxGraphCommandHandles: new Map(),
    commandRenderPath: new Map(),
    renderer: {
      render: vi.fn((_mode: EngineMode, expression: string, _color: string, _options: unknown, id: string) => {
        if (expression === 'bad()') {
          throw new Error('bad command');
        }
        const assignment = expression.match(/^([a-zA-Z_]\w*)\s*=\s*(-?\d+(?:\.\d+)?)$/);
        if (assignment) mathScope.data[assignment[1]] = Number(assignment[2]);
        return [{ name: `${id}:${expression}` }];
      }),
      mathScope
    },
    shapeDefinitions: new Map<string, GraphShapeDefinition>(),
    shapeInstances: new Map<string, GraphShapeInstance>(),
    animationTasks: new Map<string, (timestamp: number) => boolean | void>(),
    animationFrameId: null,
    selectedShapeId: null,
    isClickingObject: false,
    capabilityListeners: [],
    selectionListeners: [],
    relationListeners: [],
    viewportListeners: [],
    mutationBatchDepth: 0,
    pendingCapabilityNotification: false,
    pendingSelectionNotification: null,
    lastSelectionItems: [],
    selectionRevision: 0
  });

  return engine as GraphXEngine;
};

describe('GraphXEngine scene document support', () => {
  it('exports versioned scene documents with stable command order and supported settings', () => {
    const engine = createFakeEngine();

    engine.setMode('3d', {
      boundingbox: [-5, 5, 5, -5],
      axis: false,
      showNavigation: false,
      keepaspectratio: false,
      grid: { enabled: true, cellSizePx: 30 },
      view3D: {
        hiddenLine: {
          enabled: true
        }
      }
    });

    engine.executeCommand('cmd_a', 'a = 1', '#111111', { plot: false });
    engine.executeCommand('cmd_b', 'b = 2', '#222222');
    engine.executeCommand('cmd_a', 'a = 3', '#333333', { plot: false });

    const result = engine.exportScene();

    expect(result.status).toBe('success');
    expect(result.scene).toEqual({
      version: 1,
      mode: '3d',
      settings: {
        boundingbox: [-5, 5, 5, -5],
        axis: false,
        showNavigation: false,
        keepaspectratio: false,
        grid: { enabled: true, cellSizePx: 30 },
        view3D: {
          hiddenLine: {
            enabled: true
          }
        }
      },
      commands: [
        { id: 'cmd_a', expression: 'a = 3', color: '#333333', options: { plot: false } },
        { id: 'cmd_b', expression: 'b = 2', color: '#222222', options: undefined }
      ],
      shapes: [],
      relations: []
    });
  });

  it('fails export when runtime contains non-serializable shapes', () => {
    const engine = createFakeEngine();

    engine.registerShape(createNonSerializableShapeDefinition());
    engine.createShape('plain-shape', undefined, { select: false });

    const result = engine.exportScene();

    expect(result.status).toBe('failure');
    expect(result.scene).toBeNull();
    expect(result.diagnostics).toEqual([
      expect.objectContaining({
        code: 'scene_export_shape_not_serializable',
        nodeKind: 'shape',
        nodeType: 'plain-shape'
      })
    ]);
  });

  it('keeps current scene untouched when preflight fails', () => {
    const engine = createFakeEngine();

    engine.registerShape(createSerializableShapeDefinition());
    engine.executeCommand('cmd_1', 'a = 1');
    engine.createShape('serial-shape', { value: 7 }, { select: false });

    const before = engine.exportScene();
    const result = engine.loadScene(JSON.stringify({
      version: 999,
      mode: '2d',
      commands: [],
      shapes: []
    }));
    const after = engine.exportScene();

    expect(result.status).toBe('failure');
    expect(result.diagnostics[0]?.code).toBe('scene_unsupported_version');
    expect(after).toEqual(before);
  });

  it('loads commands and serializable shapes with partial diagnostics and preserved shape ids', () => {
    const engine = createFakeEngine();
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => undefined);

    engine.registerShape(createSerializableShapeDefinition());

    try {
      const result = engine.loadScene({
        version: 1,
        mode: '2d',
        commands: [
          { id: 'cmd_ok', expression: 'ok()' },
          { id: 'cmd_bad', expression: 'bad()' }
        ],
        shapes: [
          { id: 'shape_saved', type: 'serial-shape', payload: { value: 9 } },
          { id: 'shape_missing', type: 'missing-shape', payload: { value: 1 } }
        ]
      });

      expect(result.status).toBe('partial');
      expect(result.appliedCommands).toBe(1);
      expect(result.appliedShapes).toBe(1);
      expect(result.appliedRelations).toBe(0);
      expect(result.diagnostics).toEqual([
        expect.objectContaining({ code: 'scene_command_execute_failed', nodeKind: 'command', nodeId: 'cmd_bad' }),
        expect.objectContaining({ code: 'scene_shape_missing_definition', nodeKind: 'shape', nodeId: 'shape_missing', nodeType: 'missing-shape' })
      ]);
      expect(result.scene?.commands).toEqual([
        { id: 'cmd_ok', expression: 'ok()', color: '#0ea5e9', options: undefined }
      ]);
      expect(result.scene?.shapes).toEqual([
        { id: 'shape_saved', type: 'serial-shape', payload: { value: 9 } }
      ]);
      expect(result.scene?.relations).toEqual([]);
    } finally {
      warnSpy.mockRestore();
    }
  });

  it('round-trips scene relations through load and export', () => {
    const engine = createFakeEngine();

    const result = engine.loadScene({
      version: 1,
      mode: 'geometry',
      commands: [],
      shapes: [],
      relations: [{
        id: 'rel_saved',
        kind: 'distance-assertion',
        targets: [
          { ownerType: 'command', ownerId: 'cmd_a', targetId: 'primary' },
          { ownerType: 'command', ownerId: 'cmd_b', targetId: 'primary' }
        ],
        params: { expectedValue: 5 }
      }]
    });

    expect(result.status).toBe('success');
    expect(result.appliedRelations).toBe(1);
    expect(result.scene?.relations).toEqual([
      {
        id: 'rel_saved',
        kind: 'distance-assertion',
        targets: [
          { ownerType: 'command', ownerId: 'cmd_a', targetId: 'primary' },
          { ownerType: 'command', ownerId: 'cmd_b', targetId: 'primary' }
        ],
        active: true,
        params: { expectedValue: 5, tolerance: undefined }
      }
    ]);
  });

  it('keeps command truth in renderer-neutral core runtime scene while JSXGraph remains a compatibility renderer', () => {
    const engine = createFakeEngine();

    engine.executeCommand('cmd_a', 'A = (1, 2)', '#f43f5e', { strokeWidth: 3 });
    engine.executeCommand('cmd_b', 'B = Point(3, 4)', '#0ea5e9');
    engine.executeCommand('cmd_s', 'Segment(A, B)', '#111827');

    const runtimeScene = engine.exportRuntimeScene();
    expect(runtimeScene.status).toBe('success');
    expect(runtimeScene.scene?.objects.map((node) => node.id)).toEqual(['A', 'B', 'segment-3']);
    expect(runtimeScene.scene?.objects.find((node) => node.id === 'A')).toMatchObject({
      type: 'point',
      payload: { objectType: 'point', position: { dimension: '2d', x: 1, y: 2 }, schemaVersion: 1 },
      renderHints: { strokeColor: '#f43f5e', strokeWidth: 3 }
    });
    expect(JSON.stringify(runtimeScene.scene)).not.toMatch(/JXG|GeometryElement|Board/);
    expect(engine.getCommandObjectNodes('cmd_a')[0]?.id).toBe('A');

    engine.removeCommand('cmd_a');
    expect(engine.getCommandObjectNodes('cmd_a')).toEqual([]);
    expect(engine.getRuntimeSceneSnapshot().objects.map((node) => node.id)).toEqual(['B', 'segment-3']);
  });

  it('notifies business selection subscribers when a shape is selected', () => {
    const engine = createFakeEngine();
    const events: GraphSelectionChangeEvent[] = [];

    engine.registerShape(createSelectableShapeDefinition());
    const unsubscribe = engine.subscribeSelection((event) => events.push(event));

    engine.createShape('selectable-shape');

    expect(events).toHaveLength(2);
    expect(events[0]).toMatchObject({
      primary: null,
      selected: [],
      previous: [],
      reason: 'snapshot',
      source: 'api',
      revision: 0
    });
    expect(events[1]).toMatchObject({
      selected: [{
        kind: 'shape',
        entityType: 'selectable-shape',
        entity: { label: 'Selectable shape' },
        ui: { anchor: 'center' }
      }],
      previous: [],
      reason: 'select',
      source: 'api',
      revision: 1
    });
    expect(events[1].selected[0]?.id).toMatch(/^selectable-shape_/);
    expect(events[1].primary).toEqual(events[1].selected[0]);
    expect(engine.getSelectionItems()).toEqual(events[1].selected);

    unsubscribe();
    engine.createShape('selectable-shape');
    expect(events).toHaveLength(2);
  });

  it('notifies runtime object selection through the public selection API', () => {
    const engine = createFakeEngine();
    const events: GraphSelectionChangeEvent[] = [];

    engine.executeCommand('cmd_a', 'A = (1, 2)', '#0ea5e9');
    engine.subscribeSelection((event) => events.push(event));

    expect(engine.executeRuntimeCapability('math.object.select', {
      scope: 'object',
      objectId: 'A'
    }, true)).toBe(true);

    expect(events).toHaveLength(2);
    expect(events[1]).toMatchObject({
      primary: {
        id: 'A',
        kind: 'command',
        commandId: 'cmd_a',
        objectType: 'point'
      },
      selected: [{
        id: 'A',
        kind: 'command',
        commandId: 'cmd_a',
        objectType: 'point'
      }],
      previous: [],
      reason: 'select',
      source: 'api',
      revision: 1
    });
  });

  it('replaces runtime object selection when a shape becomes selected', () => {
    const engine = createFakeEngine();
    const events: GraphSelectionChangeEvent[] = [];

    engine.registerShape(createSelectableShapeDefinition());
    engine.executeCommand('cmd_a', 'A = (1, 2)', '#0ea5e9');
    engine.subscribeSelection((event) => events.push(event));

    expect(engine.executeRuntimeCapability('math.object.select', {
      scope: 'object',
      objectId: 'A'
    }, true)).toBe(true);
    expect(engine.createShape('selectable-shape')).toBe(true);

    const runtimeObject = engine.exportRuntimeScene().scene?.objects.find((node) => node.id === 'A');
    expect(runtimeObject?.meta?.selected).toBe(false);
    expect(events[events.length - 1]).toMatchObject({
      selected: [{
        kind: 'shape',
        entityType: 'selectable-shape'
      }],
      previous: [{
        id: 'A',
        kind: 'command',
        commandId: 'cmd_a'
      }],
      reason: 'replace',
      source: 'api',
      revision: 2
    });
  });

  it('routes function command DSL through the JSXGraph backend with serializable shared numeric scope', () => {
    const engine = createFakeEngine();
    const created: Array<{ type: string; args: unknown[] }> = [];
    const board = (engine as any).boardMgr.board;
    board.containerObj = document.createElement('div');
    board.create = vi.fn((type: string, args: unknown[]) => {
      created.push({ type, args });
      return { id: `${type}-${created.length}`, elType: type };
    });
    board.removeObject = vi.fn();

    engine.executeCommand('cmd_a', 'a = 0.5', '#64748b');
    engine.executeCommand('cmd_f', 'f(x) = sin(x) + a', '#0ea5e9');
    engine.executeCommand('cmd_df', 'df = Derivative(f)', '#f43f5e');

    expect(created.map((entry) => entry.type)).toEqual(['functiongraph', 'functiongraph']);
    expect((created[0].args[0] as (x: number) => number)(0)).toBeCloseTo(0.5);
    expect((created[1].args[0] as (x: number) => number)(0)).toBeCloseTo(1);
    expect((engine as any).renderer.render).toHaveBeenCalledTimes(1);
    expect(engine.exportRuntimeScene().scene?.objects.map((node) => node.type)).toEqual(['variable', 'function', 'function']);
    expect(engine.exportRuntimeScene().scene?.objects.find((node) => node.id === 'f')?.payload).toMatchObject({
      objectType: 'function',
      expression: 'sin(x) + a',
      parameters: { a: 0.5 }
    });
  });

  it('renders scoped coordinate-system commands at the requested drop origin on the JSXGraph backend', () => {
    const engine = createFakeEngine();
    const created: Array<{ type: string; args: unknown[]; attrs: Record<string, unknown> }> = [];
    const board = (engine as any).boardMgr.board;
    board.containerObj = document.createElement('div');
    board.create = vi.fn((type: string, args: unknown[], attrs: Record<string, unknown>) => {
      created.push({ type, args, attrs });
      return { id: `${type}-${created.length}`, elType: type };
    });
    board.removeObject = vi.fn();

    const coordinateSystem = {
      id: 'coord_drop',
      origin: { x: 3.2, y: -1.8 },
      unitScale: 1,
      xRange: { min: -6, max: 6 },
      yRange: { min: -6, max: 6 },
      snapToGrid: true
    };

    engine.executeCommand('cmd_coord', 'coord_drop = CoordinateSystem("plane")', '#64748b', { coordinateSystem });
    engine.executeCommand('cmd_f', 'f = Function("x^2", -20, 20)', '#0ea5e9', { coordinateSystem });
    engine.executeCommand('cmd_eq', 'eq = Equation("(x - 1)^2 + (y + 1)^2 = 9")', '#f97316', { coordinateSystem });

    expect(created.map((entry) => entry.type)).not.toContain('functiongraph');
    expect(created.filter((entry) => entry.type === 'curve').length).toBeGreaterThanOrEqual(2);
    expect(created.filter((entry) => entry.type === 'arrow')).toHaveLength(2);
    expect(created.every((entry) => entry.attrs.fixed === true)).toBe(true);

    const objects = engine.exportRuntimeScene().scene?.objects ?? [];
    const coord = objects.find((node) => node.id === 'coord_drop');
    expect(coord).toMatchObject({
      type: 'coordinate-system',
      meta: { coordinateSystemId: 'coord_drop', independentCoordinateSystem: true, draggable: true, snapToGrid: true },
      payload: {
        origin: { dimension: '2d', x: 3, y: -2 },
        unitPx: 1,
        geometry: {
          xAxis: [{ x: -3, y: -2 }, { x: 9, y: -2 }],
          yAxis: [{ x: 3, y: -8 }, { x: 3, y: 4 }]
        }
      }
    });

    const fn = objects.find((node) => node.id === 'f');
    expect(fn).toMatchObject({
      type: 'function',
      meta: { coordinateSystemId: 'coord_drop', independentCoordinateSystem: true, draggable: false },
      payload: { geometry: { kind: 'polyline', points: expect.any(Array) } }
    });
    expect(fn?.renderHints).toMatchObject({
      draggable: false,
      lineCap: 'butt',
      clipWorldBounds: { left: -3, right: 9, top: 4, bottom: -8 }
    });
    const fnPoints = (fn?.payload as any).geometry.points as Array<{ x: number; y: number }>;
    expect(fnPoints.length).toBeGreaterThan(0);
    expect(fnPoints.every((point) => (
      point.x >= -3 - 1e-9
      && point.x <= 9 + 1e-9
      && point.y >= -8 - 1e-9
      && point.y <= 4 + 1e-9
    ))).toBe(true);

    const equation = objects.find((node) => node.id === 'eq');
    expect(equation).toMatchObject({
      type: expect.stringMatching(/^(equation|implicit)$/),
      meta: { coordinateSystemId: 'coord_drop', independentCoordinateSystem: true, draggable: false },
      payload: { geometry: expect.objectContaining({ kind: 'polyline' }) }
    });
    const equationPoints = flattenGeometryPoints((equation?.payload as any)?.geometry);
    expect(equationPoints).toHaveLength(145);
    expect(equationPoints.every((point) => (
      point.x >= -3 - 1e-9
      && point.x <= 9 + 1e-9
      && point.y >= -8 - 1e-9
      && point.y <= 4 + 1e-9
    ))).toBe(true);
  });

  it('keeps phase-end coordinate-system origins unsnapped until release', () => {
    const engine = createFakeEngine();
    const board = (engine as any).boardMgr.board;
    board.containerObj = document.createElement('div');
    board.create = vi.fn((type: string) => ({ id: `${type}-${board.create.mock.calls.length}`, elType: type }));
    board.removeObject = vi.fn();

    const coordinateSystem = {
      id: 'coord_snap_end',
      origin: { x: 3.2, y: -1.8 },
      unitScale: 1,
      xRange: { min: -6, max: 6 },
      yRange: { min: -6, max: 6 },
      snapToGrid: { enabled: true, phase: 'end' }
    };

    engine.executeCommand('cmd_coord', 'coord_snap_end = CoordinateSystem("plane")', '#64748b', { coordinateSystem });

    const coord = engine.exportRuntimeScene().scene?.objects.find((node) => node.id === 'coord_snap_end');
    expect(coord).toMatchObject({
      type: 'coordinate-system',
      payload: {
        origin: { dimension: '2d', x: 3.2, y: -1.8 },
        geometry: {
          xAxis: [{ x: -2.8, y: -1.8 }, { x: 9.2, y: -1.8 }],
          yAxis: [{ x: 3.2, y: -7.8 }, { x: 3.2, y: 4.2 }]
        }
      }
    });
  });

  it('moves scoped coordinate-system commands together with their graph content', () => {
    const engine = createFakeEngine();
    const board = (engine as any).boardMgr.board;
    board.containerObj = document.createElement('div');
    board.create = vi.fn((type: string) => ({ id: `${type}-${board.create.mock.calls.length}`, elType: type }));
    board.removeObject = vi.fn();

    const coordinateSystem = {
      id: 'coord_drag',
      origin: { x: 0, y: 0 },
      unitScale: 1,
      xRange: { min: -6, max: 6 },
      yRange: { min: -6, max: 6 }
    };

    engine.executeCommand('cmd_coord', 'coord_drag = CoordinateSystem("plane")', '#64748b', { coordinateSystem });
    engine.executeCommand('cmd_f', 'f = Function("x", -6, 6)', '#0ea5e9', { coordinateSystem });

    const beforeFunction = engine.exportRuntimeScene().scene?.objects.find((node) => node.id === 'f');
    const beforePoints = ((beforeFunction?.payload as any).geometry.points as Array<{ x: number; y: number }>).map((point) => ({ ...point }));
    const beforeCoordinate = engine.exportRuntimeScene().scene?.objects.find((node) => node.id === 'coord_drag');
    const beforeLabel = ((beforeCoordinate?.payload as any).geometry.labels as Array<{ text: string; point: { x: number; y: number } }>).find((label) => label.text === 'y');

    expect(engine.executeRuntimeCapability('math.object.move', {
      scope: 'object',
      objectId: 'coord_drag'
    }, { delta: { dimension: '2d', dx: 3, dy: -2 } })).toBe(true);

    const objects = engine.exportRuntimeScene().scene?.objects ?? [];
    const movedCoordinate = objects.find((node) => node.id === 'coord_drag');
    expect(movedCoordinate?.payload).toMatchObject({
      origin: { dimension: '2d', x: 3, y: -2 },
      geometry: {
        xAxis: [{ x: -3, y: -2 }, { x: 9, y: -2 }],
        yAxis: [{ x: 3, y: -8 }, { x: 3, y: 4 }]
      }
    });
    const movedLabel = ((movedCoordinate?.payload as any).geometry.labels as Array<{ text: string; point: { x: number; y: number } }>).find((label) => label.text === 'y');
    expect(movedLabel?.point).toEqual({ x: (beforeLabel?.point.x ?? 0) + 3, y: (beforeLabel?.point.y ?? 0) - 2 });

    const movedFunction = objects.find((node) => node.id === 'f');
    const movedPoints = (movedFunction?.payload as any).geometry.points as Array<{ x: number; y: number }>;
    expect(movedPoints[0]).toEqual({ x: beforePoints[0].x + 3, y: beforePoints[0].y - 2 });
    expect(movedFunction?.renderHints).toMatchObject({
      clipWorldBounds: { left: -3, right: 9, top: 4, bottom: -8 }
    });
    expect(board.removeObject).toHaveBeenCalled();
  });

  it('selects clicked JSXGraph backend command objects and syncs stroke-width-only selection state', () => {
    const engine = createFakeEngine();
    const selectionEvents: GraphSelectionChangeEvent[] = [];
    const created: Array<{ type: string; args: unknown[]; attrs: Record<string, unknown>; element: Record<string, unknown> }> = [];
    const board = (engine as any).boardMgr.board;
    board.containerObj = document.createElement('div');
    board.create = vi.fn((type: string, args: unknown[], attrs: Record<string, unknown>) => {
      const element: Record<string, unknown> = { id: `${type}-${created.length + 1}`, elType: type };
      created.push({ type, args, attrs, element });
      return element;
    });
    board.removeObject = vi.fn();

    engine.executeCommand('cmd_a', 'A = (1, 2)', '#0ea5e9');
    expect(created[0].element.__vuegraphxCoreObjectId).toBe('A');
    engine.subscribeSelection((event) => selectionEvents.push(event));

    board.getAllObjectsUnderMouse = vi.fn(() => [created[0].element]);
    (engine as any).setupGlobalEvents();
    const downCall = board.on.mock.calls.find((call: unknown[]) => call[0] === 'down');
    const down = downCall?.[1] as ((event: unknown) => void) | undefined;
    expect(typeof down).toBe('function');
    if (!down) throw new Error('down handler was not registered');
    down({});

    expect(engine.exportRuntimeScene().scene?.objects.find((node) => node.id === 'A')?.meta?.selected).toBe(true);
    expect(selectionEvents[1]).toMatchObject({
      selected: [{
        id: 'A',
        kind: 'command',
        commandId: 'cmd_a',
        objectType: 'point'
      }],
      previous: [],
      reason: 'select',
      source: 'pointer'
    });
    expect(created[1]).toMatchObject({
      type: 'point',
      attrs: {
        strokeColor: '#0ea5e9',
        fillColor: '#0ea5e926',
        strokeWidth: 4
      }
    });

    board.getAllObjectsUnderMouse = vi.fn(() => []);
    down({});
    expect(engine.exportRuntimeScene().scene?.objects.find((node) => node.id === 'A')?.meta?.selected).toBe(false);
    expect(selectionEvents[2]).toMatchObject({
      selected: [],
      previous: [{
        id: 'A',
        kind: 'command',
        commandId: 'cmd_a'
      }],
      reason: 'clear',
      source: 'pointer'
    });
    expect(created[2]).toMatchObject({
      type: 'point',
      attrs: {
        strokeWidth: 2
      }
    });
  });

  it('keeps runtime object deselection scoped to the requested object', () => {
    const engine = createFakeEngine();

    engine.executeCommand('cmd_a', 'A = (1, 2)', '#0ea5e9');
    engine.executeCommand('cmd_b', 'B = (3, 4)', '#10b981');

    expect(engine.executeRuntimeCapability('math.object.select', { scope: 'object', objectId: 'A' }, true)).toBe(true);
    expect(engine.executeRuntimeCapability('math.object.select', { scope: 'object', objectId: 'B' }, true)).toBe(true);
    expect(engine.exportRuntimeScene().scene?.objects.find((node) => node.id === 'A')?.meta?.selected).toBe(true);
    expect(engine.exportRuntimeScene().scene?.objects.find((node) => node.id === 'B')?.meta?.selected).toBe(true);

    expect(engine.executeRuntimeCapability('math.object.select', { scope: 'object', objectId: 'A' }, false)).toBe(true);

    expect(engine.exportRuntimeScene().scene?.objects.find((node) => node.id === 'A')?.meta?.selected).toBe(false);
    expect(engine.exportRuntimeScene().scene?.objects.find((node) => node.id === 'B')?.meta?.selected).toBe(true);
  });

  it('notifies selection clear events for scene clear-selection', () => {
    const engine = createFakeEngine();
    const events: GraphSelectionChangeEvent[] = [];

    engine.executeCommand('cmd_a', 'A = (1, 2)', '#0ea5e9');
    engine.subscribeSelection((event) => events.push(event));

    expect(engine.executeRuntimeCapability('math.object.select', {
      scope: 'object',
      objectId: 'A'
    }, true)).toBe(true);
    expect(engine.executeRuntimeCapability('math.scene.clear-selection', { scope: 'scene' })).toBe(true);

    expect(events).toHaveLength(3);
    expect(events[2]).toMatchObject({
      primary: null,
      selected: [],
      previous: [{
        id: 'A',
        kind: 'command',
        commandId: 'cmd_a',
        objectType: 'point'
      }],
      reason: 'clear',
      source: 'clear',
      revision: 2
    });
  });

  it('notifies delete-sourced selection clear when a selected command is removed', () => {
    const engine = createFakeEngine();
    const events: GraphSelectionChangeEvent[] = [];

    engine.executeCommand('cmd_a', 'A = (1, 2)', '#0ea5e9');
    engine.subscribeSelection((event) => events.push(event));

    expect(engine.executeRuntimeCapability('math.object.select', {
      scope: 'object',
      objectId: 'A'
    }, true)).toBe(true);
    engine.removeCommand('cmd_a');

    expect(events).toHaveLength(3);
    expect(events[2]).toMatchObject({
      primary: null,
      selected: [],
      previous: [{
        id: 'A',
        kind: 'command',
        commandId: 'cmd_a',
        objectType: 'point'
      }],
      reason: 'clear',
      source: 'delete',
      revision: 2
    });
  });

  it('routes angle command DSL through the JSXGraph backend adapter', () => {
    const engine = createFakeEngine();
    const created: Array<{ type: string; args: unknown[] }> = [];
    const board = (engine as any).boardMgr.board;
    board.containerObj = document.createElement('div');
    board.create = vi.fn((type: string, args: unknown[]) => {
      created.push({ type, args });
      return { id: `${type}-${created.length}`, elType: type };
    });
    board.removeObject = vi.fn();

    engine.executeCommand('cmd_a', 'A = (0, 0)', '#0ea5e9');
    engine.executeCommand('cmd_b', 'B = (2, 0)', '#0ea5e9');
    engine.executeCommand('cmd_c', 'C = (0, 2)', '#0ea5e9');
    engine.executeCommand('cmd_angle', 'ang = Angle(B, A, C)', '#10b981');

    expect(created.map((entry) => entry.type)).toEqual(['point', 'point', 'point', 'angle']);
    expect(created[3].args).toEqual([[2, 0], [0, 0], [0, 2]]);
    expect((engine as any).renderer.render).not.toHaveBeenCalled();
    expect(engine.exportRuntimeScene().scene?.objects.map((node) => node.type)).toEqual(['point', 'point', 'point', 'measurement']);
  });

  it('routes arc, sector, semicircle, polyline, and text DSL through the JSXGraph backend adapter', () => {
    const engine = createFakeEngine();
    const created: Array<{ type: string; args: unknown[] }> = [];
    const board = (engine as any).boardMgr.board;
    board.containerObj = document.createElement('div');
    board.create = vi.fn((type: string, args: unknown[]) => {
      created.push({ type, args });
      return { id: `${type}-${created.length}`, elType: type };
    });
    board.removeObject = vi.fn();

    engine.executeCommand('cmd_a', 'A = (0, 0)', '#0ea5e9');
    engine.executeCommand('cmd_b', 'B = (2, 0)', '#0ea5e9');
    engine.executeCommand('cmd_c', 'C = (0, 2)', '#0ea5e9');
    engine.executeCommand('cmd_arc', 'arc = Arc(A, B, C)', '#10b981');
    engine.executeCommand('cmd_sector', 'sector = Sector(A, B, C)', '#f59e0b');
    engine.executeCommand('cmd_semi', 'semi = Semicircle(B, C)', '#8b5cf6');
    engine.executeCommand('cmd_chain', 'chain = PolygonalChain(A, B, C)', '#111827');
    engine.executeCommand('cmd_regular', 'regular = RegularPolygon(A, B, 4)', '#22c55e');
    engine.executeCommand('cmd_para', 'para = Parallelogram(A, B, C)', '#0f766e');
    engine.executeCommand('cmd_circ', 'circ = Circumcircle(A, B, C)', '#2563eb');
    engine.executeCommand('cmd_inc', 'inc = Incircle(A, B, C)', '#dc2626');
    engine.executeCommand('cmd_cc', 'cc = Circumcenter(A, B, C)', '#64748b');
    engine.executeCommand('cmd_ic', 'ic = Incenter(A, B, C)', '#334155');
    engine.executeCommand('cmd_text', 'label = Text(A, "origin")', '#64748b');

    expect(created.map((entry) => entry.type)).toEqual([
      'point',
      'point',
      'point',
      'arc',
      'sector',
      'semicircle',
      'curve',
      'polygon',
      'polygon',
      'circle',
      'circle',
      'point',
      'point',
      'text'
    ]);
    expect(created[3].args).toEqual([[0, 0], [2, 0], [0, 2]]);
    expect(created[5].args).toEqual([[2, 0], [0, 2]]);
    expect(created[7].args).toHaveLength(4);
    expect(created[9].args).toEqual([[1, 1], Math.SQRT2]);
    expect(created[13].args.slice(0, 2)).toEqual([0, 0]);
    expect(typeof created[13].args[2]).toBe('function');
    expect((created[13].args[2] as () => string)()).toContain('origin');
    expect((engine as any).renderer.render).not.toHaveBeenCalled();
    expect(engine.exportRuntimeScene().scene?.objects.map((node) => node.type)).toEqual([
      'point',
      'point',
      'point',
      'conic',
      'conic',
      'conic',
      'polygon',
      'polygon',
      'polygon',
      'conic',
      'conic',
      'point',
      'point',
      'text'
    ]);
  });

  it('executes core capabilities for command-owned objects and synchronizes compatible JSXGraph render state', () => {
    const engine = createFakeEngine();

    engine.executeCommand('cmd_a', 'A = (1, 2)', '#0ea5e9');
    const applied = engine.executeRuntimeCapability('math.object.set-color', {
      scope: 'object',
      objectId: 'A'
    }, '#22c55e');

    expect(applied).toBe(true);
    expect(engine.exportRuntimeScene().scene?.objects.find((node) => node.id === 'A')?.renderHints?.strokeColor).toBe('#22c55e');
    expect((engine as any).renderer.render).toHaveBeenLastCalledWith('2d', 'A = (1, 2)', '#22c55e', expect.objectContaining({ strokeColor: '#22c55e' }), 'cmd_a');

    expect(engine.executeRuntimeCapability('math.object.delete', {
      scope: 'object',
      objectId: 'A'
    })).toBe(true);
    expect(engine.exportRuntimeScene().scene?.objects).toEqual([]);
    expect(engine.exportScene().scene?.commands).toEqual([]);
  });

  it('keeps point move capability as core-authority and rewrites compatible point commands', () => {
    const engine = createFakeEngine();

    engine.executeCommand('cmd_a', 'A = (1, 2)', '#0ea5e9');
    expect(engine.executeRuntimeCapability('math.object.move', {
      scope: 'object',
      objectId: 'A'
    }, { delta: { dimension: '2d', dx: 3, dy: -1 } })).toBe(true);

    expect(engine.exportRuntimeScene().scene?.objects.find((node) => node.id === 'A')?.payload).toEqual({
      objectType: 'point',
      point: { x: 4, y: 1 },
      position: { dimension: '2d', x: 4, y: 1 },
      schemaVersion: 1
    });
    expect(engine.exportScene().scene?.commands).toEqual([
      { id: 'cmd_a', expression: 'A = (4, 1)', color: '#0ea5e9', options: undefined }
    ]);
  });

  it('executes scene-level runtime capabilities against both core state and compatibility renderer state', () => {
    const engine = createFakeEngine();

    engine.executeCommand('cmd_a', 'A = (1, 2)', '#0ea5e9');
    engine.executeCommand('cmd_b', 'B = (3, 4)', '#f43f5e');
    expect(engine.exportRuntimeScene().scene?.objects).toHaveLength(2);

    expect(engine.executeRuntimeCapability('math.scene.clear-all', { scope: 'scene' })).toBe(true);

    expect(engine.exportRuntimeScene().scene?.objects).toEqual([]);
    expect(engine.exportScene().scene?.commands).toEqual([]);
    expect((engine as any).boardMgr.resetBoard).toHaveBeenCalledOnce();
    expect((engine as any).entityMgr.clearAll).toHaveBeenCalled();
  });
});

const flattenGeometryPoints = (geometry: any): Array<{ x: number; y: number }> => {
  if (geometry?.kind === 'polyline' && Array.isArray(geometry.points)) return geometry.points;
  if ((geometry?.kind === 'multiline' || geometry?.kind === 'wireframe') && Array.isArray(geometry.segments)) return geometry.segments.flat();
  return [];
};
