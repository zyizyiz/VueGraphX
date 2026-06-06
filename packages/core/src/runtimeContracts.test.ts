import { describe, expect, it } from 'vitest';
import {
  DEFAULT_GRAPH_LAYER_ORDER,
  GraphInteractionRouter,
  GraphSceneRuntime,
  GraphSceneStore,
  GRAPH_RELATION_SNAPSHOT_VERSION,
  SUPPORTED_GRAPH_SCENE_OBJECT_IR_TYPES,
  SUBJECT_CANVAS_DRAG_DISABLED_REASON,
  GRAPH_ACTIVE_MATH_INTERACTION_CAPABILITY_IDS,
  GRAPH_MATH_INTERACTION_CAPABILITY_PATHS,
  createGraphBackendInteractionCapability,
  createGraphBackendMathInteractionCapabilities,
  createGraphCoordinateSystemDragController,
  createGraphRelationInvalidationPlan,
  createGraphRelationSnapshot,
  createGraphCapabilitiesForObject,
  createGraphDragPatch,
  createGraphObjectNode,
  createGraphObjectSelectionController,
  createGraphSceneObjectIrNode,
  createGraphViewportCoordinateModel,
  executeGraphCapability,
  hasRendererFrameworkLeak,
  inferGraphTextFormat,
  mergeGraphObjectPatch,
  normalizeGraphLatexSource,
  resolveGraphTextRenderDescriptor,
  resolveGraphDragOperation,
  unsupportedGraphSceneObjectIrDiagnostic,
  validateGraphBackendMathInteractionCapabilities,
  validateGraphRelationSnapshot,
  type GraphBackendHost,
  type GraphObjectNode,
  type GraphRenderBackend,
  type GraphRuntimeSelectionChangeEvent
} from './index';

const createPointNode = (id: string, x: number, y: number): GraphObjectNode => {
  const result = createGraphSceneObjectIrNode({
    id,
    objectType: 'point',
    payload: { objectType: 'point', position: { dimension: '2d', x, y } },
    layerId: 'content'
  });
  if (!result.ok || !result.value) {
    throw new Error(`Failed to create test point node ${id}: ${result.diagnostics.map((diagnostic) => diagnostic.code).join(', ')}`);
  }
  return result.value;
};

const createCoreOnlyTestBackend = (id = 'core-test'): GraphRenderBackend => {
  const nodes = new Map<string, GraphObjectNode>();

  return {
    id,
    capabilities: {
      pick: true,
      project: true,
      unproject: true,
      drag: true,
      layers: true,
      dimensions: ['2d']
    },
    mount: (_host, options = {}) => ({ backendId: options.backendId ?? id, size: options.size }),
    create: (node, context = {}) => {
      const stored = createGraphObjectNode({ ...node, layerId: context.layerId ?? node.layerId ?? 'content' });
      nodes.set(stored.id, stored);
      const handle = {
        id: `${id}:${stored.id}`,
        objectId: stored.id,
        backendId: id,
        layerId: stored.layerId ?? 'content',
        target: {
          scope: 'object' as const,
          objectId: stored.id,
          backendId: id,
          layerId: stored.layerId ?? 'content'
        }
      };
      return { ok: true, value: handle, diagnostics: [] };
    },
    update: (handle, patch) => {
      const current = nodes.get(handle.objectId);
      if (current) nodes.set(handle.objectId, mergeGraphObjectPatch(current, patch));
    },
    remove: (handle) => {
      nodes.delete(handle.objectId);
    },
    pick: (point, options = {}) => {
      const tolerance = options.tolerancePx ?? 8;
      for (const node of [...nodes.values()].reverse()) {
        const layerId = node.layerId ?? 'content';
        if (options.layerOrder && !options.layerOrder.includes(layerId)) continue;
        const hitGroups = readTestHitGroups(node);
        if (options.hitGroups && !hitGroups.some((group) => options.hitGroups?.includes(group))) continue;
        const payload = node.payload as { point?: { x: number; y: number }; position?: { dimension?: string; x: number; y: number } };
        const objectPoint = payload.point ?? (payload.position?.dimension === '2d' ? payload.position : undefined);
        if (!objectPoint) continue;
        const distancePx = Math.hypot(objectPoint.x - point.x, objectPoint.y - point.y);
        if (distancePx <= tolerance) {
          return {
            target: { scope: 'object', objectId: node.id, backendId: id, layerId },
            backendId: id,
            layerId,
            clientPoint: { ...point },
            worldPoint: { dimension: '2d', x: objectPoint.x, y: objectPoint.y },
            distancePx,
            hitGroup: hitGroups[0],
            meta: { hitGroups }
          };
        }
      }
      return null;
    },
    project: (point) => ({ x: point.x, y: point.y }),
    unproject: (point) => ({ dimension: '2d', x: point.x, y: point.y }),
    resize: () => {},
    destroy: () => {
      nodes.clear();
    }
  };
};

const readTestHitGroups = (node: GraphObjectNode): string[] => {
  const meta = node.meta as Record<string, unknown> | undefined;
  const fromMeta = Array.isArray(meta?.hitGroups) ? meta.hitGroups : [meta?.hitGroup];
  const groups = fromMeta.filter((group): group is string => typeof group === 'string' && group.length > 0);
  return groups.length > 0 ? groups : [node.type, node.kind];
};

describe('renderer-neutral core runtime contracts', () => {
  it('accepts generic point and text visual style hints in scene object IR payloads', () => {
    const result = createGraphSceneObjectIrNode({
      id: 'styled-point',
      objectType: 'point',
      payload: {
        objectType: 'point',
        position: { dimension: '2d', x: 1, y: 2 },
        style: {
          radius: 4,
          pointFillColor: '#FFFFFF',
          pointStrokeColor: '#333333',
          pointStrokeWidth: 1.5,
          pointShadowColor: 'rgba(0,0,0,0.2)',
          pointShadowBlur: 2,
          pointShadowOffsetX: 1,
          pointShadowOffsetY: 1,
          textColor: '#FF3333',
          textOpacity: 0.9,
          fontSize: 14,
          fontFamily: 'PingFang SC, Microsoft YaHei, Arial, sans-serif',
          fontWeight: 500,
          lineHeight: 14,
          textBackgroundColor: '#FFFFFF',
          textBorderColor: '#333333',
          textBorderWidth: 1.5,
          textBorderRadius: 3,
          textPaddingX: 4,
          textPaddingY: 2,
          textOffsetX: 6,
          textOffsetY: -6,
          textShadowColor: 'rgba(0,0,0,0.16)',
          textShadowBlur: 2,
          textShadowOffsetX: 0,
          textShadowOffsetY: 1
        }
      },
      layerId: 'content'
    });

    expect(result.ok).toBe(true);
    expect(result.value?.payload).toMatchObject({
      style: {
        pointFillColor: '#FFFFFF',
        pointStrokeWidth: 1.5,
        textColor: '#FF3333',
        fontWeight: 500,
        textOffsetY: -6
      }
    });
    expect(result.value?.renderHints).toMatchObject({
      radius: 4,
      pointFillColor: '#FFFFFF',
      pointStrokeColor: '#333333',
      pointStrokeWidth: 1.5,
      pointShadowColor: 'rgba(0,0,0,0.2)',
      textColor: '#FF3333',
      textOpacity: 0.9,
      fontSize: 14,
      fontFamily: 'PingFang SC, Microsoft YaHei, Arial, sans-serif',
      fontWeight: 500,
      lineHeight: 14,
      textBackgroundColor: '#FFFFFF',
      textBorderColor: '#333333',
      textOffsetX: 6,
      textOffsetY: -6,
      textShadowColor: 'rgba(0,0,0,0.16)'
    });
  });

  it('lets explicit render hints override scene object IR style defaults', () => {
    const result = createGraphSceneObjectIrNode({
      id: 'styled-point-override',
      objectType: 'point',
      payload: {
        objectType: 'point',
        position: { dimension: '2d', x: 1, y: 2 },
        style: {
          strokeColor: '#111827',
          pointFillColor: '#FFFFFF',
          lineDash: [4, 8]
        }
      },
      renderHints: {
        strokeColor: '#FF3333',
        selected: true
      }
    });

    expect(result.ok).toBe(true);
    expect(result.value?.renderHints).toMatchObject({
      strokeColor: '#FF3333',
      pointFillColor: '#FFFFFF',
      selected: true
    });
    expect(result.value?.renderHints?.lineDash).toEqual([4, 8]);
  });

  it('defines the active math interaction contract without replacing legacy backend booleans', () => {
    expect(GRAPH_MATH_INTERACTION_CAPABILITY_PATHS).toEqual([
      'viewport.zoom',
      'viewport.gestureZoom',
      'viewport.pan',
      'object.pick',
      'object.select',
      'object.highlight',
      'project',
      'unproject',
      'diagnostics'
    ]);
    expect(GRAPH_ACTIVE_MATH_INTERACTION_CAPABILITY_IDS).toEqual([
      'math.viewport.select',
      'math.viewport.move',
      'math.viewport.resize',
      'math.viewport.pan',
      'math.viewport.zoom',
      'math.object.select'
    ]);

    const legacyOnlyCapabilities = {
      pick: true,
      project: true,
      unproject: true,
      drag: true,
      layers: true,
      dimensions: ['2d'] as const
    };
    expect(legacyOnlyCapabilities.pick).toBe(true);
    expect(validateGraphBackendMathInteractionCapabilities('legacy-backend', legacyOnlyCapabilities)).toEqual([
      expect.objectContaining({
        code: 'backend.math-interactions.missing',
        severity: 'error',
        target: { scope: 'backend-layer', backendId: 'legacy-backend' }
      })
    ]);
  });

  it('validates explicit supported, partial, and unsupported math backend interaction statuses', () => {
    const supportedInteractions = Object.fromEntries(
      GRAPH_MATH_INTERACTION_CAPABILITY_PATHS.map((path) => [path, createGraphBackendInteractionCapability('supported')])
    );
    const capabilities = {
      pick: true,
      project: true,
      unproject: true,
      drag: true,
      layers: true,
      dimensions: ['2d'] as const,
      mathInteractions: createGraphBackendMathInteractionCapabilities({
        ...supportedInteractions,
        'viewport.gestureZoom': createGraphBackendInteractionCapability('partial-support', {
          reason: 'Native pinch degrades to modifier-wheel on this host.'
        }),
        'object.highlight': createGraphBackendInteractionCapability('unsupported', {
          reason: 'Selected styling is not implemented.'
        })
      })
    };

    expect(capabilities.mathInteractions.viewport.zoom.status).toBe('supported');
    expect(validateGraphBackendMathInteractionCapabilities('diagnostic-backend', capabilities)).toEqual([
      expect.objectContaining({
        code: 'backend.math-interaction.partial-support',
        severity: 'warning',
        message: 'Native pinch degrades to modifier-wheel on this host.'
      }),
      expect.objectContaining({
        code: 'backend.math-interaction.unsupported',
        severity: 'error',
        message: 'Selected styling is not implemented.'
      })
    ]);
  });

  it('treats omitted math interaction paths as unsupported instead of silently supported', () => {
    const capabilities = {
      pick: true,
      project: true,
      unproject: true,
      drag: true,
      layers: true,
      dimensions: ['2d'] as const,
      mathInteractions: createGraphBackendMathInteractionCapabilities({
        'viewport.zoom': createGraphBackendInteractionCapability('supported')
      })
    };

    expect(capabilities.mathInteractions.viewport.zoom.status).toBe('supported');
    expect(capabilities.mathInteractions.viewport.gestureZoom.status).toBe('unsupported');
    expect(validateGraphBackendMathInteractionCapabilities('undeclared-backend', capabilities)).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          code: 'backend.math-interaction.unsupported',
          severity: 'error',
          message: 'Math interaction capability viewport.gestureZoom is undeclared.'
        })
      ])
    );
  });

  it('normalizes renderer-neutral LaTeX text descriptors for backend adapters', () => {
    const node = createGraphSceneObjectIrNode({
      id: 'latex-label',
      objectType: 'text',
      payload: {
        objectType: 'text',
        content: '$$\\frac{a}{b}$$',
        anchor: { coordinates: { dimension: '2d', x: 1, y: 2 } },
        format: 'latex'
      }
    });

    expect(node.ok).toBe(true);
    expect(resolveGraphTextRenderDescriptor(node.value!)).toEqual({
      text: '$$\\frac{a}{b}$$',
      format: 'latex',
      latex: '\\frac{a}{b}',
      displayMode: true
    });
    expect(normalizeGraphLatexSource('\\(x^2\\)')).toEqual({ latex: 'x^2', displayMode: false });
    expect(inferGraphTextFormat('$x^2$')).toBe('latex');
    expect(inferGraphTextFormat('plain text')).toBe('plain');

    const store = new GraphSceneStore('latex-export');
    store.addObject(createGraphObjectNode({
      id: 'formula-command',
      kind: 'overlay',
      type: 'text',
      payload: { point: { x: 0, y: 0 }, text: '$x^2$', format: 'latex' },
      layerId: 'overlay'
    }));
    const exported = store.toJSON();
    expect(exported.value?.objects[0]?.payload).toMatchObject({
      objectType: 'text',
      content: '$x^2$',
      format: 'latex'
    });

    const legacyStore = new GraphSceneStore('legacy-text-format-export');
    const legacyResult = legacyStore.addObject(createGraphObjectNode({
      id: 'legacy-label',
      kind: 'overlay',
      type: 'text',
      payload: { point: { x: 0, y: 0 }, text: 'plain label', format: 'html' },
      layerId: 'overlay'
    }));
    expect(legacyResult.ok).toBe(true);
    expect(legacyStore.toJSON().value?.objects[0]?.payload).toMatchObject({
      objectType: 'text',
      content: 'plain label',
      format: 'plain'
    });
  });

  it('defines renderer-neutral scene object IR for M1 graph object families', () => {
    expect(SUPPORTED_GRAPH_SCENE_OBJECT_IR_TYPES).toEqual([
      'point',
      'line',
      'segment',
      'ray',
      'polygon',
      'conic',
      'text',
      'function',
      'parametric',
      'implicit',
      'vector',
      'transform',
      'measurement',
      'solid',
      'coordinate-system'
    ]);

    const sceneObjects = [
      createGraphSceneObjectIrNode({
        id: 'point-a',
        objectType: 'point',
        payload: { objectType: 'point', position: { dimension: '2d', x: 1, y: 2 } }
      }),
      createGraphSceneObjectIrNode({
        id: 'line-ab',
        objectType: 'line',
        payload: {
          objectType: 'line',
          definition: {
            mode: 'through-points',
            points: [{ objectId: 'point-a' }, { coordinates: { dimension: '2d', x: 3, y: 4 } }]
          }
        }
      }),
      createGraphSceneObjectIrNode({
        id: 'segment-ab',
        objectType: 'segment',
        payload: {
          objectType: 'segment',
          endpoints: [{ objectId: 'point-a' }, { coordinates: { dimension: '2d', x: 5, y: 6 } }]
        }
      }),
      createGraphSceneObjectIrNode({
        id: 'ray-ab',
        objectType: 'ray',
        payload: {
          objectType: 'ray',
          origin: { objectId: 'point-a' },
          through: { coordinates: { dimension: '2d', x: 8, y: 9 } }
        }
      }),
      createGraphSceneObjectIrNode({
        id: 'polygon-abc',
        objectType: 'polygon',
        payload: {
          objectType: 'polygon',
          vertices: [
            { objectId: 'point-a' },
            { coordinates: { dimension: '2d', x: 4, y: 0 } },
            { coordinates: { dimension: '2d', x: 0, y: 4 } }
          ],
          closed: true
        }
      }),
      createGraphSceneObjectIrNode({
        id: 'conic-c',
        objectType: 'conic',
        payload: {
          objectType: 'conic',
          conicKind: 'ellipse',
          definition: {
            mode: 'center-radii',
            center: { coordinates: { dimension: '2d', x: 0, y: 0 } },
            radiusX: 3,
            radiusY: 2
          }
        }
      }),
      createGraphSceneObjectIrNode({
        id: 'text-t',
        objectType: 'text',
        payload: {
          objectType: 'text',
          content: 'A',
          anchor: { objectId: 'point-a' },
          format: 'plain'
        }
      }),
      createGraphSceneObjectIrNode({
        id: 'function-f',
        objectType: 'function',
        payload: {
          objectType: 'function',
          expression: 'sin(x)',
          variable: 'x',
          domain: { min: -Math.PI, max: Math.PI }
        }
      }),
      createGraphSceneObjectIrNode({
        id: 'parametric-p',
        objectType: 'parametric',
        payload: {
          objectType: 'parametric',
          parameter: 't',
          xExpression: 'cos(t)',
          yExpression: 'sin(t)',
          domain: { min: 0, max: Math.PI * 2 }
        }
      }),
      createGraphSceneObjectIrNode({
        id: 'implicit-i',
        objectType: 'implicit',
        payload: {
          objectType: 'implicit',
          expression: 'x^2 + y^2 = 1',
          variables: ['x', 'y']
        }
      }),
      createGraphSceneObjectIrNode({
        id: 'vector-v',
        objectType: 'vector',
        payload: {
          objectType: 'vector',
          start: { coordinates: { dimension: '2d', x: 0, y: 0 } },
          end: { coordinates: { dimension: '2d', x: 1, y: 1 } }
        }
      }),
      createGraphSceneObjectIrNode({
        id: 'transform-r',
        objectType: 'transform',
        payload: {
          objectType: 'transform',
          transformKind: 'rotation',
          target: { objectId: 'polygon-abc' },
          parameters: { angleRadians: Math.PI / 2, center: { objectId: 'point-a' } }
        }
      }),
      createGraphSceneObjectIrNode({
        id: 'measure-m',
        objectType: 'measurement',
        payload: {
          objectType: 'measurement',
          measurementKind: 'distance',
          targets: [{ objectId: 'point-a' }, { objectId: 'segment-ab' }],
          unit: 'unit'
        }
      }),
      createGraphSceneObjectIrNode({
        id: 'solid-s',
        objectType: 'solid',
        payload: {
          objectType: 'solid',
          solidKind: 'polyhedron',
          vertices: [
            { dimension: '3d', x: 0, y: 0, z: 0 },
            { dimension: '3d', x: 1, y: 0, z: 0 },
            { dimension: '3d', x: 0, y: 1, z: 0 },
            { dimension: '3d', x: 0, y: 0, z: 1 }
          ],
          faces: [[0, 1, 2], [0, 1, 3], [0, 2, 3], [1, 2, 3]]
        }
      }),
      createGraphSceneObjectIrNode({
        id: 'coordinate-system-cs',
        objectType: 'coordinate-system',
        payload: {
          objectType: 'coordinate-system',
          dimension: 'plane',
          origin: { dimension: '2d', x: 0, y: 0 },
          size: { width: 360, height: 360 },
          unitPx: 30,
          xRange: { min: -6, max: 6 },
          yRange: { min: -6, max: 6 },
          geometry: { kind: 'coordinate-system', segments: [] }
        }
      })
    ];

    const store = new GraphSceneStore('m1-ir');
    for (const result of sceneObjects) {
      expect(result.ok).toBe(true);
      expect(store.addObject(result.value!).ok).toBe(true);
    }

    const json = store.toJSON({ milestone: 'M1' });
    expect(json.ok).toBe(true);
    expect(JSON.stringify(json.value)).not.toMatch(/JXG|BABYLON|HTMLElement|HTMLCanvasElement/);

    const loaded = GraphSceneStore.fromJSON(json.value!);
    expect(loaded.ok).toBe(true);
    expect(loaded.value?.listObjects().map((object) => object.type)).toEqual([...SUPPORTED_GRAPH_SCENE_OBJECT_IR_TYPES]);
  });

  it('round-trips relation and dependency snapshots through scene documents', () => {
    const pointA = createPointNode('A', 0, 0);
    const pointB = createPointNode('B', 3, 4);
    const segment = createGraphSceneObjectIrNode({
      id: 'segment-ab',
      objectType: 'segment',
      payload: {
        objectType: 'segment',
        endpoints: [{ objectId: 'A' }, { objectId: 'B' }]
      },
      dependencies: ['A', 'B'],
      relations: ['distance-ab']
    });
    const measurement = createGraphSceneObjectIrNode({
      id: 'distance-ab',
      objectType: 'measurement',
      payload: {
        objectType: 'measurement',
        measurementKind: 'distance',
        targets: [{ objectId: 'A' }, { objectId: 'B' }],
        unit: 'unit'
      },
      dependencies: ['A', 'B', 'segment-ab']
    });

    expect(segment.ok).toBe(true);
    expect(measurement.ok).toBe(true);

    const store = new GraphSceneStore('relations');
    for (const node of [pointA, pointB, segment.value!, measurement.value!]) {
      expect(store.addObject(node).ok).toBe(true);
    }

    const relationSnapshot = createGraphRelationSnapshot(store.listObjects());
    expect(relationSnapshot.ok).toBe(true);
    expect(relationSnapshot.value).toMatchObject({
      version: GRAPH_RELATION_SNAPSHOT_VERSION,
      objects: [
        { objectId: 'segment-ab', dependencyIds: ['A', 'B'], relationIds: ['distance-ab'] },
        { objectId: 'distance-ab', dependencyIds: ['A', 'B', 'segment-ab'], relationIds: [] }
      ],
      relations: [
        { relationId: 'distance-ab', relationType: 'measurement', dependencyIds: ['A', 'B', 'segment-ab'] }
      ]
    });

    const json = store.toJSON({ source: 'relation-test' });
    expect(json.ok).toBe(true);
    expect(json.value?.relationSnapshot).toEqual(relationSnapshot.value);

    const loaded = GraphSceneStore.fromJSON(json.value!);
    expect(loaded.ok).toBe(true);
    expect(loaded.value?.toJSON().value?.relationSnapshot).toEqual(relationSnapshot.value);
  });

  it('plans relation invalidation and recompute order without renderer state', () => {
    const pointA = createPointNode('A', 0, 0);
    const pointB = createPointNode('B', 3, 4);
    const segment = createGraphSceneObjectIrNode({
      id: 'segment-ab',
      objectType: 'segment',
      payload: {
        objectType: 'segment',
        endpoints: [{ objectId: 'A' }, { objectId: 'B' }]
      },
      dependencies: ['A', 'B'],
      relations: ['distance-ab']
    });
    const distanceRelation = createGraphSceneObjectIrNode({
      id: 'distance-ab',
      kind: 'relation',
      objectType: 'measurement',
      payload: {
        objectType: 'measurement',
        measurementKind: 'distance',
        targets: [{ objectId: 'A' }, { objectId: 'B' }],
        unit: 'unit'
      },
      dependencies: ['A', 'B', 'segment-ab']
    });

    expect(segment.ok).toBe(true);
    expect(distanceRelation.ok).toBe(true);

    const plan = createGraphRelationInvalidationPlan(
      [pointA, pointB, segment.value!, distanceRelation.value!],
      { changedObjectIds: ['A'] }
    );

    expect(plan.ok).toBe(true);
    expect(plan.value).toMatchObject({
      changedObjectIds: ['A'],
      removedObjectIds: [],
      dirtyObjectIds: ['A', 'segment-ab', 'distance-ab'],
      recomputeObjectIds: ['segment-ab', 'distance-ab'],
      relationIds: ['distance-ab']
    });
  });

  it('keeps relation recompute order dependency-first for unordered multi-level inputs', () => {
    const pointA = createPointNode('A', 0, 0);
    const pointB = createGraphSceneObjectIrNode({
      id: 'B',
      objectType: 'point',
      payload: { objectType: 'point', position: { dimension: '2d', x: 1, y: 1 } },
      dependencies: ['A']
    });
    const pointC = createGraphSceneObjectIrNode({
      id: 'C',
      objectType: 'point',
      payload: { objectType: 'point', position: { dimension: '2d', x: 2, y: 2 } },
      dependencies: ['B']
    });

    expect(pointB.ok).toBe(true);
    expect(pointC.ok).toBe(true);

    const plan = createGraphRelationInvalidationPlan(
      [pointC.value!, pointA, pointB.value!],
      { changedObjectIds: ['A'] }
    );

    expect(plan.ok).toBe(true);
    expect(plan.value?.recomputeObjectIds).toEqual(['B', 'C']);
    expect(plan.value?.dirtyObjectIds).toEqual(expect.arrayContaining(['A', 'B', 'C']));
    expect(plan.value?.dirtyObjectIds).toHaveLength(3);
  });

  it('returns typed diagnostics for missing and invalid relation snapshots', () => {
    const missingDependency = new GraphSceneStore('missing-dependency');
    expect(missingDependency.addObject({
      ...createPointNode('A', 0, 0),
      dependencies: ['missing-point']
    }).ok).toBe(true);

    const missingSnapshot = missingDependency.toJSON();
    expect(missingSnapshot.ok).toBe(false);
    expect(missingSnapshot.diagnostics[0]).toMatchObject({
      code: 'relation-snapshot.missing-dependency',
      severity: 'error',
      target: { scope: 'object', objectId: 'A' }
    });

    const invalidSnapshot = validateGraphRelationSnapshot({
      version: GRAPH_RELATION_SNAPSHOT_VERSION,
      objects: [{ objectId: 'A', dependencyIds: ['A'], relationIds: [] }],
      relations: 'invalid'
    }, [createPointNode('A', 0, 0)]);
    expect(invalidSnapshot.ok).toBe(false);
    expect(invalidSnapshot.diagnostics[0]).toMatchObject({
      code: 'relation-snapshot.invalid-snapshot',
      severity: 'error',
      target: { scope: 'scene' }
    });

    const invalidRelationTarget = validateGraphRelationSnapshot({
      version: GRAPH_RELATION_SNAPSHOT_VERSION,
      objects: [{ objectId: 'A', dependencyIds: [], relationIds: ['A'] }],
      relations: []
    }, [createPointNode('A', 0, 0)]);
    expect(invalidRelationTarget.ok).toBe(false);
    expect(invalidRelationTarget.diagnostics[0]).toMatchObject({
      code: 'relation-snapshot.invalid-relation-object',
      severity: 'error',
      target: { scope: 'relation', relationId: 'A' }
    });
  });

  it('defines typed viewport coordinate contracts for 2D, dual-layer 2.5D, and 3D modes', () => {
    const viewport2d = createGraphViewportCoordinateModel({
      viewportId: 'vp-2d',
      mode: '2d',
      size: { width: 800, height: 600 },
      layerIds: ['content', 'overlay']
    });
    expect(viewport2d.ok).toBe(true);
    expect(viewport2d.value).toMatchObject({
      viewportId: 'vp-2d',
      mode: '2d',
      worldDimensions: '2d',
      layerIds: ['content', 'overlay']
    });

    const dualLayer = createGraphViewportCoordinateModel({
      viewportId: 'vp-2_5d',
      mode: 'dual-layer-2_5d',
      size: { width: 800, height: 600 },
      layerIds: ['content', 'overlay'],
      depthPolicy: 'ordered-layers'
    });
    expect(dualLayer.ok).toBe(true);
    expect(dualLayer.value).toMatchObject({
      mode: 'dual-layer-2_5d',
      worldDimensions: '2d',
      layerIds: ['content', 'overlay'],
      depthPolicy: 'ordered-layers'
    });

    const viewport3d = createGraphViewportCoordinateModel({
      viewportId: 'vp-3d',
      mode: '3d',
      size: { width: 1024, height: 768 },
      layerIds: ['content'],
      camera: {
        position: { dimension: '3d', x: 0, y: 0, z: 10 },
        target: { dimension: '3d', x: 0, y: 0, z: 0 },
        up: { dimension: '3d', x: 0, y: 1, z: 0 }
      }
    });
    expect(viewport3d.ok).toBe(true);
    expect(viewport3d.value).toMatchObject({
      mode: '3d',
      worldDimensions: '3d',
      camera: {
        position: { dimension: '3d', x: 0, y: 0, z: 10 },
        target: { dimension: '3d', x: 0, y: 0, z: 0 }
      }
    });

    const unsupportedMode = createGraphViewportCoordinateModel({
      viewportId: 'vp-4d',
      mode: '4d',
      size: { width: 10, height: 10 },
      layerIds: ['content']
    });
    expect(unsupportedMode.ok).toBe(false);
    expect(unsupportedMode.diagnostics[0]).toMatchObject({
      code: 'viewport-coordinate.unsupported-mode',
      severity: 'warning',
      target: { scope: 'viewport', viewportId: 'vp-4d' }
    });

    const invalid2dDepth = createGraphViewportCoordinateModel({
      viewportId: 'vp-2d-invalid',
      mode: '2d',
      size: { width: 10, height: 10 },
      layerIds: ['content'],
      depthPolicy: 'camera-depth'
    });
    expect(invalid2dDepth.ok).toBe(false);
    expect(invalid2dDepth.diagnostics[0]).toMatchObject({
      code: 'viewport-coordinate.invalid-model',
      severity: 'error',
      target: { scope: 'viewport', viewportId: 'vp-2d-invalid' }
    });

    const invalidDualLayer = createGraphViewportCoordinateModel({
      viewportId: 'vp-invalid',
      mode: 'dual-layer-2_5d',
      size: { width: 10, height: 10 },
      layerIds: ['content']
    });
    expect(invalidDualLayer.ok).toBe(false);
    expect(invalidDualLayer.diagnostics[0]).toMatchObject({
      code: 'viewport-coordinate.invalid-model',
      severity: 'error',
      target: { scope: 'viewport', viewportId: 'vp-invalid' }
    });

    const invalid3dCamera = createGraphViewportCoordinateModel({
      viewportId: 'vp-3d-invalid',
      mode: '3d',
      size: { width: 10, height: 10 },
      layerIds: ['content'],
      camera: {
        position: { dimension: '3d', x: 0, y: 0, z: Number.NaN },
        target: { dimension: '3d', x: 0, y: 0, z: 0 }
      }
    });
    expect(invalid3dCamera.ok).toBe(false);
    expect(invalid3dCamera.diagnostics[0]).toMatchObject({
      code: 'viewport-coordinate.invalid-model',
      severity: 'error',
      target: { scope: 'viewport', viewportId: 'vp-3d-invalid' }
    });
  });

  it('returns typed diagnostics for scene object IR families outside the M1 contract', () => {
    const unsupported = createGraphSceneObjectIrNode({
      id: 'slider-a',
      objectType: 'slider',
      payload: { objectType: 'slider' }
    });

    expect(unsupported.ok).toBe(false);
    expect(unsupported.diagnostics[0]).toMatchObject({
      code: 'scene-object-ir.unsupported-object-type',
      severity: 'warning',
      target: { scope: 'object', objectId: 'slider-a' }
    });
    expect(unsupported.diagnostics[0]).toEqual(unsupportedGraphSceneObjectIrDiagnostic('slider', 'slider-a'));
  });

  it('rejects invalid scene object IR payloads before they become scene truth', () => {
    const invalidPoint = createGraphSceneObjectIrNode({
      id: 'point-missing-position',
      objectType: 'point',
      payload: { objectType: 'point' }
    });

    expect(invalidPoint.ok).toBe(false);
    expect(invalidPoint.diagnostics[0]).toMatchObject({
      code: 'scene-object-ir.invalid-payload',
      severity: 'error',
      target: { scope: 'object', objectId: 'point-missing-position' }
    });

    const store = new GraphSceneStore('m1-ir-validation');
    const unsupportedAdd = store.addObject({
      id: 'slider-a',
      kind: 'shape',
      type: 'slider',
      payload: { objectType: 'slider' }
    });

    expect(unsupportedAdd.ok).toBe(false);
    expect(unsupportedAdd.diagnostics[0].code).toBe('scene-object-ir.unsupported-object-type');
    expect(store.getObject('slider-a')).toBeNull();

    const invalidAdd = store.addObject({
      id: 'point-b',
      kind: 'shape',
      type: 'point',
      payload: { objectType: 'point' }
    });

    expect(invalidAdd.ok).toBe(false);
    expect(invalidAdd.diagnostics[0].code).toBe('scene-object-ir.invalid-payload');
    expect(store.getObject('point-b')).toBeNull();

    const point = createGraphSceneObjectIrNode({
      id: 'point-c',
      objectType: 'point',
      payload: { objectType: 'point', position: { dimension: '2d', x: 1, y: 2 } }
    });
    expect(point.ok).toBe(true);
    expect(store.addObject(point.value!).ok).toBe(true);

    const invalidUpdate = store.updateObject('point-c', {
      payload: { objectType: 'point' }
    });

    expect(invalidUpdate.ok).toBe(false);
    expect(invalidUpdate.diagnostics[0].code).toBe('scene-object-ir.invalid-payload');
    expect(store.getObject('point-c')?.payload).toMatchObject({
      objectType: 'point',
      position: { dimension: '2d', x: 1, y: 2 }
    });
  });

  it('rejects invalid or unsupported scene objects during direct JSON import', () => {
    const unsupported = GraphSceneStore.fromJSON({
      version: 2,
      sceneId: 'bad-import',
      objects: [
        {
          id: 'slider-a',
          kind: 'shape',
          type: 'slider',
          payload: { objectType: 'slider' }
        }
      ],
      rootObjectIds: ['slider-a']
    });

    expect(unsupported.ok).toBe(false);
    expect(unsupported.value).toBeUndefined();
    expect(unsupported.diagnostics[0].code).toBe('scene-object-ir.unsupported-object-type');

    const invalid = GraphSceneStore.fromJSON({
      version: 2,
      sceneId: 'bad-import',
      objects: [
        {
          id: 'point-missing-position',
          kind: 'shape',
          type: 'point',
          payload: { objectType: 'point' }
        }
      ],
      rootObjectIds: ['point-missing-position']
    });

    expect(invalid.ok).toBe(false);
    expect(invalid.value).toBeUndefined();
    expect(invalid.diagnostics[0].code).toBe('scene-object-ir.invalid-payload');
  });

  it('mounts core backends through a renderer-free host contract', () => {
    const backend = createCoreOnlyTestBackend('core-host');
    const host: GraphBackendHost = {
      hostId: 'memory-host',
      hostKind: 'memory',
      hostAttributes: { test: true }
    };

    expect(backend.mount(host, { size: { width: 320, height: 200 } })).toEqual({
      backendId: 'core-host',
      size: { width: 320, height: 200 }
    });

    const runtime = new GraphSceneRuntime({ backend });
    expect(runtime.mount(host, { size: { width: 320, height: 200 } })).toEqual({
      backendId: 'core-host',
      size: { width: 320, height: 200 }
    });
  });

  it('detects renderer-owned data before it can enter scene truth', () => {
    expect(hasRendererFrameworkLeak({ payload: { point: { x: 1, y: 2 } } })).toBe(false);
    expect(hasRendererFrameworkLeak({ payload: { element: 'mathematical-term' } })).toBe(false);
    expect(hasRendererFrameworkLeak({ payload: { objectType: 'text', content: 'Babylon文字OK' } })).toBe(false);
    expect(hasRendererFrameworkLeak({ payload: { board: { id: 'JXG board' } } })).toBe(true);
    expect(hasRendererFrameworkLeak({ payload: 'BABYLON.Mesh' })).toBe(true);
  });

  it('stores and serializes scene objects without backend references', () => {
    const store = new GraphSceneStore('math-scene');
    const added = store.addObject(createPointNode('A', 0, 0));
    expect(added.ok).toBe(true);

    const patch = store.updateObject('A', {
      payload: { objectType: 'point', position: { dimension: '2d', x: 2, y: 3 } },
      renderHints: { strokeColor: '#f00' }
    });
    expect(patch.ok).toBe(true);
    expect(patch.value?.payload).toMatchObject({ objectType: 'point', position: { dimension: '2d', x: 2, y: 3 } });

    const json = store.toJSON({ source: 'test' });
    expect(json.ok).toBe(true);
    expect(JSON.stringify(json.value)).not.toMatch(/JXG|BABYLON|HTMLCanvasElement/);

    const loaded = GraphSceneStore.fromJSON(json.value!);
    expect(loaded.ok).toBe(true);
    expect(loaded.value?.getObject('A')?.payload).toMatchObject({ objectType: 'point', position: { dimension: '2d', x: 2, y: 3 } });
  });

  it('merges object patches while keeping removable backend hints out of core state', () => {
    const node = createPointNode('A', 0, 0);
    const merged = mergeGraphObjectPatch({ ...node, backendHint: 'jsxgraph' }, { backendHint: null, meta: { source: 'command' } });
    expect(merged.backendHint).toBeUndefined();
    expect(merged.meta).toEqual({ source: 'command' });
  });

  it('maps subject-tools math categories to renderer-neutral capability descriptors', () => {
    const types = ['function', 'equation', 'vector', 'coordinate-system', 'polygon', 'solid'] as const;
    const capabilityIds = types.flatMap((type, index) => createGraphCapabilitiesForObject({
      id: `object-${index}`,
      kind: 'shape',
      type,
      payload: {}
    }).map((capability) => capability.id));

    expect(capabilityIds).toContain('math.function.set-expression');
    expect(capabilityIds).toContain('math.equation.set-expression');
    expect(capabilityIds).toContain('math.vector.compute-dot-product');
    expect(capabilityIds).toContain('math.coordinate-system.toggle-assist');
    expect(capabilityIds).toContain('math.geometry.start-cut');
    expect(capabilityIds).toContain('math.solid.toggle-section');
    expect(capabilityIds).toContain('math.object.move');

    const coordinateScopedMove = createGraphCapabilitiesForObject({
      id: 'function-in-coordinate-system',
      kind: 'shape',
      type: 'function',
      payload: {},
      meta: {
        coordinateSystemId: 'coord-A',
        dragDisabledReason: SUBJECT_CANVAS_DRAG_DISABLED_REASON
      }
    }).find((capability) => capability.id === 'math.object.move');
    expect(coordinateScopedMove).toMatchObject({
      status: 'disabled',
      reason: SUBJECT_CANVAS_DRAG_DISABLED_REASON
    });
  });

  it('routes UI, overlay pass-through, backend pick, and drag sessions deterministically', () => {
    const backend = createCoreOnlyTestBackend('core-router');
    const host = document.createElement('div');
    backend.mount(host);
    backend.create(createPointNode('A', 10, 10));

    const router = new GraphInteractionRouter();
    router.registerBackend(backend, 'content');

    expect(DEFAULT_GRAPH_LAYER_ORDER[0]).toBe('ui');
    expect(router.pointerDown({ pointerId: 1, clientPoint: { x: 10, y: 10 }, uiHandled: true }).pick).toBeNull();

    const routed = router.pointerDown({ pointerId: 2, clientPoint: { x: 10, y: 10 } });
    expect(routed.pick?.target.objectId).toBe('A');
    expect(router.beginDrag('move')?.target?.objectId).toBe('A');
    expect(router.pointerMove(2, { x: 12, y: 14 })?.currentClientPoint).toEqual({ x: 12, y: 14 });
    expect(router.pointerUp(2)?.target?.objectId).toBe('A');
    expect(router.getActivePointerSession()).toBeNull();
  });

  it('routes picking hit groups, layer ordering, and pass-through diagnostics deterministically', () => {
    const overlayBackend = createCoreOnlyTestBackend('overlay-pick');
    const contentBackend = createCoreOnlyTestBackend('content-pick');
    overlayBackend.mount(document.createElement('div'));
    contentBackend.mount(document.createElement('div'));
    overlayBackend.create({
      ...createPointNode('overlay-label', 10, 10),
      layerId: 'overlay',
      meta: { hitGroups: ['label'] }
    });
    contentBackend.create({
      ...createPointNode('content-point', 10, 10),
      layerId: 'content',
      meta: { hitGroups: ['vertex'] }
    });

    const router = new GraphInteractionRouter([
      { layerId: 'overlay', interactive: true, passThrough: false, backendIds: ['overlay-pick'] }
    ]);
    router.registerBackend(overlayBackend, 'overlay');
    router.registerBackend(contentBackend, 'content');

    expect(router.pick({ x: 10, y: 10 }, { layerOrder: ['overlay', 'content'] })?.target.objectId).toBe('overlay-label');
    const groupedPick = router.pickWithDiagnostics({ x: 10, y: 10 }, {
      layerOrder: ['overlay', 'content'],
      pickOptions: { hitGroups: ['vertex'] }
    });
    expect(groupedPick.pick?.target.objectId).toBe('content-point');
    expect(groupedPick.pick?.hitGroup).toBe('vertex');

    const passThroughRouter = new GraphInteractionRouter([
      { layerId: 'overlay', interactive: false, passThrough: true, backendIds: ['overlay-pick'] }
    ]);
    passThroughRouter.registerBackend(overlayBackend, 'overlay');
    passThroughRouter.registerBackend(contentBackend, 'content');
    const passThrough = passThroughRouter.pickWithDiagnostics({ x: 10, y: 10 }, {
      layerOrder: ['overlay', 'content']
    });
    expect(passThrough.pick?.target.objectId).toBe('content-point');
    expect(passThrough.diagnostics.map((diagnostic) => diagnostic.code)).toContain('pick.layer-pass-through');

    const blockingRouter = new GraphInteractionRouter([
      { layerId: 'overlay', interactive: false, passThrough: false, backendIds: ['overlay-pick'] }
    ]);
    blockingRouter.registerBackend(overlayBackend, 'overlay');
    blockingRouter.registerBackend(contentBackend, 'content');
    const blocked = blockingRouter.pickWithDiagnostics({ x: 10, y: 10 }, {
      layerOrder: ['overlay', 'content']
    });
    expect(blocked.pick).toBeNull();
    expect(blocked.diagnostics[0]).toMatchObject({
      code: 'pick.layer-blocked',
      severity: 'warning',
      target: { scope: 'backend-layer', layerId: 'overlay' }
    });
  });

  it('creates core-first drag patches before backend redraw', () => {
    const pointPatch = createGraphDragPatch(createPointNode('A', 0, 0), {
      delta: { dimension: '2d', dx: 3, dy: -2 }
    });
    expect(pointPatch.ok).toBe(true);
    expect(pointPatch.value?.payload).toMatchObject({ objectType: 'point', position: { dimension: '2d', x: 3, y: -2 } });

    const polygonPatch = createGraphDragPatch({
      id: 'poly',
      kind: 'shape',
      type: 'polygon',
      payload: {
        geometry: {
          kind: 'polygon',
          vertices: [{ x: 0, y: 0 }, { x: 2, y: 0 }, { x: 0, y: 2 }]
        }
      }
    }, {
      startWorldPoint: { dimension: '2d', x: 1, y: 1 },
      currentWorldPoint: { dimension: '2d', x: 2, y: 3 }
    });

    expect(polygonPatch.ok).toBe(true);
    expect((polygonPatch.value?.payload as any).geometry.vertices).toEqual([
      { x: 1, y: 2 },
      { x: 3, y: 2 },
      { x: 1, y: 4 }
    ]);

    const unsupported = createGraphDragPatch({
      id: 'label',
      kind: 'overlay',
      type: 'label',
      payload: { text: 'not draggable by core' }
    }, {
      delta: { dimension: '2d', dx: 1, dy: 1 }
    });
    expect(unsupported.ok).toBe(false);
    expect(unsupported.diagnostics[0].code).toBe('drag.unsupported-object');

    const coordinateScoped = createGraphDragPatch({
      ...createPointNode('coord-point', 0, 0),
      meta: {
        coordinateSystemId: 'coord-A',
        dragDisabledReason: SUBJECT_CANVAS_DRAG_DISABLED_REASON
      }
    }, {
      delta: { dimension: '2d', dx: 1, dy: 1 }
    });
    expect(coordinateScoped.ok).toBe(false);
    expect(coordinateScoped.diagnostics[0]).toMatchObject({
      code: 'drag.disabled-object',
      message: SUBJECT_CANVAS_DRAG_DISABLED_REASON
    });

    const coordinateScopedFree = {
      ...createPointNode('coord-free-point', 0, 0),
      meta: {
        coordinateSystemId: 'coord-A',
        draggable: true
      },
      renderHints: {
        draggable: true
      }
    };
    const coordinateScopedFreePatch = createGraphDragPatch(coordinateScopedFree, {
      delta: { dimension: '2d', dx: 2, dy: 1 }
    });
    expect(coordinateScopedFreePatch.ok).toBe(true);
    expect(coordinateScopedFreePatch.value?.payload).toMatchObject({
      objectType: 'point',
      position: { dimension: '2d', x: 2, y: 1 }
    });
    expect(createGraphCapabilitiesForObject(coordinateScopedFree).find((capability) => capability.id === 'math.object.move')).toMatchObject({
      status: 'supported'
    });

    const coordinateSystemPatch = createGraphDragPatch({
      id: 'coord-A',
      kind: 'shape',
      type: 'coordinate-system',
      payload: {
        objectType: 'coordinate-system',
        dimension: 'plane',
        origin: { dimension: '2d', x: 0, y: 0 },
        size: { width: 12, height: 12 },
        unitPx: 1,
        xRange: { min: -6, max: 6 },
        yRange: { min: -6, max: 6 },
        geometry: {
          kind: 'coordinate-system',
          xAxis: [{ x: -6, y: 0 }, { x: 6, y: 0 }],
          yAxis: [{ x: 0, y: -6 }, { x: 0, y: 6 }],
          segments: [
            [{ x: -6, y: 0 }, { x: 6, y: 0 }],
            [{ x: 0, y: -6 }, { x: 0, y: 6 }]
          ],
          labels: [{ text: 'O', axis: 'plain', role: 'origin', point: { x: 0, y: 0 } }]
        }
      },
      meta: { coordinateSystemId: 'coord-A', draggable: true, snapToGrid: true }
    }, {
      delta: { dimension: '2d', dx: 2, dy: 3 }
    });
    expect(coordinateSystemPatch.ok).toBe(true);
    expect(coordinateSystemPatch.value?.payload).toMatchObject({
      origin: { dimension: '2d', x: 2, y: 3 },
      geometry: {
        xAxis: [{ x: -4, y: 3 }, { x: 8, y: 3 }],
        yAxis: [{ x: 2, y: -3 }, { x: 2, y: 9 }],
        labels: [expect.objectContaining({ point: { x: 2, y: 3 } })]
      }
    });

    const snappedCoordinateSystemPatch = createGraphDragPatch({
      id: 'coord-snap',
      kind: 'shape',
      type: 'coordinate-system',
      payload: {
        objectType: 'coordinate-system',
        origin: { dimension: '2d', x: 0, y: 0 },
        geometry: {
          kind: 'coordinate-system',
          xAxis: [{ x: -6, y: 0 }, { x: 6, y: 0 }],
          yAxis: [{ x: 0, y: -6 }, { x: 0, y: 6 }],
          labels: [{ text: 'O', axis: 'plain', role: 'origin', point: { x: 0, y: 0 } }]
        }
      },
      meta: { coordinateSystemId: 'coord-snap', draggable: true, snapToGrid: true }
    }, {
      delta: { dimension: '2d', dx: 2.35, dy: -1.55 }
    });
    expect(snappedCoordinateSystemPatch.ok).toBe(true);
    expect(snappedCoordinateSystemPatch.value?.payload).toMatchObject({
      origin: { dimension: '2d', x: 2, y: -2 },
      geometry: {
        xAxis: [{ x: -4, y: -2 }, { x: 8, y: -2 }],
        yAxis: [{ x: 2, y: -8 }, { x: 2, y: 4 }],
        labels: [expect.objectContaining({ point: { x: 2, y: -2 } })]
      }
    });

    const snapOnEndNode = {
      id: 'coord-snap-end',
      kind: 'shape',
      type: 'coordinate-system',
      payload: {
        objectType: 'coordinate-system',
        origin: { dimension: '2d', x: 0, y: 0 },
        geometry: {
          kind: 'coordinate-system',
          xAxis: [{ x: -6, y: 0 }, { x: 6, y: 0 }],
          yAxis: [{ x: 0, y: -6 }, { x: 0, y: 6 }]
        }
      },
      meta: { coordinateSystemId: 'coord-snap-end', draggable: true, snapToGrid: { enabled: true, phase: 'end' } }
    } satisfies GraphObjectNode;
    const snapOnEndMovePatch = createGraphDragPatch(snapOnEndNode, {
      delta: { dimension: '2d', dx: 2.35, dy: -1.55 },
      dragPhase: 'move'
    });
    expect(snapOnEndMovePatch.value?.payload).toMatchObject({
      origin: { dimension: '2d', x: 2.35, y: -1.55 }
    });
    const snapOnEndReleasePatch = createGraphDragPatch(snapOnEndNode, {
      delta: { dimension: '2d', dx: 2.35, dy: -1.55 },
      dragPhase: 'end'
    });
    expect(snapOnEndReleasePatch.value?.payload).toMatchObject({
      origin: { dimension: '2d', x: 2, y: -2 }
    });

    const snapOnEndSettledNode = {
      ...snapOnEndNode,
      payload: {
        objectType: 'coordinate-system',
        origin: { dimension: '2d', x: 2.35, y: -1.55 },
        geometry: {
          kind: 'coordinate-system',
          xAxis: [{ x: -3.65, y: -1.55 }, { x: 8.35, y: -1.55 }],
          yAxis: [{ x: 2.35, y: -7.55 }, { x: 2.35, y: 4.45 }]
        }
      }
    } satisfies GraphObjectNode;
    const snapOnEndSettledReleasePatch = createGraphDragPatch(snapOnEndSettledNode, {
      delta: { dimension: '2d', dx: 0, dy: 0 },
      dragPhase: 'end'
    });
    expect(snapOnEndSettledReleasePatch.value?.payload).toMatchObject({
      origin: { dimension: '2d', x: 2, y: -2 },
      geometry: {
        xAxis: [{ x: -4, y: -2 }, { x: 8, y: -2 }],
        yAxis: [{ x: 2, y: -8 }, { x: 2, y: 4 }]
      }
    });
  });

  it('explains drag success, constrained clamps, and relation-driven failures', () => {
    const success = resolveGraphDragOperation(createPointNode('free-point', 0, 0), {
      delta: { dimension: '2d', dx: 2, dy: -1 }
    });
    expect(success.ok).toBe(true);
    expect(success.value).toMatchObject({
      status: 'success',
      explanation: { code: 'drag.success', severity: 'info' },
      patch: { payload: { objectType: 'point', position: { dimension: '2d', x: 2, y: -1 } } }
    });

    const constrained = resolveGraphDragOperation({
      ...createPointNode('bounded-point', 4, 4),
      meta: { dragBounds: { dimension: '2d', minX: 0, maxX: 5, minY: 0, maxY: 5 } }
    }, {
      delta: { dimension: '2d', dx: 4, dy: 4 }
    });
    expect(constrained.ok).toBe(true);
    expect(constrained.value).toMatchObject({
      status: 'clamped',
      explanation: { code: 'drag.clamped-to-bounds', severity: 'warning' },
      patch: { payload: { objectType: 'point', position: { dimension: '2d', x: 5, y: 5 } } }
    });

    const relationDriven = resolveGraphDragOperation({
      ...createPointNode('midpoint-ab', 1, 1),
      dependencies: ['A', 'B'],
      meta: { relationDriven: true }
    }, {
      delta: { dimension: '2d', dx: 1, dy: 1 }
    });
    expect(relationDriven.ok).toBe(false);
    expect(relationDriven.diagnostics[0]).toMatchObject({
      code: 'drag.relation-driven-object',
      severity: 'error',
      target: { scope: 'object', objectId: 'midpoint-ab' }
    });
  });

  it('executes common capabilities against core scene before backend redraw', () => {
    const scene = new GraphSceneStore('capabilities');
    scene.addObject(createPointNode('A', 0, 0));

    const move = executeGraphCapability({
      scene,
      capabilityId: 'math.object.move',
      target: { scope: 'object', objectId: 'A' },
      payload: { delta: { dimension: '2d', dx: 4, dy: 5 } }
    });
    expect(move.ok).toBe(true);
    expect(scene.getObject('A')?.payload).toMatchObject({ objectType: 'point', position: { dimension: '2d', x: 4, y: 5 } });

    const color = executeGraphCapability({
      scene,
      capabilityId: 'math.object.set-color',
      target: { scope: 'object', objectId: 'A' },
      payload: '#f43f5e'
    });
    expect(color.ok).toBe(true);
    expect(scene.getObject('A')?.renderHints?.strokeColor).toBe('#f43f5e');

    const lock = executeGraphCapability({
      scene,
      capabilityId: 'math.object.lock',
      target: { scope: 'object', objectId: 'A' },
      payload: true
    });
    expect(lock.ok).toBe(true);
    expect(createGraphDragPatch(scene.getObject('A')!, { delta: { dimension: '2d', dx: 1, dy: 1 } }).diagnostics[0].code).toBe('drag.locked-object');

    const select = executeGraphCapability({
      scene,
      capabilityId: 'math.object.select',
      target: { scope: 'object', objectId: 'A' },
      payload: true
    });
    expect(select.ok).toBe(true);
    expect(scene.getObject('A')?.meta?.selected).toBe(true);

    const remove = executeGraphCapability({
      scene,
      capabilityId: 'math.object.delete',
      target: { scope: 'object', objectId: 'A' }
    });
    expect(remove.ok).toBe(true);
    expect(scene.getObject('A')).toBeNull();
  });

  it('executes subject-math capability model as core patches instead of UI-only no-ops', () => {
    const scene = new GraphSceneStore('math-capabilities');
    scene.addObject({
      id: 'f',
      kind: 'shape',
      type: 'function',
      payload: { objectType: 'function', expression: 'x^2', variable: 'x', parameters: { a: 1 } },
      layerId: 'content'
    });
    scene.addObject({
      id: 'solid',
      kind: 'shape',
      type: 'solid',
      payload: { objectType: 'solid', solidKind: 'custom', parameters: { family: 'cube', size: 1 } },
      layerId: 'content'
    });
    scene.addObject({
      id: 'v',
      kind: 'shape',
      type: 'vector',
      payload: {
        objectType: 'vector',
        start: { coordinates: { dimension: '2d', x: 0, y: 0 } },
        end: { coordinates: { dimension: '2d', x: 1, y: 0 } }
      },
      layerId: 'content'
    });

    expect(executeGraphCapability({
      scene,
      capabilityId: 'math.function.set-expression',
      target: { scope: 'object', objectId: 'f' },
      payload: { expression: 'sin(x)' }
    }).ok).toBe(true);
    expect((scene.getObject('f')?.payload as any).expression).toBe('sin(x)');

    expect(executeGraphCapability({
      scene,
      capabilityId: 'math.function.toggle-derivative',
      target: { scope: 'object', objectId: 'f' },
      payload: true
    }).ok).toBe(true);
    expect((scene.getObject('f')?.meta as any).toggles['function:toggle-derivative']).toBe(true);

    expect(executeGraphCapability({
      scene,
      capabilityId: 'math.solid.set-section-plane',
      target: { scope: 'object', objectId: 'solid' },
      payload: 'xy'
    }).ok).toBe(true);
    expect((scene.getObject('solid')?.payload as any).section.plane).toBe('xy');

    expect(executeGraphCapability({
      scene,
      capabilityId: 'math.vector.set-point',
      target: { scope: 'object', objectId: 'v' },
      payload: { endpoint: 'end', point: { x: 2, y: 3 } }
    }).ok).toBe(true);
    expect((scene.getObject('v')?.payload as any).vector).toEqual({ x: 2, y: 3 });

    expect(executeGraphCapability({
      scene,
      capabilityId: 'math.scene.clear-selection',
      target: { scope: 'scene' }
    }).ok).toBe(true);
    expect(scene.listObjects()).toHaveLength(3);

    expect(executeGraphCapability({
      scene,
      capabilityId: 'math.scene.add-geometry',
      target: { scope: 'scene' },
      payload: {
        node: {
          id: 'added',
          kind: 'shape',
          type: 'point',
          payload: { objectType: 'point', position: { dimension: '2d', x: 9, y: 9 } }
        }
      }
    }).ok).toBe(true);
    expect(scene.getObject('added')?.payload).toMatchObject({ objectType: 'point', position: { dimension: '2d', x: 9, y: 9 } });

    scene.addObject({
      id: 'viewport-main',
      kind: 'viewport',
      type: 'viewport',
      payload: { pan: { x: 0, y: 0 }, zoom: 1 },
      layerId: 'background'
    });
    expect(executeGraphCapability({
      scene,
      capabilityId: 'math.viewport.pan',
      target: { scope: 'viewport', viewportId: 'viewport-main' },
      payload: { dx: 12, dy: -4 }
    }).ok).toBe(true);
    expect((scene.getObject('viewport-main')?.payload as any).pan).toEqual({ x: 12, y: -4 });

    expect(executeGraphCapability({
      scene,
      capabilityId: 'math.viewport.zoom',
      target: { scope: 'viewport', viewportId: 'floating-viewport' },
      payload: 2
    }).value?.object).toMatchObject({
      id: 'floating-viewport',
      kind: 'viewport',
      payload: { zoom: 2 }
    });
    expect(scene.getObject('floating-viewport')).toMatchObject({
      id: 'floating-viewport',
      kind: 'viewport',
      payload: { zoom: 2 }
    });

    expect(executeGraphCapability({
      scene,
      capabilityId: 'math.scene.clear-all',
      target: { scope: 'scene' }
    }).ok).toBe(true);
    expect(scene.listObjects()).toEqual([]);
  });

  it('covers capability executor success, unsupported, partial-support, and diagnostic paths', () => {
    const scene = new GraphSceneStore('capability-matrix');
    scene.addObject(createPointNode('A', 0, 0));
    scene.addObject({
      id: 'f',
      kind: 'shape',
      type: 'function',
      payload: { objectType: 'function', expression: 'x^2', variable: 'x', parameters: { a: 1 } },
      layerId: 'content'
    });
    scene.addObject({
      id: 'solid',
      kind: 'shape',
      type: 'solid',
      payload: { objectType: 'solid', solidKind: 'custom', parameters: { family: 'cube', size: 1 } },
      layerId: 'content'
    });

    const success = executeGraphCapability({
      scene,
      capabilityId: 'math.function.set-expression',
      target: { scope: 'object', objectId: 'f' },
      payload: { expression: 'cos(x)' }
    });
    expect(success.ok).toBe(true);
    expect((scene.getObject('f')?.payload as any).expression).toBe('cos(x)');

    const failureMatrix = [
      {
        capabilityId: 'math.geometry.nonexistent-command',
        target: { scope: 'object', objectId: 'f' },
        expectedCode: 'capability.unsupported',
        unchangedObjectId: 'f'
      },
      {
        capabilityId: 'math.solid.set-section-plane',
        target: { scope: 'object', objectId: 'f' },
        payload: 'xy',
        expectedCode: 'capability.partial-support',
        unchangedObjectId: 'f'
      },
      {
        capabilityId: 'math.object.move',
        target: { scope: 'object', objectId: 'A' },
        payload: { delta: { dimension: '2d', dx: 'bad', dy: 1 } },
        expectedCode: 'capability.invalid-delta',
        unchangedObjectId: 'A'
      },
      {
        capabilityId: 'math.object.set-color',
        target: { scope: 'object', objectId: 'missing' },
        payload: '#000',
        expectedCode: 'capability.missing-object',
        unchangedObjectId: null
      }
    ] as const;

    for (const entry of failureMatrix) {
      const before = entry.unchangedObjectId ? JSON.stringify(scene.getObject(entry.unchangedObjectId)) : JSON.stringify(scene.listObjects());
      const result = executeGraphCapability({
        scene,
        capabilityId: entry.capabilityId,
        target: entry.target,
        payload: 'payload' in entry ? entry.payload : undefined
      });

      expect(result.ok).toBe(false);
      expect(result.diagnostics[0]).toMatchObject({
        code: entry.expectedCode,
        target: entry.target
      });
      const after = entry.unchangedObjectId ? JSON.stringify(scene.getObject(entry.unchangedObjectId)) : JSON.stringify(scene.listObjects());
      expect(after).toBe(before);
    }
  });

  it('keeps backend rendering behind GraphSceneRuntime while drag mutates core first', () => {
    const backend = createCoreOnlyTestBackend('runtime-backend');
    const runtime = new GraphSceneRuntime({ backend });
    runtime.mount(document.createElement('div'));

    const added = runtime.addObject(createPointNode('A', 10, 10));
    expect(added.ok).toBe(true);
    expect(backend.pick({ x: 10, y: 10 })?.target.objectId).toBe('A');

    const moved = runtime.applyDragToObject('A', {
      delta: { dimension: '2d', dx: 5, dy: -2 }
    });
    expect(moved.ok).toBe(true);
    expect(runtime.scene.getObject('A')?.payload).toMatchObject({ objectType: 'point', position: { dimension: '2d', x: 15, y: 8 } });
    expect(backend.pick({ x: 15, y: 8 })?.target.objectId).toBe('A');
    expect(runtime.snapshot().handles).toHaveLength(1);
  });

  it('syncs runtime objects incrementally without recreating unchanged backend resources', () => {
    const backend = createCoreOnlyTestBackend('runtime-sync');
    const createIds: string[] = [];
    const updateIds: string[] = [];
    const removeIds: string[] = [];
    const flushFrames: Array<readonly string[] | undefined> = [];
    const create = backend.create;
    const update = backend.update;
    const remove = backend.remove;
    backend.create = (node, context) => {
      createIds.push(node.id);
      return create(node, context);
    };
    backend.update = (handle, patch, context) => {
      updateIds.push(handle.objectId);
      update(handle, patch, context);
    };
    backend.remove = (handle) => {
      removeIds.push(handle.objectId);
      remove(handle);
    };
    backend.flush = (frame) => {
      flushFrames.push(frame?.dirtyObjectIds);
    };

    const runtime = new GraphSceneRuntime({ backend });
    runtime.mount(document.createElement('div'));

    const firstSync = runtime.syncObjects([
      createPointNode('A', 1, 1),
      createPointNode('B', 2, 2)
    ]);
    expect(firstSync.ok).toBe(true);
    expect(createIds).toEqual(['A', 'B']);
    expect(updateIds).toEqual([]);
    expect(removeIds).toEqual([]);
    expect(flushFrames).toEqual([['A', 'B']]);

    createIds.length = 0;
    updateIds.length = 0;
    removeIds.length = 0;
    flushFrames.length = 0;

    const appendSync = runtime.syncObjects([
      createPointNode('A', 1, 1),
      createPointNode('B', 2, 2),
      createPointNode('C', 3, 3)
    ]);
    expect(appendSync.ok).toBe(true);
    expect(createIds).toEqual(['C']);
    expect(updateIds).toEqual([]);
    expect(removeIds).toEqual([]);
    expect(flushFrames).toEqual([['C']]);

    createIds.length = 0;
    updateIds.length = 0;
    removeIds.length = 0;
    flushFrames.length = 0;

    const updateSync = runtime.syncObjects([
      createPointNode('A', 4, 4),
      createPointNode('B', 2, 2),
      createPointNode('C', 3, 3)
    ]);
    expect(updateSync.ok).toBe(true);
    expect(createIds).toEqual([]);
    expect(updateIds).toEqual(['A']);
    expect(removeIds).toEqual([]);
    expect(flushFrames).toEqual([['A']]);

    createIds.length = 0;
    updateIds.length = 0;
    removeIds.length = 0;
    flushFrames.length = 0;

    const removeSync = runtime.syncObjects([
      createPointNode('A', 4, 4),
      createPointNode('C', 3, 3)
    ]);
    expect(removeSync.ok).toBe(true);
    expect(createIds).toEqual([]);
    expect(updateIds).toEqual([]);
    expect(removeIds).toEqual(['B']);
    expect(flushFrames).toEqual([['B']]);
  });

  it('moves selected runtime objects to the top of the scene order', () => {
    const backend = createCoreOnlyTestBackend('runtime-selected-order');
    const runtime = new GraphSceneRuntime({ backend });
    runtime.mount(document.createElement('div'));

    const first = runtime.addObject(createPointNode('A', 1, 1));
    const second = runtime.addObject(createPointNode('B', 2, 2));
    expect(first.ok).toBe(true);
    expect(second.ok).toBe(true);
    expect(runtime.snapshot().objects.map((node) => node.id)).toEqual(['A', 'B']);

    const selected = runtime.updateObject('A', { meta: { selected: true } });

    expect(selected.ok).toBe(true);
    expect(runtime.snapshot().objects.map((node) => node.id)).toEqual(['B', 'A']);
  });

  it('notifies runtime selection subscribers from core object mutations', () => {
    const backend = createCoreOnlyTestBackend('runtime-selection');
    const runtime = new GraphSceneRuntime({ backend });
    runtime.mount(document.createElement('div'));
    runtime.addObject(createPointNode('A', 1, 1));
    runtime.addObject(createPointNode('B', 2, 2));

    const events: GraphRuntimeSelectionChangeEvent[] = [];
    const unsubscribe = runtime.subscribeSelection((event) => events.push(event));

    expect(events[0]).toMatchObject({
      primary: null,
      selected: [],
      previous: [],
      reason: 'snapshot',
      source: 'api',
      revision: 0
    });

    const selected = runtime.selectObject('A', { source: 'pointer' });
    expect(selected.ok).toBe(true);
    expect(events).toHaveLength(2);
    expect(events[1]).toMatchObject({
      reason: 'select',
      source: 'pointer',
      revision: 1,
      primary: {
        id: 'A',
        objectId: 'A',
        kind: 'object',
        objectKind: 'shape',
        objectType: 'point',
        backendId: 'runtime-selection',
        target: { scope: 'object', objectId: 'A', backendId: 'runtime-selection' }
      },
      selected: [{ id: 'A' }],
      previous: []
    });
    expect(runtime.scene.getObject('A')?.meta?.selected).toBe(true);
    expect(runtime.snapshot().objects.map((node) => node.id)).toEqual(['B', 'A']);

    const duplicate = runtime.selectObject('A', { source: 'pointer' });
    expect(duplicate.ok).toBe(true);
    expect(events).toHaveLength(2);

    const movedSelected = runtime.updateObject('A', {
      payload: { objectType: 'point', position: { dimension: '2d', x: 4, y: 4 } }
    });
    expect(movedSelected.ok).toBe(true);
    expect(events).toHaveLength(3);
    expect(events[2]).toMatchObject({
      reason: 'update',
      source: 'api',
      revision: 2,
      primary: { id: 'A', payload: { position: { x: 4, y: 4 } } },
      selected: [{ id: 'A' }],
      previous: [{ id: 'A' }]
    });

    const replaced = runtime.selectObject('B', { source: 'api' });
    expect(replaced.ok).toBe(true);
    expect(events).toHaveLength(4);
    expect(events[3]).toMatchObject({
      reason: 'replace',
      source: 'api',
      revision: 3,
      primary: { id: 'B' },
      selected: [{ id: 'B' }],
      previous: [{ id: 'A' }]
    });
    expect(runtime.scene.getObject('A')?.meta?.selected).toBe(false);
    expect(runtime.scene.getObject('B')?.meta?.selected).toBe(true);

    const cleared = runtime.clearSelection({ source: 'clear' });
    expect(cleared.ok).toBe(true);
    expect(cleared.value?.map((node) => node.id)).toEqual(['B']);
    expect(events).toHaveLength(5);
    expect(events[4]).toMatchObject({
      reason: 'clear',
      source: 'clear',
      revision: 4,
      primary: null,
      selected: [],
      previous: [{ id: 'B' }]
    });

    unsubscribe();
    runtime.selectObject('A');
    expect(events).toHaveLength(5);
  });

  it('routes pointer selection through configurable selectable-node rules', () => {
    const backend = createCoreOnlyTestBackend('runtime-object-selection-controller');
    const runtime = new GraphSceneRuntime({ backend });
    runtime.mount(document.createElement('div'));
    runtime.addObject({
      ...createPointNode('locked-point', 1, 1),
      meta: { selectable: false }
    });
    runtime.addObject({
      ...createPointNode('selectable-point', 2, 2),
      meta: { selectable: true }
    });

    const events: GraphRuntimeSelectionChangeEvent[] = [];
    runtime.subscribeSelection((event) => events.push(event));

    const controller = createGraphObjectSelectionController({
      runtime,
      pickOptions: { tolerancePx: 0.1 },
      isSelectableNode: (node) => node?.meta?.selectable === true
    });

    expect(controller.pointerDown({ pointerId: 1, point: { x: 1, y: 1 } })).toMatchObject({
      handled: false,
      action: 'ignored',
      objectId: 'locked-point'
    });
    expect(runtime.getSelectionItems()).toEqual([]);
    expect(events).toHaveLength(1);

    expect(controller.pointerDown({ pointerId: 2, point: { x: 2, y: 2 } })).toMatchObject({
      handled: true,
      action: 'selected',
      objectId: 'selectable-point'
    });
    expect(runtime.scene.getObject('selectable-point')?.meta?.selected).toBe(true);
    expect(events).toHaveLength(2);
    expect(events[1]).toMatchObject({
      reason: 'select',
      source: 'pointer',
      selected: [{ id: 'selectable-point' }]
    });

    expect(controller.pointerDown({ pointerId: 3, point: { x: 9, y: 9 } })).toMatchObject({
      handled: false,
      action: 'cleared'
    });
    expect(runtime.getSelectionItems()).toEqual([]);
    expect(events).toHaveLength(3);
    expect(events[2]).toMatchObject({
      reason: 'clear',
      source: 'pointer',
      selected: []
    });
  });

  it('emits one runtime selection event per syncObjects batch', () => {
    const backend = createCoreOnlyTestBackend('runtime-selection-sync');
    const runtime = new GraphSceneRuntime({ backend });
    runtime.mount(document.createElement('div'));
    const events: GraphRuntimeSelectionChangeEvent[] = [];
    runtime.subscribeSelection((event) => events.push(event));

    const selectedCommandNode = {
      ...createPointNode('A', 1, 1),
      meta: { ownerCommandId: 'cmd-A', selected: true }
    };
    const firstSync = runtime.syncObjects([
      selectedCommandNode,
      createPointNode('B', 2, 2)
    ]);
    expect(firstSync.ok).toBe(true);
    expect(events).toHaveLength(2);
    expect(events[1]).toMatchObject({
      reason: 'select',
      source: 'sync',
      revision: 1,
      primary: {
        id: 'A',
        kind: 'command',
        commandId: 'cmd-A',
        objectType: 'point'
      },
      selected: [{ id: 'A' }],
      previous: []
    });

    const unchangedSync = runtime.syncObjects([
      selectedCommandNode,
      createPointNode('B', 2, 2)
    ]);
    expect(unchangedSync.ok).toBe(true);
    expect(events).toHaveLength(2);

    const updatedSelectedCommandNode = {
      ...createPointNode('A', 4, 4),
      meta: { ownerCommandId: 'cmd-A', selected: true }
    };
    const updateSync = runtime.syncObjects([
      updatedSelectedCommandNode,
      createPointNode('B', 2, 2)
    ]);
    expect(updateSync.ok).toBe(true);
    expect(events).toHaveLength(3);
    expect(events[2]).toMatchObject({
      reason: 'update',
      source: 'sync',
      revision: 2,
      primary: {
        id: 'A',
        kind: 'command',
        commandId: 'cmd-A',
        payload: { position: { x: 4, y: 4 } }
      },
      selected: [{ id: 'A' }],
      previous: [{ id: 'A' }]
    });

    const replaceSync = runtime.syncObjects([
      { ...createPointNode('B', 2, 2), meta: { selected: true } }
    ]);
    expect(replaceSync.ok).toBe(true);
    expect(events).toHaveLength(4);
    expect(events[3]).toMatchObject({
      reason: 'replace',
      source: 'sync',
      revision: 3,
      primary: { id: 'B' },
      selected: [{ id: 'B' }],
      previous: [{ id: 'A' }]
    });

    const clearSync = runtime.syncObjects([createPointNode('B', 2, 2)]);
    expect(clearSync.ok).toBe(true);
    expect(events).toHaveLength(5);
    expect(events[4]).toMatchObject({
      reason: 'clear',
      source: 'sync',
      revision: 4,
      primary: null,
      selected: [],
      previous: [{ id: 'B' }]
    });
  });

  it('moves coordinate systems with their scoped graph objects and clip bounds', () => {
    const backend = createCoreOnlyTestBackend('runtime-coordinate-drag');
    let flushCount = 0;
    (backend as GraphRenderBackend & { flush: NonNullable<GraphRenderBackend['flush']> }).flush = () => {
      flushCount += 1;
    };
    const runtime = new GraphSceneRuntime({ backend });
    runtime.mount(document.createElement('div'));

    runtime.addObject({
      id: 'coord-A',
      kind: 'shape',
      type: 'coordinate-system',
      payload: {
        objectType: 'coordinate-system',
        dimension: 'plane',
        origin: { dimension: '2d', x: 0, y: 0 },
        size: { width: 12, height: 12 },
        unitPx: 1,
        xRange: { min: -6, max: 6 },
        yRange: { min: -6, max: 6 },
        geometry: {
          kind: 'coordinate-system',
          xAxis: [{ x: -6, y: 0 }, { x: 6, y: 0 }],
          yAxis: [{ x: 0, y: -6 }, { x: 0, y: 6 }],
          segments: [
            [{ x: -6, y: 0 }, { x: 6, y: 0 }],
            [{ x: 0, y: -6 }, { x: 0, y: 6 }]
          ],
          labels: []
        }
      },
      renderHints: { draggable: true },
      meta: { coordinateSystemId: 'coord-A', draggable: true, snapToGrid: true }
    });
    runtime.addObject({
      id: 'f',
      kind: 'shape',
      type: 'function',
      payload: {
        objectType: 'function',
        expression: 'x',
        geometry: { kind: 'polyline', points: [{ x: -1, y: -1 }, { x: 1, y: 1 }] }
      },
      renderHints: {
        draggable: false,
        clipWorldBounds: { left: -6, right: 6, top: 6, bottom: -6 }
      },
      meta: {
        coordinateSystemId: 'coord-A',
        draggable: false,
        dragDisabled: true
      }
    });

    const moved = runtime.applyDragToObject('coord-A', {
      delta: { dimension: '2d', dx: 4.35, dy: -1.6 }
    });

    expect(moved.ok).toBe(true);
    expect(runtime.scene.getObject('coord-A')?.payload).toMatchObject({
      origin: { dimension: '2d', x: 4, y: -2 },
      geometry: {
        xAxis: [{ x: -2, y: -2 }, { x: 10, y: -2 }],
        yAxis: [{ x: 4, y: -8 }, { x: 4, y: 4 }]
      }
    });
    expect(runtime.scene.getObject('f')?.payload).toMatchObject({
      geometry: { points: [{ x: 3, y: -3 }, { x: 5, y: -1 }] }
    });
    expect(runtime.scene.getObject('f')?.renderHints).toMatchObject({
      draggable: false,
      clipWorldBounds: { left: -2, right: 10, top: 4, bottom: -8 }
    });
    expect(flushCount).toBe(1);
  });

  it('routes pointer drags for coordinate systems without stealing child-object hits', () => {
    const backend = createCoreOnlyTestBackend('runtime-coordinate-drag-controller');
    const runtime = new GraphSceneRuntime({ backend });
    runtime.mount(document.createElement('div'));

    runtime.addObject({
      id: 'coord-controller',
      kind: 'shape',
      type: 'coordinate-system',
      payload: {
        objectType: 'coordinate-system',
        dimension: 'plane',
        origin: { dimension: '2d', x: 0, y: 0 },
        size: { width: 12, height: 12 },
        unitPx: 1,
        xRange: { min: -6, max: 6 },
        yRange: { min: -6, max: 6 },
        geometry: {
          kind: 'coordinate-system',
          border: [{ x: -6, y: -6 }, { x: 6, y: -6 }, { x: 6, y: 6 }, { x: -6, y: 6 }],
          xAxis: [{ x: -6, y: 0 }, { x: 6, y: 0 }],
          yAxis: [{ x: 0, y: -6 }, { x: 0, y: 6 }],
          labels: []
        }
      },
      renderHints: { draggable: true },
      meta: { coordinateSystemId: 'coord-controller', draggable: true }
    });
    runtime.addObject({
      id: 'function-controller',
      kind: 'shape',
      type: 'function',
      payload: {
        objectType: 'function',
        expression: 'x',
        geometry: { kind: 'polyline', points: [{ x: -1, y: -1 }, { x: 1, y: 1 }] }
      },
      renderHints: {
        draggable: false,
        clipWorldBounds: { left: -6, right: 6, top: 6, bottom: -6 }
      },
      meta: {
        coordinateSystemId: 'coord-controller',
        dragDisabled: true
      }
    });
    runtime.addObject({
      ...createPointNode('child-point', 1, 1),
      meta: {
        coordinateSystemId: 'coord-controller',
        dragDisabled: true
      }
    });
    runtime.addObject({
      ...createPointNode('free-child-point', 4, 4),
      renderHints: { draggable: true },
      meta: {
        coordinateSystemId: 'coord-controller',
        draggable: true
      }
    });

    const controller = createGraphCoordinateSystemDragController({
      runtime,
      pickOptions: { tolerancePx: 0.1 },
      resolveWorldPoint: (point) => ({ x: point.x, y: point.y })
    });

    expect(controller.pointerDown({ pointerId: 4, point: { x: 4, y: 4 } })).toMatchObject({
      handled: true,
      objectId: 'free-child-point'
    });
    expect(controller.pointerMove({ pointerId: 4, point: { x: 6, y: 5 } })).toMatchObject({
      handled: true,
      objectId: 'free-child-point'
    });
    expect(controller.pointerUp({ pointerId: 4, point: { x: 6, y: 5 } }).handled).toBe(true);
    expect(runtime.scene.getObject('free-child-point')?.payload).toMatchObject({
      position: { dimension: '2d', x: 6, y: 5 }
    });

    expect(controller.pointerDown({ pointerId: 1, point: { x: 1, y: 1 } }).handled).toBe(false);
    expect(controller.isDragging()).toBe(false);

    expect(controller.pointerDown({ pointerId: 2, point: { x: 2, y: 2 } })).toMatchObject({
      handled: true,
      objectId: 'coord-controller'
    });
    expect(controller.isDragging(2)).toBe(true);

    expect(controller.pointerMove({ pointerId: 2, point: { x: 5, y: 0 } })).toMatchObject({
      handled: true,
      objectId: 'coord-controller'
    });
    expect(controller.pointerUp({ pointerId: 2, point: { x: 5, y: 0 } }).handled).toBe(true);
    expect(controller.isDragging()).toBe(false);

    expect(runtime.scene.getObject('coord-controller')?.payload).toMatchObject({
      origin: { dimension: '2d', x: 3, y: -2 },
      geometry: {
        border: [{ x: -3, y: -8 }, { x: 9, y: -8 }, { x: 9, y: 4 }, { x: -3, y: 4 }]
      }
    });
    expect(runtime.scene.getObject('function-controller')?.payload).toMatchObject({
      geometry: { points: [{ x: 2, y: -3 }, { x: 4, y: -1 }] }
    });
    expect(runtime.scene.getObject('function-controller')?.renderHints).toMatchObject({
      clipWorldBounds: { left: -3, right: 9, top: 4, bottom: -8 }
    });
    expect(runtime.scene.getObject('free-child-point')?.payload).toMatchObject({
      position: { dimension: '2d', x: 9, y: 3 }
    });
  });

  it('routes pointer drags for independent geometry objects without coordinate systems', () => {
    const backend = createCoreOnlyTestBackend('runtime-independent-drag-controller');
    const runtime = new GraphSceneRuntime({ backend });
    runtime.mount(document.createElement('div'));
    runtime.addObject({
      id: 'free-polygon',
      kind: 'shape',
      type: 'polygon',
      payload: {
        geometry: {
          kind: 'polygon',
          vertices: [{ x: -2, y: 3 }, { x: 0, y: 3 }, { x: -2, y: 5 }]
        }
      },
      layerId: 'content'
    });
    const dragRuntime = {
      scene: runtime.scene,
      router: {
        pick: (point: { x: number; y: number }) => (
          point.x === -2 && point.y === 3
            ? {
                target: { scope: 'object' as const, objectId: 'free-polygon' },
                backendId: backend.id,
                layerId: 'content' as const,
                clientPoint: { ...point }
              }
            : null
        )
      },
      applyDragToObject: runtime.applyDragToObject.bind(runtime)
    };

    const controller = createGraphCoordinateSystemDragController({
      runtime: dragRuntime,
      pickOptions: { tolerancePx: 0.1 },
      resolveWorldPoint: (point) => ({ x: point.x, y: point.y })
    });

    expect(controller.pointerDown({ pointerId: 1, point: { x: -2, y: 3 } })).toMatchObject({
      handled: true,
      objectId: 'free-polygon'
    });
    expect(controller.pointerMove({ pointerId: 1, point: { x: 1, y: 5 } })).toMatchObject({
      handled: true,
      objectId: 'free-polygon'
    });
    expect(controller.pointerUp({ pointerId: 1, point: { x: 1, y: 5 } }).handled).toBe(true);
    expect(runtime.scene.getObject('free-polygon')?.payload).toMatchObject({
      geometry: {
        vertices: [{ x: 1, y: 5 }, { x: 3, y: 5 }, { x: 1, y: 7 }]
      }
    });
  });

  it('removes old backend resources before switching GraphSceneRuntime backends', () => {
    const firstBackend = createCoreOnlyTestBackend('runtime-first');
    const secondBackend = createCoreOnlyTestBackend('runtime-second');
    const runtime = new GraphSceneRuntime({ backend: firstBackend });
    runtime.mount(document.createElement('div'));
    runtime.addObject(createPointNode('A', 3, 4));

    expect(firstBackend.pick({ x: 3, y: 4 })?.target.objectId).toBe('A');
    runtime.setBackend(secondBackend);

    expect(firstBackend.pick({ x: 3, y: 4 })).toBeNull();
    expect(secondBackend.pick({ x: 3, y: 4 })?.target.objectId).toBe('A');
  });
});
