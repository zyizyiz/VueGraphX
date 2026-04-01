import JXG from 'jsxgraph';
import { InstructionParser } from '../../parsing/InstructionParser';
import { RenderContext, RenderHandler } from '../types';
import { evaluateInvocationArg, normalizeAndRegister } from '../utils';
import { resolve2DElementType, resolve3DElementType } from '../jsxgraphCommandCatalog';
import type { GraphHiddenLineMeshSourceData, GraphHiddenLinePolylineSetSourceData } from '../hiddenLine/contracts';

const toPoint3D = (value: any): [number, number, number] | null => {
  if (Array.isArray(value) && value.length >= 3 && value.every((v) => typeof v === 'number' && Number.isFinite(v))) {
    return [value[0], value[1], value[2]];
  }

  const usrCoords = value?.coords?.usrCoords;
  if (Array.isArray(usrCoords) && usrCoords.length >= 4) {
    const [_, x, y, z] = usrCoords;
    if ([x, y, z].every((v) => typeof v === 'number' && Number.isFinite(v))) {
      return [x, y, z];
    }
  }

  if (typeof value?.X === 'function' && typeof value?.Y === 'function' && typeof value?.Z === 'function') {
    const x = value.X();
    const y = value.Y();
    const z = value.Z();
    if ([x, y, z].every((v) => typeof v === 'number' && Number.isFinite(v))) {
      return [x, y, z];
    }
  }

  return null;
};

const buildPolylineSource = (args: any[]): GraphHiddenLinePolylineSetSourceData | null => {
  const points = args.map((arg) => toPoint3D(arg)).filter((p): p is [number, number, number] => !!p);
  if (points.length < 2) return null;
  return {
    kind: 'polyline-set',
    polylines: [
      {
        points: points.map(([x, y, z]) => ({ x, y, z }))
      }
    ]
  };
};

const buildPolygonMeshSource = (args: any[]): GraphHiddenLineMeshSourceData | null => {
  const points = args.map((arg) => toPoint3D(arg)).filter((p): p is [number, number, number] => !!p);
  if (points.length < 3) return null;

  return {
    kind: 'mesh',
    vertices: points.map(([x, y, z]) => ({ x, y, z })),
    faces: [
      {
        indices: points.map((_, index) => index)
      }
    ]
  };
};

export class GenericInvocationHandler implements RenderHandler {
  public name = 'generic-invocation';
  public priority = 10;

  public supports(ctx: RenderContext): boolean {
    const invocation = InstructionParser.parseInvocation(ctx.processedExpr);
    if (!invocation) return false;

    const type = invocation.type.toLowerCase();
    if (type === 'surface') return false;

    if (ctx.mode === '2d' || ctx.mode === 'geometry') {
      return !!resolve2DElementType(invocation.type);
    }

    return ctx.mode === '3d' && !!resolve3DElementType(invocation.type);
  }

  public handle(ctx: RenderContext): JXG.GeometryElement[] | null {
    const invocation = InstructionParser.parseInvocation(ctx.processedExpr);
    if (!invocation) return null;

    const board = ctx.boardMgr.board;
    const view3d = ctx.boardMgr.view3d;
    const type = invocation.type.toLowerCase();
    const resolved2DType = resolve2DElementType(invocation.type);
    const resolved3DType = resolve3DElementType(invocation.type);
    const parsedArgs = invocation.args.map(arg => evaluateInvocationArg(arg, ctx.entityMgr, ctx.mathScope));
    const name = invocation.name;

    const is2DCallable = !!resolved2DType;
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
        const shape = board.create(resolved2DType as any, parsedArgs, attrs);
        return normalizeAndRegister(shape, name, ctx.entityMgr);
      } catch (e) {
        throw new Error(`二维指令创建失败(${invocation.type}): ${(e as any)?.message || '未知错误'}`);
      }
    }

    if (ctx.mode === '3d' && view3d && resolved3DType) {
      const baseAttrs: any = {
        name,
        withLabel: !!name,
        strokeColor: ctx.color,
        fillColor: ctx.color,
        fillOpacity: 0.8,
        strokeWidth: 1.2
      };
      const attrs = Object.assign({}, baseAttrs, ctx.extraOptions);

      const candidateTypes = [resolved3DType, type, `${type}3d`];
      for (const candidateType of candidateTypes) {
        try {
          const shape = view3d.create(candidateType, parsedArgs, attrs);
          const elements = normalizeAndRegister(shape, name, ctx.entityMgr);

          const lowerType = resolved3DType.toLowerCase();
          if (ctx.hiddenLine && ctx.hiddenLine.registerSource) {
            if (lowerType === 'line3d' || lowerType === 'curve3d' || lowerType === 'functiongraph3d') {
              const polySource = buildPolylineSource(parsedArgs);
              if (polySource) {
                ctx.hiddenLine.registerSource({
                  debugLabel: `command:${lowerType}`,
                  tags: ['command', '3d', lowerType, 'edge'],
                  role: 'edge',
                  resolve: () => polySource
                });
              }
            } else if (lowerType === 'polygon3d') {
              const meshSource = buildPolygonMeshSource(parsedArgs);
              if (meshSource) {
                ctx.hiddenLine.registerSource({
                  debugLabel: 'command:polygon3d',
                  tags: ['command', '3d', 'polygon3d', 'mesh'],
                  role: 'both',
                  resolve: () => meshSource
                });
              }
            }
          }

          return elements;
        } catch {
        }
      }
    }

    return null;
  }
}
