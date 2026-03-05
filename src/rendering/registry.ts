import JXG from 'jsxgraph';
import { RenderContext, RenderHandler } from './types';

export class RenderRegistry {
  private handlers: RenderHandler[] = [];

  public register(handler: RenderHandler): void {
    this.handlers.push(handler);
    this.handlers.sort((a, b) => a.priority - b.priority);
  }

  public run(ctx: RenderContext): JXG.GeometryElement[] {
    for (const handler of this.handlers) {
      if (!handler.supports(ctx)) continue;
      const result = handler.handle(ctx);
      if (result) return result;
    }
    return [];
  }

  public resolveHandler(ctx: RenderContext): RenderHandler | undefined {
    return this.handlers.find(handler => handler.supports(ctx));
  }

  public getHandlers(): ReadonlyArray<RenderHandler> {
    return this.handlers;
  }
}
