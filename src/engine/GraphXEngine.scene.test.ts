import { describe, expect, it, vi } from 'vitest';
import type { GraphShapeDefinition, GraphShapeInstance } from '../architecture/shapes/contracts';
import type { EngineMode, GraphXOptions } from '../types/engine';
import { GraphXEngine } from './GraphXEngine';
import { GraphRelationState } from './relationState';
import { GraphSceneState } from './sceneState';

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

  const engine = Object.assign(Object.create(GraphXEngine.prototype), {
    boardMgr,
    currentOptions: undefined,
    entityMgr: {
      registerCommandElements: vi.fn(),
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
    renderer: {
      render: vi.fn((_mode: EngineMode, expression: string, _color: string, _options: unknown, id: string) => {
        if (expression === 'bad()') {
          throw new Error('bad command');
        }
        return [{ name: `${id}:${expression}` }];
      }),
      mathScope: {
        clear: vi.fn()
      }
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
});
