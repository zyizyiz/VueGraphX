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
import {
  mergeGraphObjectPatch,
  resolveGraphViewportGridOptions,
  type GraphViewportGridInput,
  type ResolvedGraphViewportGridOptions
} from '@vuegraphx/core';
import type {
  BabylonBackendSupportStatus,
  BabylonRuntimePickResult,
  BabylonRuntimePort
} from './BabylonGraphBackend';

export interface BabylonVector3Like {
  x: number;
  y: number;
  z: number;
}

export interface BabylonMeshLike {
  name?: string;
  metadata?: Record<string, unknown>;
  isPickable?: boolean;
  position?: BabylonVector3Like;
  rotation?: BabylonVector3Like;
  scaling?: BabylonVector3Like;
  material?: unknown;
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
  clearColor?: unknown;
  ambientColor?: unknown;
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
  mode?: number;
  orthoLeft?: number;
  orthoRight?: number;
  orthoTop?: number;
  orthoBottom?: number;
  lowerAlphaLimit?: number;
  upperAlphaLimit?: number;
  lowerBetaLimit?: number;
  upperBetaLimit?: number;
  lowerRadiusLimit?: number;
  upperRadiusLimit?: number;
  attachControl?(canvas: HTMLCanvasElement, noPreventDefault?: boolean): void;
}

export interface BabylonMaterialLike {
  diffuseColor?: unknown;
  emissiveColor?: unknown;
  specularColor?: unknown;
  diffuseTexture?: unknown;
  emissiveTexture?: unknown;
  opacityTexture?: unknown;
  useAlphaFromDiffuseTexture?: boolean;
  backFaceCulling?: boolean;
  disableLighting?: boolean;
  disableDepthWrite?: boolean;
  alpha?: number;
  dispose?(forceDisposeEffect?: boolean, forceDisposeTextures?: boolean): void;
}

export interface BabylonDynamicTextureLike {
  hasAlpha?: boolean;
  getContext?(): CanvasRenderingContext2D;
  update?(invertY?: boolean, premulAlpha?: boolean, allowGPUOptimization?: boolean): void;
  drawText(
    text: string,
    x: number | null | undefined,
    y: number | null | undefined,
    font: string,
    color: string | null,
    fillColor: string | null,
    invertY?: boolean,
    update?: boolean
  ): void;
  dispose?(): void;
}

export interface BabylonTextureLike {
  hasAlpha?: boolean;
  dispose?(): void;
}

export interface BabylonNamespaceLike {
  Engine: new (canvas: HTMLCanvasElement, antialias?: boolean, options?: Record<string, unknown>) => BabylonEngineLike;
  Scene: new (engine: BabylonEngineLike) => BabylonSceneLike;
  Vector3: new (x: number, y: number, z: number) => BabylonVector3Like;
  Color3?: new (r: number, g: number, b: number) => unknown;
  Color4?: new (r: number, g: number, b: number, a: number) => unknown;
  StandardMaterial?: new (name: string, scene: BabylonSceneLike) => BabylonMaterialLike;
  DynamicTexture?: new (
    name: string,
    canvasOrSize: { width: number; height: number } | number,
    scene?: BabylonSceneLike,
    generateMipMaps?: boolean
  ) => BabylonDynamicTextureLike;
  Texture?: new (
    url: string,
    scene?: BabylonSceneLike,
    noMipmapOrOptions?: unknown,
    invertY?: boolean
  ) => BabylonTextureLike;
  ArcRotateCamera?: new (name: string, alpha: number, beta: number, radius: number, target: BabylonVector3Like, scene: BabylonSceneLike) => BabylonCameraLike;
  HemisphericLight?: new (name: string, direction: BabylonVector3Like, scene: BabylonSceneLike) => unknown;
  MeshBuilder: {
    CreateBox(name: string, options: Record<string, unknown>, scene: BabylonSceneLike): BabylonMeshLike;
    CreateDisc?(name: string, options: Record<string, unknown>, scene: BabylonSceneLike): BabylonMeshLike;
    CreatePlane?(name: string, options: Record<string, unknown>, scene: BabylonSceneLike): BabylonMeshLike;
    CreateSphere?(name: string, options: Record<string, unknown>, scene: BabylonSceneLike): BabylonMeshLike;
    CreateCylinder?(name: string, options: Record<string, unknown>, scene: BabylonSceneLike): BabylonMeshLike;
    CreateTube?(name: string, options: Record<string, unknown>, scene: BabylonSceneLike): BabylonMeshLike;
  };
}

export type BabylonRenderMode = '3d';

export interface BabylonRuntimeOptions {
  canvas?: HTMLCanvasElement;
  antialias?: boolean;
  engineOptions?: Record<string, unknown>;
  renderMode?: BabylonRenderMode;
  attachCameraControl?: boolean;
  canvasPointerEvents?: 'auto' | 'none';
  showAxes?: boolean;
  grid?: GraphViewportGridInput;
}

interface BabylonStoredObject {
  node: GraphObjectNode;
  handle: GraphRenderHandle;
  meshes: BabylonMeshLike[];
}

interface RgbaColor {
  r: number;
  g: number;
  b: number;
  a: number;
}

const VUEGRAPHX_METADATA_KEY = 'vuegraphx';
const BABYLON_WORLD_HALF_EXTENT = 10;
const BABYLON_GRID_STEP = 1;
const BABYLON_3D_GRID_Z = -0.025;
const BABYLON_PROXY_BASE_STROKE_WIDTH = 2;
const BABYLON_PROXY_THICKNESS = 0.055;

export class BabylonRuntime implements BabylonRuntimePort {
  private canvas: HTMLCanvasElement | null;
  private engine: BabylonEngineLike | null = null;
  private scene: BabylonSceneLike | null = null;
  private renderLoop: (() => void) | null = null;
  private ownsCanvas = false;
  private showAxes: boolean;
  private gridInput?: GraphViewportGridInput;
  private readonly objects = new Map<string, BabylonStoredObject>();
  private readonly helperMeshes: BabylonMeshLike[] = [];

  public constructor(
    private readonly BABYLON: BabylonNamespaceLike,
    private readonly options: BabylonRuntimeOptions = {}
  ) {
    this.canvas = options.canvas ?? null;
    this.showAxes = options.showAxes ?? true;
    this.gridInput = options.grid;
  }

  public mount(host: HTMLElement, options: GraphBackendMountOptions = {}): void {
    this.showAxes = readBoolean(options.attributes?.showAxes) ?? this.options.showAxes ?? true;
    this.gridInput = readGridInput(options.attributes?.grid) ?? this.options.grid;

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
    this.installVisualDefaults();
    this.installDefaultCameraAndLight();
    this.installGridAndAxes();
    this.renderLoop = () => this.scene?.render();
    this.engine.runRenderLoop(this.renderLoop);
  }

  public getSupportStatus(node: GraphObjectNode): BabylonBackendSupportStatus | null {
    return node.type === 'solid' ? 'success' : 'unsupported';
  }

  public createObject(node: GraphObjectNode, handle: GraphRenderHandle, _context: GraphBackendContext = {}): void {
    const scene = this.requireScene();
    const previous = this.objects.get(handle.id);
    if (previous) {
      this.disposeStoredObject(previous);
      this.objects.delete(handle.id);
    }
    if (node.type !== 'solid') return;

    const meshes = isSurfaceSolidNode(node)
      ? this.createSurfaceWireframeMeshes(node, handle, scene)
      : [this.createMeshForSolid(node, handle, scene)];
    this.objects.set(handle.id, { node, handle, meshes });
  }

  public updateObject(handle: GraphRenderHandle, patch: GraphObjectPatch, context: GraphBackendContext = {}): void {
    const stored = this.objects.get(handle.id);
    if (!stored) return;
    const nextNode = mergeGraphObjectPatch(stored.node, patch);
    this.disposeStoredObject(stored);
    this.objects.delete(handle.id);
    this.createObject(nextNode, stored.handle, context);
  }

  public createSolid(node: GraphObjectNode, handle: GraphRenderHandle, context: GraphBackendContext = {}): void {
    this.createObject(node, handle, context);
  }

  public updateSolid(handle: GraphRenderHandle, patch: GraphObjectPatch, context: GraphBackendContext = {}): void {
    this.updateObject(handle, patch, context);
  }

  public remove(handle: GraphRenderHandle): void {
    const stored = this.objects.get(handle.id);
    if (!stored) return;
    this.disposeStoredObject(stored);
    this.objects.delete(handle.id);
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

  public setWorldBounds(_bounds: { left: number; right: number; top: number; bottom: number }): void {
    this.renderFrame();
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
    for (const object of this.objects.values()) this.disposeStoredObject(object);
    this.objects.clear();
    this.disposeHelperMeshes();
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

  private installVisualDefaults(): void {
    if (!this.scene) return;
    this.scene.clearColor = this.createColor4(1, 1, 1, 1);
    this.scene.ambientColor = this.createColor3(0.78, 0.84, 0.92);
  }

  private installDefaultCameraAndLight(): void {
    if (!this.scene) return;
    if (this.BABYLON.ArcRotateCamera) {
      const camera = new this.BABYLON.ArcRotateCamera(
        'vuegraphx-camera',
        -Math.PI / 4,
        Math.PI / 3,
        18,
        new this.BABYLON.Vector3(0, 0, 0),
        this.scene
      );
      if (this.canvas && (this.options.attachCameraControl ?? true)) camera.attachControl?.(this.canvas, true);
      this.scene.activeCamera = camera;
    }
    if (this.BABYLON.HemisphericLight) {
      new this.BABYLON.HemisphericLight('vuegraphx-light', new this.BABYLON.Vector3(0, 1, -0.4), this.scene);
    }
  }

  private installGridAndAxes(): void {
    const scene = this.requireScene();
    const gridOptions = this.resolveGridOptions();
    this.disposeHelperMeshes();

    if (!this.showAxes && !gridOptions.enabled) return;

    const gridColor = parseCssColorToRgba(gridOptions.lineColor, { r: 0.58, g: 0.64, b: 0.72, a: 0.28 });
    const axisColor = { r: 0.28, g: 0.33, b: 0.41, a: 0.9 };
    const gridThickness = Math.max(0.004, gridOptions.lineWidth * 0.012);
    const axisThickness = 0.035;

    if (gridOptions.enabled) {
      for (let coordinate = -BABYLON_WORLD_HALF_EXTENT; coordinate <= BABYLON_WORLD_HALF_EXTENT; coordinate += BABYLON_GRID_STEP) {
        const isAxis = coordinate === 0;
        const color = isAxis && this.showAxes ? axisColor : gridColor;
        const thickness = isAxis && this.showAxes ? axisThickness : gridThickness;
        this.helperMeshes.push(this.createLineBox({
          name: `vuegraphx-grid-x-${coordinate}`,
          start: { x: -BABYLON_WORLD_HALF_EXTENT, y: coordinate, z: BABYLON_3D_GRID_Z },
          end: { x: BABYLON_WORLD_HALF_EXTENT, y: coordinate, z: BABYLON_3D_GRID_Z },
          thickness,
          scene,
          color,
          metadata: null
        }));
        this.helperMeshes.push(this.createLineBox({
          name: `vuegraphx-grid-y-${coordinate}`,
          start: { x: coordinate, y: -BABYLON_WORLD_HALF_EXTENT, z: BABYLON_3D_GRID_Z },
          end: { x: coordinate, y: BABYLON_WORLD_HALF_EXTENT, z: BABYLON_3D_GRID_Z },
          thickness,
          scene,
          color,
          metadata: null
        }));
      }
      return;
    }

    if (!this.showAxes) return;
    this.helperMeshes.push(this.createLineBox({
      name: 'vuegraphx-grid-x-0',
      start: { x: -BABYLON_WORLD_HALF_EXTENT, y: 0, z: BABYLON_3D_GRID_Z },
      end: { x: BABYLON_WORLD_HALF_EXTENT, y: 0, z: BABYLON_3D_GRID_Z },
      thickness: axisThickness,
      scene,
      color: axisColor,
      metadata: null
    }));
    this.helperMeshes.push(this.createLineBox({
      name: 'vuegraphx-grid-y-0',
      start: { x: 0, y: -BABYLON_WORLD_HALF_EXTENT, z: BABYLON_3D_GRID_Z },
      end: { x: 0, y: BABYLON_WORLD_HALF_EXTENT, z: BABYLON_3D_GRID_Z },
      thickness: axisThickness,
      scene,
      color: axisColor,
      metadata: null
    }));
  }

  private resolveGridOptions(): ResolvedGraphViewportGridOptions {
    if (this.gridInput !== undefined) return resolveGraphViewportGridOptions(this.gridInput);
    const inferred = resolveGraphViewportGridOptions(true);
    return { ...inferred, enabled: this.showAxes };
  }

  private createMeshForSolid(node: GraphObjectNode, handle: GraphRenderHandle, scene: BabylonSceneLike): BabylonMeshLike {
    const descriptor = readSolidDescriptor(node);
    const family = descriptor.family;
    const parameters = descriptor.parameters;
    let mesh: BabylonMeshLike;

    const cylinderOptions = createCylinderLikeMeshOptions(family, parameters);
    if (family === 'sphere' && this.BABYLON.MeshBuilder.CreateSphere) {
      mesh = this.BABYLON.MeshBuilder.CreateSphere(handle.id, { diameter: (parameters.radius ?? 1) * 2 }, scene);
    } else if (cylinderOptions && this.BABYLON.MeshBuilder.CreateCylinder) {
      mesh = this.BABYLON.MeshBuilder.CreateCylinder(handle.id, cylinderOptions, scene);
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
    mesh.material = this.createMaterial(`${handle.id}:material`, scene, readNodeColor(node, { r: 0.05, g: 0.45, b: 0.86, a: 0.82 }));
    this.applySolidTransform(mesh, descriptor);
    return mesh;
  }

  private createSurfaceWireframeMeshes(node: GraphObjectNode, handle: GraphRenderHandle, scene: BabylonSceneLike): BabylonMeshLike[] {
    const color = readNodeColor(node, { r: 0.05, g: 0.45, b: 0.86, a: 0.82 });
    const metadata = createObjectMetadata(handle, 'projection');
    const thickness = resolveStrokeThickness(node);
    let segmentIndex = 0;
    return readSurfaceWireframeSegments(node).flatMap((points) => {
      const tube = this.createPathTube({
        name: `${handle.id}:segment-${segmentIndex + 1}`,
        points,
        thickness,
        scene,
        color,
        metadata
      });
      if (tube) {
        segmentIndex += 1;
        return [tube];
      }
      return createPointSegments(points).map((segment) => {
        segmentIndex += 1;
        return this.createLineBox({
          name: `${handle.id}:segment-${segmentIndex}`,
          start: segment.start,
          end: segment.end,
          thickness,
          scene,
          color,
          metadata
        });
      });
    });
  }

  private applySolidTransform(mesh: BabylonMeshLike, descriptor: ReturnType<typeof readSolidDescriptor>): void {
    if (descriptor.origin) mesh.position = new this.BABYLON.Vector3(descriptor.origin.x, descriptor.origin.y, descriptor.origin.z);
    if (descriptor.rotation) mesh.rotation = new this.BABYLON.Vector3(descriptor.rotation.x, descriptor.rotation.y, descriptor.rotation.z);
  }

  private applyCanvasSize(size: GraphViewportSize): void {
    const width = Math.max(1, Math.round(size.width));
    const height = Math.max(1, Math.round(size.height));
    if (!this.canvas) return;
    this.canvas.width = width;
    this.canvas.height = height;
  }

  private createLineBox(options: {
    name: string;
    start: BabylonVector3Like;
    end: BabylonVector3Like;
    thickness: number;
    scene: BabylonSceneLike;
    color: RgbaColor;
    metadata: Record<string, unknown> | null;
  }): BabylonMeshLike {
    const dx = options.end.x - options.start.x;
    const dy = options.end.y - options.start.y;
    const dz = options.end.z - options.start.z;
    const length = Math.max(0.001, Math.hypot(dx, dy, dz));
    const mesh = this.BABYLON.MeshBuilder.CreateBox(options.name, {
      width: length,
      height: options.thickness,
      depth: options.thickness
    }, options.scene);
    mesh.name = options.name;
    if (!options.metadata) mesh.isPickable = false;
    if (options.metadata) mesh.metadata = { ...(mesh.metadata ?? {}), ...options.metadata };
    mesh.position = new this.BABYLON.Vector3(
      (options.start.x + options.end.x) / 2,
      (options.start.y + options.end.y) / 2,
      (options.start.z + options.end.z) / 2
    );
    mesh.rotation = new this.BABYLON.Vector3(0, -Math.atan2(dz, Math.hypot(dx, dy)), Math.atan2(dy, dx));
    mesh.material = this.createMaterial(`${options.name}:material`, options.scene, options.color);
    return mesh;
  }

  private createPathTube(options: {
    name: string;
    points: BabylonVector3Like[];
    thickness: number;
    scene: BabylonSceneLike;
    color: RgbaColor;
    metadata: Record<string, unknown> | null;
  }): BabylonMeshLike | null {
    const createTube = this.BABYLON.MeshBuilder.CreateTube;
    if (!createTube || options.points.length < 2) return null;

    const mesh = createTube(options.name, {
      path: options.points.map((point) => new this.BABYLON.Vector3(point.x, point.y, point.z)),
      radius: options.thickness / 2,
      tessellation: 8,
      cap: 3
    }, options.scene);
    mesh.name = options.name;
    if (options.metadata) mesh.metadata = { ...(mesh.metadata ?? {}), ...options.metadata };
    mesh.material = this.createMaterial(`${options.name}:material`, options.scene, options.color);
    return mesh;
  }

  private createMaterial(name: string, scene: BabylonSceneLike, color: RgbaColor): unknown {
    if (!this.BABYLON.StandardMaterial) return undefined;
    const material = new this.BABYLON.StandardMaterial(name, scene);
    const color3 = this.createColor3(color.r, color.g, color.b);
    material.diffuseColor = color3;
    material.emissiveColor = this.createColor3(color.r * 0.18, color.g * 0.18, color.b * 0.18);
    material.specularColor = this.createColor3(0.08, 0.08, 0.08);
    material.alpha = color.a;
    return material;
  }

  private createColor3(r: number, g: number, b: number): unknown {
    return this.BABYLON.Color3 ? new this.BABYLON.Color3(r, g, b) : { r, g, b };
  }

  private createColor4(r: number, g: number, b: number, a: number): unknown {
    return this.BABYLON.Color4 ? new this.BABYLON.Color4(r, g, b, a) : { r, g, b, a };
  }

  private disposeStoredObject(object: BabylonStoredObject): void {
    for (const mesh of object.meshes) {
      disposeMaterialLike(mesh.material);
      mesh.dispose();
    }
  }

  private disposeHelperMeshes(): void {
    for (const mesh of this.helperMeshes.splice(0)) {
      disposeMaterialLike(mesh.material);
      mesh.dispose();
    }
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
  const payload = asRecord(node.payload);
  const family = typeof payload?.family === 'string'
    ? payload.family
    : typeof payload?.solidKind === 'string'
      ? payload.solidKind
      : 'cube';
  const rawParameters = asRecord(payload?.parameters) ?? {};
  const parameters = Object.fromEntries(
    Object.entries(rawParameters).filter((entry): entry is [string, number] => typeof entry[1] === 'number' && Number.isFinite(entry[1]))
  );
  return {
    family,
    parameters,
    origin: readVector3(payload?.origin) ?? readVector3(payload?.position),
    rotation: readVector3(payload?.rotation)
  };
};

const readSurfaceWireframeSegments = (node: GraphObjectNode): BabylonVector3Like[][] => {
  const payload = asRecord(node.payload);
  const geometry = asRecord(payload?.geometry);
  if (!geometry) return [];

  if ((geometry.kind === 'wireframe' || geometry.kind === 'multiline') && Array.isArray(geometry.segments)) {
    return geometry.segments
      .filter(Array.isArray)
      .map((segment) => segment
        .map((entry) => readVector3(entry) ?? readVector2AsVector3(entry))
        .filter((point): point is BabylonVector3Like => !!point))
      .filter((segment) => segment.length >= 2);
  }

  const points = readPointArray(geometry.points);
  return points && points.length >= 2 ? [points] : [];
};

const createObjectMetadata = (
  handle: GraphRenderHandle,
  componentId: string
): Record<string, unknown> => ({
  [VUEGRAPHX_METADATA_KEY]: {
    objectId: handle.objectId,
    componentId
  }
});

const isSurfaceSolidNode = (node: GraphObjectNode): boolean => {
  const payload = asRecord(node.payload);
  return payload?.solidKind === 'surface' || payload?.family === 'surface';
};

const createPointSegments = (
  points: BabylonVector3Like[]
): Array<{ start: BabylonVector3Like; end: BabylonVector3Like }> => {
  const segments: Array<{ start: BabylonVector3Like; end: BabylonVector3Like }> = [];
  for (let index = 1; index < points.length; index += 1) {
    const start = points[index - 1];
    const end = points[index];
    if (Math.hypot(end.x - start.x, end.y - start.y, end.z - start.z) > 1e-9) segments.push({ start, end });
  }
  return segments;
};

const readNodeColor = (node: GraphObjectNode, fallback: RgbaColor): RgbaColor => {
  const renderHints = asRecord(node.renderHints);
  const fromStroke = typeof renderHints?.strokeColor === 'string' ? parseCssHexColor(renderHints.strokeColor) : null;
  const fromFill = typeof renderHints?.fillColor === 'string' ? parseCssHexColor(renderHints.fillColor) : null;
  return fromStroke ?? fromFill ?? fallback;
};

const resolveStrokeThickness = (node: GraphObjectNode): number => {
  const renderHints = asRecord(node.renderHints);
  const strokeWidth = Math.max(
    1,
    readFiniteNumber(renderHints?.strokeWidth) ?? BABYLON_PROXY_BASE_STROKE_WIDTH
  );
  return BABYLON_PROXY_THICKNESS * (strokeWidth / BABYLON_PROXY_BASE_STROKE_WIDTH);
};

const parseCssHexColor = (value: string): RgbaColor | null => {
  const normalized = value.trim();
  if (!normalized.startsWith('#')) return null;
  const hex = normalized.slice(1);
  const expand = (entry: string) => entry.length === 1 ? `${entry}${entry}` : entry;
  const parts = hex.length === 3 || hex.length === 4
    ? [expand(hex[0]), expand(hex[1]), expand(hex[2]), hex[3] ? expand(hex[3]) : 'ff']
    : hex.length === 6 || hex.length === 8
      ? [hex.slice(0, 2), hex.slice(2, 4), hex.slice(4, 6), hex.slice(6, 8) || 'ff']
      : null;
  if (!parts) return null;
  const values = parts.map((part) => Number.parseInt(part, 16));
  if (values.some((entry) => Number.isNaN(entry))) return null;
  return {
    r: values[0] / 255,
    g: values[1] / 255,
    b: values[2] / 255,
    a: Math.max(0.35, values[3] / 255)
  };
};

const parseCssColorToRgba = (value: string, fallback: RgbaColor): RgbaColor => {
  const hex = parseCssHexColor(value);
  if (hex) return hex;
  const match = value.trim().match(/^rgba?\(([^)]+)\)$/i);
  if (!match) return fallback;
  const parts = match[1].split(',').map((part) => Number(part.trim()));
  if (parts.length < 3 || parts.some((entry) => Number.isNaN(entry))) return fallback;
  return {
    r: clampNumber(parts[0] / 255, 0, 1),
    g: clampNumber(parts[1] / 255, 0, 1),
    b: clampNumber(parts[2] / 255, 0, 1),
    a: clampNumber(parts[3] ?? fallback.a, 0, 1)
  };
};

const readPointArray = (value: unknown): BabylonVector3Like[] | null => {
  if (!Array.isArray(value)) return null;
  const points = value
    .map((entry) => readVector3(entry) ?? readVector2AsVector3(entry))
    .filter((entry): entry is BabylonVector3Like => !!entry);
  return points.length > 0 ? points : null;
};

const readVector2AsVector3 = (value: unknown): BabylonVector3Like | undefined => {
  const record = asRecord(value);
  const point = asRecord(record?.coordinates) ?? record;
  if (typeof point?.x === 'number' && Number.isFinite(point.x) && typeof point.y === 'number' && Number.isFinite(point.y)) {
    return { x: point.x, y: point.y, z: 0 };
  }
  return undefined;
};

const POLYGONAL_PRISM_SIDES: Record<string, number> = {
  'triangular-prism': 3,
  'pentagonal-prism': 5,
  'hexagonal-prism': 6
};

const POLYGONAL_PYRAMID_SIDES: Record<string, number> = {
  'triangular-pyramid': 3,
  'quadrangular-pyramid': 4
};

const POLYGONAL_FRUSTUM_SIDES: Record<string, number> = {
  'triangular-frustum': 3,
  'quadrangular-frustum': 4
};

const createCylinderLikeMeshOptions = (family: string, parameters: Record<string, number>): Record<string, unknown> | null => {
  if (family === 'cylinder' || family === 'cone' || family === 'conical-frustum') {
    return {
      height: parameters.height ?? 2,
      diameterTop: family === 'cone' ? 0 : (parameters.topRadius ?? parameters.radius ?? 1) * 2,
      diameterBottom: (parameters.bottomRadius ?? parameters.radius ?? 1) * 2,
      tessellation: 48
    };
  }

  const prismSides = POLYGONAL_PRISM_SIDES[family];
  if (prismSides) {
    const diameter = regularPolygonCircumDiameter({
      perimeter: parameters.basePerimeter,
      area: parameters.baseArea,
      sides: prismSides,
      fallbackArea: 1
    });
    return {
      height: parameters.height ?? 2,
      diameterTop: diameter,
      diameterBottom: diameter,
      tessellation: prismSides
    };
  }

  const pyramidSides = POLYGONAL_PYRAMID_SIDES[family];
  if (pyramidSides) {
    return {
      height: parameters.height ?? 2,
      diameterTop: 0,
      diameterBottom: regularPolygonCircumDiameter({
        perimeter: parameters.basePerimeter,
        area: parameters.baseArea,
        sides: pyramidSides,
        fallbackArea: 1
      }),
      tessellation: pyramidSides
    };
  }

  const frustumSides = POLYGONAL_FRUSTUM_SIDES[family];
  if (frustumSides) {
    return {
      height: parameters.height ?? 2,
      diameterTop: regularPolygonCircumDiameter({
        perimeter: parameters.topPerimeter,
        area: parameters.topArea,
        sides: frustumSides,
        fallbackArea: 0.5
      }),
      diameterBottom: regularPolygonCircumDiameter({
        perimeter: parameters.bottomPerimeter,
        area: parameters.bottomArea,
        sides: frustumSides,
        fallbackArea: 1
      }),
      tessellation: frustumSides
    };
  }

  return null;
};

const regularPolygonCircumDiameter = (options: {
  perimeter?: number;
  area?: number;
  sides: number;
  fallbackArea: number;
}): number => {
  const safeSides = Math.max(3, Math.floor(options.sides));
  if (typeof options.perimeter === 'number' && Number.isFinite(options.perimeter) && options.perimeter > 0) {
    const sideLength = options.perimeter / safeSides;
    return sideLength / Math.sin(Math.PI / safeSides);
  }
  const safeArea = Number.isFinite(options.area) && (options.area ?? 0) > 0 ? options.area! : options.fallbackArea;
  const radius = Math.sqrt((2 * safeArea) / (safeSides * Math.sin((2 * Math.PI) / safeSides)));
  return radius * 2;
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

const readFiniteNumber = (value: unknown): number | undefined => (
  typeof value === 'number' && Number.isFinite(value) ? value : undefined
);

const clampNumber = (value: number, min: number, max: number): number => (
  Math.min(max, Math.max(min, value))
);

const readBoolean = (value: unknown): boolean | null => (
  typeof value === 'boolean' ? value : null
);

const readGridInput = (value: unknown): GraphViewportGridInput | undefined => {
  if (typeof value === 'boolean') return value;
  if (typeof value === 'object' && value !== null && !Array.isArray(value)) return value as GraphViewportGridInput;
  return undefined;
};

const asRecord = (value: unknown): Record<string, unknown> | null => (
  typeof value === 'object' && value !== null ? value as Record<string, unknown> : null
);

const disposeMaterialLike = (material: unknown): void => {
  const materialRecord = asRecord(material);
  if (!materialRecord) return;
  if (typeof materialRecord.dispose === 'function') {
    materialRecord.dispose(false, true);
    return;
  }
  const texture = asRecord(materialRecord.diffuseTexture);
  if (typeof texture?.dispose === 'function') texture.dispose();
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
