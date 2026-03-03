import * as math from 'mathjs';

export class MathScope {
  public data: any = {};

  public clear(): void {
    this.data = {};
  }

  public evaluate(node: math.MathNode): any {
    return node.compile().evaluate(this.data);
  }
}
