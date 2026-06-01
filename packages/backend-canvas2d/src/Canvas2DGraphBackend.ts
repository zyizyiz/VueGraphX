import katex from 'katex';
import katexCss from 'katex/dist/katex.min.css?raw';
import {
  resolveGraphTextAnchor,
  resolveGraphTextRenderDescriptor,
  type GraphTextRenderDescriptor
} from '@vuegraphx/core';
import type {
  GraphBackendContext,
  GraphBackendHost,
  GraphBackendMountOptions,
  GraphBackendMountResult,
  GraphObjectNode,
  GraphObjectPatch,
  GraphOperationResult,
  GraphRenderHandle,
  GraphViewportSize
} from '@vuegraphx/core';
import {
  createStandardCoordinateTickModel,
  STANDARD_COORDINATE_UI,
  formatStandardCoordinateLabel,
  isStandardZeroCoordinate,
  type StandardCoordinateTickModel
} from '@vuegraphx/core';
import { MemoryGraphBackend, type MemoryGraphBackendOptions } from './memory';

export interface CanvasWorldBounds {
  left: number;
  top: number;
  right: number;
  bottom: number;
}

export interface Canvas2DGraphBackendOptions extends MemoryGraphBackendOptions {
  canvas?: HTMLCanvasElement;
  context?: CanvasRenderingContext2D;
  pixelRatio?: number;
  worldBounds?: CanvasWorldBounds;
  showAxes?: boolean;
  preserveAspectRatio?: boolean;
}

interface CanvasDrawablePayload {
  point?: { x: number; y: number };
  text?: string;
  points?: Array<{ x: number; y: number }>;
  vertex?: { x: number; y: number };
  radians?: number;
  geometry?: {
    kind?: string;
    center?: { x: number; y: number };
    radius?: number;
    radiusX?: number;
    radiusY?: number;
    rotationRadians?: number;
    startAngle?: number;
    endAngle?: number;
    vertices?: Array<{ x: number; y: number }>;
    points?: Array<{ x: number; y: number }>;
    segments?: Array<Array<{ x: number; y: number }>>;
    start?: { x: number; y: number };
    end?: { x: number; y: number };
    point?: { x: number; y: number };
    origin?: { x: number; y: number };
    direction?: { x: number; y: number };
  };
  start?: { x: number; y: number };
  end?: { x: number; y: number };
  measurementKind?: string;
  value?: number;
}

interface CanvasTextLayout {
  descriptor: GraphTextRenderDescriptor;
  point: { x: number; y: number };
}

type BackendSupportStatus = 'success' | 'unsupported' | 'partial-support';

const CANVAS2D_SUPPORTED_TYPES = new Set([
  'point',
  'text',
  'angle',
  'circle',
  'arc',
  'sector',
  'semicircle',
  'polygon',
  'segment',
  'line',
  'ray',
  'polyline',
  'function',
  'vector',
  'measurement',
  'midpoint',
  'intersection',
  'perpendicular-line',
  'parallel-line',
  'tangent',
  'translated',
  'rotated',
  'conic',
  'equation',
  'solid',
  'parametric'
]);
const CANVAS2D_PARTIAL_TYPES = new Set<string>();
const CANVAS2D_MIN_VISUAL_ZOOM_SCALE = 0.25;
const CANVAS2D_MAX_VISUAL_ZOOM_SCALE = 8;
const KATEX_STYLE_ELEMENT_ID = 'vuegraphx-katex-style';
const KATEX_LAYOUT_CSS = katexCss.replace(/@font-face\{[^}]*\}/g, '');

const getBaseCanvas2DSupportStatus = (node: GraphObjectNode): BackendSupportStatus => {
  if (node.type === 'implicit') {
    return isDrawableCanvas2DNode(node) ? 'success' : 'unsupported';
  }
  if (CANVAS2D_SUPPORTED_TYPES.has(node.type)) {
    return isDrawableCanvas2DNode(node) ? 'success' : 'partial-support';
  }
  if (CANVAS2D_PARTIAL_TYPES.has(node.type)) return 'partial-support';
  return 'unsupported';
};

const getCanvas2DSupportStatus = (
  node: GraphObjectNode,
  options: { canRenderLatexDom: boolean }
): BackendSupportStatus => {
  const status = getBaseCanvas2DSupportStatus(node);
  if (status !== 'success') return status;
  return requiresCanvasDomTextRendering(node) && !options.canRenderLatexDom
    ? 'partial-support'
    : status;
};

const requiresCanvasDomTextRendering = (node: GraphObjectNode): boolean => {
  if (!(node.type === 'text' || node.type === 'measurement')) return false;
  const layout = readCanvasTextLayout(node);
  return layout?.descriptor.format === 'latex';
};

const isDrawableCanvas2DNode = (node: GraphObjectNode): boolean => {
  const payload = node.payload as CanvasDrawablePayload | undefined;
  if (!payload) return false;
  if (node.type === 'text') return readCanvasTextLayout(node) !== null;
  if (isCanvasPoint(payload.point)) return true;
  if (node.type === 'measurement') {
    if (isCanvasPoint(payload.point)) return true;
    return payload.measurementKind === 'angle'
      && Array.isArray(payload.points)
      && payload.points.filter(isCanvasPoint).length >= 3;
  }
  if (node.type === 'angle') return Array.isArray(payload.points) && payload.points.filter(isCanvasPoint).length >= 3;
  if (isCanvasPoint(payload.start) && isCanvasPoint(payload.end)) return true;

  const geometry = payload.geometry;
  if (!geometry?.kind) return false;
  if (geometry.kind === 'circle') return isCanvasPoint(geometry.center) && isFiniteNumber(geometry.radius);
  if (geometry.kind === 'arc' || geometry.kind === 'sector' || geometry.kind === 'semicircle') {
    return isCanvasPoint(geometry.center) && isCanvasPoint(geometry.start) && isCanvasPoint(geometry.end);
  }
  if (geometry.kind === 'ellipse' || geometry.kind === 'hyperbola') {
    return isCanvasPoint(geometry.center) && isFiniteNumber(geometry.radiusX) && isFiniteNumber(geometry.radiusY);
  }
  if (geometry.kind === 'polygon') return Array.isArray(geometry.vertices) && geometry.vertices.filter(isCanvasPoint).length > 0;
  if (geometry.kind === 'segment') return isCanvasPoint(geometry.start) && isCanvasPoint(geometry.end);
  if (geometry.kind === 'polyline') return Array.isArray(geometry.points) && geometry.points.filter(isCanvasPoint).length > 1;
  if (geometry.kind === 'multiline' || geometry.kind === 'wireframe') {
    return Array.isArray(geometry.segments) && geometry.segments.some((segment) => Array.isArray(segment) && segment.filter(isCanvasPoint).length > 1);
  }
  if (geometry.kind === 'line') return isCanvasPoint(geometry.point) && isCanvasPoint(geometry.direction);
  if (geometry.kind === 'ray') return isCanvasPoint(geometry.origin ?? geometry.point) && isCanvasPoint(geometry.direction);
  return false;
};

const isFiniteNumber = (value: unknown): value is number => typeof value === 'number' && Number.isFinite(value);
const isCanvasPoint = (value: unknown): value is { x: number; y: number } => {
  if (typeof value !== 'object' || value === null) return false;
  const record = value as Record<string, unknown>;
  return isFiniteNumber(record.x) && isFiniteNumber(record.y);
};

const readCanvasTextLayout = (node: GraphObjectNode): CanvasTextLayout | null => {
  const descriptor = resolveGraphTextRenderDescriptor(node);
  const anchor = resolveGraphTextAnchor(node);
  return descriptor && anchor?.dimension === '2d'
    ? { descriptor, point: { x: anchor.x, y: anchor.y } }
    : null;
};

const createBackendSupportDiagnosticResult = (
  backendId: string,
  node: GraphObjectNode,
  status: Exclude<BackendSupportStatus, 'success'>
): GraphOperationResult<GraphRenderHandle> => ({
  ok: false,
  diagnostics: [{
    code: status === 'partial-support' ? 'backend.partial-support' : 'backend.unsupported-object',
    message: `Backend ${backendId} reports ${status} for object ${node.id} (${node.type}).`,
    severity: status === 'partial-support' ? 'warning' : 'error',
    target: {
      scope: 'object',
      objectId: node.id,
      backendId,
      layerId: node.layerId ?? 'content'
    }
  }]
});

export class Canvas2DGraphBackend extends MemoryGraphBackend {
  private canvas: HTMLCanvasElement | null;
  private context: CanvasRenderingContext2D | null = null;
  private labelLayer: HTMLDivElement | null = null;
  private readonly providedContext: CanvasRenderingContext2D | null;
  private pixelRatio: number;
  private worldBounds: CanvasWorldBounds | null;
  private visualBaselineWorldBounds: CanvasWorldBounds | null;
  private readonly showAxes: boolean;
  private readonly preserveAspectRatio: boolean;

  public constructor(options: Canvas2DGraphBackendOptions = {}) {
    super({ id: options.id ?? 'canvas2d', capabilities: { dimensions: ['2d'], ...(options.capabilities ?? {}) } });
    this.canvas = options.canvas ?? null;
    this.providedContext = options.context ?? null;
    this.context = this.providedContext;
    this.pixelRatio = options.pixelRatio ?? 1;
    this.worldBounds = options.worldBounds ?? null;
    this.visualBaselineWorldBounds = this.worldBounds ? { ...this.worldBounds } : null;
    this.showAxes = options.showAxes ?? true;
    this.preserveAspectRatio = options.preserveAspectRatio ?? false;
  }

  public override mount(host: GraphBackendHost, options: GraphBackendMountOptions = {}): GraphBackendMountResult {
    const hostElement = resolveHostElement(host);
    const worldBounds = readWorldBounds(options.attributes?.worldBounds);
    if (worldBounds) {
      this.worldBounds = worldBounds;
      this.visualBaselineWorldBounds = { ...worldBounds };
    } else if (this.worldBounds && !this.visualBaselineWorldBounds) {
      this.visualBaselineWorldBounds = { ...this.worldBounds };
    }
    if (!this.canvas) {
      if (!hostElement) {
        throw new Error('Canvas2DGraphBackend requires an HTMLElement host or a canvas option.');
      }
      this.canvas = document.createElement('canvas');
      hostElement.appendChild(this.canvas);
    } else if (hostElement && !this.canvas.parentElement && hostElement !== this.canvas) {
      hostElement.appendChild(this.canvas);
    }
    const labelHost = hostElement && hostElement !== this.canvas ? hostElement : this.canvas.parentElement;
    if (labelHost) this.installLabelLayer(labelHost);
    this.context = this.providedContext ?? getCanvasContext(this.canvas);
    const result = super.mount(host, options);
    if (options.size) this.resize(options.size);
    return result;
  }

  public override create(node: GraphObjectNode, context: GraphBackendContext = {}): GraphOperationResult<GraphRenderHandle> {
    const status = getCanvas2DSupportStatus(node, { canRenderLatexDom: !!this.labelLayer });
    if (status !== 'success') {
      return createBackendSupportDiagnosticResult(this.id, node, status);
    }
    const result = super.create(node, context);
    if (result.ok) this.flush();
    return result;
  }

  public override update(handle: GraphRenderHandle, patch: GraphObjectPatch, context: GraphBackendContext = {}): void {
    super.update(handle, patch, context);
    this.flush();
  }

  public override remove(handle: GraphRenderHandle): void {
    super.remove(handle);
    this.flush();
  }

  public override resize(size: GraphViewportSize): void {
    super.resize(size);
    if (!this.canvas) return;
    const ratio = this.pixelRatio;
    this.canvas.width = Math.max(1, Math.round(size.width * ratio));
    this.canvas.height = Math.max(1, Math.round(size.height * ratio));
    this.canvas.style.width = `${size.width}px`;
    this.canvas.style.height = `${size.height}px`;
    this.context = this.providedContext ?? getCanvasContext(this.canvas);
    if (this.context && ratio !== 1) this.context.setTransform(ratio, 0, 0, ratio, 0, 0);
    this.flush();
  }

  public override clear(): void {
    super.clear();
    this.flush();
  }

  public setWorldBounds(bounds: CanvasWorldBounds): void {
    if (!this.visualBaselineWorldBounds) this.visualBaselineWorldBounds = { ...bounds };
    this.worldBounds = { ...bounds };
    this.flush();
  }

  public getWorldBounds(): CanvasWorldBounds | null {
    return this.worldBounds ? { ...this.worldBounds } : null;
  }

  public override flush(): void {
    if (!this.context || !this.canvas) return;
    const width = this.canvas.width / this.pixelRatio;
    const height = this.canvas.height / this.pixelRatio;
    this.context.clearRect(0, 0, width, height);
    this.labelLayer?.replaceChildren();
    this.drawAxes(width, height);
    for (const node of this.listNodes()) {
      this.drawNode(node);
    }
  }

  public override pick(point: { x: number; y: number }, options: Parameters<MemoryGraphBackend['pick']>[1] = {}) {
    if (!this.worldBounds) return super.pick(point, options);
    const worldPoint = this.unproject(point);
    if (!worldPoint || worldPoint.dimension !== '2d') return null;
    const scale = this.getWorldScale();
    const worldTolerance = (options.tolerancePx ?? 8) / Math.max(1e-6, Math.min(scale.x, scale.y));
    const result = super.pick({ x: worldPoint.x, y: worldPoint.y }, { ...options, tolerancePx: worldTolerance });
    return result ? { ...result, clientPoint: { ...point } } : null;
  }

  public override project(point: { dimension: '2d' | '3d'; x: number; y: number }): { x: number; y: number } | null {
    return this.projectPoint(point);
  }

  public override unproject(point: { x: number; y: number }): { dimension: '2d'; x: number; y: number } | null {
    if (!this.worldBounds || !this.canvas) return { dimension: '2d', x: point.x, y: point.y };
    const width = this.canvas.width / this.pixelRatio;
    const height = this.canvas.height / this.pixelRatio;
    const { left, right, top, bottom } = this.getVisibleWorldBoundsForSize(width, height) ?? this.worldBounds;
    return {
      dimension: '2d',
      x: left + (point.x / Math.max(1, width)) * (right - left),
      y: top - (point.y / Math.max(1, height)) * (top - bottom)
    };
  }

  public override destroy(): void {
    super.destroy();
    this.labelLayer?.remove();
    this.canvas?.remove();
    this.canvas = null;
    this.context = null;
    this.labelLayer = null;
  }

  private drawNode(node: GraphObjectNode): void {
    if (!this.context) return;
    if (node.renderHints?.visible === false) return;
    const payload = node.payload as CanvasDrawablePayload;
    const selected = isSelectedNode(node);
    const visualScale = this.getVisualZoomScale();
    const strokeColor = readString(node.renderHints?.strokeColor, '#1f6feb');
    const fillColor = readString(node.renderHints?.fillColor, 'rgba(31, 111, 235, 0.15)');
    const baseStrokeWidth = readNumber(node.renderHints?.strokeWidth, 2);
    const strokeWidth = (selected ? resolveSelectedStrokeWidth(baseStrokeWidth) : baseStrokeWidth) * visualScale;
    this.context.save();
    this.context.strokeStyle = strokeColor;
    this.context.fillStyle = fillColor;
    this.context.lineWidth = strokeWidth;
    this.context.lineCap = 'round';
    this.context.lineJoin = 'round';
    const dash = readNumber(node.renderHints?.dash, 0);
    if (dash > 0) this.context.setLineDash([dash * 4 * visualScale, dash * 3 * visualScale]);

    if (node.type === 'text') {
      const layout = readCanvasTextLayout(node);
      if (layout) this.drawText(layout, node);
      this.context.restore();
      return;
    }

    if (node.type === 'measurement') {
      const layout = readCanvasTextLayout(node);
      if (layout?.descriptor.format === 'latex') {
        this.drawText(layout, node);
        this.context.restore();
        return;
      }
      if (payload.measurementKind === 'angle' && payload.points && payload.points.length >= 3) {
        this.drawAngle(payload.points);
        this.drawMeasurement(payload);
        this.context.restore();
        return;
      }
      this.drawMeasurement(payload);
      this.context.restore();
      return;
    }

    if (payload.point) {
      const point = this.projectPoint(payload.point);
      if (node.type === 'text' && payload.text) {
        this.context.font = scaleCssFont(readString(node.renderHints?.font, '14px sans-serif'), visualScale);
        this.context.fillText(payload.text, point.x, point.y);
      } else {
        const radius = readNumber(node.renderHints?.radius, 4) * visualScale;
        this.context.beginPath();
        this.context.fillStyle = strokeColor;
        this.context.strokeStyle = strokeColor;
        this.context.lineWidth = Math.max(strokeWidth, 2 * visualScale);
        this.context.arc(point.x, point.y, radius, 0, Math.PI * 2);
        this.context.fill();
        this.context.stroke();
      }
      this.context.restore();
      return;
    }

    if (node.type === 'angle' && payload.points && payload.points.length >= 3) {
      this.drawAngle(payload.points);
      this.context.restore();
      return;
    }

    const geometry = payload.geometry;
    if (geometry?.kind === 'circle' && geometry.center && typeof geometry.radius === 'number') {
      const center = this.projectPoint(geometry.center);
      this.context.beginPath();
      this.context.arc(center.x, center.y, this.projectRadius(geometry.radius), 0, Math.PI * 2);
      this.context.stroke();
    } else if ((geometry?.kind === 'arc' || geometry?.kind === 'sector' || geometry?.kind === 'semicircle') && geometry.center && geometry.start && geometry.end) {
      this.drawArcLike({
        center: geometry.center,
        start: geometry.start,
        end: geometry.end,
        radius: geometry.radius,
        startAngle: geometry.startAngle,
        endAngle: geometry.endAngle
      }, geometry.kind === 'sector');
    } else if (geometry?.kind === 'ellipse' && geometry.center && typeof geometry.radiusX === 'number' && typeof geometry.radiusY === 'number') {
      this.drawEllipse(geometry.center, geometry.radiusX, geometry.radiusY, geometry.rotationRadians ?? 0);
    } else if (geometry?.kind === 'hyperbola' && geometry.center && typeof geometry.radiusX === 'number' && typeof geometry.radiusY === 'number') {
      this.drawHyperbola(geometry.center, geometry.radiusX, geometry.radiusY, geometry.rotationRadians ?? 0);
    } else if (geometry?.kind === 'polygon' && geometry.vertices && geometry.vertices.length > 0) {
      this.drawPointPath(geometry.vertices, true, true);
    } else if (geometry?.kind === 'segment' && geometry.start && geometry.end) {
      this.drawPointPath([geometry.start, geometry.end]);
    } else if (geometry?.kind === 'polyline' && geometry.points && geometry.points.length > 1) {
      this.drawPointPath(geometry.points);
    } else if ((geometry?.kind === 'multiline' || geometry?.kind === 'wireframe') && Array.isArray(geometry.segments)) {
      for (const segment of geometry.segments) {
        if (Array.isArray(segment) && segment.length > 1) this.drawPointPath(segment);
      }
    } else if (geometry?.kind === 'line' && geometry.point && geometry.direction) {
      const endpoints = this.extendLineToBounds(geometry.point, geometry.direction, false);
      if (endpoints) this.drawPointPath(endpoints);
    } else if (geometry?.kind === 'ray' && (geometry.origin || geometry.point) && geometry.direction) {
      const endpoints = this.extendLineToBounds(geometry.origin ?? geometry.point!, geometry.direction, true);
      if (endpoints) this.drawPointPath(endpoints);
    } else if (payload.start && payload.end) {
      node.type === 'vector'
        ? this.drawVector(payload.start, payload.end)
        : this.drawPointPath([payload.start, payload.end]);
    }

    this.context.restore();
  }

  private drawAxes(width: number, height: number): void {
    if (!this.context || !this.worldBounds || !this.showAxes) return;
    const bounds = this.getVisibleWorldBoundsForSize(width, height) ?? this.worldBounds;
    const { left, right, top, bottom } = bounds;
    const origin = this.projectPoint({ x: 0, y: 0 });
    const xAxisVisible = bottom <= 0 && top >= 0;
    const yAxisVisible = left <= 0 && right >= 0;
    const xAxisY = origin.y;
    const yAxisX = origin.x;
    const visualScale = this.getVisualZoomScale();
    const xTicks = createStandardCoordinateTickModel(left, right, width / visualScale);
    const yTicks = createStandardCoordinateTickModel(bottom, top, height / visualScale);

    this.context.save();
    this.drawStandardCoordinateAxes({
      xTicks,
      yTicks,
      width,
      height,
      xAxisY,
      yAxisX,
      xAxisVisible,
      yAxisVisible,
      visualScale
    });
    this.context.restore();
  }

  private drawStandardCoordinateAxes(options: {
    xTicks: StandardCoordinateTickModel;
    yTicks: StandardCoordinateTickModel;
    width: number;
    height: number;
    xAxisY: number;
    yAxisX: number;
    xAxisVisible: boolean;
    yAxisVisible: boolean;
    visualScale: number;
  }): void {
    if (!this.context) return;
    const axisStrokeWidth = STANDARD_COORDINATE_UI.axisStrokeWidthPx * options.visualScale;
    const arrowLength = STANDARD_COORDINATE_UI.axisArrowLengthPx * options.visualScale;
    const arrowHalfHeight = STANDARD_COORDINATE_UI.axisArrowHalfHeightPx * options.visualScale;
    this.context.save();
    this.context.strokeStyle = STANDARD_COORDINATE_UI.axisStrokeColor;
    this.context.fillStyle = STANDARD_COORDINATE_UI.axisStrokeColor;
    this.context.lineWidth = axisStrokeWidth;
    this.context.lineCap = 'round';

    if (options.xAxisVisible) {
      this.context.beginPath();
      this.context.moveTo(axisStrokeWidth / 2, options.xAxisY);
      this.context.lineTo(options.width - arrowLength, options.xAxisY);
      this.context.stroke();
      this.drawFilledArrowHead([
        { x: options.width, y: options.xAxisY },
        { x: options.width - arrowLength, y: options.xAxisY - arrowHalfHeight },
        { x: options.width - arrowLength, y: options.xAxisY + arrowHalfHeight }
      ]);
    }

    if (options.yAxisVisible) {
      this.context.beginPath();
      this.context.moveTo(options.yAxisX, options.height);
      this.context.lineTo(options.yAxisX, arrowLength);
      this.context.stroke();
      this.drawFilledArrowHead([
        { x: options.yAxisX, y: 0 },
        { x: options.yAxisX - arrowHalfHeight, y: arrowLength },
        { x: options.yAxisX + arrowHalfHeight, y: arrowLength }
      ]);
    }

    this.context.fillStyle = STANDARD_COORDINATE_UI.tickLabelColor;
    this.context.font = scaleCssFont(STANDARD_COORDINATE_UI.tickLabelFont, options.visualScale);
    this.context.textBaseline = 'top';

    if (options.xAxisVisible) {
      this.context.textAlign = 'center';
      for (const x of options.xTicks.positions) {
        if (isStandardZeroCoordinate(x)) continue;
        const point = this.projectPoint({ x, y: 0 });
        this.context.fillText(
          formatStandardCoordinateLabel(x),
          point.x,
          options.xAxisY + STANDARD_COORDINATE_UI.xTickLabelTopOffsetPx * options.visualScale
        );
      }
      this.context.textAlign = 'left';
      this.context.fillText(
        'x',
        options.width - STANDARD_COORDINATE_UI.xAxisLabelRightInsetPx * options.visualScale,
        options.xAxisY + STANDARD_COORDINATE_UI.xAxisLabelTopOffsetPx * options.visualScale
      );
    }

    if (options.yAxisVisible) {
      this.context.textAlign = 'left';
      for (const y of options.yTicks.positions) {
        if (isStandardZeroCoordinate(y)) continue;
        const point = this.projectPoint({ x: 0, y });
        this.context.fillText(
          formatStandardCoordinateLabel(y),
          options.yAxisX + STANDARD_COORDINATE_UI.yTickLabelLeftOffsetPx * options.visualScale,
          point.y + STANDARD_COORDINATE_UI.yTickLabelTopOffsetPx * options.visualScale
        );
      }
      this.context.fillText(
        'y',
        options.yAxisX + STANDARD_COORDINATE_UI.yAxisLabelLeftOffsetPx * options.visualScale,
        STANDARD_COORDINATE_UI.yAxisLabelTopPx * options.visualScale
      );
    }

    if (options.xAxisVisible && options.yAxisVisible) {
      this.context.textAlign = 'left';
      this.context.fillText(
        'O',
        options.yAxisX + STANDARD_COORDINATE_UI.originLabelLeftOffsetPx * options.visualScale,
        options.xAxisY + STANDARD_COORDINATE_UI.originLabelTopOffsetPx * options.visualScale
      );
    }
    this.context.restore();
  }

  private drawFilledArrowHead(points: Array<{ x: number; y: number }>): void {
    if (!this.context) return;
    this.context.beginPath();
    this.context.moveTo(points[0].x, points[0].y);
    for (const point of points.slice(1)) this.context.lineTo(point.x, point.y);
    this.context.closePath();
    this.context.fill();
  }

  private installLabelLayer(host: HTMLElement): void {
    if (typeof document === 'undefined') return;
    if (globalThis.getComputedStyle?.(host).position === 'static') {
      host.style.position = 'relative';
    }
    this.labelLayer?.remove();
    this.labelLayer = document.createElement('div');
    this.labelLayer.setAttribute('data-vuegraphx-canvas2d-label-layer', 'true');
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

  private drawPointPath(points: Array<{ x: number; y: number }>, close = false, fill = false): void {
    if (!this.context || points.length === 0) return;
    const first = this.projectPoint(points[0]);
    const strokeStyle = this.context.strokeStyle;
    const lineWidth = this.context.lineWidth;
    const drawPath = () => {
      this.context!.beginPath();
      this.context!.moveTo(first.x, first.y);
      for (const point of points.slice(1)) {
        const projected = this.projectPoint(point);
        this.context!.lineTo(projected.x, projected.y);
      }
      if (close) this.context!.closePath();
    };

    this.context.strokeStyle = strokeStyle;
    this.context.lineWidth = lineWidth;
    drawPath();
    if (fill) this.context.fill();
    this.context.stroke();
  }

  private drawAngle(points: Array<{ x: number; y: number }>): void {
    if (!this.context || points.length < 3) return;
    const [first, vertex, third] = points;
    const vertexScreen = this.projectPoint(vertex);
    const firstScreen = this.projectPoint(first);
    const thirdScreen = this.projectPoint(third);
    const firstAngle = Math.atan2(firstScreen.y - vertexScreen.y, firstScreen.x - vertexScreen.x);
    const thirdAngle = Math.atan2(thirdScreen.y - vertexScreen.y, thirdScreen.x - vertexScreen.x);
    const visualScale = this.getVisualZoomScale();
    const radius = Math.min(
      48 * visualScale,
      Math.max(
        18 * visualScale,
        Math.min(
          Math.hypot(firstScreen.x - vertexScreen.x, firstScreen.y - vertexScreen.y),
          Math.hypot(thirdScreen.x - vertexScreen.x, thirdScreen.y - vertexScreen.y)
        ) * 0.32
      )
    );

    this.context.globalAlpha = 0.35;
    this.context.beginPath();
    this.context.moveTo(vertexScreen.x, vertexScreen.y);
    this.context.lineTo(firstScreen.x, firstScreen.y);
    this.context.moveTo(vertexScreen.x, vertexScreen.y);
    this.context.lineTo(thirdScreen.x, thirdScreen.y);
    this.context.stroke();

    this.context.globalAlpha = 1;
    this.context.beginPath();
    this.context.arc(vertexScreen.x, vertexScreen.y, radius, firstAngle, thirdAngle);
    this.context.stroke();
  }

  private drawText(layout: CanvasTextLayout, node: GraphObjectNode): void {
    if (!this.context) return;
    if (layout.descriptor.format === 'latex') {
      if (this.labelLayer && this.canvas) this.drawDomTextLabel(layout, node);
      return;
    }

    const point = this.projectPoint(layout.point);
    const visualScale = this.getTextVisualZoomScale();
    const text = layout.descriptor.latex ?? layout.descriptor.text;
    this.drawScaledTextAt(text, point, {
      font: readString(node.renderHints?.font, '600 14px/1.25 Arial, "Microsoft YaHei", "PingFang SC", sans-serif'),
      visualScale,
      fillStyle: readString(node.renderHints?.textColor, readString(node.renderHints?.strokeColor, '#0f172a')),
      alpha: readNumber(node.renderHints?.textOpacity, 1)
    });
  }

  private drawDomTextLabel(layout: CanvasTextLayout, node: GraphObjectNode): void {
    if (!this.labelLayer || !this.canvas) return;
    const point = this.projectPoint(layout.point);
    const label = document.createElement('div');
    const visualScale = this.getTextVisualZoomScale();
    label.setAttribute('data-vuegraphx-object-id', node.id);
    label.innerHTML = renderLatexHtmlAndMathMl(layout.descriptor);
    Object.assign(label.style, {
      position: 'absolute',
      left: '0',
      top: '0',
      transform: createDomLabelTransform(point, visualScale),
      transformOrigin: '0 0',
      color: readString(node.renderHints?.strokeColor, '#0f172a'),
      background: 'transparent',
      border: '0',
      borderRadius: '0',
      padding: '0',
      font: readString(node.renderHints?.font, '600 14px/1.25 Arial, "Microsoft YaHei", "PingFang SC", sans-serif'),
      whiteSpace: 'nowrap',
      opacity: '1',
      textShadow: 'none',
      boxShadow: 'none',
      contain: 'layout paint style',
      willChange: 'transform',
      pointerEvents: 'none'
    });
    this.labelLayer.appendChild(label);
  }

  private drawMeasurement(payload: CanvasDrawablePayload): void {
    if (!this.context || !payload.point) return;
    const point = this.projectPoint(payload.point);
    const label = payload.text ?? `${payload.measurementKind ?? 'measure'}: ${formatNumber(payload.value)}`;
    const visualScale = this.getTextVisualZoomScale();
    this.drawScaledTextAt(label, { x: point.x + 8, y: point.y - 8 }, {
      font: '12px sans-serif',
      visualScale,
      fillStyle: '#334155'
    });
  }

  private drawScaledTextAt(
    text: string,
    point: { x: number; y: number },
    options: {
      font: string;
      visualScale: number;
      fillStyle: string;
      alpha?: number;
      textAlign?: CanvasTextAlign;
      textBaseline?: CanvasTextBaseline;
    }
  ): void {
    if (!this.context) return;
    this.context.save();
    this.context.translate(point.x, point.y);
    this.context.scale(options.visualScale, options.visualScale);
    this.context.font = options.font;
    this.context.textAlign = options.textAlign ?? 'left';
    this.context.textBaseline = options.textBaseline ?? 'top';
    this.context.fillStyle = options.fillStyle;
    this.context.globalAlpha = options.alpha ?? 1;
    this.context.fillText(text, 0, 0);
    this.context.restore();
  }

  private drawEllipse(centerPoint: { x: number; y: number }, radiusX: number, radiusY: number, rotationRadians: number): void {
    if (!this.context) return;
    const center = this.projectPoint(centerPoint);
    const scale = this.getWorldScale();
    this.context.beginPath();
    this.context.ellipse(
      center.x,
      center.y,
      Math.abs(radiusX * scale.x),
      Math.abs(radiusY * scale.y),
      -rotationRadians,
      0,
      Math.PI * 2
    );
    this.context.stroke();
  }

  private drawHyperbola(centerPoint: { x: number; y: number }, radiusX: number, radiusY: number, rotationRadians: number): void {
    if (!this.context) return;
    const branches = [-1, 1].map((side) => {
      const points: Array<{ x: number; y: number }> = [];
      for (let index = 0; index < 96; index += 1) {
        const t = -2.2 + (4.4 * index) / 95;
        const local = { x: side * radiusX * Math.cosh(t), y: radiusY * Math.sinh(t) };
        points.push(rotateAroundOrigin(local, rotationRadians, centerPoint));
      }
      return points;
    });
    for (const branch of branches) this.drawPointPath(branch);
  }

  private drawVector(startPoint: { x: number; y: number }, endPoint: { x: number; y: number }): void {
    if (!this.context) return;
    this.drawPointPath([startPoint, endPoint]);
    const start = this.projectPoint(startPoint);
    const end = this.projectPoint(endPoint);
    const angle = Math.atan2(end.y - start.y, end.x - start.x);
    const size = 10 * this.getVisualZoomScale();
    this.context.beginPath();
    this.context.moveTo(end.x, end.y);
    this.context.lineTo(end.x - size * Math.cos(angle - Math.PI / 6), end.y - size * Math.sin(angle - Math.PI / 6));
    this.context.moveTo(end.x, end.y);
    this.context.lineTo(end.x - size * Math.cos(angle + Math.PI / 6), end.y - size * Math.sin(angle + Math.PI / 6));
    this.context.stroke();
  }

  private drawArcLike(
    geometry: {
      center: { x: number; y: number };
      start: { x: number; y: number };
      end: { x: number; y: number };
      radius?: number;
      startAngle?: number;
      endAngle?: number;
    },
    fillSector: boolean
  ): void {
    if (!this.context) return;
    const center = this.projectPoint(geometry.center);
    const start = this.projectPoint(geometry.start);
    const end = this.projectPoint(geometry.end);
    const radius = Math.max(0, Math.hypot(start.x - center.x, start.y - center.y));
    const startAngle = Math.atan2(start.y - center.y, start.x - center.x);
    const endAngle = Math.atan2(end.y - center.y, end.x - center.x);

    this.context.beginPath();
    if (fillSector) {
      this.context.moveTo(center.x, center.y);
      this.context.lineTo(start.x, start.y);
    }
    this.context.arc(center.x, center.y, radius, startAngle, endAngle);
    if (fillSector) {
      this.context.closePath();
      this.context.fill();
    }
    this.context.stroke();
  }

  private projectPoint(point: { x: number; y: number }): { x: number; y: number } {
    if (!this.worldBounds || !this.canvas) return { x: point.x, y: point.y };
    const width = this.canvas.width / this.pixelRatio;
    const height = this.canvas.height / this.pixelRatio;
    const { left, right, top, bottom } = this.getVisibleWorldBoundsForSize(width, height) ?? this.worldBounds;
    return {
      x: ((point.x - left) / (right - left)) * width,
      y: ((top - point.y) / (top - bottom)) * height
    };
  }

  private projectRadius(radius: number): number {
    if (!this.worldBounds) return radius;
    const scale = this.getWorldScale();
    return radius * Math.min(scale.x, scale.y);
  }

  private getWorldScale(): { x: number; y: number } {
    if (!this.worldBounds || !this.canvas) return { x: 1, y: 1 };
    const width = this.canvas.width / this.pixelRatio;
    const height = this.canvas.height / this.pixelRatio;
    const bounds = this.getVisibleWorldBoundsForSize(width, height) ?? this.worldBounds;
    return {
      x: width / Math.max(1e-6, Math.abs(bounds.right - bounds.left)),
      y: height / Math.max(1e-6, Math.abs(bounds.top - bounds.bottom))
    };
  }

  private getVisualZoomScale(): number {
    return clampVisualZoomScale(this.getRawVisualZoomScale());
  }

  private getTextVisualZoomScale(): number {
    // Semantic labels must keep following viewport zoom past helper-UI limits.
    return normalizeVisualZoomScale(this.getRawVisualZoomScale());
  }

  private getRawVisualZoomScale(): number {
    if (!this.worldBounds || !this.visualBaselineWorldBounds || !this.canvas) return 1;
    const width = this.canvas.width / this.pixelRatio;
    const height = this.canvas.height / this.pixelRatio;
    const currentBounds = this.getVisibleWorldBoundsForSize(width, height) ?? this.worldBounds;
    const baselineBounds = this.preserveAspectRatio
      ? fitCanvasBoundsToViewportAspect(this.visualBaselineWorldBounds, { width, height })
      : this.visualBaselineWorldBounds;
    const currentScale = pixelsPerWorldUnit(currentBounds, { width, height });
    const baselineScale = pixelsPerWorldUnit(baselineBounds, { width, height });
    const scale = Math.min(
      currentScale.x / Math.max(1e-9, baselineScale.x),
      currentScale.y / Math.max(1e-9, baselineScale.y)
    );
    return scale;
  }

  private getVisibleWorldBoundsForSize(width: number, height: number): CanvasWorldBounds | null {
    if (!this.worldBounds) return null;
    return this.preserveAspectRatio
      ? fitCanvasBoundsToViewportAspect(this.worldBounds, { width, height })
      : this.worldBounds;
  }

  private extendLineToBounds(
    point: { x: number; y: number },
    direction: { x: number; y: number },
    ray: boolean
  ): Array<{ x: number; y: number }> | null {
    const bounds = this.getVisibleWorldBoundsForSize(
      this.canvas ? this.canvas.width / this.pixelRatio : 0,
      this.canvas ? this.canvas.height / this.pixelRatio : 0
    ) ?? this.worldBounds ?? { left: -1000, right: 1000, top: 1000, bottom: -1000 };
    const length = Math.max(Math.abs(bounds.right - bounds.left), Math.abs(bounds.top - bounds.bottom)) * 2;
    const magnitude = Math.hypot(direction.x, direction.y);
    if (magnitude <= 1e-9) return null;
    const unit = { x: direction.x / magnitude, y: direction.y / magnitude };
    return ray
      ? [point, { x: point.x + unit.x * length, y: point.y + unit.y * length }]
      : [
          { x: point.x - unit.x * length, y: point.y - unit.y * length },
          { x: point.x + unit.x * length, y: point.y + unit.y * length }
        ];
  }
}

const readString = (value: unknown, fallback: string): string => typeof value === 'string' ? value : fallback;
const readNumber = (value: unknown, fallback: number): number => typeof value === 'number' && Number.isFinite(value) ? value : fallback;
const clampVisualZoomScale = (value: number): number => (
  Number.isFinite(value)
    ? Math.min(CANVAS2D_MAX_VISUAL_ZOOM_SCALE, Math.max(CANVAS2D_MIN_VISUAL_ZOOM_SCALE, value))
    : 1
);
const normalizeVisualZoomScale = (value: number): number => (
  Number.isFinite(value) && value > 0 ? value : 1
);
const pixelsPerWorldUnit = (
  bounds: CanvasWorldBounds,
  viewport: { width: number; height: number }
): { x: number; y: number } => ({
  x: Math.max(1e-9, viewport.width) / Math.max(1e-9, Math.abs(bounds.right - bounds.left)),
  y: Math.max(1e-9, viewport.height) / Math.max(1e-9, Math.abs(bounds.top - bounds.bottom))
});
const scaleCssFont = (font: string, visualScale: number): string => (
  font.replace(/(\d+(?:\.\d+)?)px/g, (_match, value: string) => `${formatCssNumber(Number(value) * visualScale)}px`)
);
const formatCssNumber = (value: number): string => (
  Number.isFinite(value) ? Number(value.toFixed(3)).toString() : '0'
);
const createDomLabelTransform = (point: { x: number; y: number }, visualScale: number): string => (
  `translate3d(${formatCssNumber(point.x)}px, ${formatCssNumber(point.y)}px, 0) scale(${formatCssNumber(visualScale)})`
);
const isSelectedNode = (node: GraphObjectNode): boolean => (
  node.meta?.selected === true || node.renderHints?.selected === true
);

const resolveSelectedStrokeWidth = (strokeWidth: number): number => Math.max(1, strokeWidth) * 2;
const formatNumber = (value: unknown): string => typeof value === 'number' && Number.isFinite(value) ? Number(value.toFixed(3)).toString() : '';
const renderLatexHtmlAndMathMl = (descriptor: GraphTextRenderDescriptor): string => (
  katex.renderToString(descriptor.latex ?? descriptor.text, {
    displayMode: descriptor.displayMode ?? false,
    output: 'htmlAndMathml',
    throwOnError: false,
    strict: 'ignore',
    trust: false
  })
);
const ensureKatexStyles = (doc: Document | null): void => {
  if (!doc?.head || doc.getElementById(KATEX_STYLE_ELEMENT_ID)) return;
  const style = doc.createElement('style');
  style.id = KATEX_STYLE_ELEMENT_ID;
  style.textContent = KATEX_LAYOUT_CSS;
  doc.head.appendChild(style);
};
const rotateAroundOrigin = (point: { x: number; y: number }, radians: number, center: { x: number; y: number }): { x: number; y: number } => {
  const cos = Math.cos(radians);
  const sin = Math.sin(radians);
  return {
    x: center.x + point.x * cos - point.y * sin,
    y: center.y + point.x * sin + point.y * cos
  };
};
const resolveHostElement = (host: GraphBackendHost): HTMLElement | null => {
  if (typeof HTMLElement === 'undefined') return null;
  if (host instanceof HTMLElement) return host;
  if (host.resource instanceof HTMLElement) return host.resource;
  return null;
};
const readWorldBounds = (value: unknown): CanvasWorldBounds | null => {
  if (typeof value !== 'object' || value === null) return null;
  const record = value as Record<string, unknown>;
  const left = record.left;
  const top = record.top;
  const right = record.right;
  const bottom = record.bottom;
  if ([left, top, right, bottom].every((entry) => typeof entry === 'number' && Number.isFinite(entry))) {
    return { left, top, right, bottom } as CanvasWorldBounds;
  }
  return null;
};
const fitCanvasBoundsToViewportAspect = (
  bounds: CanvasWorldBounds,
  viewport: { width: number; height: number }
): CanvasWorldBounds => {
  const worldWidth = bounds.right - bounds.left;
  const worldHeight = bounds.top - bounds.bottom;
  if (worldWidth <= 0 || worldHeight <= 0 || viewport.width <= 0 || viewport.height <= 0) {
    return bounds;
  }

  const viewportAspect = viewport.width / viewport.height;
  if (!Number.isFinite(viewportAspect) || viewportAspect <= 0) return bounds;
  const worldAspect = worldWidth / worldHeight;
  if (Math.abs(worldAspect - viewportAspect) < 1e-9) return bounds;

  const centerX = (bounds.left + bounds.right) / 2;
  const centerY = (bounds.top + bounds.bottom) / 2;
  if (viewportAspect > worldAspect) {
    const halfWidth = (worldHeight * viewportAspect) / 2;
    return {
      left: centerX - halfWidth,
      right: centerX + halfWidth,
      top: bounds.top,
      bottom: bounds.bottom
    };
  }

  const halfHeight = (worldWidth / viewportAspect) / 2;
  return {
    left: bounds.left,
    right: bounds.right,
    top: centerY + halfHeight,
    bottom: centerY - halfHeight
  };
};
const getCanvasContext = (canvas: HTMLCanvasElement): CanvasRenderingContext2D | null => {
  if (typeof navigator !== 'undefined' && /jsdom/i.test(navigator.userAgent)) {
    return null;
  }
  try {
    return canvas.getContext('2d');
  } catch {
    return null;
  }
};

export const createCanvas2DGraphBackend = (options?: Canvas2DGraphBackendOptions): Canvas2DGraphBackend => new Canvas2DGraphBackend(options);
