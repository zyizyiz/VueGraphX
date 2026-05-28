import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { GraphRenderHandle } from '@vuegraphx/core';
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
  CreateBox: vi.fn((_name: string, _options: Record<string, unknown>, _scene: unknown) => {
    FakeMeshBuilder.lastMesh = new FakeMesh();
    return FakeMeshBuilder.lastMesh;
  }),
  CreateSphere: vi.fn((_name: string, _options: Record<string, unknown>, _scene: unknown) => {
    FakeMeshBuilder.lastMesh = new FakeMesh();
    return FakeMeshBuilder.lastMesh;
  }),
  CreateCylinder: vi.fn((_name: string, _options: Record<string, unknown>, _scene: unknown) => {
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

beforeEach(() => {
  FakeMeshBuilder.lastMesh = null;
  FakeMeshBuilder.CreateBox.mockClear();
  FakeMeshBuilder.CreateSphere.mockClear();
  FakeMeshBuilder.CreateCylinder.mockClear();
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

  it('maps polygonal prism, pyramid, and frustum solid families to Babylon cylinder meshes with fixed tessellation', () => {
    const runtime = createBabylonRuntime(createFakeBabylon());
    const host = document.createElement('div');
    runtime.mount(host, { size: { width: 320, height: 240 } });

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
