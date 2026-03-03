import * as math from 'mathjs';

/**
 * MathScope: 数学引擎执行上下文生命周期维持器
 * 职责：
 * 负责跨指令（如多行表达式 U=1, x=cos(U) 等）时维系全局共享的数学执行作用域（Scope）。
 * 并在进行全局重刷时给予状态切片的快速清空。
 */
export class MathScope {
  // 保存整个 MathJS 允许透传访问的沙箱全局状态数据
  public data: any = {};

  /**
   * 抹净当前所有的环境常量与函数声明
   */
  public clear(): void {
    this.data = {};
  }

  /**
   * 将通过 Node 编译的数学语句通过合并沙箱的方式强行执行保存
   * @param node MathJS 已编译过的抽象语法节点
   */
  public evaluate(node: math.MathNode): any {
    return node.compile().evaluate(this.data);
  }
}
