import JXG from 'jsxgraph';
import { EngineMode } from '../types/engine';
import { BoardManager } from '../board/BoardManager';
import { EntityManager } from '../entities/EntityManager';
import { MathScope } from '../math/MathScope';

export interface RenderContext {
  mode: EngineMode;
  rawExpr: string;
  processedExpr: string;
  color: string;
  extraOptions: any;
  boardMgr: BoardManager;
  entityMgr: EntityManager;
  mathScope: MathScope;
}

export interface RenderHandler {
  name: string;
  priority: number;
  supports: (ctx: RenderContext) => boolean;
  handle: (ctx: RenderContext) => JXG.GeometryElement[] | null;
}
