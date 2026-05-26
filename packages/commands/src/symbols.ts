import type { GraphObjectNode } from '@vuegraphx/core';

export interface GraphCommandSymbolRecord {
  name: string;
  id: string;
  node: GraphObjectNode;
  kind: GraphObjectNode['kind'];
  type: string;
  dependencies: readonly string[];
  commandType?: string;
}

export interface GraphCommandSymbolMetadata {
  getRecord(name: string): GraphCommandSymbolRecord | undefined;
  resolve(name: string): GraphCommandSymbolRecord | null;
  dependencyIdsFor(name: string): string[];
  records(): GraphCommandSymbolRecord[];
  clone(): GraphCommandSymbolStore;
  toMap(): Map<string, GraphObjectNode>;
}

export type GraphCommandSymbolTable = Map<string, GraphObjectNode> & Partial<GraphCommandSymbolMetadata>;

export type GraphCommandSymbolTableInput =
  | GraphCommandSymbolStore
  | GraphCommandSymbolTable
  | ReadonlyMap<string, GraphObjectNode>
  | Iterable<readonly [string, GraphObjectNode]>;

export class GraphCommandSymbolStore extends Map<string, GraphObjectNode> implements GraphCommandSymbolMetadata {
  private readonly symbolRecords = new Map<string, GraphCommandSymbolRecord>();

  public constructor(input?: GraphCommandSymbolTableInput | null) {
    super();
    if (!input) return;

    if (input instanceof GraphCommandSymbolStore) {
      for (const record of input.records()) {
        this.set(record.name, record.node, {
          commandType: record.commandType,
          dependencies: record.dependencies
        });
      }
      return;
    }

    for (const [name, node] of input) {
      this.set(name, node);
    }
  }

  public set(
    name: string,
    node: GraphObjectNode,
    meta: { commandType?: string; dependencies?: readonly string[] } = {}
  ): this {
    const dependencies = [...(meta.dependencies ?? node.dependencies ?? [])];
    super.set(name, node);
    this.symbolRecords.set(name, {
      name,
      id: node.id,
      node,
      kind: node.kind,
      type: node.type,
      dependencies,
      commandType: meta.commandType
    });
    return this;
  }

  public delete(name: string): boolean {
    this.symbolRecords.delete(name);
    return super.delete(name);
  }

  public clear(): void {
    super.clear();
    this.symbolRecords.clear();
  }

  public getRecord(name: string): GraphCommandSymbolRecord | undefined {
    return this.symbolRecords.get(name);
  }

  public resolve(name: string): GraphCommandSymbolRecord | null {
    return this.getRecord(name) ?? null;
  }

  public dependencyIdsFor(name: string): string[] {
    return [...(this.getRecord(name)?.dependencies ?? [])];
  }

  public records(): GraphCommandSymbolRecord[] {
    return [...this.symbolRecords.values()].map((record) => ({
      ...record,
      dependencies: [...record.dependencies]
    }));
  }

  public clone(): GraphCommandSymbolStore {
    return new GraphCommandSymbolStore(this);
  }

  public toMap(): Map<string, GraphObjectNode> {
    return new Map(this);
  }
}
