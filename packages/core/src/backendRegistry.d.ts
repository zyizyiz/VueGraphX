import type { GraphRenderBackend } from './contracts';
export declare class GraphBackendRegistry {
    private readonly backends;
    register(backend: GraphRenderBackend): void;
    get(id: string): GraphRenderBackend | null;
    require(id: string): GraphRenderBackend;
    unregister(id: string): boolean;
    list(): GraphRenderBackend[];
    clear(): void;
}
