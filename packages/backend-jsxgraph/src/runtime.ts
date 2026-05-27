import * as math from 'mathjs';
import {
  mergeGraphObjectPatch,
  type GraphBackendContext,
  type GraphBackendMountOptions,
  type GraphClientPoint,
  type GraphObjectNode,
  type GraphObjectPatch,
  type GraphPickOptions,
  type GraphPickResult,
  type GraphRenderHandle,
  type GraphViewportRef,
  type GraphViewportSize,
  type GraphWorldPoint
} from '@vuegraphx/core';
import type { JsxGraphRuntimePort } from './JsxGraphBackend';

type JsxGraphElement = {
  id?: string;
  name?: string;
  elType?: string;
  setAttribute?: (attributes: Record<string, unknown>) => void;
};

type JsxGraphBoardLike = {
  create(type: string, args: unknown[], attributes?: Record<string, unknown>): JsxGraphElement | JsxGraphElement[];
  removeObject(element: JsxGraphElement | JsxGraphElement[]): void;
  update?(): void;
  fullUpdate?(): void;
  resizeContainer?(width: number, height: number, emit?: boolean): void;
  getBoundingBox?(): [number, number, number, number];
  containerObj?: HTMLElement;
};

type JsxGraphNamespaceLike = {
  JSXGraph?: {
    initBoard(container: string | HTMLElement, attributes?: Record<string, unknown>): JsxGraphBoardLike;
    freeBoard?(board: JsxGraphBoardLike): void;
  };
  Coords?: new (mode: unknown, point: number[], board: JsxGraphBoardLike) => {
    scrCoords: number[];
    usrCoords: number[];
  };
  COORDS_BY_USER?: unknown;
  COORDS_BY_SCREEN?: unknown;
};

export interface JsxGraphRuntimeCreateElementsEvent {
  node: GraphObjectNode;
  handle: GraphRenderHandle;
  elements: JsxGraphElement[];
}

export interface JsxGraphRuntimeOptions {
  board?: JsxGraphBoardLike;
  boardOptions?: Record<string, unknown>;
  createBoard?: (host: HTMLElement, options: GraphBackendMountOptions) => JsxGraphBoardLike;
  onCreateElements?: (event: JsxGraphRuntimeCreateElementsEvent) => void;
  onRemoveElements?: (event: JsxGraphRuntimeCreateElementsEvent) => void;
}

interface StoredJsxGraphObject {
  node: GraphObjectNode;
  handle: GraphRenderHandle;
  elements: JsxGraphElement[];
}

interface Point2D {
  x: number;
  y: number;
}

const DEFAULT_BOUNDS: [number, number, number, number] = [-10, 10, 10, -10];

export class JsxGraphRuntime implements JsxGraphRuntimePort {
  private board: JsxGraphBoardLike | null;
  private ownsBoard = false;
  private readonly objects = new Map<string, StoredJsxGraphObject>();

  public constructor(
    private readonly JXG: JsxGraphNamespaceLike,
    private readonly options: JsxGraphRuntimeOptions = {}
  ) {
    this.board = options.board ?? null;
  }

  public mount(host: HTMLElement, options: GraphBackendMountOptions = {}): void {
    if (this.board) return;
    this.board = this.options.createBoard?.(host, options)
      ?? this.JXG.JSXGraph?.initBoard(host, {
        axis: true,
        showNavigation: false,
        showCopyright: false,
        boundingbox: DEFAULT_BOUNDS,
        ...(this.options.boardOptions ?? {}),
        ...(options.attributes ?? {})
      })
      ?? null;
    if (!this.board) throw new Error('JSXGraph runtime requires a board or a JXG.JSXGraph.initBoard implementation.');
    this.ownsBoard = true;
  }

  public createObject(node: GraphObjectNode, handle: GraphRenderHandle, context: GraphBackendContext = {}): void {
    const board = this.requireBoard();
    const previous = this.objects.get(handle.id);
    if (previous) this.removeStored(previous);

    const elements = this.createElements(board, node, context);
    const stored = { node, handle, elements };
    this.objects.set(handle.id, stored);
    if (elements.length > 0) this.options.onCreateElements?.(stored);
    this.flush();
  }

  public updateObject(handle: GraphRenderHandle, patch: GraphObjectPatch, context: GraphBackendContext = {}): void {
    const stored = this.objects.get(handle.id);
    if (!stored) return;
    const nextNode = mergeGraphObjectPatch(stored.node, patch);
    this.removeStored(stored);
    const board = this.requireBoard();
    const elements = this.createElements(board, nextNode, context);
    const nextStored = { node: nextNode, handle, elements };
    this.objects.set(handle.id, nextStored);
    if (elements.length > 0) this.options.onCreateElements?.(nextStored);
    this.flush();
  }

  public removeObject(handle: GraphRenderHandle): void {
    const stored = this.objects.get(handle.id);
    if (!stored) return;
    this.removeStored(stored);
    this.objects.delete(handle.id);
    this.flush();
  }

  public pick(point: GraphClientPoint, options: GraphPickOptions = {}): GraphPickResult | null {
    const tolerancePx = options.tolerancePx ?? 8;
    const tolerance = this.toWorldTolerance(tolerancePx);
    const world = this.unproject(point);
    const testPoint = world?.dimension === '2d' ? { x: world.x, y: world.y } : point;
    for (const stored of [...this.objects.values()].reverse()) {
      const layerId = stored.handle.layerId;
      if (stored.node.renderHints?.visible === false) continue;
      if (options.layerOrder && !options.layerOrder.includes(layerId)) continue;
      const distance = distanceToNode(stored.node, testPoint);
      if (distance !== null && distance <= tolerance) {
        return {
          target: { scope: 'object', objectId: stored.handle.objectId, backendId: stored.handle.backendId, layerId },
          backendId: stored.handle.backendId,
          layerId,
          clientPoint: { ...point },
          worldPoint: world ?? undefined,
          distancePx: distance
        };
      }
    }
    return null;
  }

  public project(point: GraphWorldPoint, _viewport?: GraphViewportRef): GraphClientPoint | null {
    if (point.dimension !== '2d' || !this.board || !this.JXG.Coords || this.JXG.COORDS_BY_USER === undefined) {
      return { x: point.x, y: point.y };
    }
    const coords = new this.JXG.Coords(this.JXG.COORDS_BY_USER, [point.x, point.y], this.board);
    return { x: coords.scrCoords[1], y: coords.scrCoords[2] };
  }

  public unproject(point: GraphClientPoint, _viewport?: GraphViewportRef): GraphWorldPoint | null {
    if (!this.board || !this.JXG.Coords || this.JXG.COORDS_BY_SCREEN === undefined) {
      return { dimension: '2d', x: point.x, y: point.y };
    }
    const coords = new this.JXG.Coords(this.JXG.COORDS_BY_SCREEN, [point.x, point.y], this.board);
    return { dimension: '2d', x: coords.usrCoords[1], y: coords.usrCoords[2] };
  }

  public resize(size: GraphViewportSize): void {
    this.board?.resizeContainer?.(size.width, size.height, true);
  }

  public flush(): void {
    this.board?.update?.();
  }

  public destroy(): void {
    for (const stored of this.objects.values()) this.removeStored(stored);
    this.objects.clear();
    if (this.ownsBoard && this.board) this.JXG.JSXGraph?.freeBoard?.(this.board);
    this.board = null;
    this.ownsBoard = false;
  }

  public listElements(handleId: string): JsxGraphElement[] {
    return [...(this.objects.get(handleId)?.elements ?? [])];
  }

  private createElements(board: JsxGraphBoardLike, node: GraphObjectNode, context: GraphBackendContext): JsxGraphElement[] {
    if (node.renderHints?.visible === false) return [];
    const attrs = createAttributes(node, context);
    const payload = asRecord(node.payload);
    const geometry = asRecord(payload?.geometry);

    if (geometry?.kind === 'line' && isPoint2D(geometry.point) && isPoint2D(geometry.direction)) {
      const start = geometry.point;
      const end = add(start, geometry.direction);
      return normalizeElements(board.create('line', [[start.x, start.y], [end.x, end.y]], attrs));
    }

    if (geometry?.kind === 'ray' && isPoint2D(geometry.origin) && isPoint2D(geometry.direction)) {
      const start = geometry.origin;
      const end = add(start, geometry.direction);
      return normalizeElements(board.create('ray', [[start.x, start.y], [end.x, end.y]], attrs));
    }

    if (geometry?.kind === 'segment' && isPoint2D(geometry.start) && isPoint2D(geometry.end)) {
      return normalizeElements(board.create('segment', [[geometry.start.x, geometry.start.y], [geometry.end.x, geometry.end.y]], attrs));
    }

    if (node.type === 'vector' && isPoint2D(payload?.start) && isPoint2D(payload?.end)) {
      return normalizeElements(board.create('arrow', [[payload.start.x, payload.start.y], [payload.end.x, payload.end.y]], attrs));
    }

    if (geometry?.kind === 'circle' && isPoint2D(geometry.center) && typeof geometry.radius === 'number') {
      return normalizeElements(board.create('circle', [[geometry.center.x, geometry.center.y], geometry.radius], attrs));
    }

    if (geometry?.kind === 'polygon' && Array.isArray(geometry.vertices)) {
      const points = geometry.vertices.filter(isPoint2D).map((point) => [point.x, point.y]);
      if (points.length >= 3) return normalizeElements(board.create('polygon', points, attrs));
    }

    if (geometry?.kind === 'polyline' && Array.isArray(geometry.points)) {
      const points = geometry.points.filter(isPoint2D).map((point) => [point.x, point.y]);
      if (points.length >= 2) return normalizeElements(board.create('curve', [points.map((point) => point[0]), points.map((point) => point[1])], attrs));
    }

    if ((geometry?.kind === 'arc' || geometry?.kind === 'sector') && isPoint2D(geometry.center) && isPoint2D(geometry.start) && isPoint2D(geometry.end)) {
      return normalizeElements(board.create(geometry.kind, [
        [geometry.center.x, geometry.center.y],
        [geometry.start.x, geometry.start.y],
        [geometry.end.x, geometry.end.y]
      ], attrs));
    }

    if (geometry?.kind === 'semicircle' && isPoint2D(geometry.start) && isPoint2D(geometry.end)) {
      return normalizeElements(board.create('semicircle', [
        [geometry.start.x, geometry.start.y],
        [geometry.end.x, geometry.end.y]
      ], attrs));
    }

    if (node.type === 'angle') {
      const anglePoints = readAnglePoints(payload);
      if (anglePoints) {
        return normalizeElements(board.create('angle', anglePoints.map((point) => [point.x, point.y]), attrs));
      }
    }

    if (node.type === 'text' && isPoint2D(payload?.point) && typeof payload?.text === 'string') {
      return normalizeElements(board.create('text', [payload.point.x, payload.point.y, payload.text], attrs));
    }

    const payloadPoint = readPayloadPoint2D(payload);
    if (payloadPoint) {
      return normalizeElements(board.create('point', [payloadPoint.x, payloadPoint.y], attrs));
    }

    if ((node.type === 'function' || node.type === 'derivative') && typeof payload?.expression === 'string') {
      const descriptor = payload as { expression: string; variable?: string; domain?: [number, number] };
      const compiled = math.parse(descriptor.expression).compile();
      const domain = Array.isArray(descriptor.domain) ? descriptor.domain : undefined;
      const variable = descriptor.variable ?? 'x';
      return normalizeElements(board.create('functiongraph', [
        (value: number) => compiled.evaluate({ [variable]: value, x: value, e: Math.E, pi: Math.PI }),
        ...(domain ? domain : [])
      ], attrs));
    }

    if (node.type === 'perpendicular-line') {
      const relation = asRecord(payload);
      const sourceId = typeof relation?.sourceObjectId === 'string' ? relation.sourceObjectId : undefined;
      const through = isPoint2D(relation?.through) ? relation.through : null;
      const source = sourceId ? this.findStoredNode(sourceId) : null;
      const sourceDirection = directionForNode(source);
      if (through && sourceDirection) {
        const perpendicular = { x: -sourceDirection.y, y: sourceDirection.x };
        const end = add(through, perpendicular);
        return normalizeElements(board.create('line', [[through.x, through.y], [end.x, end.y]], attrs));
      }
    }

    return [];
  }

  private findStoredNode(objectId: string): GraphObjectNode | null {
    for (const stored of this.objects.values()) {
      if (stored.node.id === objectId || stored.handle.objectId === objectId) return stored.node;
    }
    return null;
  }

  private removeStored(stored: StoredJsxGraphObject): void {
    if (stored.elements.length > 0) this.options.onRemoveElements?.(stored);
    const board = this.board;
    if (!board) return;
    for (const element of stored.elements) {
      try {
        board.removeObject(element);
      } catch {
        // JSXGraph remove can throw for elements already removed by a board reset.
      }
    }
  }

  private requireBoard(): JsxGraphBoardLike {
    if (!this.board) throw new Error('JSXGraph runtime must be mounted before rendering.');
    return this.board;
  }

  private toWorldTolerance(tolerancePx: number): number {
    if (!this.board?.getBoundingBox || !this.board.containerObj) return tolerancePx;
    const [left, top, right, bottom] = this.board.getBoundingBox();
    const width = this.board.containerObj.clientWidth;
    const height = this.board.containerObj.clientHeight;
    const xScale = width / Math.max(1e-9, Math.abs(right - left));
    const yScale = height / Math.max(1e-9, Math.abs(top - bottom));
    const scale = Math.min(xScale, yScale);
    return Number.isFinite(scale) && scale > 0 ? tolerancePx / scale : tolerancePx;
  }
}

export const createJsxGraphRuntime = (
  JXG: JsxGraphNamespaceLike,
  options?: JsxGraphRuntimeOptions
): JsxGraphRuntime => new JsxGraphRuntime(JXG, options);

const createAttributes = (node: GraphObjectNode, _context: GraphBackendContext): Record<string, unknown> => {
  const hints = node.renderHints ?? {};
  const name = typeof hints.name === 'string' ? hints.name : node.id;
  const fillColor = typeof hints.fillColor === 'string' ? hints.fillColor : typeof hints.strokeColor === 'string' ? hints.strokeColor : '#0ea5e9';
  return {
    name,
    withLabel: Boolean(name),
    strokeColor: typeof hints.strokeColor === 'string' ? hints.strokeColor : '#0ea5e9',
    fillColor,
    fillOpacity: typeof hints.fillOpacity === 'number' ? hints.fillOpacity : 0.15,
    strokeWidth: typeof hints.strokeWidth === 'number' ? hints.strokeWidth : 2,
    size: typeof hints.radius === 'number' ? hints.radius : 3,
    visible: hints.visible !== false,
    fixed: asRecord(node.meta)?.locked === true
  };
};

const normalizeElements = (value: JsxGraphElement | JsxGraphElement[] | null | undefined): JsxGraphElement[] => {
  if (!value) return [];
  return Array.isArray(value) ? value.filter(Boolean) : [value];
};

const asRecord = (value: unknown): Record<string, unknown> | null => typeof value === 'object' && value !== null ? value as Record<string, unknown> : null;
const isPoint2D = (value: unknown): value is Point2D => {
  const record = asRecord(value);
  return typeof record?.x === 'number' && Number.isFinite(record.x) && typeof record.y === 'number' && Number.isFinite(record.y);
};
const readPayloadPoint2D = (payload: Record<string, unknown> | null): Point2D | null => {
  if (isPoint2D(payload?.point)) return payload.point;
  const position = asRecord(payload?.position);
  if (position?.dimension === '2d' && isPoint2D(position)) return { x: position.x, y: position.y };
  return null;
};

const add = (left: Point2D, right: Point2D): Point2D => ({ x: left.x + right.x, y: left.y + right.y });

const directionForNode = (node: GraphObjectNode | null): Point2D | null => {
  const payload = asRecord(node?.payload);
  const geometry = asRecord(payload?.geometry);
  if (isPoint2D(geometry?.direction)) return geometry.direction;
  if (isPoint2D(geometry?.start) && isPoint2D(geometry.end)) return { x: geometry.end.x - geometry.start.x, y: geometry.end.y - geometry.start.y };
  if (isPoint2D(payload?.start) && isPoint2D(payload.end)) return { x: payload.end.x - payload.start.x, y: payload.end.y - payload.start.y };
  return null;
};

const distanceToNode = (node: GraphObjectNode, point: Point2D): number | null => {
  const payload = asRecord(node.payload);
  const geometry = asRecord(payload?.geometry);
  const payloadPoint = readPayloadPoint2D(payload);
  if (payloadPoint) return Math.hypot(payloadPoint.x - point.x, payloadPoint.y - point.y);
  if (geometry?.kind === 'circle' && isPoint2D(geometry.center) && typeof geometry.radius === 'number') {
    return Math.abs(Math.hypot(point.x - geometry.center.x, point.y - geometry.center.y) - geometry.radius);
  }
  if (geometry && (geometry.kind === 'segment' || node.type === 'vector') && isPoint2D(geometry.start) && isPoint2D(geometry.end)) {
    return distanceToSegment(point, geometry.start, geometry.end);
  }
  if (isPoint2D(payload?.start) && isPoint2D(payload.end)) return distanceToSegment(point, payload.start, payload.end);
  if ((geometry?.kind === 'line' || geometry?.kind === 'ray') && isPoint2D(geometry.point ?? geometry.origin) && isPoint2D(geometry.direction)) {
    const origin = (geometry.point ?? geometry.origin) as Point2D;
    if (geometry.kind === 'ray') {
      const projection = projectionParameter(point, origin, geometry.direction);
      if (projection < 0) return Math.hypot(point.x - origin.x, point.y - origin.y);
    }
    return distanceToInfiniteLine(point, origin, geometry.direction);
  }
  if (geometry?.kind === 'polygon' && Array.isArray(geometry.vertices)) {
    const points = geometry.vertices.filter(isPoint2D);
    return points.length >= 2 ? Math.min(...points.map((vertex, index) => distanceToSegment(point, vertex, points[(index + 1) % points.length]))) : null;
  }
  if (geometry?.kind === 'polyline' && Array.isArray(geometry.points)) {
    const points = geometry.points.filter(isPoint2D);
    if (points.length < 2) return null;
    const distances: number[] = [];
    for (let index = 0; index < points.length - 1; index += 1) distances.push(distanceToSegment(point, points[index], points[index + 1]));
    return Math.min(...distances);
  }
  const arcGeometry = readArcLikeGeometry(geometry);
  if (arcGeometry) {
    return distanceToArcLike(point, arcGeometry);
  }
  if (isPoint2D(payload?.point) && typeof payload?.text === 'string') {
    return Math.hypot(payload.point.x - point.x, payload.point.y - point.y);
  }
  const anglePoints = readAnglePoints(payload);
  if (anglePoints) {
    return distanceToAngle(point, anglePoints);
  }
  return null;
};

const readAnglePoints = (payload: Record<string, unknown> | null): [Point2D, Point2D, Point2D] | null => {
  const points = Array.isArray(payload?.points) ? payload.points.filter(isPoint2D) : [];
  return points.length >= 3 ? [points[0], points[1], points[2]] : null;
};

const readArcLikeGeometry = (geometry: Record<string, unknown> | null): { center: Point2D; start: Point2D; end: Point2D; radius: number } | null => {
  if (!geometry || (geometry.kind !== 'arc' && geometry.kind !== 'sector' && geometry.kind !== 'semicircle')) return null;
  if (!isPoint2D(geometry.center) || !isPoint2D(geometry.start) || !isPoint2D(geometry.end)) return null;
  const radius = typeof geometry.radius === 'number' && Number.isFinite(geometry.radius)
    ? geometry.radius
    : Math.hypot(geometry.start.x - geometry.center.x, geometry.start.y - geometry.center.y);
  return { center: geometry.center, start: geometry.start, end: geometry.end, radius };
};

const projectionParameter = (point: Point2D, start: Point2D, direction: Point2D): number => {
  const denominator = direction.x * direction.x + direction.y * direction.y;
  if (denominator <= 1e-9) return 0;
  return ((point.x - start.x) * direction.x + (point.y - start.y) * direction.y) / denominator;
};

const distanceToInfiniteLine = (point: Point2D, linePoint: Point2D, direction: Point2D): number => {
  const length = Math.hypot(direction.x, direction.y);
  if (length <= 1e-9) return Math.hypot(point.x - linePoint.x, point.y - linePoint.y);
  return Math.abs((point.x - linePoint.x) * direction.y - (point.y - linePoint.y) * direction.x) / length;
};

const distanceToSegment = (point: Point2D, start: Point2D, end: Point2D): number => {
  const direction = { x: end.x - start.x, y: end.y - start.y };
  const t = Math.max(0, Math.min(1, projectionParameter(point, start, direction)));
  const closest = { x: start.x + direction.x * t, y: start.y + direction.y * t };
  return Math.hypot(point.x - closest.x, point.y - closest.y);
};

const distanceToAngle = (point: Point2D, [first, vertex, third]: [Point2D, Point2D, Point2D]): number => {
  const radius = Math.max(0.35, Math.min(Math.hypot(first.x - vertex.x, first.y - vertex.y), Math.hypot(third.x - vertex.x, third.y - vertex.y)) * 0.35);
  return Math.abs(Math.hypot(point.x - vertex.x, point.y - vertex.y) - radius);
};

const distanceToArcLike = (
  point: Point2D,
  geometry: { center: Point2D; start: Point2D; end: Point2D; radius: number }
): number => {
  const radialDistance = Math.abs(Math.hypot(point.x - geometry.center.x, point.y - geometry.center.y) - geometry.radius);
  return Math.min(
    radialDistance,
    Math.hypot(point.x - geometry.start.x, point.y - geometry.start.y),
    Math.hypot(point.x - geometry.end.x, point.y - geometry.end.y)
  );
};
