import * as math from 'mathjs';
import { InstructionParser } from '../../parsing/InstructionParser';
import { RenderContext, RenderHandler } from '../types';

export class Surface3DHandler implements RenderHandler {
  public name = 'surface-3d';
  public priority = 30;

  public supports(ctx: RenderContext): boolean {
    return ctx.mode === '3d' && /^Surface\((.*)\)$/i.test(ctx.processedExpr);
  }

  public handle(ctx: RenderContext) {
    const view3d = ctx.boardMgr.view3d;
    if (!view3d) throw new Error('3D 核心视图器未成功建构');

    const surfaceMatch = ctx.processedExpr.match(/^Surface\((.*)\)$/i);
    if (!surfaceMatch) return null;

    const args = InstructionParser.splitTopLevelArgs(surfaceMatch[1]);
    if (args.length < 3) {
      throw new Error('Surface 需要至少 3 个参数: Surface(X, Y, Z, ...)');
    }

    const xCode = math.parse(args[0]).compile();
    const yCode = math.parse(args[1]).compile();
    const zCode = math.parse(args[2]).compile();

    try {
      xCode.evaluate(Object.assign({ u: 1, v: 1, e: Math.E, pi: Math.PI }, ctx.mathScope.data));
      yCode.evaluate(Object.assign({ u: 1, v: 1, e: Math.E, pi: Math.PI }, ctx.mathScope.data));
      zCode.evaluate(Object.assign({ u: 1, v: 1, e: Math.E, pi: Math.PI }, ctx.mathScope.data));
    } catch (e: any) {
      throw new Error(`Surface 含未定义变量(请仅使用 u,v): ${e.message}`);
    }

    const rangeU = args.length >= 5
      ? [math.evaluate(args[3], ctx.mathScope.data), math.evaluate(args[4], ctx.mathScope.data)]
      : [0, 2 * Math.PI];
    const rangeV = args.length >= 7
      ? [math.evaluate(args[5], ctx.mathScope.data), math.evaluate(args[6], ctx.mathScope.data)]
      : [0, 2 * Math.PI];

    const baseAttrs: any = {
      strokeWidth: 0.5,
      strokeColor: ctx.color,
      fillColor: ctx.color,
      fillOpacity: 0.9,
      stepsU: 40,
      stepsV: 40
    };
    const attrs = Object.assign({}, baseAttrs, ctx.extraOptions);

    const surface = view3d.create('parametricsurface3d', [
      (u: number, v: number) => {
        try {
          return xCode.evaluate(Object.assign({ u, v, e: Math.E, pi: Math.PI }, ctx.mathScope.data));
        } catch {
          return NaN;
        }
      },
      (u: number, v: number) => {
        try {
          return yCode.evaluate(Object.assign({ u, v, e: Math.E, pi: Math.PI }, ctx.mathScope.data));
        } catch {
          return NaN;
        }
      },
      (u: number, v: number) => {
        try {
          return zCode.evaluate(Object.assign({ u, v, e: Math.E, pi: Math.PI }, ctx.mathScope.data));
        } catch {
          return NaN;
        }
      },
      rangeU,
      rangeV
    ], attrs);

    return [surface];
  }
}
