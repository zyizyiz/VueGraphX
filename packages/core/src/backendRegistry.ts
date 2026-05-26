import type { GraphRenderBackend } from './contracts';

export class GraphBackendRegistry {
  private readonly backends = new Map<string, GraphRenderBackend>();

  public register(backend: GraphRenderBackend): void {
    if (!backend.id.trim()) {
      throw new Error('Graph backend id must be non-empty.');
    }
    if (this.backends.has(backend.id)) {
      throw new Error(`Graph backend already registered: ${backend.id}`);
    }
    this.backends.set(backend.id, backend);
  }

  public get(id: string): GraphRenderBackend | null {
    return this.backends.get(id) ?? null;
  }

  public require(id: string): GraphRenderBackend {
    const backend = this.get(id);
    if (!backend) {
      throw new Error(`Graph backend is not registered: ${id}`);
    }
    return backend;
  }

  public unregister(id: string): boolean {
    return this.backends.delete(id);
  }

  public list(): GraphRenderBackend[] {
    return [...this.backends.values()];
  }

  public clear(): void {
    this.backends.clear();
  }
}
