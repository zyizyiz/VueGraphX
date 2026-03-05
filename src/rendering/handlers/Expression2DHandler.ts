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
        // plot: false → 纯辅助函数，只注册到 mathScope 不绘图
        // 多参数函数或参数非 x 的函数也不绘图
        if (ctx.extraOptions?.plot === false ||
            (node as any).params.length > 1 ||
            (node as any).params[0] !== 'x') {
          return els;
        }
      }

      // 提取要绘图的表达式节点：
      // - AssignmentNode (y = ...)：取 value（右侧表达式）
      // - FunctionAssignmentNode (f(x) = ...)：取 expr（函数体），而非整个定义节点
      // - 其他：直接用整个 node
      const plotNode = (node as any).isAssignmentNode
        ? (node as any).value
        : node.type === 'FunctionAssignmentNode'
          ? (node as any).expr
          : node;
      const code = plotNode.compile();

      // 用临时 scope 做合法性预检，不污染主 mathScope.data 的状态
      code.evaluate({ ...ctx.mathScope.data, x: 1, e: Math.E, pi: Math.PI });

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

      // 当 f(x) = ... 定义了函数并创建了曲线时，以函数名注册到 entityMgr，
      // 使后续指令（如 Tangent(A, f)）能通过名字引用该 JSXGraph 元素
      if (node.type === 'FunctionAssignmentNode') {
        const fnName = (node as any).name;
        if (fnName) {
          ctx.entityMgr.registerNamedElement(fnName, curve);
        }
      }

      els.push(curve);
      return els;
    } catch (e: any) {
      throw new Error(`曲线表达式解析失败: ${e.message}`);
    }
  }
}
