import * as math from 'mathjs';

/**
 * 供表达式渲染器共享使用的可变求值作用域。
 */
export class MathScope {
  public data: any = {};

  /**
   * 清空作用域中保存的所有变量。
   */
  public clear(): void {
    this.data = {};
  }

  /**
   * 基于当前作用域执行一个编译后的 mathjs 节点。
   */
  public evaluate(node: math.MathNode): any {
    return node.compile().evaluate(this.data);
  }
}
