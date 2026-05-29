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
  alpha?: number;
  dispose?(forceDisposeEffect?: boolean, forceDisposeTextures?: boolean): void;
}

export interface BabylonDynamicTextureLike {
  hasAlpha?: boolean;
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
  ArcRotateCamera?: new (name: string, alpha: number, beta: number, radius: number, target: BabylonVector3Like, scene: BabylonSceneLike) => BabylonCameraLike;
  HemisphericLight?: new (name: string, direction: BabylonVector3Like, scene: BabylonSceneLike) => unknown;
  MeshBuilder: {
    CreateBox(name: string, options: Record<string, unknown>, scene: BabylonSceneLike): BabylonMeshLike;
    CreatePlane?(name: string, options: Record<string, unknown>, scene: BabylonSceneLike): BabylonMeshLike;
    CreateSphere?(name: string, options: Record<string, unknown>, scene: BabylonSceneLike): BabylonMeshLike;
    CreateCylinder?(name: string, options: Record<string, unknown>, scene: BabylonSceneLike): BabylonMeshLike;
  };
}

export type BabylonRenderMode = '2d' | '3d';

export interface BabylonRuntimeOptions {
  canvas?: HTMLCanvasElement;
  antialias?: boolean;
  engineOptions?: Record<string, unknown>;
  renderMode?: BabylonRenderMode;
  attachCameraControl?: boolean;
  canvasPointerEvents?: 'auto' | 'none';
}

interface Babylon2DWorldBounds {
  left: number;
  right: number;
  top: number;
  bottom: number;
}

interface BabylonStoredObject {
  node: GraphObjectNode;
  handle: GraphRenderHandle;
  meshes: BabylonMeshLike[];
  labels: HTMLElement[];
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
const BABYLON_GRID_Z = -0.025;
const BABYLON_PROXY_THICKNESS = 0.055;
const BABYLON_CAMERA_ORTHOGRAPHIC_MODE = 1;
const BABYLON_DOUBLE_SIDE = 2;
const BABYLON_TEXT_PLANE_HEIGHT = 0.72;
const BABYLON_TEXT_TEXTURE_HEIGHT = 128;
const BABYLON_TEXT_TEXTURE_PADDING = 20;
const DEFAULT_BABYLON_2D_WORLD_BOUNDS: Babylon2DWorldBounds = {
  left: -BABYLON_WORLD_HALF_EXTENT,
  right: BABYLON_WORLD_HALF_EXTENT,
  top: BABYLON_WORLD_HALF_EXTENT,
  bottom: -BABYLON_WORLD_HALF_EXTENT
};

export class BabylonRuntime implements BabylonRuntimePort {
  private canvas: HTMLCanvasElement | null;
  private labelLayer: HTMLDivElement | null = null;
  private engine: BabylonEngineLike | null = null;
  private scene: BabylonSceneLike | null = null;
  private camera: BabylonCameraLike | null = null;
  private renderLoop: (() => void) | null = null;
  private ownsCanvas = false;
  private renderMode: BabylonRenderMode;
  private worldBounds: Babylon2DWorldBounds = DEFAULT_BABYLON_2D_WORLD_BOUNDS;
  private readonly objects = new Map<string, BabylonStoredObject>();
  private readonly helperMeshes: BabylonMeshLike[] = [];

  public constructor(
    private readonly BABYLON: BabylonNamespaceLike,
    private readonly options: BabylonRuntimeOptions = {}
  ) {
    this.canvas = options.canvas ?? null;
    this.renderMode = options.renderMode ?? '3d';
  }

  public mount(host: HTMLElement, options: GraphBackendMountOptions = {}): void {
    this.renderMode = resolveRenderMode(options.attributes?.renderMode, this.options.renderMode ?? this.renderMode);
    this.worldBounds = read2DWorldBounds(options.attributes?.worldBounds) ?? DEFAULT_BABYLON_2D_WORLD_BOUNDS;
    this.installLabelLayer(host);

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

  public createObject(node: GraphObjectNode, handle: GraphRenderHandle, _context: GraphBackendContext = {}): void {
    const scene = this.requireScene();
    const previous = this.objects.get(handle.id);
    if (previous) this.disposeStoredObject(previous);
    const meshes = this.shouldRenderAsNativeSolid(node)
      ? [this.createMeshForSolid(node, handle, scene)]
      : this.createMeshesForProxyObject(node, handle, scene);
    const labels = this.createLabelsForObject(node, handle);
    this.objects.set(handle.id, { node, handle, meshes, labels });
  }

  public updateObject(handle: GraphRenderHandle, patch: GraphObjectPatch, _context: GraphBackendContext = {}): void {
    const stored = this.objects.get(handle.id);
    if (!stored) return;
    const nextNode = mergeGraphObjectPatch(stored.node, patch);
    this.disposeStoredObject(stored);
    const scene = this.requireScene();
    const meshes = this.shouldRenderAsNativeSolid(nextNode)
      ? [this.createMeshForSolid(nextNode, stored.handle, scene)]
      : this.createMeshesForProxyObject(nextNode, stored.handle, scene);
    const labels = this.createLabelsForObject(nextNode, stored.handle);
    this.objects.set(handle.id, { node: nextNode, handle: stored.handle, meshes, labels });
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
      worldPoint: info.pickedPoint ? this.createPickWorldPoint(info.pickedPoint) : undefined,
      distancePx: typeof info.distance === 'number' ? info.distance : undefined,
      meta: { meshName: info.pickedMesh.name }
    };
  }

  public project(point: GraphWorldPoint, _viewport?: GraphViewportRef): GraphClientPoint | null {
    return { x: point.x, y: point.y };
  }

  public unproject(point: GraphClientPoint, _viewport?: GraphViewportRef): GraphWorldPoint | null {
    if (this.renderMode === '2d') return { dimension: '2d', x: point.x, y: point.y };
    return { dimension: '3d', x: point.x, y: point.y, z: 0 };
  }

  public resize(size: GraphViewportSize): void {
    if (this.canvas) this.applyCanvasSize(size);
    if (this.renderMode === '2d') this.applyOrthographicCameraBounds();
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
    this.labelLayer?.remove();
    if (this.ownsCanvas) this.canvas?.remove();
    this.canvas = null;
    this.labelLayer = null;
    this.ownsCanvas = false;
    this.engine = null;
    this.scene = null;
    this.camera = null;
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
      const is2D = this.renderMode === '2d';
      const camera = new this.BABYLON.ArcRotateCamera(
        'vuegraphx-camera',
        -Math.PI / 2,
        is2D ? Math.PI / 2 : Math.PI / 2.35,
        is2D ? BABYLON_WORLD_HALF_EXTENT * 2 : 18,
        new this.BABYLON.Vector3(0, 0, 0),
        this.scene
      );
      if (is2D) this.configureCameraFor2D(camera);
      const shouldAttachCameraControl = this.options.attachCameraControl ?? !is2D;
      if (this.canvas && shouldAttachCameraControl) camera.attachControl?.(this.canvas, true);
      this.scene.activeCamera = camera;
      this.camera = camera;
    }
    if (this.BABYLON.HemisphericLight) {
      const direction = this.renderMode === '2d'
        ? new this.BABYLON.Vector3(0, 0, -1)
        : new this.BABYLON.Vector3(0, 1, -0.4);
      new this.BABYLON.HemisphericLight('vuegraphx-light', direction, this.scene);
    }
  }

  private installGridAndAxes(): void {
    const scene = this.requireScene();
    this.disposeHelperMeshes();
    for (let coordinate = -BABYLON_WORLD_HALF_EXTENT; coordinate <= BABYLON_WORLD_HALF_EXTENT; coordinate += BABYLON_GRID_STEP) {
      const isAxis = coordinate === 0;
      const color = isAxis ? { r: 0.28, g: 0.33, b: 0.41, a: 0.9 } : { r: 0.58, g: 0.64, b: 0.72, a: 0.28 };
      const thickness = isAxis ? 0.035 : 0.012;
      this.helperMeshes.push(this.createLineBox({
        name: `vuegraphx-grid-x-${coordinate}`,
        start: { x: -BABYLON_WORLD_HALF_EXTENT, y: coordinate, z: BABYLON_GRID_Z },
        end: { x: BABYLON_WORLD_HALF_EXTENT, y: coordinate, z: BABYLON_GRID_Z },
        thickness,
        scene,
        color,
        metadata: null
      }));
      this.helperMeshes.push(this.createLineBox({
        name: `vuegraphx-grid-y-${coordinate}`,
        start: { x: coordinate, y: -BABYLON_WORLD_HALF_EXTENT, z: BABYLON_GRID_Z },
        end: { x: coordinate, y: BABYLON_WORLD_HALF_EXTENT, z: BABYLON_GRID_Z },
        thickness,
        scene,
        color,
        metadata: null
      }));
    }
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
    this.applySolidTransform(mesh, node);
    return mesh;
  }

  private shouldRenderAsNativeSolid(node: GraphObjectNode): boolean {
    return node.type === 'solid' && this.renderMode === '3d' && !isSurfaceSolidNode(node);
  }

  private createMeshesForProxyObject(node: GraphObjectNode, handle: GraphRenderHandle, scene: BabylonSceneLike): BabylonMeshLike[] {
    const payload = asRecord(node.payload);
    const geometry = asRecord(payload?.geometry);
    const color = readNodeColor(node, colorForNodeType(node.type));
    const metadata = createObjectMetadata(handle, proxyComponentForNode(node));

    if (node.type === 'text' || node.type === 'measurement') {
      if (this.renderMode === '2d') return [];
      const mesh = this.createTextPlane(node, handle, scene, color, metadata);
      return mesh ? [mesh] : [];
    }

    if (node.type === 'point') {
      const anchor = readObjectAnchor(node);
      const mesh = this.BABYLON.MeshBuilder.CreateSphere
        ? this.BABYLON.MeshBuilder.CreateSphere(handle.id, { diameter: 0.32, segments: 18 }, scene)
        : this.BABYLON.MeshBuilder.CreateBox(handle.id, { size: 0.28 }, scene);
      mesh.name = handle.id;
      mesh.metadata = metadata;
      mesh.position = new this.BABYLON.Vector3(anchor.x, anchor.y, anchor.z + 0.02);
      mesh.material = this.createMaterial(`${handle.id}:material`, scene, color);
      return [mesh];
    }

    const pathSegments = readRenderablePathSegments(payload, geometry);
    if (pathSegments.length > 0) {
      let segmentIndex = 0;
      return pathSegments.flatMap((linePoints) => {
        const close = node.type === 'polygon' || geometry?.kind === 'polygon';
        const points = close ? closePointPath(linePoints) : linePoints;
        return createPointSegments(points).map((segment) => {
          segmentIndex += 1;
          return this.createLineBox({
            name: `${handle.id}:segment-${segmentIndex}`,
            start: segment.start,
            end: segment.end,
            thickness: BABYLON_PROXY_THICKNESS,
            scene,
            color,
            metadata
          });
        });
      });
    }

    const anchor = readObjectAnchor(node);
    const mesh = this.BABYLON.MeshBuilder.CreateBox(handle.id, proxyDimensionsForNode(node), scene);
    mesh.name = handle.id;
    mesh.metadata = metadata;
    mesh.position = new this.BABYLON.Vector3(anchor.x, anchor.y, anchor.z + 0.02);
    mesh.material = this.createMaterial(`${handle.id}:material`, scene, color);
    return [mesh];
  }

  private createTextPlane(
    node: GraphObjectNode,
    handle: GraphRenderHandle,
    scene: BabylonSceneLike,
    color: RgbaColor,
    metadata: Record<string, unknown>
  ): BabylonMeshLike | null {
    if (!this.BABYLON.DynamicTexture || !this.BABYLON.MeshBuilder.CreatePlane) return null;

    const text = readTextForNode(node);
    const textureSize = textTextureSizeForText(text);
    const visualSize = textPlaneSizeForText(text);
    const texture = new this.BABYLON.DynamicTexture(
      `${handle.id}:text-texture`,
      textureSize,
      scene,
      false
    );
    texture.hasAlpha = true;
    texture.drawText(
      text,
      BABYLON_TEXT_TEXTURE_PADDING,
      null,
      `${Math.round(BABYLON_TEXT_TEXTURE_HEIGHT * 0.46)}px Arial, "Microsoft YaHei", "PingFang SC", sans-serif`,
      rgbaToCss(color),
      'rgba(255, 255, 255, 0.92)',
      true,
      true
    );

    const mesh = this.BABYLON.MeshBuilder.CreatePlane(handle.id, {
      width: visualSize.width,
      height: visualSize.height,
      sideOrientation: BABYLON_DOUBLE_SIDE
    }, scene);
    const anchor = readObjectAnchor(node);
    mesh.name = handle.id;
    mesh.metadata = metadata;
    mesh.position = new this.BABYLON.Vector3(
      anchor.x + visualSize.width / 2,
      anchor.y + visualSize.height / 2,
      anchor.z + 0.08
    );
    mesh.material = this.createTextMaterial(`${handle.id}:text-material`, scene, texture, color);
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

  private installLabelLayer(host: HTMLElement): void {
    if (typeof document === 'undefined') return;
    if (globalThis.getComputedStyle?.(host).position === 'static') {
      host.style.position = 'relative';
    }
    this.labelLayer?.remove();
    this.labelLayer = document.createElement('div');
    this.labelLayer.setAttribute('data-vuegraphx-babylon-label-layer', 'true');
    Object.assign(this.labelLayer.style, {
      position: 'absolute',
      inset: '0',
      pointerEvents: 'none',
      zIndex: '2',
      overflow: 'hidden'
    });
    host.appendChild(this.labelLayer);
  }

  private createLabelsForObject(node: GraphObjectNode, handle: GraphRenderHandle): HTMLElement[] {
    if (!(node.type === 'text' || node.type === 'measurement')) return [];
    if (this.renderMode !== '2d') return [];
    if (!this.labelLayer || typeof document === 'undefined') return [];
    const anchor = readObjectAnchor(node);
    const color = readNodeColor(node, colorForNodeType(node.type));
    const label = document.createElement('div');
    label.textContent = readTextForNode(node);
    label.setAttribute('data-vuegraphx-object-id', handle.objectId);
    label.setAttribute('data-vuegraphx-component-id', proxyComponentForNode(node));
    const position = projectWorldPointToLayerPercent(anchor, this.worldBounds);
    Object.assign(label.style, {
      position: 'absolute',
      left: `${position.left}%`,
      top: `${position.top}%`,
      transform: 'translate(0, -100%)',
      color: rgbaToCss(color),
      background: 'rgba(255, 255, 255, 0.88)',
      borderRadius: '4px',
      padding: '1px 4px',
      font: '600 14px/1.25 Arial, "Microsoft YaHei", "PingFang SC", sans-serif',
      whiteSpace: 'nowrap',
      textShadow: '0 1px 0 rgba(255, 255, 255, 0.92)',
      boxShadow: '0 0 0 1px rgba(148, 163, 184, 0.18)'
    });
    this.labelLayer.appendChild(label);
    return [label];
  }

  private configureCameraFor2D(camera: BabylonCameraLike): void {
    camera.mode = BABYLON_CAMERA_ORTHOGRAPHIC_MODE;
    camera.lowerAlphaLimit = -Math.PI / 2;
    camera.upperAlphaLimit = -Math.PI / 2;
    camera.lowerBetaLimit = Math.PI / 2;
    camera.upperBetaLimit = Math.PI / 2;
    camera.lowerRadiusLimit = BABYLON_WORLD_HALF_EXTENT * 2;
    camera.upperRadiusLimit = BABYLON_WORLD_HALF_EXTENT * 2;
    this.applyOrthographicCameraBounds(camera);
  }

  private applyOrthographicCameraBounds(camera = this.camera): void {
    if (!camera) return;
    camera.orthoLeft = this.worldBounds.left;
    camera.orthoRight = this.worldBounds.right;
    camera.orthoTop = this.worldBounds.top;
    camera.orthoBottom = this.worldBounds.bottom;
  }

  private createPickWorldPoint(point: BabylonVector3Like): GraphWorldPoint {
    return this.renderMode === '2d'
      ? { dimension: '2d', x: point.x, y: point.y }
      : { dimension: '3d', x: point.x, y: point.y, z: point.z };
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

  private createTextMaterial(
    name: string,
    scene: BabylonSceneLike,
    texture: BabylonDynamicTextureLike,
    color: RgbaColor
  ): unknown {
    if (!this.BABYLON.StandardMaterial) return undefined;
    const material = new this.BABYLON.StandardMaterial(name, scene);
    material.diffuseTexture = texture;
    material.emissiveTexture = texture;
    material.opacityTexture = undefined;
    material.useAlphaFromDiffuseTexture = true;
    material.backFaceCulling = false;
    material.disableLighting = true;
    material.diffuseColor = this.createColor3(1, 1, 1);
    material.emissiveColor = this.createColor3(1, 1, 1);
    material.specularColor = this.createColor3(0, 0, 0);
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
    for (const label of object.labels) label.remove();
  }

  private disposeHelperMeshes(): void {
    for (const mesh of this.helperMeshes.splice(0)) mesh.dispose();
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

const readObjectAnchor = (node: GraphObjectNode): BabylonVector3Like => {
  const payload = asRecord(node.payload);
  const geometry = asRecord(payload?.geometry);
  const candidates: unknown[] = [
    payload?.point,
    payload?.anchor,
    payload?.position,
    payload?.start,
    payload?.end,
    payload?.vertex,
    geometry?.center,
    geometry?.point,
    geometry?.origin,
    geometry?.start,
    geometry?.end
  ];
  for (const candidate of candidates) {
    const point = readVector3(candidate) ?? readVector2AsVector3(candidate);
    if (point) return point;
  }

  const fromArray = averageVector3(readPointArray(geometry?.points) ?? readPointArray(geometry?.vertices) ?? readPointArray(payload?.points));
  return fromArray ?? { x: 0, y: 0, z: 0 };
};

const proxyDimensionsForNode = (node: GraphObjectNode): Record<string, unknown> => {
  if (node.type === 'point') return { size: 0.12 };
  if (node.type === 'text' || node.type === 'measurement') return { width: 0.65, height: 0.08, depth: 0.08 };
  if (node.type === 'function' || node.type === 'polyline') return { width: 1, height: 0.05, depth: 0.05 };
  if (node.type === 'polygon') return { width: 0.8, height: 0.08, depth: 0.8 };
  if (node.type === 'line' || node.type === 'segment' || node.type === 'ray' || node.type === 'vector') return { width: 1, height: 0.04, depth: 0.04 };
  return { size: 0.28 };
};

const proxyComponentForNode = (node: GraphObjectNode): string => {
  if (node.type === 'text') return 'label';
  if (node.type === 'measurement') return 'measurement';
  if (node.type === 'function') return 'curve';
  if (node.type === 'polygon') return 'face';
  if (node.type === 'solid') return 'projection';
  if (node.type === 'point') return 'point';
  if (node.type === 'line' || node.type === 'ray' || node.type === 'segment' || node.type === 'vector') return 'edge';
  return 'proxy';
};

const readTextForNode = (node: GraphObjectNode): string => {
  const payload = asRecord(node.payload);
  const direct = firstNonEmptyString(payload?.text, payload?.content, payload?.label, payload?.name);
  if (direct) return direct;
  if (node.type === 'measurement') {
    const measurementKind = typeof payload?.measurementKind === 'string' ? payload.measurementKind : 'measure';
    const value = readFiniteNumber(payload?.value);
    if (value !== undefined) return `${measurementKind}: ${formatDisplayNumber(value)}`;
    const expression = firstNonEmptyString(payload?.expression);
    if (expression) return `${measurementKind}: ${expression}`;
  }
  return node.id;
};

const textTextureSizeForText = (text: string): { width: number; height: number } => ({
  width: clampNumber(
    Math.ceil(visualTextLength(text) * 36 + BABYLON_TEXT_TEXTURE_PADDING * 2),
    192,
    1024
  ),
  height: BABYLON_TEXT_TEXTURE_HEIGHT
});

const textPlaneSizeForText = (text: string): { width: number; height: number } => ({
  width: clampNumber(visualTextLength(text) * 0.32 + 0.52, 1.05, 8),
  height: BABYLON_TEXT_PLANE_HEIGHT
});

const projectWorldPointToLayerPercent = (
  point: BabylonVector3Like,
  bounds: Babylon2DWorldBounds
): { left: number; top: number } => ({
  left: ((point.x - bounds.left) / (bounds.right - bounds.left)) * 100,
  top: ((bounds.top - point.y) / (bounds.top - bounds.bottom)) * 100
});

const visualTextLength = (text: string): number => {
  let length = 0;
  for (const char of text) {
    length += char.charCodeAt(0) > 255 ? 1 : 0.58;
  }
  return Math.max(1, length);
};

const formatDisplayNumber = (value: number): string => (
  Number.isInteger(value) ? String(value) : value.toFixed(3).replace(/0+$/, '').replace(/\.$/, '')
);

const firstNonEmptyString = (...values: unknown[]): string | null => {
  for (const value of values) {
    if (typeof value !== 'string') continue;
    const trimmed = value.trim();
    if (trimmed) return trimmed;
  }
  return null;
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

const readRenderablePathSegments = (
  payload: Record<string, unknown> | null,
  geometry: Record<string, unknown> | null
): BabylonVector3Like[][] => {
  if ((geometry?.kind === 'multiline' || geometry?.kind === 'wireframe') && Array.isArray(geometry.segments)) {
    return geometry.segments
      .filter(Array.isArray)
      .map((segment) => segment
        .map((entry) => readVector3(entry) ?? readVector2AsVector3(entry))
        .filter((point): point is BabylonVector3Like => !!point))
      .filter((segment) => segment.length >= 2);
  }
  if (geometry?.kind === 'hyperbola') {
    const center = readVector3(geometry.center) ?? readVector2AsVector3(geometry.center);
    if (!center) return [];
    return sampleHyperbolaSegments(
      center,
      readFiniteNumber(geometry.radiusX) ?? 1,
      readFiniteNumber(geometry.radiusY) ?? 1,
      readFiniteNumber(geometry.rotationRadians) ?? 0
    );
  }
  const points = readRenderablePathPoints(payload, geometry);
  return points.length >= 2 ? [points] : [];
};

const readRenderablePathPoints = (
  payload: Record<string, unknown> | null,
  geometry: Record<string, unknown> | null
): BabylonVector3Like[] => {
  const geometryKind = typeof geometry?.kind === 'string' ? geometry.kind : '';
  const geometryPoints = readPointArray(geometry?.points);
  if (geometryPoints && geometryPoints.length >= 2) return geometryPoints;

  const vertices = readPointArray(geometry?.vertices);
  if (vertices && vertices.length >= 2) return vertices;

  if (geometryKind === 'segment') {
    return compactPathPoints([geometry?.start, geometry?.end]);
  }
  if (geometryKind === 'line') {
    const point = readVector3(geometry?.point) ?? readVector2AsVector3(geometry?.point);
    const direction = readVector3(geometry?.direction) ?? readVector2AsVector3(geometry?.direction);
    return point && direction ? extendDirectionPath(point, direction, false) : [];
  }
  if (geometryKind === 'ray') {
    const origin = readVector3(geometry?.origin) ?? readVector2AsVector3(geometry?.origin ?? geometry?.point);
    const direction = readVector3(geometry?.direction) ?? readVector2AsVector3(geometry?.direction);
    return origin && direction ? extendDirectionPath(origin, direction, true) : [];
  }
  if (geometryKind === 'circle' || geometryKind === 'ellipse') {
    const center = readVector3(geometry?.center) ?? readVector2AsVector3(geometry?.center);
    if (!center) return [];
    const radiusX = readFiniteNumber(geometry?.radiusX) ?? readFiniteNumber(geometry?.radius) ?? 1;
    const radiusY = readFiniteNumber(geometry?.radiusY) ?? readFiniteNumber(geometry?.radius) ?? radiusX;
    const rotation = readFiniteNumber(geometry?.rotationRadians) ?? 0;
    return sampleEllipsePath(center, radiusX, radiusY, rotation);
  }
  if (geometryKind === 'arc' || geometryKind === 'sector' || geometryKind === 'semicircle') {
    const center = readVector3(geometry?.center) ?? readVector2AsVector3(geometry?.center);
    const start = readVector3(geometry?.start) ?? readVector2AsVector3(geometry?.start);
    const end = readVector3(geometry?.end) ?? readVector2AsVector3(geometry?.end);
    return center && start && end ? sampleArcPath(center, start, end, geometryKind === 'sector') : [];
  }

  const payloadPoints = readPointArray(payload?.points);
  if (payloadPoints && payloadPoints.length >= 2) return payloadPoints;

  if (payload?.start && payload?.end) {
    return compactPathPoints([payload.start, payload.end]);
  }

  return [];
};

const compactPathPoints = (values: unknown[]): BabylonVector3Like[] => values
  .map((value) => readVector3(value) ?? readVector2AsVector3(value))
  .filter((point): point is BabylonVector3Like => !!point);

const extendDirectionPath = (
  point: BabylonVector3Like,
  direction: BabylonVector3Like,
  ray: boolean
): BabylonVector3Like[] => {
  const magnitude = Math.hypot(direction.x, direction.y, direction.z);
  if (magnitude <= 1e-9) return [];
  const unit = { x: direction.x / magnitude, y: direction.y / magnitude, z: direction.z / magnitude };
  const length = BABYLON_WORLD_HALF_EXTENT * 2;
  return ray
    ? [point, { x: point.x + unit.x * length, y: point.y + unit.y * length, z: point.z + unit.z * length }]
    : [
        { x: point.x - unit.x * length, y: point.y - unit.y * length, z: point.z - unit.z * length },
        { x: point.x + unit.x * length, y: point.y + unit.y * length, z: point.z + unit.z * length }
      ];
};

const sampleEllipsePath = (
  center: BabylonVector3Like,
  radiusX: number,
  radiusY: number,
  rotationRadians: number,
  steps = 97
): BabylonVector3Like[] => {
  const points: BabylonVector3Like[] = [];
  const cos = Math.cos(rotationRadians);
  const sin = Math.sin(rotationRadians);
  for (let index = 0; index < steps; index += 1) {
    const theta = (Math.PI * 2 * index) / (steps - 1);
    const localX = radiusX * Math.cos(theta);
    const localY = radiusY * Math.sin(theta);
    points.push({
      x: center.x + localX * cos - localY * sin,
      y: center.y + localX * sin + localY * cos,
      z: center.z
    });
  }
  return points;
};

const sampleHyperbolaSegments = (
  center: BabylonVector3Like,
  radiusX: number,
  radiusY: number,
  rotationRadians: number
): BabylonVector3Like[][] => {
  const cos = Math.cos(rotationRadians);
  const sin = Math.sin(rotationRadians);
  return [-1, 1].map((side) => {
    const points: BabylonVector3Like[] = [];
    for (let index = 0; index < 48; index += 1) {
      const t = -2.1 + (4.2 * index) / 47;
      const localX = side * radiusX * Math.cosh(t);
      const localY = radiusY * Math.sinh(t);
      points.push({
        x: center.x + localX * cos - localY * sin,
        y: center.y + localX * sin + localY * cos,
        z: center.z
      });
    }
    return points;
  });
};

const sampleArcPath = (
  center: BabylonVector3Like,
  start: BabylonVector3Like,
  end: BabylonVector3Like,
  includeCenter: boolean
): BabylonVector3Like[] => {
  const radius = Math.max(0.001, Math.hypot(start.x - center.x, start.y - center.y));
  const startAngle = Math.atan2(start.y - center.y, start.x - center.x);
  let endAngle = Math.atan2(end.y - center.y, end.x - center.x);
  if (endAngle < startAngle) endAngle += Math.PI * 2;
  const points: BabylonVector3Like[] = includeCenter ? [center, start] : [];
  for (let index = 0; index < 48; index += 1) {
    const theta = startAngle + ((endAngle - startAngle) * index) / 47;
    points.push({
      x: center.x + radius * Math.cos(theta),
      y: center.y + radius * Math.sin(theta),
      z: center.z
    });
  }
  if (includeCenter) points.push(center);
  return points;
};

const closePointPath = (points: BabylonVector3Like[]): BabylonVector3Like[] => {
  const first = points[0];
  const last = points[points.length - 1];
  return first && last && Math.hypot(first.x - last.x, first.y - last.y, first.z - last.z) > 1e-9
    ? [...points, first]
    : points;
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

const colorForNodeType = (type: string): RgbaColor => {
  if (type === 'measurement' || type === 'text') return { r: 0.2, g: 0.25, b: 0.33, a: 0.92 };
  if (type === 'point') return { r: 0.86, g: 0.21, b: 0.27, a: 0.95 };
  if (type === 'polygon') return { r: 0.08, g: 0.58, b: 0.42, a: 0.82 };
  if (type === 'solid') return { r: 0.05, g: 0.45, b: 0.86, a: 0.82 };
  return { r: 0.03, g: 0.49, b: 0.78, a: 0.92 };
};

const readNodeColor = (node: GraphObjectNode, fallback: RgbaColor): RgbaColor => {
  const renderHints = asRecord(node.renderHints);
  const fromStroke = typeof renderHints?.strokeColor === 'string' ? parseCssHexColor(renderHints.strokeColor) : null;
  const fromFill = typeof renderHints?.fillColor === 'string' ? parseCssHexColor(renderHints.fillColor) : null;
  return fromStroke ?? fromFill ?? fallback;
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

const rgbaToCss = (color: RgbaColor): string => (
  `rgba(${Math.round(color.r * 255)}, ${Math.round(color.g * 255)}, ${Math.round(color.b * 255)}, ${color.a})`
);

const readPointArray = (value: unknown): BabylonVector3Like[] | null => {
  if (!Array.isArray(value)) return null;
  const points = value
    .map((entry) => readVector3(entry) ?? readVector2AsVector3(entry))
    .filter((entry): entry is BabylonVector3Like => !!entry);
  return points.length > 0 ? points : null;
};

const averageVector3 = (points: BabylonVector3Like[] | null): BabylonVector3Like | null => (
  points && points.length > 0
    ? {
        x: points.reduce((sum, point) => sum + point.x, 0) / points.length,
        y: points.reduce((sum, point) => sum + point.y, 0) / points.length,
        z: points.reduce((sum, point) => sum + point.z, 0) / points.length
      }
    : null
);

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

const resolveRenderMode = (value: unknown, fallback: BabylonRenderMode): BabylonRenderMode => (
  value === '2d' || value === '3d' ? value : fallback
);

const read2DWorldBounds = (value: unknown): Babylon2DWorldBounds | null => {
  const record = asRecord(value);
  const left = readFiniteNumber(record?.left);
  const right = readFiniteNumber(record?.right);
  const top = readFiniteNumber(record?.top);
  const bottom = readFiniteNumber(record?.bottom);
  if (left === undefined || right === undefined || top === undefined || bottom === undefined) return null;
  if (left >= right || bottom >= top) return null;
  return { left, right, top, bottom };
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
