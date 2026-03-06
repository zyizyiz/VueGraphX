import type { GraphCapabilityDescriptor } from '../../types/capabilities';
import type { ShapeCapabilityTarget } from './contracts';

export abstract class GraphCapability {
  public abstract readonly id: string;

  public abstract supports(target: ShapeCapabilityTarget): boolean;
  public abstract createDescriptor(target: ShapeCapabilityTarget): GraphCapabilityDescriptor;
  public abstract execute(target: ShapeCapabilityTarget, payload?: unknown): boolean;

  protected parseNumberValue(payload: unknown): number | null {
    if (typeof payload === 'number' && Number.isFinite(payload)) return payload;
    if (
      payload &&
      typeof payload === 'object' &&
      'value' in payload &&
      typeof (payload as { value: unknown }).value === 'number' &&
      Number.isFinite((payload as { value: number }).value)
    ) {
      return (payload as { value: number }).value;
    }
    return null;
  }

  protected parseColorValue(payload: unknown): string | null {
    if (typeof payload === 'string' && payload.trim()) return payload;
    if (
      payload &&
      typeof payload === 'object' &&
      'color' in payload &&
      typeof (payload as { color: unknown }).color === 'string' &&
      (payload as { color: string }).color.trim()
    ) {
      return (payload as { color: string }).color;
    }
    return null;
  }
}
