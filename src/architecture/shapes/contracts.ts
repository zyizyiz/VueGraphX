import type { GraphXEngine } from '../../engine/GraphXEngine';
import type { EngineMode } from '../../types/engine';
import type { ShapeCapabilityTarget } from '../capabilities/contracts';

export interface GraphShapeInstance {
  id: string;
  entityType: string;
  setSelected(selected: boolean): void;
  onBoardDown?(e: any, isClickingObject: boolean): void;
  onBoardUp?(e: any, isClickingObject: boolean): void;
  onBoardUpdate?(): void;
  getCapabilityTarget(): ShapeCapabilityTarget | null;
  destroy(): void;
}

export interface GraphShapeGroupMember {
  id: string;
  key: string;
  object: any;
}

export interface GraphShapeDragOptions {
  selectOnStart?: boolean;
  onStart?: (...args: any[]) => void;
  onMove?: (...args: any[]) => void;
  onEnd?: (...args: any[]) => void;
}

export interface GraphShapeGroupDragOptions {
  keys?: string | string[];
  filter?: (member: GraphShapeGroupMember, ...args: any[]) => boolean;
  selectOnStart?: boolean;
  onStart?: (member: GraphShapeGroupMember, ...args: any[]) => void;
  onMove?: (member: GraphShapeGroupMember, ...args: any[]) => void;
  onEnd?: (member: GraphShapeGroupMember, ...args: any[]) => void;
}

export interface GraphScreenPoint {
  x: number;
  y: number;
}

export interface GraphViewport {
  width: number;
  height: number;
}

export interface GraphViewportPadding {
  left?: number;
  right?: number;
  top?: number;
  bottom?: number;
}

export interface GraphPointAnnotationOptions {
  alphabet?: string;
  defaultAttributes?: Record<string, unknown>;
}

export type GraphPointAnnotationSource =
  | {
      kind: 'point';
      point: any;
    }
  | {
      kind: 'intersection';
      elements: any[];
      index?: number;
    }
  | {
      kind: 'midpoint';
      points: [any, any];
    }
  | {
      kind: 'computed';
      resolve: () => any;
    };

export interface GraphPointAnnotationSpec {
  key: string;
  label?: string;
  source: GraphPointAnnotationSource;
  attributes?: Record<string, unknown>;
}

export type GraphAnimationEasing = (progress: number) => number;

export interface GraphAnimationPlaybackOptions {
  duration?: number;
  easing?: GraphAnimationEasing;
}

export interface GraphAnimationTrack {
  readonly id: string;
  readonly label?: string;
  readonly progress: number;
  readonly isAnimating: boolean;
  readonly isPaused: boolean;
  readonly loop: boolean;
  readonly yoyo: boolean;
  readonly min: number;
  readonly max: number;
  readonly step: number;
  readonly duration: number;
  playTo(target: number, options?: GraphAnimationPlaybackOptions): void;
  playForward(options?: GraphAnimationPlaybackOptions): void;
  playBackward(options?: GraphAnimationPlaybackOptions): void;
  pause(): void;
  resume(): void;
  stop(): void;
  setLoop(enabled: boolean): void;
  toggleLoop(): void;
  setYoyo(enabled: boolean): void;
  toggleYoyo(): void;
  setProgress(value: number): void;
}

export interface GraphAnimationTrackConfig {
  id: string;
  label?: string;
  initialProgress?: number;
  min?: number;
  max?: number;
  step?: number;
  duration?: number;
  loop?: boolean;
  yoyo?: boolean;
  easing?: GraphAnimationEasing;
  onProgress?: (value: number, track: GraphAnimationTrack) => void;
}

export interface GraphScreenBounds {
  left: number;
  right: number;
  top: number;
  bottom: number;
  width: number;
  height: number;
}

export type GraphScreenAnchor =
  | 'top-left'
  | 'top'
  | 'top-right'
  | 'left'
  | 'center'
  | 'right'
  | 'bottom-left'
  | 'bottom'
  | 'bottom-right';

export type GraphShapeGroupInput = any[] | Record<string, any>;

export interface GraphShapeGroupHitOptions {
  keys?: string | string[];
  eventName?: string;
  filter?: (member: GraphShapeGroupMember, ...args: any[]) => boolean;
}

export interface GraphShapeGroup {
  id: string;
  members: readonly GraphShapeGroupMember[];
  nativeGroup: any | null;
  getMember(key: string): GraphShapeGroupMember | null;
  getObject(key: string): any | null;
  has(key: string): boolean;
  keys(): string[];
  pick(keys: string | string[]): GraphShapeGroup;
  forEach(callback: (member: GraphShapeGroupMember) => void, keys?: string | string[]): void;
  setAttribute(attributes: Record<string, unknown>, keys?: string | string[]): void;
  setVisible(visible: boolean, keys?: string | string[]): void;
  show(keys?: string | string[]): void;
  hide(keys?: string | string[]): void;
  on(eventName: string, handler: (member: GraphShapeGroupMember, ...args: any[]) => void, keys?: string | string[]): () => void;
  onHit(handler: (member: GraphShapeGroupMember, ...args: any[]) => void, options?: GraphShapeGroupHitOptions): () => void;
  bindSelectOnHit(options?: GraphShapeGroupHitOptions): () => void;
  bindDrag(options?: GraphShapeGroupDragOptions): () => void;
  off(eventName?: string, keys?: string | string[]): void;
}

export interface GraphShapeContext {
  engine: GraphXEngine;
  board: any;
  selectShape(shapeId: string | null): void;
  isShapeSelected(shapeId: string): boolean;
  addShape(instance: GraphShapeInstance): void;
  removeShape(shapeId: string): void;
  notifyChange(): void;
  generateId(prefix: string): string;
  getUsrCoordFromEvent(event: any): [number, number] | null;
  getViewport(): GraphViewport;
  projectUserPoint(point: [number, number]): GraphScreenPoint | null;
  projectPoint3D(point: [number, number, number]): GraphScreenPoint | null;
  projectUserBounds(points: Array<[number, number]>): GraphScreenBounds | null;
  project3DBounds(points: Array<[number, number, number]>): GraphScreenBounds | null;
  getBoundsAnchor(bounds: GraphScreenBounds, anchor?: GraphScreenAnchor): GraphScreenPoint;
  clampScreenPoint(point: GraphScreenPoint, padding?: GraphViewportPadding): GraphScreenPoint;
}

export interface GraphShapeDefinition {
  type: string;
  supportedModes: EngineMode | EngineMode[] | 'all';
  createShape(context: GraphShapeContext, payload?: unknown): GraphShapeInstance | null;
  createFromDrop?(context: GraphShapeContext, event: DragEvent): GraphShapeInstance | null;
}
