import JXG from 'jsxgraph';
import * as math from 'mathjs';
import { BoardManager } from './BoardManager';
import { EntityManager } from './EntityManager';
import { Parser } from './Parser';
import { MathScope } from './MathScope';

/**
 * Renderer: 挂载和图形绘制流水线车间
 * 职责：
 * 1. 负责识别和分发正确的图形绘制调用
 * 2. 结合底层的 JSXGraph 生成图元、并把有名的实体登记到对象管理池
 */
export class Renderer {
  public mathScope: MathScope;

  constructor(
    private boardMgr: BoardManager,
    private entityMgr: EntityManager
  ) {
    this.mathScope = new MathScope();
  }

  /**
   * 二维降级分析和绘图适配管线 
   * 支持能力：点 A=(1,2)，方程 f(x)=x^2，裸表达式 x^2+1
   */
  public parseAndRender2D(expr: string, color: string, extraOptions: any = {}): JXG.GeometryElement[] {
    const els: JXG.GeometryElement[] = [];
    const board = this.boardMgr.board;
    if (!board) return els;

    let processedExpr = Parser.preprocessLaTeX(expr);

    // 探测 1： 泛型几何组件构建指令
    const geomMatch = processedExpr.match(/^(?:([a-zA-Z_]\w*)\s*=\s*)?([a-zA-Z_]\w*)\s*\((.*)\)$/);
    if (geomMatch) {
      const name = geomMatch[1] || '';
      const typeCandidate = geomMatch[2].toLowerCase();
      
      // 动态判断：检查 JSXGraph 的底层元素注册表
      if ((JXG as any).elements && (JXG as any).elements[typeCandidate]) {
        const argsString = geomMatch[3];
        const args: string[] = [];
        let current = '';
        let depth = 0;
        for (const char of argsString) {
          if (char === '(' || char === '[' || char === '{') depth++;
          else if (char === ')' || char === ']' || char === '}') depth--;
          else if (char === ',' && depth === 0) {
            args.push(current);
            current = '';
            continue;
          }
          current += char;
        }
        if (current) args.push(current);

        const parsedArgs = args.map(arg => {
          const str = arg.trim();
          
          const namedEl = this.entityMgr.getNamedElement(str);
          if (namedEl) return namedEl;
          
          try {
            const tupleMatch = str.match(/^\((.*)\)$/);
            if (tupleMatch && tupleMatch[1].includes(',') && !/[a-zA-Z]/i.test(tupleMatch[1])) {
                const val = math.evaluate('[' + tupleMatch[1] + ']');
                return Array.isArray(val) ? val : (val && typeof (val as any).toArray === 'function' ? (val as any).toArray() : str);
            }
            
            if (/^[a-zA-Z_]\w*$/.test(str)) return str;
            
            const val = math.evaluate(str);
            if (typeof val === 'number') return val;
            if (val && typeof (val as any).toArray === 'function') return (val as any).toArray();
            if (Array.isArray(val)) return val;
            return str;
          } catch {
            return str;
          }
        });

        try {
          const isFilledShape = /circle|polygon|sector|ellipse|conic|inequality/i.test(typeCandidate);
          const baseAttrs: any = {
            name,
            withLabel: !!name,
            strokeColor: color,
            strokeWidth: 2,
            fillColor: isFilledShape ? color : 'none',
            fillOpacity: 0.1
          };
          const attrs = Object.assign({}, baseAttrs, extraOptions);

          const shape = board.create(typeCandidate as any, parsedArgs, attrs);
          
          if (Array.isArray(shape)) {
             els.push(...shape as JXG.GeometryElement[]);
             if (name && shape.length > 0) this.entityMgr.registerNamedElement(name, (shape as JXG.GeometryElement[])[0]);
          } else {
             els.push(shape as JXG.GeometryElement);
             if (name) this.entityMgr.registerNamedElement(name, shape as JXG.GeometryElement);
          }
        } catch (e) {
          console.error('[Renderer] JSXGraph creation error:', e);
        }
        
        return els;
      }
    }

    // 探测 2： 显式点定义
    const pointMatch = processedExpr.match(/^(?:([a-zA-Z_]\w*)\s*=?\s*)?\(\s*([^,]+)\s*,\s*([^)]+)\s*\)$/);
    if (pointMatch) {
      const name = pointMatch[1] || '';
      const xExp = pointMatch[2];
      const yExp = pointMatch[3];
      
      try {
        const xVal = math.evaluate(xExp);
        const yVal = math.evaluate(yExp);
        
        const baseAttrs: any = {
          name,
          withLabel: !!name,
          fillColor: color,
          strokeColor: color,
          size: 3
        };
        const attrs = Object.assign({}, baseAttrs, extraOptions);

        const pt = board.create('point', [xVal, yVal], attrs);
        els.push(pt);
        if (name) this.entityMgr.registerNamedElement(name, pt);
        return els;
      } catch {
        // Fallthrough
      }
    }

    try {
      const node = math.parse(processedExpr);
      
      // 探测拦截：如果是纯赋值如 a = 1，或者普通的函数赋值，处理到数学上下文缓存里
      if ((node as any).isAssignmentNode) {
         const varName = (node as any).object.name;
         if (varName !== 'y' && varName !== 'x') {
             this.mathScope.evaluate(node);
             return els; // 这个纯计算公式不上画布
         }
      } else if (node.type === 'FunctionAssignmentNode') {
         this.mathScope.evaluate(node);
         // 虽然有赋值能力（存在内存），但我们仍想把函数 f(x) 或者什么投射成一个曲面
         if ((node as any).params.length > 1 || (node as any).params[0] !== 'x') {
             return els;
         }
      }

      const plotNode = (node as any).isAssignmentNode ? (node as any).value : node;
      const code = plotNode.compile();
      
      // 前置语法探针测试 (Dry Run)
      try {
        code.evaluate(Object.assign({ x: 1, e: Math.E, pi: Math.PI }, this.mathScope.data));
      } catch (dryErr: any) {
        throw new Error(`函数变量或语法错误: ${dryErr.message}`);
      }
      
      const baseAttrs: any = {
        strokeColor: color,
        strokeWidth: 3,
        highlight: true
      };
      const attrs = Object.assign({}, baseAttrs, extraOptions);

      const curve = board.create('functiongraph', [
        (x: number) => {
          try {
            return code.evaluate(Object.assign({ x, e: Math.E, pi: Math.PI }, this.mathScope.data));
          } catch {
            return NaN;
          }
        }
      ], attrs);
      
      els.push(curve);
    } catch (e: any) {
      console.warn('[Renderer] Unhandled 2D expression', processedExpr, e);
      throw new Error(`曲线表达式解析失败: ${e.message}`);
    }
    
    return els;
  }

  /**
   * 三维降级分析和绘图适配管线
   */
  public parseAndRender3D(expr: string, color: string, extraOptions: any = {}): JXG.GeometryElement[] {
    const view3d = this.boardMgr.view3d;
    if (!view3d) throw new Error("3D 核心视图器未成功建构");
    
    const els: JXG.GeometryElement[] = [];
    let processedExpr = Parser.preprocessLaTeX(expr);

    const tupleMatch = processedExpr.match(/^(?:([a-zA-Z_]\w*)\s*=?\s*)?\((.*)\)$/);
    if (tupleMatch && tupleMatch[2].includes(',')) {
      const name = tupleMatch[1] || '';
      const arrayStr = '[' + tupleMatch[2] + ']';
      try {
        const coords = math.evaluate(arrayStr);
        const coordArr = Array.isArray(coords)
          ? coords
          : (coords && typeof (coords as any).toArray === 'function' ? (coords as any).toArray() : null);

        if (coordArr && coordArr.length >= 2) {
           const baseAttrs: any = {
             name,
             withLabel: !!name,
             color,
             size: 4
           };
           const attrs = Object.assign({}, baseAttrs, extraOptions);

           const pt = view3d.create('point3d', coordArr, attrs);
           els.push(pt);
           if (name) this.entityMgr.registerNamedElement(name, pt);
           return els;
        }
      } catch {
        // Fallthrough
      }
    }

    // 探测 3D 参数曲面指令 Surface(X, Y, Z, [uMin, uMax, vMin, vMax])
    const surfaceMatch = processedExpr.match(/^Surface\((.*)\)$/i);
    if (surfaceMatch) {
      const argsString = surfaceMatch[1];
      const args: string[] = [];
      let current = ''; let depth = 0;
      for (const char of argsString) {
        if (char === '(' || char === '[' || char === '{') depth++;
        else if (char === ')' || char === ']' || char === '}') depth--;
        else if (char === ',' && depth === 0) {
          args.push(current.trim()); current = ''; continue;
        }
        current += char;
      }
      if (current) args.push(current.trim());

      if (args.length >= 3) {
        try {
          const xCode = math.parse(args[0]).compile();
          const yCode = math.parse(args[1]).compile();
          const zCode = math.parse(args[2]).compile();

          // Dry run 测试所有变量是否在白名单之内
          try {
             xCode.evaluate(Object.assign({ u: 1, v: 1, e: Math.E, pi: Math.PI }, this.mathScope.data));
             yCode.evaluate(Object.assign({ u: 1, v: 1, e: Math.E, pi: Math.PI }, this.mathScope.data));
             zCode.evaluate(Object.assign({ u: 1, v: 1, e: Math.E, pi: Math.PI }, this.mathScope.data));
          } catch(err: any) {
             throw new Error(`含未定义的变量 (请仅使用 u,v): ${err.message}`);
          }

          const rangeU = args.length >= 5 ? [math.evaluate(args[3], this.mathScope.data), math.evaluate(args[4], this.mathScope.data)] : [0, 2 * Math.PI];
          const rangeV = args.length >= 7 ? [math.evaluate(args[5], this.mathScope.data), math.evaluate(args[6], this.mathScope.data)] : [0, 2 * Math.PI];

          const baseAttrs: any = { strokeWidth: 0.5, strokeColor: color, fillColor: color, fillOpacity: 0.9, stepsU: 40, stepsV: 40 };
          const attrs = Object.assign({}, baseAttrs, extraOptions);

          const surface = view3d.create('parametricsurface3d', [
            (u: number, v: number) => { try { return xCode.evaluate(Object.assign({ u, v, e: Math.E, pi: Math.PI }, this.mathScope.data)); } catch { return NaN; } },
            (u: number, v: number) => { try { return yCode.evaluate(Object.assign({ u, v, e: Math.E, pi: Math.PI }, this.mathScope.data)); } catch { return NaN; } },
            (u: number, v: number) => { try { return zCode.evaluate(Object.assign({ u, v, e: Math.E, pi: Math.PI }, this.mathScope.data)); } catch { return NaN; } },
            rangeU,
            rangeV
          ], attrs);
          els.push(surface);
          return els;
        } catch (e: any) {
          throw new Error(`参数曲面(Surface)解析失败: ${e.message}`);
        }
      }
    }

    try {
      const node = math.parse(processedExpr);

      if ((node as any).isAssignmentNode) {
          const varName = (node as any).object.name;
          if (varName !== 'z' && varName !== 'Z') {
              // 这个公式在 3D 模式中不是为了构造形如 z=f(x,y) 的三维网面，而只是声明常量 x = 1 或者 U = 2 之类的。塞进内存完事。
              this.mathScope.evaluate(node);
              return els;
          }
      } else if (node.type === 'FunctionAssignmentNode') {
          this.mathScope.evaluate(node);
          return els; // 3D 中如果是普通的一元方法我们不知道怎么投射，只存闭包即可
      }

      const plotNode = (node as any).isAssignmentNode ? (node as any).value : node;
      const code = plotNode.compile();

      // 前置语法探针测试 (Dry Run)：主动拦截错误，避免渲染期黑洞
      try {
        code.evaluate(Object.assign({ x: 1, y: 1, e: Math.E, pi: Math.PI }, this.mathScope.data));
      } catch (dryErr: any) {
        throw new Error(`曲面变量或语法错误: ${dryErr.message}`);
      }

      const baseAttrs: any = {
        strokeWidth: 0.5,
        strokeColor: color,
        fillColor: color,
        fillOpacity: 0.7,
        stepsU: 30,
        stepsV: 30
      };
      const attrs = Object.assign({}, baseAttrs, extraOptions);

      const surface = view3d.create('parametricsurface3d', [
        (u: number, _v: number) => u,
        (_u: number, v: number) => v,
        (u: number, v: number) => {
          try {
            return code.evaluate(Object.assign({ x: u, y: v, e: Math.E, pi: Math.PI }, this.mathScope.data));
          } catch {
            return NaN;
          }
        },
        [-5, 5],
        [-5, 5]
      ], attrs);
      
      els.push(surface);
    } catch (e: any) {
      console.warn('[Renderer] Unhandled 3D expression', processedExpr, e);
      throw new Error(`曲面表达式解析失败: ${e.message}`);
    }
    
    return els;
  }
}
