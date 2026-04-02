import * as math from 'mathjs';
import { RenderContext, RenderHandler } from '../types';
import type { GraphHiddenLineSurfaceSourceData } from '../hiddenLine/contracts';

export class Expression3DHandler implements RenderHandler {
  public name = 'expression-3d';
  public priority = 100;

  public supports(ctx: RenderContext): boolean {
    return ctx.mode === '3d';
  }

  public handle(ctx: RenderContext) {
    const view3d = ctx.boardMgr.view3d;
    if (!view3d) throw new Error('3D 核心视图器未成功建构');

    const els: any[] = [];

    try {
      const node = math.parse(ctx.processedExpr);

      if ((node as any).isAssignmentNode) {
        const varName = (node as any).object.name;
        if (varName !== 'z' && varName !== 'Z') {
          ctx.mathScope.evaluate(node);
          return els;
        }
      } else if (node.type === 'FunctionAssignmentNode') {
        ctx.mathScope.evaluate(node);
        return els;
      }

      const plotNode = (node as any).isAssignmentNode
        ? (node as any).value
        : node.type === 'FunctionAssignmentNode'
          ? (node as any).expr
          : node;
      const code = plotNode.compile();

      // 用临时 scope 做合法性预检，不污染主 mathScope.data 的状态
      code.evaluate({ ...ctx.mathScope.data, x: 1, y: 1, e: Math.E, pi: Math.PI });

      const baseAttrs: any = {
        strokeWidth: 0.5,
        strokeColor: ctx.color,
        fillColor: ctx.color,
        fillOpacity: 0.7,
        stepsU: 30,
        stepsV: 30
      };
      const attrs = Object.assign({}, baseAttrs, ctx.extraOptions);

      const buildHiddenLineSource = (): GraphHiddenLineSurfaceSourceData => ({
        kind: 'surface',
        uRange: [-5, 5],
        vRange: [-5, 5],
        stepsU: attrs.stepsU,
        stepsV: attrs.stepsV,
        evaluate: (u: number, v: number) => {
          try {
            return {
              x: u,
              y: v,
              z: code.evaluate({ ...ctx.mathScope.data, x: u, y: v, e: Math.E, pi: Math.PI })
            };
          } catch {
            return null;
          }
        }
      });

      const surface = view3d.create('parametricsurface3d', [
        (u: number, _v: number) => u,
        (_u: number, v: number) => v,
        (u: number, v: number) => {
          try {
            return code.evaluate({ ...ctx.mathScope.data, x: u, y: v, e: Math.E, pi: Math.PI });
          } catch {
            return NaN;
          }
        },
        [-5, 5],
        [-5, 5]
      ], attrs);

      ctx.hiddenLine.registerSource({
        debugLabel: 'expression-surface',
        tags: ['command', 'expression', 'surface', '3d'],
        role: 'both',
        style: {
          visible: { strokeColor: attrs.strokeColor, strokeWidth: 1.2 },
          hidden: { strokeColor: attrs.strokeColor }
        },
        resolve: () => buildHiddenLineSource()
      });

      els.push(surface);
      return els;
    } catch (e: any) {
      throw new Error(`曲面表达式解析失败: ${e.message}`);
    }
  }
}
