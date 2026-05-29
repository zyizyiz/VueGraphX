import { describe, expect, it, vi } from 'vitest';
import type { GraphShapeDefinition, GraphShapeInstance } from '../architecture/shapes/contracts';
import type { EngineMode, GraphXOptions } from '../types/engine';
import { GraphXEngine } from './GraphXEngine';
import { GraphRelationState } from './relationState';
import { GraphSceneState } from './sceneState';
import { GraphSceneStore } from '@vuegraphx/core';

const createShapeInstance = (id: string, entityType: string, payload?: unknown): GraphShapeInstance => ({
  id,
  entityType,
  setSelected: vi.fn(),
  getCapabilityTarget: () => null,
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
    relationListeners: [],
    mutationBatchDepth: 0,
    pendingCapabilityNotification: false
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
    expect(created[13].args).toEqual([0, 0, 'origin']);
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
