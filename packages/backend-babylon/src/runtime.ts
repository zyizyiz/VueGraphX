import katex from 'katex';
import katexCss from 'katex/dist/katex.min.css?raw';
import type {
  GraphBackendContext,
  GraphBackendMountOptions,
  GraphClientPoint,
  GraphObjectNode,
  GraphObjectPatch,
  GraphPickOptions,
  GraphRenderHandle,
  GraphTextRenderDescriptor,
  GraphViewportRef,
  GraphViewportSize,
  GraphWorldPoint
} from '@vuegraphx/core';
import {
  createStandardCoordinateTickModel,
  STANDARD_COORDINATE_UI,
  formatStandardCoordinateLabel,
  isStandardZeroCoordinate,
  createCenteredWorldBoundsForViewportGrid,
  mergeGraphObjectPatch,
  resolveGraphTextRenderDescriptor,
  resolveGraphViewportGridOptions,
  resolveGraphViewportGridStep,
  resolveStandardCoordinateLabelScreenPosition,
  type GraphViewportGridInput,
  type ResolvedGraphViewportGridOptions,
  type StandardCoordinateLabelModel
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

export type BabylonRenderMode = '2d' | '3d';

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

interface StandardCoordinateScreenMetrics {
  width: number;
  height: number;
  origin: GraphClientPoint;
  visualScale: number;
  strokeWorld: number;
  clientToWorld(point: GraphClientPoint, z: number): BabylonVector3Like;
}

interface Babylon2DCoordinateLabelMetadata {
  text: string;
  axis: 'x' | 'y' | 'plain';
  left: number;
  top: number;
  visualScale: number;
}

interface Babylon2DCoordinateLayer {
  mesh: BabylonMeshLike;
  texture: BabylonDynamicTextureLike;
  textureWidth: number;
  textureHeight: number;
}

const VUEGRAPHX_METADATA_KEY = 'vuegraphx';
const BABYLON_WORLD_HALF_EXTENT = 10;
const BABYLON_GRID_STEP = 1;
// The 2D orthographic camera looks from negative Z toward the XY plane, so
// larger Z values are farther away. Keep helper axes/grid behind user objects.
const BABYLON_2D_GRID_Z = 0.08;
const BABYLON_2D_COORDINATE_LABEL_Z = 0.07;
const BABYLON_3D_GRID_Z = -0.025;
const BABYLON_2D_PATH_Z = 0;
const BABYLON_2D_POINT_Z = -0.02;
const BABYLON_2D_SELECTED_Z = -0.04;
const BABYLON_2D_TEXT_Z = -0.06;
const BABYLON_2D_LAYER_Z_STEP = 0.0001;
const BABYLON_2D_JOIN_Z_OFFSET = BABYLON_2D_LAYER_Z_STEP * 0.25;
const BABYLON_PROXY_BASE_STROKE_WIDTH = 2;
const BABYLON_PROXY_THICKNESS = 0.055;
const BABYLON_CAMERA_ORTHOGRAPHIC_MODE = 1;
const BABYLON_DOUBLE_SIDE = 2;
const BABYLON_TEXT_PLANE_HEIGHT = 0.72;
const BABYLON_TEXT_TEXTURE_HEIGHT = 128;
const BABYLON_TEXT_TEXTURE_PADDING = 20;
const BABYLON_MIN_VISUAL_ZOOM_SCALE = 0.25;
const BABYLON_MAX_VISUAL_ZOOM_SCALE = 8;
const KATEX_STYLE_ELEMENT_ID = 'vuegraphx-katex-style';
const KATEX_LAYOUT_CSS = katexCss.replace(/@font-face\{[^}]*\}/g, '');
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
  private visualBaselineWorldBounds: Babylon2DWorldBounds = DEFAULT_BABYLON_2D_WORLD_BOUNDS;
  private viewportSize: GraphViewportSize | null = null;
  private showAxes: boolean;
  private gridInput?: GraphViewportGridInput;
  private hasExplicitWorldBounds = false;
  private readonly objects = new Map<string, BabylonStoredObject>();
  private readonly helperMeshes: BabylonMeshLike[] = [];
  private readonly helperLabels: HTMLElement[] = [];
  private readonly object2DLayerOrders = new Map<string, number>();
  private next2DLayerOrder = 0;
  private coordinateLayer: Babylon2DCoordinateLayer | null = null;

  public constructor(
    private readonly BABYLON: BabylonNamespaceLike,
    private readonly options: BabylonRuntimeOptions = {}
  ) {
    this.canvas = options.canvas ?? null;
    this.renderMode = options.renderMode ?? '3d';
    this.showAxes = options.showAxes ?? true;
    this.gridInput = options.grid;
  }

  public mount(host: HTMLElement, options: GraphBackendMountOptions = {}): void {
    this.renderMode = resolveRenderMode(options.attributes?.renderMode, this.options.renderMode ?? this.renderMode);
    const mountedWorldBounds = read2DWorldBounds(options.attributes?.worldBounds);
    this.worldBounds = mountedWorldBounds ?? DEFAULT_BABYLON_2D_WORLD_BOUNDS;
    this.visualBaselineWorldBounds = { ...this.worldBounds };
    this.hasExplicitWorldBounds = !!mountedWorldBounds;
    this.showAxes = readBoolean(options.attributes?.showAxes) ?? this.options.showAxes ?? true;
    const mountedGridInput = readGridInput(options.attributes?.grid);
    this.gridInput = mountedGridInput ?? this.options.grid;
    this.viewportSize = null;
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
    this.syncImplicitGridBounds();

    this.engine = new this.BABYLON.Engine(this.canvas, this.options.antialias ?? true, this.options.engineOptions);
    this.scene = new this.BABYLON.Scene(this.engine);
    this.installVisualDefaults();
    this.installDefaultCameraAndLight();
    this.installGridAndAxes();
    this.renderLoop = () => this.scene?.render();
    this.engine.runRenderLoop(this.renderLoop);
  }

  public getSupportStatus(node: GraphObjectNode): BabylonBackendSupportStatus | null {
    if (!(node.type === 'text' || node.type === 'measurement')) return null;

    const descriptor = resolveGraphTextRenderDescriptor(node);
    if (this.renderMode === '2d') {
      return descriptor?.format === 'latex' && !this.labelLayer ? 'partial-support' : 'success';
    }

    if (descriptor?.format === 'latex') {
      return this.canRenderLatexTextPlane() ? 'success' : 'partial-support';
    }

    return this.canRenderPlainTextPlane() ? 'success' : 'partial-support';
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
    this.object2DLayerOrders.delete(handle.id);
  }

  public pick(point: GraphClientPoint, _options: GraphPickOptions = {}): BabylonRuntimePickResult | null {
    if (this.renderMode === '2d') {
      const tolerancePick = this.pick2DObjectWithTolerance(point, _options);
      if (tolerancePick) return tolerancePick;
    }
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
    if (point.dimension === '2d' && this.renderMode === '2d') {
      return project2DWorldToClient(point, this.getVisible2DWorldBounds(), this.viewportSize ?? readCanvasViewportSize(this.canvas));
    }
    return { x: point.x, y: point.y };
  }

  public unproject(point: GraphClientPoint, _viewport?: GraphViewportRef): GraphWorldPoint | null {
    if (this.renderMode === '2d') {
      const world = unproject2DClientToWorld(point, this.getVisible2DWorldBounds(), this.viewportSize ?? readCanvasViewportSize(this.canvas));
      return { dimension: '2d', x: world.x, y: world.y };
    }
    return { dimension: '3d', x: point.x, y: point.y, z: 0 };
  }

  public setWorldBounds(bounds: Babylon2DWorldBounds): void {
    this.worldBounds = { ...bounds };
    this.hasExplicitWorldBounds = true;
    if (this.renderMode === '2d') this.applyOrthographicCameraBounds();
    this.refresh2DHelperArtifacts();
    this.refresh2DObjectLabels();
    this.renderFrame();
  }

  public resize(size: GraphViewportSize): void {
    if (this.canvas) this.applyCanvasSize(size);
    this.syncImplicitGridBounds();
    if (this.renderMode === '2d') this.applyOrthographicCameraBounds();
    this.refresh2DHelperArtifacts();
    this.refresh2DObjectLabels();
    this.engine?.resize();
  }

  public renderFrame(): void {
    this.scene?.render();
  }

  public destroy(): void {
    if (this.renderLoop) this.engine?.stopRenderLoop?.(this.renderLoop);
    for (const object of this.objects.values()) this.disposeStoredObject(object);
    this.objects.clear();
    this.object2DLayerOrders.clear();
    this.next2DLayerOrder = 0;
    this.disposeHelperMeshes();
    this.disposeCoordinateLayer();
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
    this.viewportSize = null;
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
    const gridZ = this.renderMode === '2d' ? BABYLON_2D_GRID_Z : BABYLON_3D_GRID_Z;
    const gridOptions = this.resolveGridOptionsForCurrentMode();
    this.disposeHelperMeshes();

    if (!this.showAxes && !gridOptions.enabled) {
      this.disposeCoordinateLayer();
      return;
    }

    if (this.renderMode !== '2d') {
      this.disposeCoordinateLayer();
      this.create3DGridAndAxes(scene, gridZ, gridOptions);
      return;
    }

    if (this.update2DCoordinateLayer(scene, gridOptions)) return;
    this.disposeCoordinateLayer();

    const bounds = this.getVisible2DWorldBounds();
    const xAxisVisible = this.showAxes && bounds.bottom <= 0 && bounds.top >= 0;
    const yAxisVisible = this.showAxes && bounds.left <= 0 && bounds.right >= 0;
    const viewportSize = this.viewportSize ?? readCanvasViewportSize(this.canvas);
    const axisMetrics = createStandardCoordinateScreenMetrics(bounds, viewportSize, this.get2DVisualZoomScale());
    const xTicks = createStandardCoordinateTickModel(bounds.left, bounds.right, axisMetrics.width / axisMetrics.visualScale);
    const yTicks = createStandardCoordinateTickModel(bounds.bottom, bounds.top, axisMetrics.height / axisMetrics.visualScale);
    const axisColor = rgbaFromHex(STANDARD_COORDINATE_UI.axisStrokeColor, 1);

    if (gridOptions.enabled) {
      this.create2DGridLineBoxes(scene, bounds, axisMetrics, gridOptions, gridZ);
    }

    if (xAxisVisible) {
      this.helperMeshes.push(this.createLineBox({
        name: 'vuegraphx-coordinate-x-axis',
        start: axisMetrics.clientToWorld({
          x: (STANDARD_COORDINATE_UI.axisStrokeWidthPx * axisMetrics.visualScale) / 2,
          y: axisMetrics.origin.y
        }, gridZ),
        end: axisMetrics.clientToWorld({
          x: axisMetrics.width - STANDARD_COORDINATE_UI.axisArrowLengthPx * axisMetrics.visualScale,
          y: axisMetrics.origin.y
        }, gridZ),
        thickness: axisMetrics.strokeWorld,
        scene,
        color: axisColor,
        metadata: null
      }));
    }

    if (yAxisVisible) {
      this.helperMeshes.push(this.createLineBox({
        name: 'vuegraphx-coordinate-y-axis',
        start: axisMetrics.clientToWorld({ x: axisMetrics.origin.x, y: axisMetrics.height }, gridZ),
        end: axisMetrics.clientToWorld({
          x: axisMetrics.origin.x,
          y: STANDARD_COORDINATE_UI.axisArrowLengthPx * axisMetrics.visualScale
        }, gridZ),
        thickness: axisMetrics.strokeWorld,
        scene,
        color: axisColor,
        metadata: null
      }));
    }

    if (xAxisVisible) {
      for (const x of xTicks.positions) {
        if (isStandardZeroCoordinate(x)) continue;
        const point = project2DWorldToClient({ x, y: 0 }, bounds, viewportSize);
        this.createHelperLabel(formatStandardCoordinateLabel(x), {
          left: point.x,
          top: axisMetrics.origin.y + STANDARD_COORDINATE_UI.xTickLabelTopOffsetPx * axisMetrics.visualScale
        }, 'x', axisMetrics.visualScale, scene, axisMetrics, BABYLON_2D_COORDINATE_LABEL_Z);
      }
      this.createAxisArrowHead('x', {
        x: axisMetrics.width,
        y: axisMetrics.origin.y
      }, axisMetrics, scene, gridZ);
      this.createHelperLabel('x', {
        left: axisMetrics.width - STANDARD_COORDINATE_UI.xAxisLabelRightInsetPx * axisMetrics.visualScale,
        top: axisMetrics.origin.y + STANDARD_COORDINATE_UI.xAxisLabelTopOffsetPx * axisMetrics.visualScale
      }, 'plain', axisMetrics.visualScale, scene, axisMetrics, BABYLON_2D_COORDINATE_LABEL_Z);
    }

    if (yAxisVisible) {
      for (const y of yTicks.positions) {
        if (isStandardZeroCoordinate(y)) continue;
        const point = project2DWorldToClient({ x: 0, y }, bounds, viewportSize);
        this.createHelperLabel(formatStandardCoordinateLabel(y), {
          left: axisMetrics.origin.x + STANDARD_COORDINATE_UI.yTickLabelLeftOffsetPx * axisMetrics.visualScale,
          top: point.y + STANDARD_COORDINATE_UI.yTickLabelTopOffsetPx * axisMetrics.visualScale
        }, 'y', axisMetrics.visualScale, scene, axisMetrics, BABYLON_2D_COORDINATE_LABEL_Z);
      }
      this.createAxisArrowHead('y', {
        x: axisMetrics.origin.x,
        y: 0
      }, axisMetrics, scene, gridZ);
      this.createHelperLabel('y', {
        left: axisMetrics.origin.x + STANDARD_COORDINATE_UI.yAxisLabelLeftOffsetPx * axisMetrics.visualScale,
        top: STANDARD_COORDINATE_UI.yAxisLabelTopPx * axisMetrics.visualScale
      }, 'plain', axisMetrics.visualScale, scene, axisMetrics, BABYLON_2D_COORDINATE_LABEL_Z);
    }

    if (xAxisVisible && yAxisVisible) {
      this.createHelperLabel('O', {
        left: axisMetrics.origin.x + STANDARD_COORDINATE_UI.originLabelLeftOffsetPx * axisMetrics.visualScale,
        top: axisMetrics.origin.y + STANDARD_COORDINATE_UI.originLabelTopOffsetPx * axisMetrics.visualScale
      }, 'plain', axisMetrics.visualScale, scene, axisMetrics, BABYLON_2D_COORDINATE_LABEL_Z);
    }
  }

  private create3DGridAndAxes(
    scene: BabylonSceneLike,
    gridZ: number,
    gridOptions: ResolvedGraphViewportGridOptions
  ): void {
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
          start: { x: -BABYLON_WORLD_HALF_EXTENT, y: coordinate, z: gridZ },
          end: { x: BABYLON_WORLD_HALF_EXTENT, y: coordinate, z: gridZ },
          thickness,
          scene,
          color,
          metadata: null
        }));
        this.helperMeshes.push(this.createLineBox({
          name: `vuegraphx-grid-y-${coordinate}`,
          start: { x: coordinate, y: -BABYLON_WORLD_HALF_EXTENT, z: gridZ },
          end: { x: coordinate, y: BABYLON_WORLD_HALF_EXTENT, z: gridZ },
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
      start: { x: -BABYLON_WORLD_HALF_EXTENT, y: 0, z: gridZ },
      end: { x: BABYLON_WORLD_HALF_EXTENT, y: 0, z: gridZ },
      thickness: axisThickness,
      scene,
      color: axisColor,
      metadata: null
    }));
    this.helperMeshes.push(this.createLineBox({
      name: 'vuegraphx-grid-y-0',
      start: { x: 0, y: -BABYLON_WORLD_HALF_EXTENT, z: gridZ },
      end: { x: 0, y: BABYLON_WORLD_HALF_EXTENT, z: gridZ },
      thickness: axisThickness,
      scene,
      color: axisColor,
      metadata: null
    }));
  }

  private create2DGridLineBoxes(
    scene: BabylonSceneLike,
    bounds: Babylon2DWorldBounds,
    metrics: StandardCoordinateScreenMetrics,
    gridOptions: ResolvedGraphViewportGridOptions,
    z: number
  ): void {
    const pixelsPerUnitX = metrics.width / Math.max(1e-9, bounds.right - bounds.left);
    const pixelsPerUnitY = metrics.height / Math.max(1e-9, bounds.top - bounds.bottom);
    const stepX = resolveGraphViewportGridStep(pixelsPerUnitX, Math.abs(bounds.right - bounds.left), gridOptions);
    const stepY = resolveGraphViewportGridStep(pixelsPerUnitY, Math.abs(bounds.top - bounds.bottom), gridOptions);
    const startX = Math.ceil(bounds.left / stepX) * stepX;
    const startY = Math.ceil(bounds.bottom / stepY) * stepY;
    const thickness = Math.max(metrics.strokeWorld * 0.35, gridOptions.lineWidth * Math.max(
      Math.abs(bounds.right - bounds.left) / metrics.width,
      Math.abs(bounds.top - bounds.bottom) / metrics.height
    ));
    const color = parseCssColorToRgba(gridOptions.lineColor, { r: 0.58, g: 0.64, b: 0.72, a: 0.28 });

    for (let x = startX; x <= bounds.right + 1e-9; x += stepX) {
      this.helperMeshes.push(this.createLineBox({
        name: `vuegraphx-coordinate-grid-x-${formatMeshCoordinate(x)}`,
        start: { x, y: bounds.bottom, z },
        end: { x, y: bounds.top, z },
        thickness,
        scene,
        color,
        metadata: null
      }));
    }

    for (let y = startY; y <= bounds.top + 1e-9; y += stepY) {
      this.helperMeshes.push(this.createLineBox({
        name: `vuegraphx-coordinate-grid-y-${formatMeshCoordinate(y)}`,
        start: { x: bounds.left, y, z },
        end: { x: bounds.right, y, z },
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

  private canRenderPlainTextPlane(): boolean {
    return !!(this.BABYLON.DynamicTexture && this.BABYLON.MeshBuilder.CreatePlane);
  }

  private canRenderLatexTextPlane(): boolean {
    return !!(this.BABYLON.Texture && this.BABYLON.MeshBuilder.CreatePlane && this.BABYLON.StandardMaterial);
  }

  private createMeshesForProxyObject(node: GraphObjectNode, handle: GraphRenderHandle, scene: BabylonSceneLike): BabylonMeshLike[] {
    const payload = asRecord(node.payload);
    const geometry = asRecord(payload?.geometry);
    const color = readNodeColor(node, colorForNodeType(node.type));
    const metadata = createObjectMetadata(handle, proxyComponentForNode(node));
    const proxyThickness = this.resolveProxyThickness(node);

    if (node.type === 'text' || node.type === 'measurement') {
      if (this.renderMode === '2d') return [];
      const mesh = this.createTextPlane(node, handle, scene, color, metadata);
      return mesh ? [mesh] : [];
    }

    if (node.type === 'point') {
      const anchor = readObjectAnchor(node);
      const pointZ = this.resolve2DLayerZ(handle, isSelectedNode(node) ? BABYLON_2D_SELECTED_Z : BABYLON_2D_POINT_Z);
      const position = this.renderMode === '2d'
        ? this.layerPoint(anchor, pointZ)
        : { x: anchor.x, y: anchor.y, z: anchor.z + 0.02 };
      const mesh = this.renderMode === '2d' && this.BABYLON.MeshBuilder.CreateDisc
        ? this.BABYLON.MeshBuilder.CreateDisc(handle.id, {
          radius: 0.16,
          tessellation: 32,
          sideOrientation: BABYLON_DOUBLE_SIDE
        }, scene)
        : this.BABYLON.MeshBuilder.CreateSphere
        ? this.BABYLON.MeshBuilder.CreateSphere(handle.id, { diameter: 0.32, segments: 18 }, scene)
        : this.BABYLON.MeshBuilder.CreateBox(handle.id, { size: 0.28 }, scene);
      mesh.name = handle.id;
      mesh.metadata = metadata;
      mesh.position = new this.BABYLON.Vector3(position.x, position.y, position.z);
      mesh.material = this.renderMode === '2d'
        ? this.createFlatMaterial(`${handle.id}:material`, scene, color)
        : this.createMaterial(`${handle.id}:material`, scene, color);
      return [mesh];
    }

    const pathSegments = readRenderablePathSegments(payload, geometry);
    if (pathSegments.length > 0) {
      let segmentIndex = 0;
      return pathSegments.flatMap((linePoints) => {
        const close = node.type === 'polygon' || geometry?.kind === 'polygon';
        const points = close ? closePointPath(linePoints) : linePoints;
        const pathZ = this.resolve2DLayerZ(handle, isSelectedNode(node) ? BABYLON_2D_SELECTED_Z : BABYLON_2D_PATH_Z);
        const layeredPoints = this.layerPathPoints(points, pathZ);
        if (this.renderMode === '2d' && this.BABYLON.MeshBuilder.CreatePlane) {
          const meshes = this.createFlatPathMeshes({
            namePrefix: `${handle.id}:segment`,
            points: layeredPoints,
            thickness: proxyThickness,
            scene,
            color,
            metadata,
            startIndex: segmentIndex
          });
          segmentIndex += meshes.segmentCount;
          return meshes.meshes;
        }
        const tube = this.createPathTube({
          name: `${handle.id}:segment-${segmentIndex + 1}`,
          points: layeredPoints,
          thickness: proxyThickness,
          scene,
          color,
          metadata
        });
        if (tube) {
          segmentIndex += 1;
          return [tube];
        }

        return createPointSegments(layeredPoints).map((segment) => {
          segmentIndex += 1;
          return this.createLineBox({
            name: `${handle.id}:segment-${segmentIndex}`,
            start: segment.start,
            end: segment.end,
            thickness: proxyThickness,
            scene,
            color,
            metadata
          });
        });
      });
    }

    const rawAnchor = readObjectAnchor(node);
    const fallbackZ = this.resolve2DLayerZ(handle, isSelectedNode(node) ? BABYLON_2D_SELECTED_Z : BABYLON_2D_PATH_Z);
    const anchor = this.renderMode === '2d'
      ? this.layerPoint(rawAnchor, fallbackZ)
      : { x: rawAnchor.x, y: rawAnchor.y, z: rawAnchor.z + 0.02 };
    const mesh = this.BABYLON.MeshBuilder.CreateBox(handle.id, proxyDimensionsForNode(node), scene);
    mesh.name = handle.id;
    mesh.metadata = metadata;
    mesh.position = new this.BABYLON.Vector3(anchor.x, anchor.y, anchor.z);
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
    if (!this.BABYLON.MeshBuilder.CreatePlane) return null;

    const descriptor = resolveGraphTextRenderDescriptor(node);
    if (descriptor?.format === 'latex') {
      return this.createLatexTextPlane(descriptor, node, handle, scene, color, metadata);
    }

    if (!this.BABYLON.DynamicTexture) return null;
    const text = descriptor?.text ?? readTextForNode(node);
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
    const position = this.renderMode === '2d'
      ? this.layerPoint(anchor, isSelectedNode(node) ? BABYLON_2D_SELECTED_Z : BABYLON_2D_TEXT_Z)
      : { x: anchor.x, y: anchor.y, z: anchor.z + 0.08 };
    mesh.position = new this.BABYLON.Vector3(
      position.x + visualSize.width / 2,
      position.y + visualSize.height / 2,
      position.z
    );
    mesh.material = this.createTextMaterial(`${handle.id}:text-material`, scene, texture, color);
    return mesh;
  }

  private createLatexTextPlane(
    descriptor: GraphTextRenderDescriptor,
    node: GraphObjectNode,
    handle: GraphRenderHandle,
    scene: BabylonSceneLike,
    color: RgbaColor,
    metadata: Record<string, unknown>
  ): BabylonMeshLike | null {
    if (!this.BABYLON.Texture || !this.BABYLON.MeshBuilder.CreatePlane) return null;

    const source = descriptor.latex ?? descriptor.text;
    const textureSize = textTextureSizeForText(source);
    const visualSize = textPlaneSizeForText(source);
    const svg = createLatexTextureSvg(descriptor, textureSize, color);
    const texture = new this.BABYLON.Texture(
      `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`,
      scene,
      true,
      true
    );
    texture.hasAlpha = true;

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
    const width = Math.max(1, Math.round(size.width));
    const height = Math.max(1, Math.round(size.height));
    this.viewportSize = { width, height };
    if (!this.canvas) return;
    this.canvas.width = width;
    this.canvas.height = height;
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
    ensureKatexStyles(host.ownerDocument);
  }

  private createLabelsForObject(node: GraphObjectNode, handle: GraphRenderHandle): HTMLElement[] {
    if (this.renderMode !== '2d') return [];
    if (!this.labelLayer || typeof document === 'undefined') return [];
    if (node.type === 'coordinate-system') return this.createCoordinateSystemLabelsForObject(node, handle);
    if (!(node.type === 'text' || node.type === 'measurement')) return [];
    const anchor = readObjectAnchor(node);
    const color = readNodeColor(node, colorForNodeType(node.type));
    const visualScale = this.get2DTextVisualZoomScale();
    const label = document.createElement('div');
    applyTextToDomLabel(label, node);
    label.setAttribute('data-vuegraphx-object-id', handle.objectId);
    label.setAttribute('data-vuegraphx-component-id', proxyComponentForNode(node));
    const position = project2DWorldToClient(anchor, this.getVisible2DWorldBounds(), this.viewportSize ?? readCanvasViewportSize(this.canvas));
    Object.assign(label.style, {
      position: 'absolute',
      left: '0',
      top: '0',
      transform: createDomLabelTransform(position, visualScale),
      transformOrigin: '0 0',
      color: rgbaToCss(color),
      background: 'transparent',
      border: '0',
      borderRadius: '0',
      padding: '0',
      font: '600 14px/1.25 Arial, "Microsoft YaHei", "PingFang SC", sans-serif',
      whiteSpace: 'nowrap',
      opacity: '1',
      textShadow: 'none',
      boxShadow: 'none',
      contain: 'layout paint style',
      willChange: 'transform',
      outline: 'none'
    });
    this.labelLayer.appendChild(label);
    return [label];
  }

  private createCoordinateSystemLabelsForObject(node: GraphObjectNode, handle: GraphRenderHandle): HTMLElement[] {
    if (!this.labelLayer || typeof document === 'undefined') return [];
    const geometry = asRecord(asRecord(node.payload)?.geometry);
    if (geometry?.kind !== 'coordinate-system') return [];
    const labels = readStandardCoordinateLabels(geometry.labels);
    if (labels.length === 0) return [];

    const bounds = this.getVisible2DWorldBounds();
    const viewportSize = this.viewportSize ?? readCanvasViewportSize(this.canvas);
    const visualScale = this.get2DVisualZoomScale();
    return labels.map((coordinateLabel) => {
      const anchor = project2DWorldToClient(coordinateLabel.point, bounds, viewportSize);
      const position = resolveStandardCoordinateLabelScreenPosition(coordinateLabel, anchor, visualScale);
      const label = document.createElement('div');
      label.textContent = coordinateLabel.text;
      label.setAttribute('data-vuegraphx-object-id', handle.objectId);
      label.setAttribute('data-vuegraphx-component-id', `${proxyComponentForNode(node)}:coordinate-label`);
      label.setAttribute('data-vuegraphx-coordinate-label-role', coordinateLabel.role);
      Object.assign(label.style, {
        position: 'absolute',
        left: `${formatCssNumber(position.x)}px`,
        top: `${formatCssNumber(position.y)}px`,
        transform: coordinateLabel.axis === 'x' ? 'translate(-50%, 0)' : 'none',
        transformOrigin: '0 0',
        color: STANDARD_COORDINATE_UI.tickLabelColor,
        background: 'transparent',
        border: '0',
        borderRadius: '0',
        padding: '0',
        font: scaleCssFont(STANDARD_COORDINATE_UI.tickLabelFont, visualScale),
        lineHeight: `${formatCssNumber(STANDARD_COORDINATE_UI.tickLabelLineHeightPx * visualScale)}px`,
        whiteSpace: 'nowrap',
        textAlign: coordinateLabel.axis === 'x' ? 'center' : 'left',
        opacity: '1',
        textShadow: 'none',
        boxShadow: 'none',
        contain: 'layout paint style',
        willChange: 'left, top',
        outline: 'none'
      });
      this.labelLayer?.appendChild(label);
      return label;
    });
  }

  private resolveGridOptionsForCurrentMode(): ResolvedGraphViewportGridOptions {
    if (this.gridInput !== undefined) return resolveGraphViewportGridOptions(this.gridInput);
    const inferred = resolveGraphViewportGridOptions(true);
    return { ...inferred, enabled: this.showAxes };
  }

  private syncImplicitGridBounds(): void {
    if (this.renderMode !== '2d' || this.hasExplicitWorldBounds || this.gridInput === undefined) return;
    const gridOptions = this.resolveGridOptionsForCurrentMode();
    if (!gridOptions.enabled) return;
    const viewportSize = this.viewportSize ?? readCanvasViewportSize(this.canvas);
    if (!viewportSize) return;
    const bounds = createCenteredWorldBoundsForViewportGrid(viewportSize, gridOptions);
    this.worldBounds = { ...bounds };
    this.visualBaselineWorldBounds = { ...bounds };
  }

  private draw2DGridTexture(
    context: CanvasRenderingContext2D,
    bounds: Babylon2DWorldBounds,
    metrics: StandardCoordinateScreenMetrics,
    gridOptions: ResolvedGraphViewportGridOptions
  ): void {
    const pixelsPerUnitX = metrics.width / Math.max(1e-9, bounds.right - bounds.left);
    const pixelsPerUnitY = metrics.height / Math.max(1e-9, bounds.top - bounds.bottom);
    const stepX = resolveGraphViewportGridStep(pixelsPerUnitX, Math.abs(bounds.right - bounds.left), gridOptions);
    const stepY = resolveGraphViewportGridStep(pixelsPerUnitY, Math.abs(bounds.top - bounds.bottom), gridOptions);
    const startX = Math.ceil(bounds.left / stepX) * stepX;
    const startY = Math.ceil(bounds.bottom / stepY) * stepY;

    context.fillStyle = gridOptions.backgroundColor;
    context.fillRect(0, 0, metrics.width, metrics.height);
    context.strokeStyle = gridOptions.lineColor;
    context.lineWidth = gridOptions.lineWidth;
    context.lineCap = 'butt';
    context.beginPath();

    for (let x = startX; x <= bounds.right + 1e-9; x += stepX) {
      const point = project2DWorldToClient({ x, y: 0 }, bounds, { width: metrics.width, height: metrics.height });
      const alignedX = alignCanvasPixel(point.x, gridOptions.lineWidth);
      context.moveTo(alignedX, 0);
      context.lineTo(alignedX, metrics.height);
    }

    for (let y = startY; y <= bounds.top + 1e-9; y += stepY) {
      const point = project2DWorldToClient({ x: 0, y }, bounds, { width: metrics.width, height: metrics.height });
      const alignedY = alignCanvasPixel(point.y, gridOptions.lineWidth);
      context.moveTo(0, alignedY);
      context.lineTo(metrics.width, alignedY);
    }

    context.stroke();
  }

  private update2DCoordinateLayer(scene: BabylonSceneLike, gridOptions: ResolvedGraphViewportGridOptions): boolean {
    const createPlane = this.BABYLON.MeshBuilder.CreatePlane;
    if (!this.BABYLON.DynamicTexture || !createPlane || !this.BABYLON.StandardMaterial) return false;

    const bounds = this.getVisible2DWorldBounds();
    const xAxisVisible = this.showAxes && bounds.bottom <= 0 && bounds.top >= 0;
    const yAxisVisible = this.showAxes && bounds.left <= 0 && bounds.right >= 0;
    const viewportSize = this.viewportSize ?? readCanvasViewportSize(this.canvas);
    const metrics = createStandardCoordinateScreenMetrics(bounds, viewportSize, this.get2DVisualZoomScale());
    const textureScale = 2;
    const textureWidth = Math.max(1, Math.ceil(metrics.width * textureScale));
    const textureHeight = Math.max(1, Math.ceil(metrics.height * textureScale));
    let layer = this.coordinateLayer;

    if (!layer || layer.textureWidth !== textureWidth || layer.textureHeight !== textureHeight) {
      this.disposeCoordinateLayer();
      const texture = new this.BABYLON.DynamicTexture(
        'vuegraphx-coordinate-layer:texture',
        { width: textureWidth, height: textureHeight },
        scene,
        false
      );
      texture.hasAlpha = true;
      if (!texture.getContext?.()) {
        texture.dispose?.();
        return false;
      }

      const mesh = createPlane('vuegraphx-coordinate-layer', {
        width: 1,
        height: 1,
        sideOrientation: BABYLON_DOUBLE_SIDE
      }, scene);
      mesh.name = 'vuegraphx-coordinate-layer';
      mesh.isPickable = false;
      const material = this.createTextMaterial(
        'vuegraphx-coordinate-layer:material',
        scene,
        texture,
        { r: 0, g: 0, b: 0, a: 1 }
      ) as BabylonMaterialLike | undefined;
      if (material) material.disableDepthWrite = true;
      mesh.material = material;
      layer = {
        mesh,
        texture,
        textureWidth,
        textureHeight
      };
      this.coordinateLayer = layer;
    }

    const context = layer.texture.getContext?.();
    if (!context) {
      this.disposeCoordinateLayer();
      return false;
    }
    const xTicks = createStandardCoordinateTickModel(bounds.left, bounds.right, metrics.width / metrics.visualScale);
    const yTicks = createStandardCoordinateTickModel(bounds.bottom, bounds.top, metrics.height / metrics.visualScale);
    const labels = this.draw2DCoordinateTexture(context, {
      bounds,
      metrics,
      textureWidth,
      textureHeight,
      textureScale,
      xTicks,
      yTicks,
      xAxisVisible,
      yAxisVisible,
      gridOptions
    });

    // Babylon DynamicTexture's default/invertY=true upload matches Canvas 2D's
    // top-left origin. Passing false flips the coordinate texture vertically,
    // making the y-axis and labels appear reversed during/after zoom.
    layer.texture.update?.(true);
    layer.mesh.position = new this.BABYLON.Vector3(
      (bounds.left + bounds.right) / 2,
      (bounds.top + bounds.bottom) / 2,
      BABYLON_2D_GRID_Z
    );
    layer.mesh.scaling = new this.BABYLON.Vector3(
      Math.max(1e-6, bounds.right - bounds.left),
      Math.max(1e-6, bounds.top - bounds.bottom),
      1
    );
    layer.mesh.metadata = {
      ...(layer.mesh.metadata ?? {}),
      vuegraphxCoordinateLayer: {
        layer: 'coordinate',
        kind: 'stable-texture',
        z: BABYLON_2D_GRID_Z,
        visualScale: metrics.visualScale,
        labels,
        grid: {
          enabled: gridOptions.enabled,
          cellSizePx: gridOptions.cellSizePx
        }
      }
    };
    return true;
  }

  private draw2DCoordinateTexture(
    context: CanvasRenderingContext2D,
    options: {
      bounds: Babylon2DWorldBounds;
      metrics: StandardCoordinateScreenMetrics;
      textureWidth: number;
      textureHeight: number;
      textureScale: number;
      xTicks: ReturnType<typeof createStandardCoordinateTickModel>;
      yTicks: ReturnType<typeof createStandardCoordinateTickModel>;
      xAxisVisible: boolean;
      yAxisVisible: boolean;
      gridOptions: ResolvedGraphViewportGridOptions;
    }
  ): Babylon2DCoordinateLabelMetadata[] {
    const { metrics } = options;
    const axisStrokeWidth = STANDARD_COORDINATE_UI.axisStrokeWidthPx * metrics.visualScale;
    const arrowLength = STANDARD_COORDINATE_UI.axisArrowLengthPx * metrics.visualScale;
    const arrowHalfHeight = STANDARD_COORDINATE_UI.axisArrowHalfHeightPx * metrics.visualScale;
    const labels: Babylon2DCoordinateLabelMetadata[] = [];

    context.save();
    context.setTransform(1, 0, 0, 1, 0, 0);
    context.clearRect(0, 0, options.textureWidth, options.textureHeight);
    context.setTransform(options.textureScale, 0, 0, options.textureScale, 0, 0);
    if (options.gridOptions.enabled) {
      this.draw2DGridTexture(context, options.bounds, metrics, options.gridOptions);
    }
    context.strokeStyle = STANDARD_COORDINATE_UI.axisStrokeColor;
    context.fillStyle = STANDARD_COORDINATE_UI.axisStrokeColor;
    context.lineWidth = axisStrokeWidth;
    context.lineCap = 'round';

    if (options.xAxisVisible) {
      context.beginPath();
      context.moveTo(axisStrokeWidth / 2, metrics.origin.y);
      context.lineTo(metrics.width - arrowLength, metrics.origin.y);
      context.stroke();
      drawFilledCanvasTriangle(context, [
        { x: metrics.width, y: metrics.origin.y },
        { x: metrics.width - arrowLength, y: metrics.origin.y - arrowHalfHeight },
        { x: metrics.width - arrowLength, y: metrics.origin.y + arrowHalfHeight }
      ]);
    }

    if (options.yAxisVisible) {
      context.beginPath();
      context.moveTo(metrics.origin.x, metrics.height);
      context.lineTo(metrics.origin.x, arrowLength);
      context.stroke();
      drawFilledCanvasTriangle(context, [
        { x: metrics.origin.x, y: 0 },
        { x: metrics.origin.x - arrowHalfHeight, y: arrowLength },
        { x: metrics.origin.x + arrowHalfHeight, y: arrowLength }
      ]);
    }

    context.fillStyle = STANDARD_COORDINATE_UI.tickLabelColor;
    context.font = scaleCssFont(STANDARD_COORDINATE_UI.tickLabelFont, metrics.visualScale);
    context.textBaseline = 'top';

    if (options.xAxisVisible) {
      context.textAlign = 'center';
      for (const x of options.xTicks.positions) {
        if (isStandardZeroCoordinate(x)) continue;
        const point = project2DWorldToClient({ x, y: 0 }, options.bounds, {
          width: metrics.width,
          height: metrics.height
        });
        const text = formatStandardCoordinateLabel(x);
        const top = metrics.origin.y + STANDARD_COORDINATE_UI.xTickLabelTopOffsetPx * metrics.visualScale;
        context.fillText(text, point.x, top);
        labels.push({ text, axis: 'x', left: point.x, top, visualScale: metrics.visualScale });
      }
      context.textAlign = 'left';
      const left = metrics.width - STANDARD_COORDINATE_UI.xAxisLabelRightInsetPx * metrics.visualScale;
      const top = metrics.origin.y + STANDARD_COORDINATE_UI.xAxisLabelTopOffsetPx * metrics.visualScale;
      context.fillText('x', left, top);
      labels.push({ text: 'x', axis: 'plain', left, top, visualScale: metrics.visualScale });
    }

    if (options.yAxisVisible) {
      context.textAlign = 'left';
      for (const y of options.yTicks.positions) {
        if (isStandardZeroCoordinate(y)) continue;
        const point = project2DWorldToClient({ x: 0, y }, options.bounds, {
          width: metrics.width,
          height: metrics.height
        });
        const text = formatStandardCoordinateLabel(y);
        const left = metrics.origin.x + STANDARD_COORDINATE_UI.yTickLabelLeftOffsetPx * metrics.visualScale;
        const top = point.y + STANDARD_COORDINATE_UI.yTickLabelTopOffsetPx * metrics.visualScale;
        context.fillText(text, left, top);
        labels.push({ text, axis: 'y', left, top, visualScale: metrics.visualScale });
      }
      const left = metrics.origin.x + STANDARD_COORDINATE_UI.yAxisLabelLeftOffsetPx * metrics.visualScale;
      const top = STANDARD_COORDINATE_UI.yAxisLabelTopPx * metrics.visualScale;
      context.fillText('y', left, top);
      labels.push({ text: 'y', axis: 'plain', left, top, visualScale: metrics.visualScale });
    }

    if (options.xAxisVisible && options.yAxisVisible) {
      context.textAlign = 'left';
      const left = metrics.origin.x + STANDARD_COORDINATE_UI.originLabelLeftOffsetPx * metrics.visualScale;
      const top = metrics.origin.y + STANDARD_COORDINATE_UI.originLabelTopOffsetPx * metrics.visualScale;
      context.fillText('O', left, top);
      labels.push({ text: 'O', axis: 'plain', left, top, visualScale: metrics.visualScale });
    }

    context.restore();
    return labels;
  }

  private createHelperLabel(
    text: string,
    position: { left: number; top: number },
    axis: 'x' | 'y' | 'plain',
    visualScale = 1,
    scene?: BabylonSceneLike,
    metrics?: StandardCoordinateScreenMetrics,
    z = BABYLON_2D_COORDINATE_LABEL_Z
  ): void {
    if (scene && metrics && this.createHelperLabelPlane(text, position, axis, visualScale, scene, metrics, z)) return;
    if (!this.labelLayer || typeof document === 'undefined') return;
    const label = document.createElement('div');
    label.textContent = text;
    label.setAttribute('data-vuegraphx-helper-label', 'coordinate');
    Object.assign(label.style, {
      position: 'absolute',
      left: `${position.left}px`,
      top: `${position.top}px`,
      transform: axis === 'x' ? 'translate(-50%, 0)' : 'none',
      color: STANDARD_COORDINATE_UI.tickLabelColor,
      font: scaleCssFont(STANDARD_COORDINATE_UI.tickLabelFont, visualScale),
      lineHeight: `${formatCssNumber(STANDARD_COORDINATE_UI.tickLabelLineHeightPx * visualScale)}px`,
      whiteSpace: 'nowrap',
      textAlign: axis === 'x' ? 'center' : 'left'
    });
    this.labelLayer.appendChild(label);
    this.helperLabels.push(label);
  }

  private createHelperLabelPlane(
    text: string,
    position: { left: number; top: number },
    axis: 'x' | 'y' | 'plain',
    visualScale: number,
    scene: BabylonSceneLike,
    metrics: StandardCoordinateScreenMetrics,
    z: number
  ): boolean {
    const createPlane = this.BABYLON.MeshBuilder.CreatePlane;
    if (!this.BABYLON.DynamicTexture || !createPlane) return false;

    const paddingPx = Math.max(2, 2 * visualScale);
    const textSize = estimateStandardCoordinateLabelPixelSize(text, visualScale);
    const widthPx = textSize.width + paddingPx * 2;
    const heightPx = textSize.height + paddingPx * 2;
    const leftPx = axis === 'x' ? position.left - widthPx / 2 : position.left - paddingPx;
    const topPx = position.top - paddingPx;
    const centerWorld = metrics.clientToWorld({
      x: leftPx + widthPx / 2,
      y: topPx + heightPx / 2
    }, z);
    const topLeftWorld = metrics.clientToWorld({ x: leftPx, y: topPx }, z);
    const bottomRightWorld = metrics.clientToWorld({ x: leftPx + widthPx, y: topPx + heightPx }, z);
    const widthWorld = Math.max(1e-6, Math.abs(bottomRightWorld.x - topLeftWorld.x));
    const heightWorld = Math.max(1e-6, Math.abs(topLeftWorld.y - bottomRightWorld.y));
    const textureScale = 2;
    const texture = new this.BABYLON.DynamicTexture(
      `vuegraphx-coordinate-label-${sanitizeLabelName(text)}-${this.helperMeshes.length}:texture`,
      {
        width: Math.ceil(widthPx * textureScale),
        height: Math.ceil(heightPx * textureScale)
      },
      scene,
      false
    );
    texture.hasAlpha = true;
    texture.drawText(
      text,
      paddingPx * textureScale,
      null,
      scaleCssFont(STANDARD_COORDINATE_UI.tickLabelFont, visualScale * textureScale),
      STANDARD_COORDINATE_UI.tickLabelColor,
      null,
      true,
      true
    );

    const name = `vuegraphx-coordinate-label-${sanitizeLabelName(text)}-${this.helperMeshes.length}`;
    const mesh = createPlane(name, {
      width: widthWorld,
      height: heightWorld,
      sideOrientation: BABYLON_DOUBLE_SIDE
    }, scene);
    mesh.name = name;
    mesh.isPickable = false;
    mesh.metadata = {
      ...(mesh.metadata ?? {}),
      vuegraphxHelperLabel: {
        text,
        axis,
        layer: 'coordinate',
        left: position.left,
        top: position.top,
        visualScale
      }
    };
    mesh.position = new this.BABYLON.Vector3(centerWorld.x, centerWorld.y, z);
    mesh.material = this.createTextMaterial(`${name}:material`, scene, texture, { r: 0, g: 0, b: 0, a: 1 });
    this.helperMeshes.push(mesh);
    return true;
  }

  private createAxisArrowHead(
    axis: 'x' | 'y',
    tip: GraphClientPoint,
    metrics: StandardCoordinateScreenMetrics,
    scene: BabylonSceneLike,
    z: number
  ): void {
    const color = rgbaFromHex(STANDARD_COORDINATE_UI.axisStrokeColor, 1);
    const arrowLength = STANDARD_COORDINATE_UI.axisArrowLengthPx * metrics.visualScale;
    const arrowHalfHeight = STANDARD_COORDINATE_UI.axisArrowHalfHeightPx * metrics.visualScale;
    const createDisc = this.BABYLON.MeshBuilder.CreateDisc;
    if (createDisc) {
      const tipWorld = metrics.clientToWorld(tip, z);
      const baseCenter = axis === 'x'
        ? { x: tip.x - arrowLength, y: tip.y }
        : { x: tip.x, y: tip.y + arrowLength };
      const baseCenterWorld = metrics.clientToWorld(baseCenter, z);
      const arrowWorldLength = Math.hypot(tipWorld.x - baseCenterWorld.x, tipWorld.y - baseCenterWorld.y);
      const radius = (arrowWorldLength * 2) / 3;
      if (Number.isFinite(radius) && radius > 0) {
        const name = `vuegraphx-axis-${axis}-arrow`;
        const mesh = createDisc(name, {
          radius,
          tessellation: 3,
          sideOrientation: BABYLON_DOUBLE_SIDE
        }, scene);
        mesh.name = name;
        mesh.isPickable = false;
        mesh.position = new this.BABYLON.Vector3(
          tipWorld.x - (axis === 'x' ? radius : 0),
          tipWorld.y - (axis === 'y' ? radius : 0),
          z
        );
        mesh.rotation = new this.BABYLON.Vector3(0, 0, axis === 'y' ? Math.PI / 2 : 0);
        mesh.material = this.createMaterial(`${name}:material`, scene, color);
        this.helperMeshes.push(mesh);
        return;
      }
    }

    const starts = axis === 'x'
      ? [
          { x: tip.x - arrowLength, y: tip.y - arrowHalfHeight },
          { x: tip.x - arrowLength, y: tip.y + arrowHalfHeight }
        ]
      : [
          { x: tip.x - arrowHalfHeight, y: tip.y + arrowLength },
          { x: tip.x + arrowHalfHeight, y: tip.y + arrowLength }
        ];
    const tipWorld = metrics.clientToWorld(tip, z);
    starts.forEach((start, index) => {
      this.helperMeshes.push(this.createLineBox({
        name: `vuegraphx-axis-${axis}-arrow-${index + 1}`,
        start: metrics.clientToWorld(start, z),
        end: tipWorld,
        thickness: metrics.strokeWorld,
        scene,
        color,
        metadata: null
      }));
    });
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
    const cameraBounds = this.getVisible2DWorldBounds();
    camera.orthoLeft = cameraBounds.left;
    camera.orthoRight = cameraBounds.right;
    camera.orthoTop = cameraBounds.top;
    camera.orthoBottom = cameraBounds.bottom;
  }

  private getVisible2DWorldBounds(): Babylon2DWorldBounds {
    return fitBoundsToViewportAspect(this.worldBounds, this.viewportSize ?? readCanvasViewportSize(this.canvas));
  }

  private get2DVisualZoomScale(): number {
    return clampVisualZoomScale(this.getRaw2DVisualZoomScale());
  }

  private get2DTextVisualZoomScale(): number {
    // Semantic labels must keep following viewport zoom past helper-UI limits.
    return normalizeVisualZoomScale(this.getRaw2DVisualZoomScale());
  }

  private getRaw2DVisualZoomScale(): number {
    if (this.renderMode !== '2d') return 1;
    const viewportSize = this.viewportSize ?? readCanvasViewportSize(this.canvas);
    const currentBounds = this.getVisible2DWorldBounds();
    const baselineBounds = fitBoundsToViewportAspect(this.visualBaselineWorldBounds, viewportSize);
    return boundsZoomScale(baselineBounds, currentBounds);
  }

  private get2DViewportSize(): GraphViewportSize {
    return this.viewportSize ?? readCanvasViewportSize(this.canvas) ?? { width: 1, height: 1 };
  }

  private get2DWorldUnitsPerPixel(bounds: Babylon2DWorldBounds): number {
    const viewportSize = this.get2DViewportSize();
    return Math.max(
      (bounds.right - bounds.left) / Math.max(1, viewportSize.width),
      (bounds.top - bounds.bottom) / Math.max(1, viewportSize.height)
    );
  }

  private get2DBaselineWorldUnitsPerPixel(): number {
    return this.get2DWorldUnitsPerPixel(
      fitBoundsToViewportAspect(this.visualBaselineWorldBounds, this.get2DViewportSize())
    );
  }

  private refresh2DHelperArtifacts(): void {
    if (this.renderMode === '2d' && this.scene) this.installGridAndAxes();
  }

  private refresh2DObjectLabels(): void {
    if (this.renderMode !== '2d') return;
    for (const stored of this.objects.values()) {
      for (const label of stored.labels) label.remove();
      stored.labels = this.createLabelsForObject(stored.node, stored.handle);
    }
  }

  private createPickWorldPoint(point: BabylonVector3Like): GraphWorldPoint {
    return this.renderMode === '2d'
      ? { dimension: '2d', x: point.x, y: point.y }
      : { dimension: '3d', x: point.x, y: point.y, z: point.z };
  }

  private layerPoint(point: BabylonVector3Like, z: number): BabylonVector3Like {
    return this.renderMode === '2d' ? { x: point.x, y: point.y, z } : point;
  }

  private layerPathPoints(points: BabylonVector3Like[], z: number): BabylonVector3Like[] {
    return points.map((point) => this.layerPoint(point, z));
  }

  private resolve2DLayerZ(handle: GraphRenderHandle, baseZ: number): number {
    if (this.renderMode !== '2d') return baseZ;
    let order = this.object2DLayerOrders.get(handle.id);
    if (order === undefined) {
      order = this.next2DLayerOrder;
      this.next2DLayerOrder += 1;
      this.object2DLayerOrders.set(handle.id, order);
    }
    return baseZ - order * BABYLON_2D_LAYER_Z_STEP;
  }

  private pick2DObjectWithTolerance(point: GraphClientPoint, options: GraphPickOptions = {}): BabylonRuntimePickResult | null {
    const world = this.unproject(point);
    if (!world || world.dimension !== '2d') return null;
    const bounds = this.getVisible2DWorldBounds();
    const worldUnitsPerPixel = this.get2DWorldUnitsPerPixel(bounds);
    const toleranceWorld = (options.tolerancePx ?? 12) * worldUnitsPerPixel;

    for (const stored of [...this.objects.values()].reverse()) {
      if (stored.node.renderHints?.visible === false) continue;
      if (options.layerOrder && !options.layerOrder.includes(stored.handle.layerId)) continue;
      const distance = distanceTo2DNode(stored.node, { x: world.x, y: world.y });
      if (distance !== null && distance <= toleranceWorld + this.readNodeStrokeWorld(stored.node)) {
        return {
          objectId: stored.handle.objectId,
          componentId: proxyComponentForNode(stored.node),
          worldPoint: world,
          distancePx: distance / Math.max(1e-9, worldUnitsPerPixel),
          meta: { pickMode: '2d-tolerance' }
        };
      }
    }

    return null;
  }

  private readNodeStrokeWorld(node: GraphObjectNode): number {
    return this.resolveProxyThickness(node);
  }

  private resolveProxyThickness(node: GraphObjectNode): number {
    const renderHints = asRecord(node.renderHints);
    const strokeWidth = Math.max(
      1,
      readFiniteNumber(renderHints?.strokeWidth) ?? BABYLON_PROXY_BASE_STROKE_WIDTH
    );
    const visualStrokeWidth = isSelectedNode(node) && node.type !== 'coordinate-system' ? strokeWidth * 2 : strokeWidth;
    if (this.renderMode === '2d') {
      return Math.max(0.001, visualStrokeWidth * this.get2DBaselineWorldUnitsPerPixel());
    }
    return BABYLON_PROXY_THICKNESS * (visualStrokeWidth / BABYLON_PROXY_BASE_STROKE_WIDTH);
  }

  private createFlatPathMeshes(options: {
    namePrefix: string;
    points: BabylonVector3Like[];
    thickness: number;
    scene: BabylonSceneLike;
    color: RgbaColor;
    metadata: Record<string, unknown> | null;
    startIndex: number;
  }): { meshes: BabylonMeshLike[]; segmentCount: number } {
    const meshes: BabylonMeshLike[] = [];
    const segments = createPointSegments(options.points);
    let segmentIndex = options.startIndex;

    for (const segment of segments) {
      segmentIndex += 1;
      meshes.push(this.createFlatLinePlane({
        name: `${options.namePrefix}-${segmentIndex}`,
        start: segment.start,
        end: segment.end,
        thickness: options.thickness,
        scene: options.scene,
        color: options.color,
        metadata: options.metadata
      }));
    }

    if (this.BABYLON.MeshBuilder.CreateDisc) {
      const capPrefix = options.namePrefix.replace(':segment', ':cap');
      options.points.forEach((point, pointIndex) => {
        meshes.push(this.createFlatDisc({
          name: `${capPrefix}-${options.startIndex + 1}-${pointIndex + 1}`,
          center: { ...point, z: point.z - BABYLON_2D_JOIN_Z_OFFSET },
          radius: options.thickness / 2,
          scene: options.scene,
          color: options.color,
          metadata: options.metadata
        }));
      });
    }

    return { meshes, segmentCount: segments.length };
  }

  private createFlatLinePlane(options: {
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
    const length = Math.max(0.001, Math.hypot(dx, dy));
    const mesh = this.BABYLON.MeshBuilder.CreatePlane!(options.name, {
      width: length,
      height: options.thickness,
      sideOrientation: BABYLON_DOUBLE_SIDE
    }, options.scene);
    mesh.name = options.name;
    if (!options.metadata) mesh.isPickable = false;
    if (options.metadata) mesh.metadata = { ...(mesh.metadata ?? {}), ...options.metadata };
    mesh.position = new this.BABYLON.Vector3(
      (options.start.x + options.end.x) / 2,
      (options.start.y + options.end.y) / 2,
      (options.start.z + options.end.z) / 2
    );
    mesh.rotation = new this.BABYLON.Vector3(0, 0, Math.atan2(dy, dx));
    mesh.material = this.createFlatMaterial(`${options.name}:material`, options.scene, options.color);
    return mesh;
  }

  private createFlatDisc(options: {
    name: string;
    center: BabylonVector3Like;
    radius: number;
    scene: BabylonSceneLike;
    color: RgbaColor;
    metadata: Record<string, unknown> | null;
  }): BabylonMeshLike {
    const mesh = this.BABYLON.MeshBuilder.CreateDisc!(options.name, {
      radius: Math.max(0.0005, options.radius),
      tessellation: 24,
      sideOrientation: BABYLON_DOUBLE_SIDE
    }, options.scene);
    mesh.name = options.name;
    if (!options.metadata) mesh.isPickable = false;
    if (options.metadata) mesh.metadata = { ...(mesh.metadata ?? {}), ...options.metadata };
    mesh.position = new this.BABYLON.Vector3(options.center.x, options.center.y, options.center.z);
    mesh.material = this.createFlatMaterial(`${options.name}:material`, options.scene, options.color);
    return mesh;
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

  private createFlatMaterial(name: string, scene: BabylonSceneLike, color: RgbaColor): unknown {
    if (!this.BABYLON.StandardMaterial) return undefined;
    const material = new this.BABYLON.StandardMaterial(name, scene);
    const color3 = this.createColor3(color.r, color.g, color.b);
    material.diffuseColor = color3;
    material.emissiveColor = color3;
    material.specularColor = this.createColor3(0, 0, 0);
    material.alpha = color.a;
    material.backFaceCulling = false;
    material.disableLighting = true;
    return material;
  }

  private createTextMaterial(
    name: string,
    scene: BabylonSceneLike,
    texture: BabylonDynamicTextureLike | BabylonTextureLike,
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
    for (const mesh of this.helperMeshes.splice(0)) {
      disposeMaterialLike(mesh.material);
      mesh.dispose();
    }
    for (const label of this.helperLabels.splice(0)) label.remove();
  }

  private disposeCoordinateLayer(): void {
    const layer = this.coordinateLayer;
    if (!layer) return;
    const hadMaterial = Boolean(layer.mesh.material);
    disposeMaterialLike(layer.mesh.material);
    if (!hadMaterial) layer.texture.dispose?.();
    layer.mesh.dispose();
    this.coordinateLayer = null;
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
  const descriptor = resolveGraphTextRenderDescriptor(node);
  if (descriptor) return descriptor.latex ?? descriptor.text;

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

const applyTextToDomLabel = (label: HTMLElement, node: GraphObjectNode): void => {
  const descriptor = resolveGraphTextRenderDescriptor(node);
  if (!descriptor) {
    label.textContent = node.id;
    return;
  }
  if (descriptor.format === 'latex') {
    label.innerHTML = renderLatexHtmlAndMathMl(descriptor);
    return;
  }
  label.textContent = descriptor.text;
};

const renderLatexHtmlAndMathMl = (descriptor: GraphTextRenderDescriptor): string => (
  katex.renderToString(descriptor.latex ?? descriptor.text, {
    displayMode: descriptor.displayMode ?? false,
    output: 'htmlAndMathml',
    throwOnError: false,
    strict: 'ignore',
    trust: false
  })
);

const createLatexTextureSvg = (
  descriptor: GraphTextRenderDescriptor,
  size: { width: number; height: number },
  color: RgbaColor
): string => {
  const fontSize = Math.round(BABYLON_TEXT_TEXTURE_HEIGHT * 0.42);
  const padding = BABYLON_TEXT_TEXTURE_PADDING;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size.width}" height="${size.height}" viewBox="0 0 ${size.width} ${size.height}">
<foreignObject x="0" y="0" width="100%" height="100%">
<div xmlns="http://www.w3.org/1999/xhtml" style="width:100%;height:100%;box-sizing:border-box;display:flex;align-items:center;justify-content:flex-start;padding:${padding}px;background:transparent;border:0;box-shadow:none;color:${rgbaToCss(color)};font:${fontSize}px Arial, sans-serif;overflow:hidden;">
<style><![CDATA[${escapeCdata(KATEX_LAYOUT_CSS)}]]></style>
${renderLatexHtmlAndMathMl(descriptor)}
</div>
</foreignObject>
</svg>`;
};

const ensureKatexStyles = (doc: Document | null): void => {
  if (!doc?.head || doc.getElementById(KATEX_STYLE_ELEMENT_ID)) return;
  const style = doc.createElement('style');
  style.id = KATEX_STYLE_ELEMENT_ID;
  style.textContent = KATEX_LAYOUT_CSS;
  doc.head.appendChild(style);
};

const escapeCdata = (value: string): string => value.replaceAll(']]>', ']]]]><![CDATA[>');

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

const readCanvasViewportSize = (canvas: HTMLCanvasElement | null): GraphViewportSize | null => {
  if (!canvas) return null;
  const width = firstPositiveFiniteNumber(canvas.width, canvas.clientWidth);
  const height = firstPositiveFiniteNumber(canvas.height, canvas.clientHeight);
  return width && height ? { width, height } : null;
};

const fitBoundsToViewportAspect = (
  bounds: Babylon2DWorldBounds,
  viewportSize: GraphViewportSize | null
): Babylon2DWorldBounds => {
  const worldWidth = bounds.right - bounds.left;
  const worldHeight = bounds.top - bounds.bottom;
  if (worldWidth <= 0 || worldHeight <= 0) return bounds;

  const viewportAspect = viewportSize && viewportSize.width > 0 && viewportSize.height > 0
    ? viewportSize.width / viewportSize.height
    : worldWidth / worldHeight;
  if (!Number.isFinite(viewportAspect) || viewportAspect <= 0) return bounds;

  const worldAspect = worldWidth / worldHeight;
  if (Math.abs(worldAspect - viewportAspect) < 1e-9) return bounds;

  const centerX = (bounds.left + bounds.right) / 2;
  const centerY = (bounds.top + bounds.bottom) / 2;
  if (viewportAspect > worldAspect) {
    const fittedWidth = worldHeight * viewportAspect;
    const halfWidth = fittedWidth / 2;
    return {
      left: centerX - halfWidth,
      right: centerX + halfWidth,
      top: bounds.top,
      bottom: bounds.bottom
    };
  }

  const fittedHeight = worldWidth / viewportAspect;
  const halfHeight = fittedHeight / 2;
  return {
    left: bounds.left,
    right: bounds.right,
    top: centerY + halfHeight,
    bottom: centerY - halfHeight
  };
};

const firstPositiveFiniteNumber = (...values: number[]): number | null => {
  for (const value of values) {
    if (Number.isFinite(value) && value > 0) return value;
  }
  return null;
};

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
  if (geometry?.kind === 'coordinate-system') {
    return readCoordinateSystemSegments3D(geometry);
  }
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

const readCoordinateSystemSegments3D = (geometry: Record<string, unknown>): BabylonVector3Like[][] => {
  const segments: BabylonVector3Like[][] = [];
  if (Array.isArray(geometry.segments)) {
    segments.push(...geometry.segments.map(readPointList3D).filter((points) => points.length >= 2));
    return segments;
  }
  if (Array.isArray(geometry.gridSegments)) {
    segments.push(...geometry.gridSegments.map(readPointList3D).filter((points) => points.length >= 2));
  }
  const border = readPointList3D(geometry.border);
  if (border.length >= 2) segments.push(border);
  const xAxis = readPointList3D(geometry.xAxis);
  if (xAxis.length >= 2) segments.push(xAxis);
  const yAxis = readPointList3D(geometry.yAxis);
  if (yAxis.length >= 2) segments.push(yAxis);
  return segments;
};

const readPointList3D = (value: unknown): BabylonVector3Like[] => (
  Array.isArray(value)
    ? value.map((entry) => readVector3(entry) ?? readVector2AsVector3(entry)).filter((point): point is BabylonVector3Like => !!point)
    : []
);

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

const distanceTo2DNode = (node: GraphObjectNode, point: { x: number; y: number }): number | null => {
  const payload = asRecord(node.payload);
  const geometry = asRecord(payload?.geometry);

  if (node.type === 'point' || payload?.point || payload?.position) {
    const anchor = readObjectAnchor(node);
    return Math.hypot(point.x - anchor.x, point.y - anchor.y);
  }

  const coordinateSystemDistance = distanceToCoordinateSystemRegion3D(geometry, point);
  if (coordinateSystemDistance !== null) return coordinateSystemDistance;

  const pathSegments = readRenderablePathSegments(payload, geometry);
  if (pathSegments.length > 0) {
    let minDistance = Number.POSITIVE_INFINITY;
    for (const segmentPoints of pathSegments) {
      const points = node.type === 'polygon' || geometry?.kind === 'polygon'
        ? closePointPath(segmentPoints)
        : segmentPoints;
      for (let index = 1; index < points.length; index += 1) {
        minDistance = Math.min(minDistance, distanceTo2DSegment(point, points[index - 1], points[index]));
      }
    }
    return Number.isFinite(minDistance) ? minDistance : null;
  }

  const anchor = readObjectAnchor(node);
  return Math.hypot(point.x - anchor.x, point.y - anchor.y);
};


const distanceToCoordinateSystemRegion3D = (
  geometry: Record<string, unknown> | null,
  point: { x: number; y: number }
): number | null => {
  if (geometry?.kind !== 'coordinate-system') return null;
  const border = readPointList3D(geometry.border);
  if (border.length >= 3 && pointInPolygon2D(point, border)) return 0;

  const segments = readCoordinateSystemSegments3D(geometry);
  const bounds = boundsForVectorGroups(segments);
  if (bounds && point.x >= bounds.minX && point.x <= bounds.maxX && point.y >= bounds.minY && point.y <= bounds.maxY) return 0;

  let minDistance = Number.POSITIVE_INFINITY;
  for (const segmentPoints of segments) {
    for (let index = 1; index < segmentPoints.length; index += 1) {
      minDistance = Math.min(minDistance, distanceTo2DSegment(point, segmentPoints[index - 1], segmentPoints[index]));
    }
  }
  return Number.isFinite(minDistance) ? minDistance : null;
};

const boundsForVectorGroups = (groups: BabylonVector3Like[][]): { minX: number; maxX: number; minY: number; maxY: number } | null => {
  const points = groups.flat();
  if (points.length === 0) return null;
  return {
    minX: Math.min(...points.map((entry) => entry.x)),
    maxX: Math.max(...points.map((entry) => entry.x)),
    minY: Math.min(...points.map((entry) => entry.y)),
    maxY: Math.max(...points.map((entry) => entry.y))
  };
};

const pointInPolygon2D = (point: { x: number; y: number }, polygon: readonly BabylonVector3Like[]): boolean => {
  let inside = false;
  for (let index = 0, previous = polygon.length - 1; index < polygon.length; previous = index, index += 1) {
    const currentPoint = polygon[index];
    const previousPoint = polygon[previous];
    const crosses = (currentPoint.y > point.y) !== (previousPoint.y > point.y)
      && point.x < ((previousPoint.x - currentPoint.x) * (point.y - currentPoint.y)) / ((previousPoint.y - currentPoint.y) || Number.EPSILON) + currentPoint.x;
    if (crosses) inside = !inside;
  }
  return inside;
};

const distanceTo2DSegment = (
  point: { x: number; y: number },
  start: BabylonVector3Like,
  end: BabylonVector3Like
): number => {
  const dx = end.x - start.x;
  const dy = end.y - start.y;
  const lengthSquared = dx * dx + dy * dy;
  if (lengthSquared <= 1e-12) return Math.hypot(point.x - start.x, point.y - start.y);
  const t = clampNumber(((point.x - start.x) * dx + (point.y - start.y) * dy) / lengthSquared, 0, 1);
  return Math.hypot(point.x - (start.x + t * dx), point.y - (start.y + t * dy));
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

const isSelectedNode = (node: GraphObjectNode): boolean => (
  node.meta?.selected === true || node.renderHints?.selected === true
);

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

const rgbaToCss = (color: RgbaColor): string => (
  `rgba(${Math.round(color.r * 255)}, ${Math.round(color.g * 255)}, ${Math.round(color.b * 255)}, ${color.a})`
);

const drawFilledCanvasTriangle = (
  context: Pick<CanvasRenderingContext2D, 'beginPath' | 'moveTo' | 'lineTo' | 'closePath' | 'fill'>,
  points: Array<{ x: number; y: number }>
): void => {
  if (points.length < 3) return;
  context.beginPath();
  context.moveTo(points[0].x, points[0].y);
  for (const point of points.slice(1)) context.lineTo(point.x, point.y);
  context.closePath();
  context.fill();
};

const rgbaFromHex = (hex: string, alpha: number): RgbaColor => {
  const parsed = parseCssHexColor(hex);
  return parsed ? { ...parsed, a: alpha } : { r: 0.4, g: 0.4, b: 0.4, a: alpha };
};

const project2DWorldToClient = (
  point: { x: number; y: number },
  bounds: Babylon2DWorldBounds,
  viewportSize: GraphViewportSize | null
): GraphClientPoint => {
  const width = Math.max(1, viewportSize?.width ?? 1);
  const height = Math.max(1, viewportSize?.height ?? 1);
  return {
    x: ((point.x - bounds.left) / Math.max(1e-9, bounds.right - bounds.left)) * width,
    y: ((bounds.top - point.y) / Math.max(1e-9, bounds.top - bounds.bottom)) * height
  };
};

const createStandardCoordinateScreenMetrics = (
  bounds: Babylon2DWorldBounds,
  viewportSize: GraphViewportSize | null,
  visualScale: number
): StandardCoordinateScreenMetrics => {
  const width = Math.max(1, viewportSize?.width ?? 1);
  const height = Math.max(1, viewportSize?.height ?? 1);
  const pixelsPerX = width / Math.max(1e-9, bounds.right - bounds.left);
  const pixelsPerY = height / Math.max(1e-9, bounds.top - bounds.bottom);
  const origin = project2DWorldToClient({ x: 0, y: 0 }, bounds, viewportSize);
  const strokeWorld = Math.max(
    0.006,
    STANDARD_COORDINATE_UI.axisStrokeWidthPx * visualScale * Math.min(1 / pixelsPerX, 1 / pixelsPerY)
  );
  return {
    width,
    height,
    origin,
    visualScale,
    strokeWorld,
    clientToWorld(point: GraphClientPoint, z: number): BabylonVector3Like {
      return unproject2DClientToWorld(point, bounds, viewportSize, z);
    }
  };
};

const boundsZoomScale = (
  baselineBounds: Babylon2DWorldBounds,
  currentBounds: Babylon2DWorldBounds
): number => {
  const baselineWidth = Math.max(1e-9, baselineBounds.right - baselineBounds.left);
  const baselineHeight = Math.max(1e-9, baselineBounds.top - baselineBounds.bottom);
  const currentWidth = Math.max(1e-9, currentBounds.right - currentBounds.left);
  const currentHeight = Math.max(1e-9, currentBounds.top - currentBounds.bottom);
  return Math.min(baselineWidth / currentWidth, baselineHeight / currentHeight);
};

const clampVisualZoomScale = (value: number): number => (
  Number.isFinite(value)
    ? Math.min(BABYLON_MAX_VISUAL_ZOOM_SCALE, Math.max(BABYLON_MIN_VISUAL_ZOOM_SCALE, value))
    : 1
);

const normalizeVisualZoomScale = (value: number): number => (
  Number.isFinite(value) && value > 0 ? value : 1
);

const scaleCssFont = (font: string, visualScale: number): string => (
  font.replace(/(\d+(?:\.\d+)?)px/g, (_match, value: string) => `${formatCssNumber(Number(value) * visualScale)}px`)
);

const createDomLabelTransform = (point: { x: number; y: number }, visualScale: number): string => (
  `translate3d(${formatCssNumber(point.x)}px, ${formatCssNumber(point.y)}px, 0) scale(${formatCssNumber(visualScale)})`
);

const estimateStandardCoordinateLabelPixelSize = (text: string, visualScale: number): { width: number; height: number } => ({
  width: Math.max(6 * visualScale, visualTextLength(text) * 7 * visualScale),
  height: STANDARD_COORDINATE_UI.tickLabelLineHeightPx * visualScale
});

const sanitizeLabelName = (text: string): string => (
  text.trim().replace(/[^a-zA-Z0-9_-]+/g, '_') || 'label'
);

const formatCssNumber = (value: number): string => (
  Number.isFinite(value) ? Number(value.toFixed(3)).toString() : '0'
);

const unproject2DClientToWorld = (
  point: GraphClientPoint,
  bounds: Babylon2DWorldBounds,
  viewportSize: GraphViewportSize | null,
  z = 0
): BabylonVector3Like => {
  const width = Math.max(1, viewportSize?.width ?? 1);
  const height = Math.max(1, viewportSize?.height ?? 1);
  return {
    x: bounds.left + (point.x / width) * (bounds.right - bounds.left),
    y: bounds.top - (point.y / height) * (bounds.top - bounds.bottom),
    z
  };
};

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

const alignCanvasPixel = (value: number, lineWidth: number): number => (
  Number.isFinite(value) ? Math.round(value) + (Math.round(lineWidth) % 2 === 1 ? 0.5 : 0) : 0
);

const formatMeshCoordinate = (value: number): string => (
  Number.isFinite(value) ? Number(value.toFixed(6)).toString() : '0'
);

const clampNumber = (value: number, min: number, max: number): number => (
  Math.min(max, Math.max(min, value))
);

const resolveRenderMode = (value: unknown, fallback: BabylonRenderMode): BabylonRenderMode => (
  value === '2d' || value === '3d' ? value : fallback
);

const readBoolean = (value: unknown): boolean | null => (
  typeof value === 'boolean' ? value : null
);

const readGridInput = (value: unknown): GraphViewportGridInput | undefined => {
  if (typeof value === 'boolean') return value;
  if (typeof value === 'object' && value !== null && !Array.isArray(value)) return value as GraphViewportGridInput;
  return undefined;
};

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

const readStandardCoordinateLabels = (value: unknown): StandardCoordinateLabelModel[] => (
  Array.isArray(value)
    ? value.filter((entry): entry is StandardCoordinateLabelModel => {
      const record = asRecord(entry) as Partial<StandardCoordinateLabelModel> | null;
      const point = asRecord(record?.point);
      return !!record
        && typeof record.text === 'string'
        && (record.axis === 'x' || record.axis === 'y' || record.axis === 'plain')
        && (record.role === 'x-tick' || record.role === 'y-tick' || record.role === 'x-axis' || record.role === 'y-axis' || record.role === 'origin')
        && readFiniteNumber(point?.x) !== undefined
        && readFiniteNumber(point?.y) !== undefined;
    })
    : []
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
