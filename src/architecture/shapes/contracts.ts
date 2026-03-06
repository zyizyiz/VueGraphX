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
