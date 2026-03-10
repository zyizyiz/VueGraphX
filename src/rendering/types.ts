import JXG from 'jsxgraph';
import { EngineMode } from '../types/engine';
import { BoardManager } from '../board/BoardManager';
import { EntityManager } from '../entities/EntityManager';
import { MathScope } from '../math/MathScope';
import type {
  GraphHiddenLineOptions,
  GraphHiddenLineSourceDescriptor,
  GraphHiddenLineSourceHandle
} from './hiddenLine/contracts';

export interface GraphHiddenLineRenderBridge {
  isEnabled(): boolean;
  getOptions(): GraphHiddenLineOptions;
  registerSource(ownerId: string, source: GraphHiddenLineSourceDescriptor): GraphHiddenLineSourceHandle;
  clearOwnerSources(ownerId: string): void;
}

export interface GraphHiddenLineRenderApi {
  ownerId?: string;
  isEnabled(): boolean;
  getOptions(): GraphHiddenLineOptions;
  registerSource(source: GraphHiddenLineSourceDescriptor): GraphHiddenLineSourceHandle | null;
  clearOwnerSources(ownerId?: string): void;
}

export interface RenderContext {
  mode: EngineMode;
  ownerId?: string;
  rawExpr: string;
  processedExpr: string;
  color: string;
  extraOptions: any;
  boardMgr: BoardManager;
  entityMgr: EntityManager;
  mathScope: MathScope;
  hiddenLine: GraphHiddenLineRenderApi;
}

export interface RenderHandler {
  name: string;
  priority: number;
  supports: (ctx: RenderContext) => boolean;
  handle: (ctx: RenderContext) => JXG.GeometryElement[] | null;
}
