import { beforeEach, describe, expect, it, vi } from 'vitest';
import { GraphSceneRuntime, type GraphRenderHandle } from '@vuegraphx/core';
import { createBabylonGraphBackend, createBabylonRuntime, type BabylonMeshLike, type BabylonNamespaceLike } from './index';

class FakeVector3 {
  public constructor(public x: number, public y: number, public z: number) {}
}

class FakeMesh implements BabylonMeshLike {
  public name = '';
  public metadata?: Record<string, unknown>;
  public position?: FakeVector3;
  public rotation?: FakeVector3;
  public material?: unknown;
  public options?: Record<string, unknown>;
  public dispose = vi.fn();
}

class FakeEngine {
  public static last: FakeEngine | null = null;
  public renderLoop: (() => void) | null = null;
  public resize = vi.fn();
  public dispose = vi.fn();
  public stopRenderLoop = vi.fn((callback?: () => void) => {
    if (!callback || callback === this.renderLoop) this.renderLoop = null;
  });

  public constructor() {
    FakeEngine.last = this;
  }

  public runRenderLoop(callback: () => void): void {
    this.renderLoop = callback;
  }
}

class FakeScene {
  public static last: FakeScene | null = null;
  public activeCamera?: unknown;
  public clearColor?: unknown;
  public ambientColor?: unknown;
  public render = vi.fn();
  public dispose = vi.fn();
  public pick = vi.fn(() => ({
    hit: true,
    pickedMesh: FakeMeshBuilder.lastMesh,
    pickedPoint: new FakeVector3(1, 2, 3),
    distance: 4
  }));

  public constructor() {
    FakeScene.last = this;
  }
}

class FakeCamera {
  public static last: FakeCamera | null = null;
  public mode?: number;
  public orthoLeft?: number;
  public orthoRight?: number;
  public orthoTop?: number;
  public orthoBottom?: number;
  public lowerAlphaLimit?: number;
  public upperAlphaLimit?: number;
  public lowerBetaLimit?: number;
  public upperBetaLimit?: number;
  public lowerRadiusLimit?: number;
  public upperRadiusLimit?: number;
  public attachControl = vi.fn();

  public constructor(
    public name: string,
    public alpha: number,
    public beta: number,
    public radius: number,
    public target: FakeVector3,
    public scene: unknown
  ) {
    FakeCamera.last = this;
  }
}

class FakeLight {}
class FakeColor3 {
  public constructor(public r: number, public g: number, public b: number) {}
}
class FakeColor4 {
  public constructor(public r: number, public g: number, public b: number, public a: number) {}
}
class FakeMaterial {
  public diffuseColor?: unknown;
  public emissiveColor?: unknown;
  public specularColor?: unknown;
  public diffuseTexture?: unknown;
  public emissiveTexture?: unknown;
  public opacityTexture?: unknown;
  public useAlphaFromDiffuseTexture?: boolean;
  public backFaceCulling?: boolean;
  public disableLighting?: boolean;
  public alpha?: number;
  public dispose = vi.fn();
  public constructor(public name: string, public scene: unknown) {}
}

class FakeDynamicTexture {
  public static instances: FakeDynamicTexture[] = [];
  public hasAlpha?: boolean;
  public drawText = vi.fn();
  public dispose = vi.fn();

  public constructor(
    public name: string,
    public canvasOrSize: { width: number; height: number } | number,
    public scene?: unknown,
    public generateMipMaps?: boolean
  ) {
    FakeDynamicTexture.instances.push(this);
  }
}

const FakeMeshBuilder = {
  lastMesh: null as FakeMesh | null,
  meshes: new Map<string, FakeMesh>(),
  CreateBox: vi.fn((name: string, options: Record<string, unknown>, _scene: unknown) => {
    FakeMeshBuilder.lastMesh = new FakeMesh();
    FakeMeshBuilder.lastMesh.options = options;
    FakeMeshBuilder.meshes.set(name, FakeMeshBuilder.lastMesh);
    return FakeMeshBuilder.lastMesh;
  }),
  CreatePlane: vi.fn((name: string, options: Record<string, unknown>, _scene: unknown) => {
    FakeMeshBuilder.lastMesh = new FakeMesh();
    FakeMeshBuilder.lastMesh.options = options;
    FakeMeshBuilder.meshes.set(name, FakeMeshBuilder.lastMesh);
    return FakeMeshBuilder.lastMesh;
  }),
  CreateSphere: vi.fn((name: string, options: Record<string, unknown>, _scene: unknown) => {
    FakeMeshBuilder.lastMesh = new FakeMesh();
    FakeMeshBuilder.lastMesh.options = options;
    FakeMeshBuilder.meshes.set(name, FakeMeshBuilder.lastMesh);
    return FakeMeshBuilder.lastMesh;
  }),
  CreateCylinder: vi.fn((name: string, options: Record<string, unknown>, _scene: unknown) => {
    FakeMeshBuilder.lastMesh = new FakeMesh();
    FakeMeshBuilder.lastMesh.options = options;
    FakeMeshBuilder.meshes.set(name, FakeMeshBuilder.lastMesh);
    return FakeMeshBuilder.lastMesh;
  })
};

const createFakeBabylon = (): BabylonNamespaceLike => ({
  Engine: FakeEngine as unknown as BabylonNamespaceLike['Engine'],
  Scene: FakeScene as unknown as BabylonNamespaceLike['Scene'],
  Vector3: FakeVector3,
  Color3: FakeColor3,
  Color4: FakeColor4,
  StandardMaterial: FakeMaterial,
  DynamicTexture: FakeDynamicTexture,
  ArcRotateCamera: FakeCamera as unknown as BabylonNamespaceLike['ArcRotateCamera'],
  HemisphericLight: FakeLight as unknown as BabylonNamespaceLike['HemisphericLight'],
  MeshBuilder: FakeMeshBuilder
});

const clearMeshBuilderCalls = () => {
  FakeMeshBuilder.lastMesh = null;
  FakeMeshBuilder.meshes.clear();
  FakeMeshBuilder.CreateBox.mockClear();
  FakeMeshBuilder.CreatePlane.mockClear();
  FakeMeshBuilder.CreateSphere.mockClear();
  FakeMeshBuilder.CreateCylinder.mockClear();
  FakeDynamicTexture.instances = [];
};

beforeEach(() => {
  clearMeshBuilderCalls();
  FakeCamera.last = null;
});

describe('BabylonRuntime', () => {
  it('mounts a real Babylon-style runtime, creates a solid, maps picks, and disposes cleanly', () => {
    const runtime = createBabylonRuntime(createFakeBabylon());
    const host = document.createElement('div');

    runtime.mount(host, { size: { width: 320, height: 240 } });
    expect(host.querySelector('canvas')).not.toBeNull();
    expect(FakeEngine.last?.renderLoop).toBeTypeOf('function');
    expect(FakeScene.last?.clearColor).toEqual({ r: 1, g: 1, b: 1, a: 1 });
    expect(FakeMeshBuilder.CreateBox).toHaveBeenCalledTimes(42);
    expect(FakeMeshBuilder.meshes.get('vuegraphx-grid-x-0')?.options).toMatchObject({ width: 20, height: 0.035, depth: 0.035 });
    clearMeshBuilderCalls();

    runtime.createObject({
      id: 'cube',
      kind: 'shape',
      type: 'solid',
      payload: {
        family: 'cube',
        parameters: { size: 2 },
        origin: { x: 1, y: 2, z: 3 }
      }
    }, {
      id: 'babylon:cube',
      objectId: 'cube',
      backendId: 'babylon',
      layerId: 'content',
      target: { scope: 'object', objectId: 'cube', backendId: 'babylon', layerId: 'content' }
    });

    expect(FakeMeshBuilder.CreateBox).toHaveBeenCalledOnce();
    expect(FakeMeshBuilder.lastMesh?.metadata?.vuegraphx).toEqual({ objectId: 'cube', componentId: 'body' });
    expect(FakeMeshBuilder.lastMesh?.position).toEqual({ x: 1, y: 2, z: 3 });
    expect(FakeMeshBuilder.lastMesh?.material).toMatchObject({ alpha: expect.any(Number) });

    const pick = runtime.pick({ x: 10, y: 20 });
    expect(pick).toMatchObject({ objectId: 'cube', componentId: 'body', worldPoint: { dimension: '3d', x: 1, y: 2, z: 3 } });

    runtime.resize({ width: 640, height: 480 });
    expect(FakeEngine.last?.resize).toHaveBeenCalledOnce();
    runtime.renderFrame();
    expect(FakeScene.last?.render).toHaveBeenCalledOnce();

    runtime.destroy();
    expect(FakeEngine.last?.stopRenderLoop).toHaveBeenCalled();
    expect(FakeScene.last?.dispose).toHaveBeenCalledOnce();
    expect(FakeEngine.last?.dispose).toHaveBeenCalledOnce();
  });

  it('uses a locked orthographic camera and projection meshes in 2D render mode', () => {
    const runtime = createBabylonRuntime(createFakeBabylon(), {
      renderMode: '2d',
      attachCameraControl: false
    });
    const host = document.createElement('div');

    runtime.mount(host, {
      size: { width: 320, height: 240 },
      attributes: { renderMode: '2d', worldBounds: { left: -6, right: 6, top: 4, bottom: -4 } }
    });

    expect(FakeCamera.last).toMatchObject({
      alpha: -Math.PI / 2,
      beta: Math.PI / 2,
      mode: 1,
      orthoLeft: -6,
      orthoRight: 6,
      orthoTop: 4.5,
      orthoBottom: -4.5,
      lowerAlphaLimit: -Math.PI / 2,
      upperAlphaLimit: -Math.PI / 2,
      lowerBetaLimit: Math.PI / 2,
      upperBetaLimit: Math.PI / 2
    });
    expect(FakeCamera.last?.attachControl).not.toHaveBeenCalled();

    clearMeshBuilderCalls();
    runtime.createObject({
      id: 'cube',
      kind: 'shape',
      type: 'solid',
      payload: {
        family: 'cube',
        parameters: { size: 2 },
        geometry: { kind: 'polyline', points: [{ x: -1, y: -1 }, { x: 1, y: -1 }, { x: 1, y: 1 }] }
      }
    }, {
      id: 'babylon:cube',
      objectId: 'cube',
      backendId: 'babylon',
      layerId: 'content',
      target: { scope: 'object', objectId: 'cube', backendId: 'babylon', layerId: 'content' }
    });

    expect(FakeMeshBuilder.meshes.has('babylon:cube')).toBe(false);
    expect(FakeMeshBuilder.meshes.get('babylon:cube:segment-1')?.metadata?.vuegraphx).toMatchObject({
      objectId: 'cube',
      componentId: 'projection'
    });
    expect(runtime.unproject({ x: 10, y: 20 })).toEqual({ dimension: '2d', x: 10, y: 20 });
    expect(runtime.pick({ x: 10, y: 20 })?.worldPoint).toEqual({ dimension: '2d', x: 1, y: 2 });

    runtime.resize({ width: 480, height: 240 });
    expect(FakeCamera.last).toMatchObject({ orthoLeft: -8, orthoRight: 8, orthoTop: 4, orthoBottom: -4 });

    runtime.destroy();
  });

  it('expands square 2D world bounds to preserve circular point geometry on rectangular canvases', () => {
    const runtime = createBabylonRuntime(createFakeBabylon(), {
      renderMode: '2d',
      attachCameraControl: false
    });
    const host = document.createElement('div');

    runtime.mount(host, {
      size: { width: 400, height: 300 },
      attributes: { renderMode: '2d', worldBounds: { left: -10, right: 10, top: 10, bottom: -10 } }
    });

    expect(FakeCamera.last).toMatchObject({
      orthoLeft: expect.closeTo(-13.333333333333334),
      orthoRight: expect.closeTo(13.333333333333334),
      orthoTop: 10,
      orthoBottom: -10
    });

    runtime.destroy();
  });

  it('creates and updates native Babylon proxy objects for curriculum primitives', () => {
    const runtime = createBabylonRuntime(createFakeBabylon());
    const host = document.createElement('div');
    runtime.mount(host, { size: { width: 320, height: 240 } });
    clearMeshBuilderCalls();

    const handleFor = (objectId: string): GraphRenderHandle => ({
      id: `babylon:${objectId}`,
      objectId,
      backendId: 'babylon',
      layerId: 'content' as const,
      target: { scope: 'object' as const, objectId, backendId: 'babylon', layerId: 'content' as const }
    });

    runtime.createObject({
      id: 'A',
      kind: 'shape',
      type: 'point',
      payload: { point: { x: 1, y: 2 } }
    }, handleFor('A'));
    runtime.createObject({
      id: 'f',
      kind: 'shape',
      type: 'function',
      payload: { geometry: { kind: 'polyline', points: [{ x: -1, y: 1 }, { x: 1, y: 1 }] } }
    }, handleFor('f'));
    runtime.createObject({
      id: 'poly',
      kind: 'shape',
      type: 'polygon',
      payload: { geometry: { kind: 'polygon', vertices: [{ x: 0, y: 0 }, { x: 2, y: 0 }, { x: 0, y: 2 }] } }
    }, handleFor('poly'));
    runtime.createObject({
      id: 'm',
      kind: 'overlay',
      type: 'measurement',
      payload: { point: { x: 2, y: 3 }, measurementKind: 'distance', value: 5 }
    }, handleFor('m'));
    runtime.createObject({
      id: 'label',
      kind: 'overlay',
      type: 'text',
      payload: { point: { x: -2, y: 1 }, text: '中点 A' },
      renderHints: { strokeColor: '#ef4444' }
    }, handleFor('label'));

    expect(FakeMeshBuilder.CreateSphere).toHaveBeenCalledTimes(1);
    expect(FakeMeshBuilder.CreateBox).toHaveBeenCalledTimes(4);
    expect(FakeMeshBuilder.CreatePlane).toHaveBeenCalledTimes(2);
    expect(FakeDynamicTexture.instances).toHaveLength(2);
    expect(FakeMeshBuilder.meshes.get('babylon:f:segment-1')?.metadata?.vuegraphx).toMatchObject({ objectId: 'f', componentId: 'curve' });
    expect(FakeMeshBuilder.meshes.get('babylon:poly:segment-1')?.material).toMatchObject({ alpha: expect.any(Number) });
    expect(FakeMeshBuilder.meshes.get('babylon:m')?.metadata?.vuegraphx).toMatchObject({ objectId: 'm', componentId: 'measurement' });
    expect(FakeMeshBuilder.meshes.get('babylon:label')?.metadata?.vuegraphx).toMatchObject({ objectId: 'label', componentId: 'label' });
    expect(FakeMeshBuilder.meshes.get('babylon:label')?.options).toMatchObject({ sideOrientation: 2 });
    expect(FakeDynamicTexture.instances[0]?.drawText).toHaveBeenCalledWith(
      'distance: 5',
      expect.any(Number),
      null,
      expect.stringContaining('Arial'),
      expect.stringContaining('rgba('),
      expect.stringContaining('rgba('),
      true,
      true
    );
    expect(FakeDynamicTexture.instances[1]?.drawText).toHaveBeenCalledWith(
      '中点 A',
      expect.any(Number),
      null,
      expect.stringContaining('Microsoft YaHei'),
      'rgba(239, 68, 68, 1)',
      expect.stringContaining('rgba('),
      true,
      true
    );
    expect(FakeDynamicTexture.instances[0]?.hasAlpha).toBe(true);
    expect(FakeDynamicTexture.instances[1]?.hasAlpha).toBe(true);
    expect(FakeMeshBuilder.meshes.get('babylon:label')?.material).toMatchObject({
      useAlphaFromDiffuseTexture: true,
      backFaceCulling: false,
      disableLighting: true
    });

    runtime.updateObject(handleFor('A'), { payload: { point: { x: 4, y: 5 } } });
    expect(FakeMeshBuilder.CreateSphere).toHaveBeenCalledTimes(2);
    expect(FakeMeshBuilder.meshes.get('babylon:A')?.position).toEqual({ x: 4, y: 5, z: 0.02 });

    runtime.destroy();
  });

  it('renders hyperbola branches as separate proxy curves without a bridge segment', () => {
    const runtime = createBabylonRuntime(createFakeBabylon(), { renderMode: '2d' });
    const host = document.createElement('div');
    runtime.mount(host, { size: { width: 320, height: 240 }, attributes: { renderMode: '2d' } });
    clearMeshBuilderCalls();

    runtime.createObject({
      id: 'hyp',
      kind: 'shape',
      type: 'conic',
      payload: {
        geometry: {
          kind: 'hyperbola',
          center: { x: 0, y: 0 },
          radiusX: 1,
          radiusY: 1
        }
      }
    }, {
      id: 'babylon:hyp',
      objectId: 'hyp',
      backendId: 'babylon',
      layerId: 'content',
      target: { scope: 'object', objectId: 'hyp', backendId: 'babylon', layerId: 'content' }
    });

    const segmentWidths = [...FakeMeshBuilder.meshes]
      .filter(([name]) => name.startsWith('babylon:hyp:segment-'))
      .map(([, mesh]) => Number(mesh.options?.width ?? 0));
    expect(segmentWidths).toHaveLength(94);
    expect(Math.max(...segmentWidths)).toBeLessThan(1);

    runtime.destroy();
  });

  it('renders 2D Babylon text as readable DOM labels without edge-on mesh artifacts', () => {
    const runtime = createBabylonRuntime(createFakeBabylon(), { renderMode: '2d' });
    const host = document.createElement('div');
    runtime.mount(host, {
      size: { width: 400, height: 300 },
      attributes: { renderMode: '2d', worldBounds: { left: -10, right: 10, top: 10, bottom: -10 } }
    });
    clearMeshBuilderCalls();

    const handle: GraphRenderHandle = {
      id: 'babylon:text-1',
      objectId: 'text-1',
      backendId: 'babylon',
      layerId: 'content',
      target: { scope: 'object', objectId: 'text-1', backendId: 'babylon', layerId: 'content' }
    };

    runtime.createObject({
      id: 'text-1',
      kind: 'overlay',
      type: 'text',
      payload: {
        objectType: 'text',
        content: 'Babylon文字OK',
        anchor: { coordinates: { dimension: '2d', x: -5, y: 3 } },
        format: 'plain'
      },
      renderHints: { strokeColor: '#ef4444' }
    }, handle);

    expect(FakeMeshBuilder.CreatePlane).not.toHaveBeenCalled();
    expect(FakeMeshBuilder.CreateBox).not.toHaveBeenCalled();
    const label = host.querySelector('[data-vuegraphx-babylon-label-layer] [data-vuegraphx-object-id="text-1"]') as HTMLElement | null;
    expect(label?.textContent).toBe('Babylon文字OK');
    expect(label?.style.left).toBe('25%');
    expect(label?.style.top).toBe('35%');

    runtime.destroy();
  });

  it('accepts multiline equations and surface wireframes through the backend contract', () => {
    const runtime = createBabylonRuntime(createFakeBabylon(), { renderMode: '2d' });
    const backend = createBabylonGraphBackend({ id: 'babylon', runtime });
    const host = document.createElement('div');
    backend.mount({ resource: host }, {
      size: { width: 400, height: 300 },
      attributes: { renderMode: '2d', worldBounds: { left: -10, right: 10, top: 10, bottom: -10 } }
    });
    clearMeshBuilderCalls();

    const scene = new GraphSceneRuntime({ backend });
    const equation = scene.addObject({
      id: 'eq',
      kind: 'shape',
      type: 'equation',
      payload: {
        expression: 'x^2 - y^2 = 1',
        geometry: {
          kind: 'multiline',
          segments: [
            [{ x: -2, y: -1 }, { x: -1, y: 0 }, { x: -2, y: 1 }],
            [{ x: 2, y: -1 }, { x: 1, y: 0 }, { x: 2, y: 1 }]
          ]
        }
      }
    });
    const surface = scene.addObject({
      id: 'surface',
      kind: 'shape',
      type: 'solid',
      payload: {
        objectType: 'solid',
        solidKind: 'surface',
        family: 'surface',
        geometry: {
          kind: 'wireframe',
          projection: 'isometric',
          segments: [
            [{ x: -1, y: -1 }, { x: 1, y: 1 }],
            [{ x: -1, y: 1 }, { x: 1, y: -1 }]
          ]
        }
      }
    });

    expect(equation.diagnostics).toEqual([]);
    expect(surface.diagnostics).toEqual([]);
    expect(scene.snapshot().handles.map((handle) => handle.objectId)).toEqual(['eq', 'surface']);
    expect(FakeMeshBuilder.meshes.get('babylon:eq:segment-1')?.metadata?.vuegraphx).toMatchObject({ objectId: 'eq' });
    expect(FakeMeshBuilder.meshes.get('babylon:surface:segment-1')?.metadata?.vuegraphx).toMatchObject({
      objectId: 'surface',
      componentId: 'projection'
    });

    runtime.destroy();
  });

  it('maps polygonal prism, pyramid, and frustum solid families to Babylon cylinder meshes with fixed tessellation', () => {
    const runtime = createBabylonRuntime(createFakeBabylon());
    const host = document.createElement('div');
    runtime.mount(host, { size: { width: 320, height: 240 } });
    clearMeshBuilderCalls();

    const handleFor = (objectId: string): GraphRenderHandle => ({
      id: `babylon:${objectId}`,
      objectId,
      backendId: 'babylon',
      layerId: 'content' as const,
      target: { scope: 'object' as const, objectId, backendId: 'babylon', layerId: 'content' as const }
    });

    runtime.createSolid({
      id: 'triPrism',
      kind: 'shape',
      type: 'solid',
      payload: { family: 'triangular-prism', parameters: { baseArea: 1, basePerimeter: 4.5, height: 2 } }
    }, handleFor('triPrism'));
    runtime.createSolid({
      id: 'quadPyramid',
      kind: 'shape',
      type: 'solid',
      payload: { family: 'quadrangular-pyramid', parameters: { baseArea: 1, basePerimeter: 6, height: 2, slantHeight: 2 } }
    }, handleFor('quadPyramid'));
    runtime.createSolid({
      id: 'quadFrustum',
      kind: 'shape',
      type: 'solid',
      payload: { family: 'quadrangular-frustum', parameters: { topArea: 0.25, bottomArea: 1, topPerimeter: 2.8, bottomPerimeter: 5.2, height: 2, slantHeight: 2 } }
    }, handleFor('quadFrustum'));

    expect(FakeMeshBuilder.CreateCylinder).toHaveBeenCalledTimes(3);
    expect(FakeMeshBuilder.CreateCylinder.mock.calls[0][1]).toMatchObject({
      height: 2,
      diameterTop: expect.closeTo(4.5 / 3 / Math.sin(Math.PI / 3)),
      diameterBottom: expect.closeTo(4.5 / 3 / Math.sin(Math.PI / 3)),
      tessellation: 3
    });
    expect(FakeMeshBuilder.CreateCylinder.mock.calls[1][1]).toMatchObject({
      height: 2,
      diameterTop: 0,
      diameterBottom: expect.closeTo(6 / 4 / Math.sin(Math.PI / 4)),
      tessellation: 4
    });
    expect(FakeMeshBuilder.CreateCylinder.mock.calls[2][1]).toMatchObject({
      height: 2,
      diameterTop: expect.closeTo(2.8 / 4 / Math.sin(Math.PI / 4)),
      diameterBottom: expect.closeTo(5.2 / 4 / Math.sin(Math.PI / 4)),
      tessellation: 4
    });
    expect(FakeMeshBuilder.CreateBox).not.toHaveBeenCalled();

    runtime.destroy();
  });

});
