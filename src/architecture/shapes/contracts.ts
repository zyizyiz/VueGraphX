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

export type GraphShapeGroupInput = any[] | Record<string, any>;

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
}

export interface GraphShapeDefinition {
  type: string;
  supportedModes: EngineMode | EngineMode[] | 'all';
  createShape(context: GraphShapeContext, payload?: unknown): GraphShapeInstance | null;
  createFromDrop?(context: GraphShapeContext, event: DragEvent): GraphShapeInstance | null;
}
