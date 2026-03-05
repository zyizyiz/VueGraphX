import { BoardManager } from '../board/BoardManager';
import { EntityManager } from '../entities/EntityManager';
import { MathScope } from '../math/MathScope';
import { Parser } from '../parsing/Parser';
import { EngineMode } from '../types/engine';
import { RenderRegistry } from './registry';
import { createDefaultRegistry } from './handlers/createDefaultRegistry';
import { RenderContext } from './types';
import JXG from 'jsxgraph';

export class Renderer {
  public mathScope: MathScope;
  private registry: RenderRegistry;

  constructor(
    private boardMgr: BoardManager,
    private entityMgr: EntityManager
  ) {
    this.mathScope = new MathScope();
    this.registry = createDefaultRegistry();
  }

  public render(mode: EngineMode, expr: string, color: string, extraOptions: any = {}): JXG.GeometryElement[] {
    const board = this.boardMgr.board;
    if (!board) return [];

    const processedExpr = Parser.preprocessLaTeX(expr);
    const context: RenderContext = {
      mode,
      rawExpr: expr,
      processedExpr,
      color,
      extraOptions,
      boardMgr: this.boardMgr,
      entityMgr: this.entityMgr,
      mathScope: this.mathScope
    };

    return this.registry.run(context);
  }

  public parseAndRender2D(expr: string, color: string, extraOptions: any = {}): JXG.GeometryElement[] {
    return this.render(this.boardMgr.mode === 'geometry' ? 'geometry' : '2d', expr, color, extraOptions);
  }

  public parseAndRender3D(expr: string, color: string, extraOptions: any = {}): JXG.GeometryElement[] {
    return this.render('3d', expr, color, extraOptions);
  }
}
