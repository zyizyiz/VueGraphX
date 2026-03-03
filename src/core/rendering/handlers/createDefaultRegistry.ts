import { RenderRegistry } from '../registry';
import { Expression2DHandler } from './Expression2DHandler';
import { Expression3DHandler } from './Expression3DHandler';
import { GenericInvocationHandler } from './GenericInvocationHandler';
import { Surface3DHandler } from './Surface3DHandler';
import { TuplePointHandler } from './TuplePointHandler';

export function createDefaultRegistry(): RenderRegistry {
  const registry = new RenderRegistry();

  registry.register(new GenericInvocationHandler());
  registry.register(new TuplePointHandler());
  registry.register(new Surface3DHandler());
  registry.register(new Expression2DHandler());
  registry.register(new Expression3DHandler());

  return registry;
}
