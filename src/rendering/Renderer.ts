import { BoardManager } from '../board/BoardManager';
import { EntityManager } from '../entities/EntityManager';
import { MathScope } from '../math/MathScope';
import { Parser } from '../parsing/Parser';
import { EngineMode } from '../types/engine';
import { RenderRegistry } from './registry';
import { createDefaultRegistry } from './handlers/createDefaultRegistry';
import { GraphHiddenLineRenderBridge, GraphRelationRenderBridge, RenderContext } from './types';
import JXG from 'jsxgraph';

export class Renderer {
  public mathScope: MathScope;
  private registry: RenderRegistry;

  constructor(
    private boardMgr: BoardManager,
    private entityMgr: EntityManager,
    private hiddenLineBridge: GraphHiddenLineRenderBridge,
    private relationBridge: GraphRelationRenderBridge
  ) {
    this.mathScope = new MathScope();
    this.registry = createDefaultRegistry();
  }

  public render(
    mode: EngineMode,
    expr: string,
    color: string,
    extraOptions: any = {},
    ownerId?: string
  ): JXG.GeometryElement[] {
    const board = this.boardMgr.board;
    if (!board) return [];

    const processedExpr = Parser.preprocessLaTeX(expr);
    const context: RenderContext = {
      mode,
      ownerId,
      rawExpr: expr,
      processedExpr,
      color,
      extraOptions,
      boardMgr: this.boardMgr,
      entityMgr: this.entityMgr,
      mathScope: this.mathScope,
      hiddenLine: {
        ownerId,
        isEnabled: () => this.hiddenLineBridge.isEnabled(),
        getOptions: () => this.hiddenLineBridge.getOptions(),
        registerSource: (source) => ownerId ? this.hiddenLineBridge.registerSource(ownerId, source) : null,
        clearOwnerSources: (targetOwnerId) => {
          const resolvedOwnerId = targetOwnerId ?? ownerId;
          if (resolvedOwnerId) {
            this.hiddenLineBridge.clearOwnerSources(resolvedOwnerId);
          }
        }
      },
      relation: {
        ownerId,
        registerTarget: (target) => {
          if (ownerId) {
            this.relationBridge.registerTarget(ownerId, target);
          }
        },
        clearOwnerTargets: (targetOwnerId) => {
          const resolvedOwnerId = targetOwnerId ?? ownerId;
          if (resolvedOwnerId) {
            this.relationBridge.clearOwnerTargets(resolvedOwnerId);
          }
        }
      }
    };

    return this.registry.run(context);
  }

  public parseAndRender2D(expr: string, color: string, extraOptions: any = {}, ownerId?: string): JXG.GeometryElement[] {
    return this.render(this.boardMgr.mode === 'geometry' ? 'geometry' : '2d', expr, color, extraOptions, ownerId);
  }

  public parseAndRender3D(expr: string, color: string, extraOptions: any = {}, ownerId?: string): JXG.GeometryElement[] {
    return this.render('3d', expr, color, extraOptions, ownerId);
  }
}
