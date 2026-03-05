import * as math from 'mathjs';
import { RenderContext, RenderHandler } from '../types';

export class Expression2DHandler implements RenderHandler {
  public name = 'expression-2d';
  public priority = 90;

  public supports(ctx: RenderContext): boolean {
    return ctx.mode === '2d' || ctx.mode === 'geometry';
  }

  public handle(ctx: RenderContext) {
    const board = ctx.boardMgr.board;
    const els: any[] = [];

    try {
      const node = math.parse(ctx.processedExpr);

      if ((node as any).isAssignmentNode) {
        const varName = (node as any).object.name;
        if (varName !== 'y' && varName !== 'x') {
          ctx.mathScope.evaluate(node);
          return els;
        }
      } else if (node.type === 'FunctionAssignmentNode') {
        ctx.mathScope.evaluate(node);
        if ((node as any).params.length > 1 || (node as any).params[0] !== 'x') {
          return els;
        }
      }

      const plotNode = (node as any).isAssignmentNode ? (node as any).value : node;
      const code = plotNode.compile();

      // 用临时 scope 做合法性预检，不污染主 mathScope.data 的状态
      code.evaluate({ x: 1, e: Math.E, pi: Math.PI });

      const baseAttrs: any = {
        strokeColor: ctx.color,
        strokeWidth: 3,
        highlight: true
      };
      const attrs = Object.assign({}, baseAttrs, ctx.extraOptions);

      const curve = board.create('functiongraph', [
        (x: number) => {
          try {
            return code.evaluate({ ...ctx.mathScope.data, x, e: Math.E, pi: Math.PI });
          } catch {
            return NaN;
          }
        }
      ], attrs);

      els.push(curve);
      return els;
    } catch (e: any) {
      throw new Error(`曲线表达式解析失败: ${e.message}`);
    }
  }
}
