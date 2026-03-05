import * as math from 'mathjs';
import { InstructionParser } from '../../parsing/InstructionParser';
import { RenderContext, RenderHandler } from '../types';
import { normalizeAndRegister } from '../utils';

export class TuplePointHandler implements RenderHandler {
  public name = 'tuple-point';
  public priority = 20;

  public supports(ctx: RenderContext): boolean {
    if (/^\s*[a-zA-Z_]\w*\s*\([^)]*\)\s*=/.test(ctx.processedExpr)) {
      return false;
    }
    if (InstructionParser.parseInvocation(ctx.processedExpr)) {
      return false;
    }
    return !!InstructionParser.parseTuple(ctx.processedExpr);
  }

  public handle(ctx: RenderContext) {
    const board = ctx.boardMgr.board;
    const view3d = ctx.boardMgr.view3d;
    const tuple = InstructionParser.parseTuple(ctx.processedExpr);
    if (!tuple) return null;

    const name = tuple.name;
    const values = tuple.values.map(v => math.evaluate(v, ctx.mathScope.data));

    if ((ctx.mode === '2d' || ctx.mode === 'geometry') && values.length >= 2) {
      const baseAttrs: any = {
        name,
        withLabel: !!name,
        fillColor: ctx.color,
        strokeColor: ctx.color,
        size: 3
      };
      const attrs = Object.assign({}, baseAttrs, ctx.extraOptions);
      const pt = board.create('point', [values[0], values[1]], attrs);
      return normalizeAndRegister(pt, name, ctx.entityMgr);
    }

    if (ctx.mode === '3d' && view3d && values.length >= 3) {
      const baseAttrs: any = {
        name,
        withLabel: !!name,
        color: ctx.color,
        size: 4
      };
      const attrs = Object.assign({}, baseAttrs, ctx.extraOptions);
      const pt = view3d.create('point3d', [values[0], values[1], values[2]], attrs);
      return normalizeAndRegister(pt, name, ctx.entityMgr);
    }

    return null;
  }
}
