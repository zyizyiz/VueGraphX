import type {
  GraphBackendContext,
  GraphBackendMountOptions,
  GraphBackendMountResult,
  GraphObjectNode,
  GraphObjectPatch,
  GraphRenderHandle,
  GraphViewportSize
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
  pixelRatio?: number;
  worldBounds?: CanvasWorldBounds;
  showAxes?: boolean;
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
    startAngle?: number;
    endAngle?: number;
    vertices?: Array<{ x: number; y: number }>;
    points?: Array<{ x: number; y: number }>;
    start?: { x: number; y: number };
    end?: { x: number; y: number };
    point?: { x: number; y: number };
    origin?: { x: number; y: number };
    direction?: { x: number; y: number };
  };
  start?: { x: number; y: number };
  end?: { x: number; y: number };
}

export class Canvas2DGraphBackend extends MemoryGraphBackend {
  private canvas: HTMLCanvasElement | null;
  private context: CanvasRenderingContext2D | null = null;
  private pixelRatio: number;
  private worldBounds: CanvasWorldBounds | null;
  private readonly showAxes: boolean;

  public constructor(options: Canvas2DGraphBackendOptions = {}) {
    super({ id: options.id ?? 'canvas2d', capabilities: { dimensions: ['2d'], ...(options.capabilities ?? {}) } });
    this.canvas = options.canvas ?? null;
    this.pixelRatio = options.pixelRatio ?? 1;
    this.worldBounds = options.worldBounds ?? null;
    this.showAxes = options.showAxes ?? true;
  }

  public override mount(host: HTMLElement, options: GraphBackendMountOptions = {}): GraphBackendMountResult {
    const worldBounds = readWorldBounds(options.attributes?.worldBounds);
    if (worldBounds) this.worldBounds = worldBounds;
    if (!this.canvas) {
      this.canvas = document.createElement('canvas');
      host.appendChild(this.canvas);
    } else if (!this.canvas.parentElement && host !== this.canvas) {
      host.appendChild(this.canvas);
    }
    this.context = getCanvasContext(this.canvas);
    const result = super.mount(host, options);
    if (options.size) this.resize(options.size);
    return result;
  }

  public override create(node: GraphObjectNode, context: GraphBackendContext = {}): GraphRenderHandle {
    const handle = super.create(node, context);
    this.flush();
    return handle;
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
    this.context = getCanvasContext(this.canvas);
    if (this.context && ratio !== 1) this.context.setTransform(ratio, 0, 0, ratio, 0, 0);
    this.flush();
  }

  public override clear(): void {
    super.clear();
    this.flush();
  }

  public override flush(): void {
    if (!this.context || !this.canvas) return;
    const width = this.canvas.width / this.pixelRatio;
    const height = this.canvas.height / this.pixelRatio;
    this.context.clearRect(0, 0, width, height);
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
    const { left, right, top, bottom } = this.worldBounds;
    return {
      dimension: '2d',
      x: left + (point.x / Math.max(1, width)) * (right - left),
      y: top - (point.y / Math.max(1, height)) * (top - bottom)
    };
  }

  public override destroy(): void {
    super.destroy();
    this.canvas?.remove();
    this.canvas = null;
    this.context = null;
  }

  private drawNode(node: GraphObjectNode): void {
    if (!this.context) return;
    if (node.renderHints?.visible === false) return;
    const payload = node.payload as CanvasDrawablePayload;
    this.context.save();
    this.context.strokeStyle = readString(node.renderHints?.strokeColor, '#1f6feb');
    this.context.fillStyle = readString(node.renderHints?.fillColor, 'rgba(31, 111, 235, 0.15)');
    this.context.lineWidth = readNumber(node.renderHints?.strokeWidth, 2);

    if (payload.point) {
      const point = this.projectPoint(payload.point);
      if (node.type === 'text' && payload.text) {
        this.context.font = readString(node.renderHints?.font, '14px sans-serif');
        this.context.fillText(payload.text, point.x, point.y);
      } else {
        this.context.beginPath();
        this.context.arc(point.x, point.y, readNumber(node.renderHints?.radius, 4), 0, Math.PI * 2);
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
    } else if (geometry?.kind === 'polygon' && geometry.vertices && geometry.vertices.length > 0) {
      this.drawPointPath(geometry.vertices, true, true);
    } else if (geometry?.kind === 'segment' && geometry.start && geometry.end) {
      this.drawPointPath([geometry.start, geometry.end]);
    } else if (geometry?.kind === 'polyline' && geometry.points && geometry.points.length > 1) {
      this.drawPointPath(geometry.points);
    } else if (geometry?.kind === 'line' && geometry.point && geometry.direction) {
      const endpoints = this.extendLineToBounds(geometry.point, geometry.direction, false);
      if (endpoints) this.drawPointPath(endpoints);
    } else if (geometry?.kind === 'ray' && (geometry.origin || geometry.point) && geometry.direction) {
      const endpoints = this.extendLineToBounds(geometry.origin ?? geometry.point!, geometry.direction, true);
      if (endpoints) this.drawPointPath(endpoints);
    } else if (payload.start && payload.end) {
      this.drawPointPath([payload.start, payload.end]);
    }

    this.context.restore();
  }

  private drawAxes(width: number, height: number): void {
    if (!this.context || !this.worldBounds || !this.showAxes) return;
    const { left, right, top, bottom } = this.worldBounds;
    this.context.save();
    this.context.lineWidth = 1;
    this.context.strokeStyle = 'rgba(148, 163, 184, 0.22)';
    const minX = Math.ceil(left);
    const maxX = Math.floor(right);
    for (let x = minX; x <= maxX; x += 1) {
      const point = this.projectPoint({ x, y: 0 });
      this.context.beginPath();
      this.context.moveTo(point.x, 0);
      this.context.lineTo(point.x, height);
      this.context.stroke();
    }
    const minY = Math.ceil(bottom);
    const maxY = Math.floor(top);
    for (let y = minY; y <= maxY; y += 1) {
      const point = this.projectPoint({ x: 0, y });
      this.context.beginPath();
      this.context.moveTo(0, point.y);
      this.context.lineTo(width, point.y);
      this.context.stroke();
    }

    this.context.strokeStyle = 'rgba(71, 85, 105, 0.42)';
    const origin = this.projectPoint({ x: 0, y: 0 });
    if (left <= 0 && right >= 0) {
      this.context.beginPath();
      this.context.moveTo(origin.x, 0);
      this.context.lineTo(origin.x, height);
      this.context.stroke();
    }
    if (bottom <= 0 && top >= 0) {
      this.context.beginPath();
      this.context.moveTo(0, origin.y);
      this.context.lineTo(width, origin.y);
      this.context.stroke();
    }
    this.context.restore();
  }

  private drawPointPath(points: Array<{ x: number; y: number }>, close = false, fill = false): void {
    if (!this.context || points.length === 0) return;
    const first = this.projectPoint(points[0]);
    this.context.beginPath();
    this.context.moveTo(first.x, first.y);
    for (const point of points.slice(1)) {
      const projected = this.projectPoint(point);
      this.context.lineTo(projected.x, projected.y);
    }
    if (close) this.context.closePath();
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
    const radius = Math.min(
      48,
      Math.max(
        18,
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
    const { left, right, top, bottom } = this.worldBounds;
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
    return {
      x: width / Math.max(1e-6, Math.abs(this.worldBounds.right - this.worldBounds.left)),
      y: height / Math.max(1e-6, Math.abs(this.worldBounds.top - this.worldBounds.bottom))
    };
  }

  private extendLineToBounds(
    point: { x: number; y: number },
    direction: { x: number; y: number },
    ray: boolean
  ): Array<{ x: number; y: number }> | null {
    const bounds = this.worldBounds ?? { left: -1000, right: 1000, top: 1000, bottom: -1000 };
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
