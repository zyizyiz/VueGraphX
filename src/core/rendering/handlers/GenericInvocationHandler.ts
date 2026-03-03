import JXG from 'jsxgraph';
import { InstructionParser } from '../../parsing/InstructionParser';
import { RenderContext, RenderHandler } from '../types';
import { evaluateInvocationArg, normalizeAndRegister } from '../utils';

export class GenericInvocationHandler implements RenderHandler {
  public name = 'generic-invocation';
  public priority = 10;

  public supports(ctx: RenderContext): boolean {
    const invocation = InstructionParser.parseInvocation(ctx.processedExpr);
    if (!invocation) return false;

    const type = invocation.type.toLowerCase();
    if (type === 'surface') return false;

    if (ctx.mode === '2d' || ctx.mode === 'geometry') {
      return !!(JXG as any).elements?.[type];
    }

    return ctx.mode === '3d';
  }

  public handle(ctx: RenderContext): JXG.GeometryElement[] | null {
    const invocation = InstructionParser.parseInvocation(ctx.processedExpr);
    if (!invocation) return null;

    const board = ctx.boardMgr.board;
    const view3d = ctx.boardMgr.view3d;
    const type = invocation.type.toLowerCase();
    const parsedArgs = invocation.args.map(arg => evaluateInvocationArg(arg, ctx.entityMgr, ctx.mathScope));
    const name = invocation.name;

    const is2DCallable = !!(JXG as any).elements?.[type];
    if ((ctx.mode === '2d' || ctx.mode === 'geometry') && is2DCallable) {
      const isFilledShape = /circle|polygon|sector|ellipse|conic|inequality/i.test(type);
      const baseAttrs: any = {
        name,
        withLabel: !!name,
        strokeColor: ctx.color,
        strokeWidth: 2,
        fillColor: isFilledShape ? ctx.color : 'none',
        fillOpacity: 0.1
      };
      const attrs = Object.assign({}, baseAttrs, ctx.extraOptions);

      try {
        const shape = board.create(type as any, parsedArgs, attrs);
        return normalizeAndRegister(shape, name, ctx.entityMgr);
      } catch (e) {
        throw new Error(`二维指令创建失败(${invocation.type}): ${(e as any)?.message || '未知错误'}`);
      }
    }

    if (ctx.mode === '3d' && view3d) {
      const baseAttrs: any = {
        name,
        withLabel: !!name,
        strokeColor: ctx.color,
        fillColor: ctx.color,
        fillOpacity: 0.8,
        strokeWidth: 1.2
      };
      const attrs = Object.assign({}, baseAttrs, ctx.extraOptions);

      const candidateTypes = [type, `${type}3d`];
      for (const candidateType of candidateTypes) {
        try {
          const shape = view3d.create(candidateType, parsedArgs, attrs);
          return normalizeAndRegister(shape, name, ctx.entityMgr);
        } catch {
        }
      }
    }

    return null;
  }
}
