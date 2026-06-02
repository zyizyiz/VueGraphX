import { beforeEach, describe, expect, it, vi } from 'vitest';
import { GraphSceneRuntime, createStandardCoordinateSystemGeometry, type GraphRenderHandle } from '@vuegraphx/core';
import { createBabylonGraphBackend, createBabylonRuntime, type BabylonMeshLike, type BabylonNamespaceLike } from './index';

class FakeVector3 {
  public constructor(public x: number, public y: number, public z: number) {}
}

class FakeMesh implements BabylonMeshLike {
  public name = '';
  public metadata?: Record<string, unknown>;
  public isPickable?: boolean;
  public position?: FakeVector3;
  public rotation?: FakeVector3;
  public scaling?: FakeVector3;
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
  public disableDepthWrite?: boolean;
  public alpha?: number;
  public dispose = vi.fn();
  public constructor(public name: string, public scene: unknown) {}
}

class FakeCanvasContext {
  public strokeStyle?: string;
  public fillStyle?: string;
  public lineWidth?: number;
  public lineCap?: CanvasLineCap;
  public font?: string;
  public textBaseline?: CanvasTextBaseline;
  public textAlign?: CanvasTextAlign;
  public save = vi.fn();
  public restore = vi.fn();
  public setTransform = vi.fn();
  public clearRect = vi.fn();
  public fillRect = vi.fn();
  public beginPath = vi.fn();
  public moveTo = vi.fn();
  public lineTo = vi.fn();
  public closePath = vi.fn();
  public stroke = vi.fn();
  public fill = vi.fn();
  public fillText = vi.fn();
}

class FakeDynamicTexture {
  public static instances: FakeDynamicTexture[] = [];
  public hasAlpha?: boolean;
  public context = new FakeCanvasContext();
  public drawText = vi.fn();
  public update = vi.fn();
  public dispose = vi.fn();
  public getContext = vi.fn(() => this.context as unknown as CanvasRenderingContext2D);

  public constructor(
    public name: string,
    public canvasOrSize: { width: number; height: number } | number,
    public scene?: unknown,
    public generateMipMaps?: boolean
  ) {
    FakeDynamicTexture.instances.push(this);
  }
}

class FakeTexture {
  public static instances: FakeTexture[] = [];
  public hasAlpha?: boolean;
  public dispose = vi.fn();

  public constructor(
    public url: string | null,
    public scene?: unknown,
    public noMipmapOrOptions?: unknown,
    public invertY?: boolean
  ) {
    FakeTexture.instances.push(this);
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
  CreateDisc: vi.fn((name: string, options: Record<string, unknown>, _scene: unknown) => {
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
  }),
  CreateTube: vi.fn((name: string, options: Record<string, unknown>, _scene: unknown) => {
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
  Texture: FakeTexture,
  ArcRotateCamera: FakeCamera as unknown as BabylonNamespaceLike['ArcRotateCamera'],
  HemisphericLight: FakeLight as unknown as BabylonNamespaceLike['HemisphericLight'],
  MeshBuilder: FakeMeshBuilder
});

const clearMeshBuilderCalls = () => {
  FakeMeshBuilder.lastMesh = null;
  FakeMeshBuilder.meshes.clear();
  FakeMeshBuilder.CreateBox.mockClear();
  FakeMeshBuilder.CreateDisc.mockClear();
  FakeMeshBuilder.CreatePlane.mockClear();
  FakeMeshBuilder.CreateSphere.mockClear();
  FakeMeshBuilder.CreateCylinder.mockClear();
  FakeMeshBuilder.CreateTube.mockClear();
  FakeDynamicTexture.instances = [];
  FakeTexture.instances = [];
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
    expect(runtime.project({ dimension: '2d', x: 0, y: 0 })).toEqual({ x: 160, y: 120 });
    expect(runtime.unproject({ x: 160, y: 120 })).toEqual({ dimension: '2d', x: 0, y: 0 });
    expect(runtime.pick({ x: 10, y: 20 })?.worldPoint).toEqual({ dimension: '2d', x: 1, y: 2 });

    runtime.resize({ width: 480, height: 240 });
    expect(FakeCamera.last).toMatchObject({ orthoLeft: -8, orthoRight: 8, orthoTop: 4, orthoBottom: -4 });

    runtime.destroy();
  });



  it('derives a 30px-per-unit 2D coordinate texture grid without helper axes', () => {
    const runtime = createBabylonRuntime(createFakeBabylon(), {
      renderMode: '2d',
      attachCameraControl: false,
      showAxes: false,
      grid: true
    });
    const host = document.createElement('div');

    runtime.mount(host, {
      size: { width: 600, height: 420 },
      attributes: { renderMode: '2d', showAxes: false, grid: true }
    });

    expect(FakeCamera.last).toMatchObject({
      orthoLeft: -10,
      orthoRight: 10,
      orthoTop: 7,
      orthoBottom: -7
    });
    const coordinateLayer = FakeMeshBuilder.meshes.get('vuegraphx-coordinate-layer');
    const metadata = coordinateLayer?.metadata?.vuegraphxCoordinateLayer as { grid?: { enabled?: boolean; cellSizePx?: number }; labels?: unknown[] } | undefined;
    expect(metadata?.grid).toEqual({ enabled: true, cellSizePx: 30 });
    expect(metadata?.labels).toEqual([]);
    expect(FakeDynamicTexture.instances[0]?.context.fillRect).toHaveBeenCalledWith(0, 0, 600, 420);

    runtime.destroy();
  });

  it('keeps 2D helper coordinate axes behind projected content and foreground labels', () => {
    const runtime = createBabylonRuntime(createFakeBabylon(), {
      renderMode: '2d',
      attachCameraControl: false
    });
    const host = document.createElement('div');

    runtime.mount(host, {
      size: { width: 320, height: 240 },
      attributes: { renderMode: '2d', worldBounds: { left: -6, right: 6, top: 4, bottom: -4 } }
    });
    const gridZ = FakeMeshBuilder.meshes.get('vuegraphx-coordinate-layer')?.position?.z;
    expect(gridZ).toBeGreaterThan(0);
    clearMeshBuilderCalls();

    const handleFor = (objectId: string): GraphRenderHandle => ({
      id: `babylon:${objectId}`,
      objectId,
      backendId: 'babylon',
      layerId: 'content' as const,
      target: { scope: 'object' as const, objectId, backendId: 'babylon', layerId: 'content' as const }
    });

    runtime.createObject({
      id: 'f',
      kind: 'shape',
      type: 'function',
      payload: { geometry: { kind: 'polyline', points: [{ x: -1, y: 1 }, { x: 1, y: 1 }] } }
    }, handleFor('f'));
    runtime.createObject({
      id: 'A',
      kind: 'shape',
      type: 'point',
      payload: { point: { x: 0, y: 0 } }
    }, handleFor('A'));
    runtime.createObject({
      id: 'label',
      kind: 'overlay',
      type: 'text',
      payload: { point: { x: 0, y: 0 }, text: 'front label' }
    }, handleFor('label'));

    const functionPath = FakeMeshBuilder.meshes.get('babylon:f:segment-1');
    expect(Number(functionPath?.options?.height)).toBeGreaterThan(0);
    expect(functionPath?.position?.z).toBeLessThan(gridZ ?? 0);
    expect(FakeMeshBuilder.meshes.get('babylon:A')?.position?.z).toBeLessThan(functionPath?.position?.z ?? 0);
    expect(host.querySelector('[data-vuegraphx-object-id="label"]')).not.toBeNull();

    runtime.destroy();
  });

  it('renders semantic coordinate-system labels through the 2D object label layer', () => {
    const runtime = createBabylonRuntime(createFakeBabylon(), {
      renderMode: '2d',
      attachCameraControl: false,
      showAxes: false,
      grid: false
    });
    const host = document.createElement('div');

    runtime.mount(host, {
      size: { width: 360, height: 360 },
      attributes: { renderMode: '2d', showAxes: false, grid: false, worldBounds: { left: -6, right: 6, top: 6, bottom: -6 } }
    });
    runtime.createObject({
      id: 'coord-local',
      kind: 'shape',
      type: 'coordinate-system',
      payload: {
        geometry: createStandardCoordinateSystemGeometry({
          origin: { x: 0, y: 0 },
          unitPx: 1,
          xRange: { min: -6, max: 6 },
          yRange: { min: -6, max: 6 },
          includeGrid: false,
          includeBorder: false
        })
      }
    }, {
      id: 'babylon:coord-local',
      objectId: 'coord-local',
      backendId: 'babylon',
      layerId: 'content',
      target: { scope: 'object', objectId: 'coord-local', backendId: 'babylon', layerId: 'content' }
    });

    const originLabel = host.querySelector('[data-vuegraphx-coordinate-label-role="origin"]') as HTMLElement | null;
    const yAxisLabel = Array.from(host.querySelectorAll('[data-vuegraphx-coordinate-label-role="y-axis"]')).at(0) as HTMLElement | undefined;
    expect(originLabel?.textContent).toBe('O');
    expect(originLabel?.style.left).toBe('168px');
    expect(originLabel?.style.top).toBe('180px');
    expect(yAxisLabel?.textContent).toBe('y');
    expect(yAxisLabel?.style.left).toBe('170px');
    expect(yAxisLabel?.style.top).toBe('-7px');
    expect(yAxisLabel?.style.font).toContain('12px');

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
    const coordinateLayer = FakeMeshBuilder.meshes.get('vuegraphx-coordinate-layer');
    expect(coordinateLayer?.options).toMatchObject({ width: 1, height: 1, sideOrientation: 2 });
    expect(coordinateLayer?.isPickable).toBe(false);
    expect(coordinateLayer?.position?.z).toBeGreaterThan(0);
    expect(coordinateLayer?.scaling?.x).toBeCloseTo(26.666666666666668);
    expect(coordinateLayer?.scaling?.y).toBeCloseTo(20);
    expect(coordinateLayer?.material).toMatchObject({ disableDepthWrite: true });
    const coordinateMetadata = coordinateLayer?.metadata?.vuegraphxCoordinateLayer as { labels?: Array<{ text?: string; left?: number; top?: number; axis?: string }> } | undefined;
    const coordinateLabels = coordinateMetadata?.labels ?? [];
    expect(coordinateLabels.length).toBeGreaterThan(0);
    const hasLabelAt = (text: string, left: number, top: number, axis: string) => coordinateLabels.some((label) => {
      return label?.text === text
        && Math.abs((label.left ?? Number.NaN) - left) < 1e-6
        && Math.abs((label.top ?? Number.NaN) - top) < 1e-6
        && label.axis === axis;
    });
    expect(hasLabelAt('2', 230, 150, 'x')).toBe(true);
    expect(hasLabelAt('2', 190, 111, 'y')).toBe(true);
    expect(hasLabelAt('x', 394, 150, 'plain')).toBe(true);
    expect(hasLabelAt('y', 190, -7, 'plain')).toBe(true);
    expect(hasLabelAt('O', 188, 150, 'plain')).toBe(true);
    expect(FakeDynamicTexture.instances[0]?.context.fill).toHaveBeenCalled();
    expect(FakeMeshBuilder.meshes.has('vuegraphx-axis-x-arrow-1')).toBe(false);
    expect(FakeMeshBuilder.meshes.has('vuegraphx-axis-y-arrow-1')).toBe(false);
    expect(runtime.project({ dimension: '2d', x: 10, y: 0 })).toEqual({ x: expect.closeTo(350), y: 150 });
    expect(runtime.unproject({ x: 350, y: 150 })).toEqual({ dimension: '2d', x: expect.closeTo(10), y: 0 });

    runtime.destroy();
  });

  it('scales Babylon 2D helper and DOM object label styling with viewport zoom', () => {
    const runtime = createBabylonRuntime(createFakeBabylon(), {
      renderMode: '2d',
      attachCameraControl: false
    });
    const host = document.createElement('div');

    runtime.mount(host, {
      size: { width: 400, height: 300 },
      attributes: { renderMode: '2d', worldBounds: { left: -10, right: 10, top: 10, bottom: -10 } }
    });
    runtime.createObject({
      id: 'text-zoom',
      kind: 'overlay',
      type: 'text',
      payload: { point: { x: 1, y: 2 }, text: 'zoom label' }
    }, {
      id: 'babylon:text-zoom',
      objectId: 'text-zoom',
      backendId: 'babylon',
      layerId: 'content',
      target: { scope: 'object', objectId: 'text-zoom', backendId: 'babylon', layerId: 'content' }
    });

    expect((host.querySelector('[data-vuegraphx-object-id="text-zoom"]') as HTMLElement | null)?.getAttribute('style')).toContain('14px');
    expect((host.querySelector('[data-vuegraphx-object-id="text-zoom"]') as HTMLElement | null)?.style.transform).toBe('translate3d(215px, 120px, 0) scale(1)');

    const initialTextureCount = FakeDynamicTexture.instances.length;
    const initialCoordinateLayer = FakeMeshBuilder.meshes.get('vuegraphx-coordinate-layer');
    const initialTexture = FakeDynamicTexture.instances[0];
    runtime.setWorldBounds({ left: -5, right: 5, top: 5, bottom: -5 });

    expect(FakeDynamicTexture.instances).toHaveLength(initialTextureCount);
    expect(FakeMeshBuilder.meshes.get('vuegraphx-coordinate-layer')).toBe(initialCoordinateLayer);
    expect(initialTexture?.update).toHaveBeenCalledTimes(2);
    expect(initialTexture?.update).toHaveBeenLastCalledWith(true);
    expect(initialTexture?.context.font).toContain('24px');
    const coordinateMetadata = initialCoordinateLayer?.metadata?.vuegraphxCoordinateLayer as { labels?: Array<{ text?: string; left?: number; top?: number; visualScale?: number }> } | undefined;
    const coordinateLabels = coordinateMetadata?.labels ?? [];
    const xAxisLabel = coordinateLabels.find((label) => label.text === 'x' && label.visualScale === 2);
    const yAxisLabel = coordinateLabels.find((label) => label.text === 'y' && label.visualScale === 2);
    expect(xAxisLabel).toMatchObject({ left: 388, top: 150, visualScale: 2 });
    expect(yAxisLabel).toMatchObject({ left: 180, top: -14, visualScale: 2 });
    expect(initialCoordinateLayer?.position?.z).toBeGreaterThan(0);
    const zoomedLabel = host.querySelector('[data-vuegraphx-object-id="text-zoom"]') as HTMLElement | null;
    expect(zoomedLabel?.getAttribute('style')).toContain('14px');
    expect(zoomedLabel?.style.left).toBe('0px');
    expect(zoomedLabel?.style.top).toBe('0px');
    expect(zoomedLabel?.style.transform).toBe('translate3d(230px, 90px, 0) scale(2)');
    expect(zoomedLabel?.style.transformOrigin).toBe('0 0');

    runtime.setWorldBounds({ left: -1, right: 1, top: 1, bottom: -1 });
    const deeplyZoomedLabel = host.querySelector('[data-vuegraphx-object-id="text-zoom"]') as HTMLElement | null;
    expect(deeplyZoomedLabel?.style.transform).toBe('translate3d(350px, -150px, 0) scale(10)');
    const deeplyZoomedMetadata = initialCoordinateLayer?.metadata?.vuegraphxCoordinateLayer as { labels?: Array<{ text?: string; visualScale?: number }> } | undefined;
    expect(deeplyZoomedMetadata?.labels?.some((label) => label.text === 'x' && label.visualScale === 8)).toBe(true);

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
    expect(FakeMeshBuilder.CreateTube).toHaveBeenCalledTimes(2);
    expect(FakeMeshBuilder.CreateBox).not.toHaveBeenCalled();
    expect(FakeMeshBuilder.CreatePlane).toHaveBeenCalledTimes(2);
    expect(FakeDynamicTexture.instances).toHaveLength(2);
    expect(FakeMeshBuilder.meshes.get('babylon:f:segment-1')?.metadata?.vuegraphx).toMatchObject({ objectId: 'f', componentId: 'curve' });
    expect(FakeMeshBuilder.meshes.get('babylon:f:segment-1')?.options).toMatchObject({ radius: expect.any(Number), tessellation: 8 });
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

  it('keeps selected Babylon material color unchanged', () => {
    const runtime = createBabylonRuntime(createFakeBabylon());
    const host = document.createElement('div');
    runtime.mount(host, { size: { width: 320, height: 240 } });
    clearMeshBuilderCalls();

    runtime.createObject({
      id: 'A',
      kind: 'shape',
      type: 'point',
      payload: { point: { x: 1, y: 2 } },
      meta: { selected: true },
      renderHints: { strokeColor: '#0ea5e9' }
    }, {
      id: 'babylon:A',
      objectId: 'A',
      backendId: 'babylon',
      layerId: 'content',
      target: { scope: 'object', objectId: 'A', backendId: 'babylon', layerId: 'content' }
    });

    expect(FakeMeshBuilder.meshes.get('babylon:A')?.material).toMatchObject({
      diffuseColor: { r: expect.closeTo(0.0549), g: expect.closeTo(0.647), b: expect.closeTo(0.914) },
      alpha: expect.closeTo(1)
    });

    runtime.destroy();
  });

  it('doubles selected Babylon proxy path thickness from the original stroke width', () => {
    const runtime = createBabylonRuntime(createFakeBabylon());
    const host = document.createElement('div');
    runtime.mount(host, { size: { width: 320, height: 240 } });
    clearMeshBuilderCalls();

    const createPathNode = (id: string, selected: boolean): void => {
      runtime.createObject({
        id,
        kind: 'shape',
        type: 'function',
        payload: {
          geometry: {
            kind: 'polyline',
            points: [{ x: -1, y: 0 }, { x: 1, y: 0 }]
          }
        },
        meta: selected ? { selected: true } : undefined,
        renderHints: { strokeColor: '#0ea5e9', strokeWidth: 3 }
      }, {
        id: `babylon:${id}`,
        objectId: id,
        backendId: 'babylon',
        layerId: 'content',
        target: { scope: 'object', objectId: id, backendId: 'babylon', layerId: 'content' }
      });
    };

    createPathNode('normal-path', false);
    createPathNode('selected-path', true);

    const normalRadius = Number(FakeMeshBuilder.meshes.get('babylon:normal-path:segment-1')?.options?.radius);
    const selectedRadius = Number(FakeMeshBuilder.meshes.get('babylon:selected-path:segment-1')?.options?.radius);

    expect(normalRadius).toBeGreaterThan(0);
    expect(selectedRadius).toBeCloseTo(normalRadius * 2);
    expect(FakeMeshBuilder.meshes.get('babylon:selected-path:segment-1')?.material).toMatchObject({
      diffuseColor: { r: expect.closeTo(0.0549), g: expect.closeTo(0.647), b: expect.closeTo(0.914) }
    });

    runtime.destroy();
  });


  it('picks Babylon 2D coordinate systems from the whole coordinate region', () => {
    const runtime = createBabylonRuntime(createFakeBabylon(), { renderMode: '2d' });
    const host = document.createElement('div');
    runtime.mount(host, { size: { width: 320, height: 240 } });

    runtime.createObject({
      id: 'coord',
      kind: 'shape',
      type: 'coordinate-system',
      payload: {
        geometry: createStandardCoordinateSystemGeometry({
          origin: { x: 0, y: 0 },
          unitPx: 1,
          xRange: { min: -6, max: 6 },
          yRange: { min: -6, max: 6 },
          includeGrid: false,
          includeBorder: true
        })
      }
    }, {
      id: 'babylon:coord',
      objectId: 'coord',
      backendId: 'babylon',
      layerId: 'content',
      target: { scope: 'object', objectId: 'coord', backendId: 'babylon', layerId: 'content' }
    });

    expect(runtime.pick({ x: 200, y: 80 }, { tolerancePx: 0.1 })).toMatchObject({
      objectId: 'coord',
      meta: { pickMode: '2d-tolerance' }
    });

    runtime.destroy();
  });

  it('does not thicken selected Babylon coordinate-system axes', () => {
    const runtime = createBabylonRuntime(createFakeBabylon());
    const host = document.createElement('div');
    runtime.mount(host, { size: { width: 320, height: 240 } });
    clearMeshBuilderCalls();

    const createCoordinateSystem = (id: string, selected: boolean): void => {
      runtime.createObject({
        id,
        kind: 'shape',
        type: 'coordinate-system',
        payload: {
          geometry: createStandardCoordinateSystemGeometry({
            origin: { x: 0, y: 0 },
            unitPx: 1,
            xRange: { min: -6, max: 6 },
            yRange: { min: -6, max: 6 },
            includeGrid: false,
            includeBorder: false
          })
        },
        meta: selected ? { selected: true } : undefined,
        renderHints: { strokeColor: '#64748b', strokeWidth: 3 }
      }, {
        id: `babylon:${id}`,
        objectId: id,
        backendId: 'babylon',
        layerId: 'content',
        target: { scope: 'object', objectId: id, backendId: 'babylon', layerId: 'content' }
      });
    };

    createCoordinateSystem('normal-coord', false);
    createCoordinateSystem('selected-coord', true);

    const normalRadius = Number(FakeMeshBuilder.meshes.get('babylon:normal-coord:segment-1')?.options?.radius);
    const selectedRadius = Number(FakeMeshBuilder.meshes.get('babylon:selected-coord:segment-1')?.options?.radius);

    expect(normalRadius).toBeGreaterThan(0);
    expect(selectedRadius).toBeCloseTo(normalRadius);

    runtime.destroy();
  });

  it('keeps selected Babylon proxy paths visible when stroke width is zero', () => {
    const runtime = createBabylonRuntime(createFakeBabylon());
    const host = document.createElement('div');
    runtime.mount(host, { size: { width: 320, height: 240 } });
    clearMeshBuilderCalls();

    runtime.createObject({
      id: 'selected-zero-path',
      kind: 'shape',
      type: 'function',
      payload: {
        geometry: {
          kind: 'polyline',
          points: [{ x: -1, y: 0 }, { x: 1, y: 0 }]
        }
      },
      meta: { selected: true },
      renderHints: { strokeColor: '#0ea5e9', strokeWidth: 0 }
    }, {
      id: 'babylon:selected-zero-path',
      objectId: 'selected-zero-path',
      backendId: 'babylon',
      layerId: 'content',
      target: { scope: 'object', objectId: 'selected-zero-path', backendId: 'babylon', layerId: 'content' }
    });

    expect(Number(FakeMeshBuilder.meshes.get('babylon:selected-zero-path:segment-1')?.options?.radius)).toBeGreaterThan(0);

    runtime.destroy();
  });

  it('updates Babylon 2D proxy path thickness when an object becomes selected', () => {
    const runtime = createBabylonRuntime(createFakeBabylon(), { renderMode: '2d' });
    const host = document.createElement('div');
    runtime.mount(host, {
      size: { width: 400, height: 300 },
      attributes: { renderMode: '2d', worldBounds: { left: -10, right: 10, top: 10, bottom: -10 } }
    });
    clearMeshBuilderCalls();

    const handle: GraphRenderHandle = {
      id: 'babylon:f',
      objectId: 'f',
      backendId: 'babylon',
      layerId: 'content',
      target: { scope: 'object', objectId: 'f', backendId: 'babylon', layerId: 'content' }
    };
    runtime.createObject({
      id: 'f',
      kind: 'shape',
      type: 'function',
      payload: {
        geometry: {
          kind: 'polyline',
          points: [{ x: -1, y: 0 }, { x: 1, y: 0 }]
        }
      },
      renderHints: { strokeColor: '#0ea5e9', strokeWidth: 2 }
    }, handle);
    expect(runtime.pick({ x: 200, y: 150 }, { tolerancePx: 4 })).toMatchObject({
      objectId: 'f',
      meta: { pickMode: '2d-tolerance' }
    });
    const normalThickness = Number(FakeMeshBuilder.meshes.get('babylon:f:segment-1')?.options?.height);

    runtime.updateObject(handle, { meta: { selected: true } });
    const selectedMesh = FakeMeshBuilder.meshes.get('babylon:f:segment-1');
    const selectedCap = FakeMeshBuilder.meshes.get('babylon:f:cap-1-1');
    const selectedThickness = Number(selectedMesh?.options?.height);

    expect(normalThickness).toBeGreaterThan(0);
    expect(selectedThickness).toBeCloseTo(normalThickness * 2);
    expect(selectedMesh?.position?.z).toBeLessThan(0);
    expect(selectedCap?.position?.z).toBeLessThan(selectedMesh?.position?.z ?? 0);
    expect(selectedMesh?.material).toMatchObject({
      disableLighting: true,
      specularColor: { r: 0, g: 0, b: 0 }
    });

    runtime.destroy();
  });

  it('keeps Babylon 2D proxy stroke world size anchored to the baseline while camera bounds zoom', () => {
    const runtime = createBabylonRuntime(createFakeBabylon(), { renderMode: '2d' });
    const host = document.createElement('div');
    runtime.mount(host, {
      size: { width: 400, height: 300 },
      attributes: { renderMode: '2d', worldBounds: { left: -10, right: 10, top: 10, bottom: -10 } }
    });
    clearMeshBuilderCalls();

    const handle: GraphRenderHandle = {
      id: 'babylon:f',
      objectId: 'f',
      backendId: 'babylon',
      layerId: 'content',
      target: { scope: 'object', objectId: 'f', backendId: 'babylon', layerId: 'content' }
    };
    runtime.createObject({
      id: 'f',
      kind: 'shape',
      type: 'function',
      payload: {
        geometry: {
          kind: 'polyline',
          points: [{ x: -1, y: 0 }, { x: 1, y: 0 }]
        }
      },
      renderHints: { strokeColor: '#0ea5e9', strokeWidth: 2 }
    }, handle);

    const baselineThickness = Number(FakeMeshBuilder.meshes.get('babylon:f:segment-1')?.options?.height);
    runtime.setWorldBounds({ left: -5, right: 5, top: 5, bottom: -5 });

    expect(FakeCamera.last).toMatchObject({
      orthoLeft: expect.closeTo(-6.666666666666667),
      orthoRight: expect.closeTo(6.666666666666667),
      orthoTop: 5,
      orthoBottom: -5
    });
    expect(runtime.project({ dimension: '2d', x: 1, y: 0 })).toEqual({
      x: expect.closeTo(230),
      y: 150
    });

    runtime.updateObject(handle, { meta: { selected: true } });
    const selectedAfterZoomThickness = Number(FakeMeshBuilder.meshes.get('babylon:f:segment-1')?.options?.height);

    expect(baselineThickness).toBeGreaterThan(0);
    expect(selectedAfterZoomThickness).toBeCloseTo(baselineThickness * 2);

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

    const branchPlanes = [...FakeMeshBuilder.meshes]
      .filter(([name]) => name.startsWith('babylon:hyp:segment-') && !name.includes(':cap-'));
    expect(branchPlanes).toHaveLength(94);
    expect(branchPlanes.every(([, mesh]) => Number(mesh.options?.width) > 0 && Number(mesh.options?.height) > 0)).toBe(true);

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
    expect(label?.style.left).toBe('0px');
    expect(label?.style.top).toBe('0px');
    expect(label?.style.transform).toBe('translate3d(125px, 105px, 0) scale(1)');
    expect(label?.style.transformOrigin).toBe('0 0');

    runtime.destroy();
  });

  it('renders 2D Babylon LaTeX text as transparent KaTeX DOM labels', () => {
    const runtime = createBabylonRuntime(createFakeBabylon(), { renderMode: '2d' });
    const host = document.createElement('div');
    runtime.mount(host, {
      size: { width: 400, height: 300 },
      attributes: { renderMode: '2d', worldBounds: { left: -10, right: 10, top: 10, bottom: -10 } }
    });
    clearMeshBuilderCalls();

    runtime.createObject({
      id: 'formula',
      kind: 'overlay',
      type: 'text',
      payload: {
        objectType: 'text',
        content: '$\\sqrt{x}$',
        anchor: { coordinates: { dimension: '2d', x: 1, y: 2 } },
        format: 'latex'
      },
      renderHints: { strokeColor: '#2563eb' }
    }, {
      id: 'babylon:formula',
      objectId: 'formula',
      backendId: 'babylon',
      layerId: 'content',
      target: { scope: 'object', objectId: 'formula', backendId: 'babylon', layerId: 'content' }
    });

    expect(FakeMeshBuilder.CreatePlane).not.toHaveBeenCalled();
    const label = host.querySelector('[data-vuegraphx-babylon-label-layer] [data-vuegraphx-object-id="formula"]') as HTMLElement | null;
    expect(label?.innerHTML).toContain('class="katex"');
    expect(label?.innerHTML).toContain('class="katex-html"');
    expect(label?.innerHTML).toContain('<math');
    expect(label?.textContent).toContain('x');
    expect(label?.style.left).toBe('0px');
    expect(label?.style.top).toBe('0px');
    expect(label?.style.transform).toBe('translate3d(215px, 120px, 0) scale(1)');
    expect(label?.style.transformOrigin).toBe('0 0');
    expect(label?.style.background).toBe('transparent');
    expect(label?.style.boxShadow).toBe('none');
    expect(label?.style.textShadow).toBe('none');
    expect(label?.style.border).toBe('0px');
    expect(label?.style.contain).toBe('layout paint style');
    runtime.setWorldBounds({ left: -5, right: 5, top: 5, bottom: -5 });
    const zoomedLabel = host.querySelector('[data-vuegraphx-babylon-label-layer] [data-vuegraphx-object-id="formula"]') as HTMLElement | null;
    expect(zoomedLabel?.style.transform).toBe('translate3d(230px, 90px, 0) scale(2)');
    expect(zoomedLabel?.style.font).toContain('14px');
    runtime.setWorldBounds({ left: -1, right: 1, top: 1, bottom: -1 });
    const deeplyZoomedLabel = host.querySelector('[data-vuegraphx-babylon-label-layer] [data-vuegraphx-object-id="formula"]') as HTMLElement | null;
    expect(deeplyZoomedLabel?.style.transform).toBe('translate3d(350px, -150px, 0) scale(10)');
    expect(deeplyZoomedLabel?.style.font).toContain('14px');

    runtime.destroy();
  });

  it('renders 3D Babylon LaTeX text as an SVG texture instead of raw TeX text', () => {
    const runtime = createBabylonRuntime(createFakeBabylon());
    const host = document.createElement('div');
    runtime.mount(host, { size: { width: 400, height: 300 } });
    clearMeshBuilderCalls();

    runtime.createObject({
      id: 'formula-3d',
      kind: 'overlay',
      type: 'text',
      payload: {
        objectType: 'text',
        content: '$\\sqrt{x}$',
        anchor: { coordinates: { dimension: '3d', x: 1, y: 2, z: 3 } },
        format: 'latex'
      },
      renderHints: { strokeColor: '#2563eb' }
    }, {
      id: 'babylon:formula-3d',
      objectId: 'formula-3d',
      backendId: 'babylon',
      layerId: 'content',
      target: { scope: 'object', objectId: 'formula-3d', backendId: 'babylon', layerId: 'content' }
    });

    expect(FakeTexture.instances).toHaveLength(1);
    const textureSvg = decodeURIComponent(FakeTexture.instances[0]!.url ?? '');
    expect(textureSvg).toContain('class="katex"');
    expect(textureSvg).toContain('class="katex-html"');
    expect(textureSvg).toContain('<math');
    expect(textureSvg).toContain('background:transparent');
    expect(textureSvg).not.toContain('background:rgba(255,255,255');
    expect(FakeTexture.instances[0]!.hasAlpha).toBe(true);
    expect(FakeDynamicTexture.instances).toHaveLength(0);
    expect(FakeMeshBuilder.meshes.get('babylon:formula-3d')?.material).toMatchObject({
      diffuseTexture: FakeTexture.instances[0],
      useAlphaFromDiffuseTexture: true,
      backFaceCulling: false,
      disableLighting: true
    });

    runtime.destroy();
  });

  it('reports Babylon partial support for 3D LaTeX text when texture support is unavailable', () => {
    const { Texture: _Texture, ...withoutTexture } = createFakeBabylon();
    const runtime = createBabylonRuntime(withoutTexture as BabylonNamespaceLike);
    const backend = createBabylonGraphBackend({ id: 'babylon', runtime });
    const host = document.createElement('div');
    backend.mount({ resource: host }, { size: { width: 400, height: 300 } });

    const node = {
      id: 'formula-3d',
      kind: 'overlay' as const,
      type: 'text',
      payload: {
        objectType: 'text',
        content: '$\\sqrt{x}$',
        anchor: { coordinates: { dimension: '3d' as const, x: 1, y: 2, z: 3 } },
        format: 'latex'
      },
      layerId: 'content' as const
    };

    expect(backend.create(node)).toMatchObject({
      ok: false,
      diagnostics: [{
        code: 'backend.partial-support',
        target: { objectId: 'formula-3d', backendId: 'babylon' }
      }]
    });

    backend.destroy();
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
