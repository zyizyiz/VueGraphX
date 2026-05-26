import type {
  GraphBackendContext,
  GraphBackendMountOptions,
  GraphClientPoint,
  GraphObjectNode,
  GraphObjectPatch,
  GraphPickOptions,
  GraphRenderHandle,
  GraphViewportRef,
  GraphViewportSize,
  GraphWorldPoint
} from '@vuegraphx/core';
import { mergeGraphObjectPatch } from '@vuegraphx/core';
import type { BabylonRuntimePickResult, BabylonRuntimePort } from './BabylonGraphBackend';

export interface BabylonVector3Like {
  x: number;
  y: number;
  z: number;
}

export interface BabylonMeshLike {
  name?: string;
  metadata?: Record<string, unknown>;
  position?: BabylonVector3Like;
  rotation?: BabylonVector3Like;
  scaling?: BabylonVector3Like;
  dispose(): void;
}

export interface BabylonEngineLike {
  runRenderLoop(callback: () => void): void;
  stopRenderLoop?(callback?: () => void): void;
  resize(): void;
  dispose(): void;
}

export interface BabylonSceneLike {
  activeCamera?: unknown;
  render(): void;
  pick(x: number, y: number): BabylonPickingInfoLike | null;
  dispose(): void;
}

export interface BabylonPickingInfoLike {
  hit?: boolean;
  pickedMesh?: BabylonMeshLike | null;
  pickedPoint?: BabylonVector3Like | null;
  distance?: number;
}

export interface BabylonCameraLike {
  attachControl?(canvas: HTMLCanvasElement, noPreventDefault?: boolean): void;
}

export interface BabylonNamespaceLike {
  Engine: new (canvas: HTMLCanvasElement, antialias?: boolean, options?: Record<string, unknown>) => BabylonEngineLike;
  Scene: new (engine: BabylonEngineLike) => BabylonSceneLike;
  Vector3: new (x: number, y: number, z: number) => BabylonVector3Like;
  ArcRotateCamera?: new (name: string, alpha: number, beta: number, radius: number, target: BabylonVector3Like, scene: BabylonSceneLike) => BabylonCameraLike;
  HemisphericLight?: new (name: string, direction: BabylonVector3Like, scene: BabylonSceneLike) => unknown;
  MeshBuilder: {
    CreateBox(name: string, options: Record<string, unknown>, scene: BabylonSceneLike): BabylonMeshLike;
    CreateSphere?(name: string, options: Record<string, unknown>, scene: BabylonSceneLike): BabylonMeshLike;
    CreateCylinder?(name: string, options: Record<string, unknown>, scene: BabylonSceneLike): BabylonMeshLike;
  };
}

export interface BabylonRuntimeOptions {
  canvas?: HTMLCanvasElement;
  antialias?: boolean;
  engineOptions?: Record<string, unknown>;
  attachCameraControl?: boolean;
  canvasPointerEvents?: 'auto' | 'none';
}

interface BabylonStoredSolid {
  node: GraphObjectNode;
  handle: GraphRenderHandle;
  mesh: BabylonMeshLike;
}

const VUEGRAPHX_METADATA_KEY = 'vuegraphx';

export class BabylonRuntime implements BabylonRuntimePort {
  private canvas: HTMLCanvasElement | null;
  private engine: BabylonEngineLike | null = null;
  private scene: BabylonSceneLike | null = null;
  private renderLoop: (() => void) | null = null;
  private ownsCanvas = false;
  private readonly solids = new Map<string, BabylonStoredSolid>();

  public constructor(
    private readonly BABYLON: BabylonNamespaceLike,
    private readonly options: BabylonRuntimeOptions = {}
  ) {
    this.canvas = options.canvas ?? null;
  }

  public mount(host: HTMLElement, options: GraphBackendMountOptions = {}): void {
    if (!this.canvas) {
      this.canvas = document.createElement('canvas');
      this.ownsCanvas = true;
      host.appendChild(this.canvas);
    } else if (!this.canvas.parentElement && host !== this.canvas) {
      host.appendChild(this.canvas);
    }

    this.canvas.style.width = '100%';
    this.canvas.style.height = '100%';
    this.canvas.style.display = 'block';
    this.canvas.style.pointerEvents = this.options.canvasPointerEvents ?? 'none';
    if (options.size) this.applyCanvasSize(options.size);

    this.engine = new this.BABYLON.Engine(this.canvas, this.options.antialias ?? true, this.options.engineOptions);
    this.scene = new this.BABYLON.Scene(this.engine);
    this.installDefaultCameraAndLight();
    this.renderLoop = () => this.scene?.render();
    this.engine.runRenderLoop(this.renderLoop);
  }

  public createSolid(node: GraphObjectNode, handle: GraphRenderHandle, _context: GraphBackendContext = {}): void {
    const scene = this.requireScene();
    const mesh = this.createMeshForSolid(node, handle, scene);
    this.solids.set(handle.id, { node, handle, mesh });
  }

  public updateSolid(handle: GraphRenderHandle, patch: GraphObjectPatch, _context: GraphBackendContext = {}): void {
    const stored = this.solids.get(handle.id);
    if (!stored) return;
    stored.node = mergeGraphObjectPatch(stored.node, patch);
    this.applySolidTransform(stored.mesh, stored.node);
  }

  public remove(handle: GraphRenderHandle): void {
    const stored = this.solids.get(handle.id);
    if (!stored) return;
    stored.mesh.dispose();
    this.solids.delete(handle.id);
  }

  public pick(point: GraphClientPoint, _options: GraphPickOptions = {}): BabylonRuntimePickResult | null {
    const scene = this.scene;
    if (!scene) return null;
    const info = scene.pick(point.x, point.y);
    if (!info?.hit || !info.pickedMesh) return null;
    const metadata = readVueGraphXMetadata(info.pickedMesh);
    if (!metadata?.objectId) return null;
    return {
      objectId: metadata.objectId,
      componentId: metadata.componentId,
      worldPoint: info.pickedPoint ? { dimension: '3d', x: info.pickedPoint.x, y: info.pickedPoint.y, z: info.pickedPoint.z } : undefined,
      distancePx: typeof info.distance === 'number' ? info.distance : undefined,
      meta: { meshName: info.pickedMesh.name }
    };
  }

  public project(point: GraphWorldPoint, _viewport?: GraphViewportRef): GraphClientPoint | null {
    return { x: point.x, y: point.y };
  }

  public unproject(point: GraphClientPoint, _viewport?: GraphViewportRef): GraphWorldPoint | null {
    return { dimension: '3d', x: point.x, y: point.y, z: 0 };
  }

  public resize(size: GraphViewportSize): void {
    if (this.canvas) this.applyCanvasSize(size);
    this.engine?.resize();
  }

  public renderFrame(): void {
    this.scene?.render();
  }

  public destroy(): void {
    if (this.renderLoop) this.engine?.stopRenderLoop?.(this.renderLoop);
    for (const solid of this.solids.values()) solid.mesh.dispose();
    this.solids.clear();
    this.scene?.dispose();
    this.engine?.dispose();
    if (this.ownsCanvas) this.canvas?.remove();
    this.canvas = null;
    this.ownsCanvas = false;
    this.engine = null;
    this.scene = null;
    this.renderLoop = null;
  }

  private requireScene(): BabylonSceneLike {
    if (!this.scene) throw new Error('Babylon runtime must be mounted before creating solids.');
    return this.scene;
  }

  private installDefaultCameraAndLight(): void {
    if (!this.scene) return;
    if (this.BABYLON.ArcRotateCamera) {
      const camera = new this.BABYLON.ArcRotateCamera(
        'vuegraphx-camera',
        -Math.PI / 2,
        Math.PI / 3,
        8,
        new this.BABYLON.Vector3(0, 0, 0),
        this.scene
      );
      if (this.canvas && this.options.attachCameraControl !== false) camera.attachControl?.(this.canvas, true);
      this.scene.activeCamera = camera;
    }
    if (this.BABYLON.HemisphericLight) {
      new this.BABYLON.HemisphericLight('vuegraphx-light', new this.BABYLON.Vector3(0, 1, 0), this.scene);
    }
  }

  private createMeshForSolid(node: GraphObjectNode, handle: GraphRenderHandle, scene: BabylonSceneLike): BabylonMeshLike {
    const descriptor = readSolidDescriptor(node);
    const family = descriptor.family;
    const parameters = descriptor.parameters;
    let mesh: BabylonMeshLike;

    if (family === 'sphere' && this.BABYLON.MeshBuilder.CreateSphere) {
      mesh = this.BABYLON.MeshBuilder.CreateSphere(handle.id, { diameter: (parameters.radius ?? 1) * 2 }, scene);
    } else if ((family === 'cylinder' || family === 'cone' || family === 'conical-frustum') && this.BABYLON.MeshBuilder.CreateCylinder) {
      mesh = this.BABYLON.MeshBuilder.CreateCylinder(handle.id, {
        height: parameters.height ?? 2,
        diameterTop: family === 'cone' ? 0 : (parameters.topRadius ?? parameters.radius ?? 1) * 2,
        diameterBottom: (parameters.bottomRadius ?? parameters.radius ?? 1) * 2,
        tessellation: 48
      }, scene);
    } else {
      mesh = this.BABYLON.MeshBuilder.CreateBox(handle.id, {
        size: parameters.size ?? undefined,
        width: parameters.width ?? parameters.size ?? 1,
        height: parameters.height ?? parameters.size ?? 1,
        depth: parameters.depth ?? parameters.size ?? 1
      }, scene);
    }

    mesh.name = handle.id;
    mesh.metadata = {
      ...(mesh.metadata ?? {}),
      [VUEGRAPHX_METADATA_KEY]: {
        objectId: handle.objectId,
        componentId: family === 'sphere' ? 'surface' : 'body'
      }
    };
    this.applySolidTransform(mesh, node);
    return mesh;
  }

  private applySolidTransform(mesh: BabylonMeshLike, node: GraphObjectNode): void {
    const descriptor = readSolidDescriptor(node);
    if (descriptor.origin) mesh.position = new this.BABYLON.Vector3(descriptor.origin.x, descriptor.origin.y, descriptor.origin.z);
    if (descriptor.rotation) mesh.rotation = new this.BABYLON.Vector3(descriptor.rotation.x, descriptor.rotation.y, descriptor.rotation.z);
  }

  private applyCanvasSize(size: GraphViewportSize): void {
    if (!this.canvas) return;
    this.canvas.width = Math.max(1, Math.round(size.width));
    this.canvas.height = Math.max(1, Math.round(size.height));
  }
}

export const createBabylonRuntime = (
  BABYLON: BabylonNamespaceLike,
  options?: BabylonRuntimeOptions
): BabylonRuntime => new BabylonRuntime(BABYLON, options);

const readSolidDescriptor = (node: GraphObjectNode): {
  family: string;
  parameters: Record<string, number>;
  origin?: BabylonVector3Like;
  rotation?: BabylonVector3Like;
} => {
  const payload = node.payload as Record<string, unknown> | undefined;
  const family = typeof payload?.family === 'string' ? payload.family : 'cube';
  const rawParameters = typeof payload?.parameters === 'object' && payload.parameters !== null ? payload.parameters as Record<string, unknown> : {};
  const parameters = Object.fromEntries(
    Object.entries(rawParameters).filter((entry): entry is [string, number] => typeof entry[1] === 'number' && Number.isFinite(entry[1]))
  );
  return {
    family,
    parameters,
    origin: readVector3(payload?.origin),
    rotation: readVector3(payload?.rotation)
  };
};

const readVector3 = (value: unknown): BabylonVector3Like | undefined => {
  if (typeof value !== 'object' || value === null) return undefined;
  const record = value as Record<string, unknown>;
  const { x, y, z } = record;
  return typeof x === 'number' && Number.isFinite(x)
    && typeof y === 'number' && Number.isFinite(y)
    && typeof z === 'number' && Number.isFinite(z)
    ? { x, y, z }
    : undefined;
};

const readVueGraphXMetadata = (mesh: BabylonMeshLike): { objectId: string; componentId?: string } | null => {
  const metadata = mesh.metadata?.[VUEGRAPHX_METADATA_KEY];
  if (typeof metadata !== 'object' || metadata === null) return null;
  const record = metadata as Record<string, unknown>;
  if (typeof record.objectId !== 'string') return null;
  return {
    objectId: record.objectId,
    componentId: typeof record.componentId === 'string' ? record.componentId : undefined
  };
};
