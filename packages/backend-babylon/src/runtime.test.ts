import { describe, expect, it, vi } from 'vitest';
import { createBabylonRuntime, type BabylonMeshLike, type BabylonNamespaceLike } from './index';

class FakeVector3 {
  public constructor(public x: number, public y: number, public z: number) {}
}

class FakeMesh implements BabylonMeshLike {
  public name = '';
  public metadata?: Record<string, unknown>;
  public position?: FakeVector3;
  public rotation?: FakeVector3;
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
  public attachControl = vi.fn();
}

class FakeLight {}

const FakeMeshBuilder = {
  lastMesh: null as FakeMesh | null,
  CreateBox: vi.fn(() => {
    FakeMeshBuilder.lastMesh = new FakeMesh();
    return FakeMeshBuilder.lastMesh;
  }),
  CreateSphere: vi.fn(() => {
    FakeMeshBuilder.lastMesh = new FakeMesh();
    return FakeMeshBuilder.lastMesh;
  }),
  CreateCylinder: vi.fn(() => {
    FakeMeshBuilder.lastMesh = new FakeMesh();
    return FakeMeshBuilder.lastMesh;
  })
};

const createFakeBabylon = (): BabylonNamespaceLike => ({
  Engine: FakeEngine as unknown as BabylonNamespaceLike['Engine'],
  Scene: FakeScene as unknown as BabylonNamespaceLike['Scene'],
  Vector3: FakeVector3,
  ArcRotateCamera: FakeCamera as unknown as BabylonNamespaceLike['ArcRotateCamera'],
  HemisphericLight: FakeLight as unknown as BabylonNamespaceLike['HemisphericLight'],
  MeshBuilder: FakeMeshBuilder
});

describe('BabylonRuntime', () => {
  it('mounts a real Babylon-style runtime, creates a solid, maps picks, and disposes cleanly', () => {
    const runtime = createBabylonRuntime(createFakeBabylon());
    const host = document.createElement('div');

    runtime.mount(host, { size: { width: 320, height: 240 } });
    expect(host.querySelector('canvas')).not.toBeNull();
    expect(FakeEngine.last?.renderLoop).toBeTypeOf('function');

    runtime.createSolid({
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
});
