import type {
  GraphHiddenLineSourceData,
  GraphHiddenLineSourceDescriptor,
  GraphHiddenLineSourceRecord
} from './contracts';

export class GraphHiddenLineRegistry {
  private readonly sourceMap = new Map<string, GraphHiddenLineSourceRecord>();
  private readonly sourceIdsByOwner = new Map<string, Set<string>>();
  private nextId = 0;
  private nextOrder = 0;

  public register<TData extends GraphHiddenLineSourceData>(
    ownerId: string,
    descriptor: GraphHiddenLineSourceDescriptor<TData>
  ): GraphHiddenLineSourceRecord<TData> {
    const sourceId = descriptor.id ?? this.generateId(ownerId);
    const existingRecord = this.sourceMap.get(sourceId);

    if (existingRecord) {
      const previousOwnerIds = this.sourceIdsByOwner.get(existingRecord.ownerId);
      previousOwnerIds?.delete(sourceId);
      if (previousOwnerIds && previousOwnerIds.size === 0) {
        this.sourceIdsByOwner.delete(existingRecord.ownerId);
      }
    }

    const record: GraphHiddenLineSourceRecord<TData> = {
      id: sourceId,
      ownerId,
      order: existingRecord?.order ?? ++this.nextOrder,
      descriptor
    };

    this.sourceMap.set(sourceId, record as GraphHiddenLineSourceRecord);

    const existingIds = this.sourceIdsByOwner.get(ownerId) ?? new Set<string>();
    existingIds.add(sourceId);
    this.sourceIdsByOwner.set(ownerId, existingIds);

    return record;
  }

  public get(sourceId: string): GraphHiddenLineSourceRecord | null {
    return this.sourceMap.get(sourceId) ?? null;
  }

  public list(): GraphHiddenLineSourceRecord[] {
    return Array.from(this.sourceMap.values());
  }

  public remove(sourceId: string): boolean {
    const record = this.sourceMap.get(sourceId);
    if (!record) return false;

    this.sourceMap.delete(sourceId);

    const ownerIds = this.sourceIdsByOwner.get(record.ownerId);
    ownerIds?.delete(sourceId);
    if (ownerIds && ownerIds.size === 0) {
      this.sourceIdsByOwner.delete(record.ownerId);
    }

    return true;
  }

  public clearOwner(ownerId: string): string[] {
    const ownerIds = this.sourceIdsByOwner.get(ownerId);
    if (!ownerIds) return [];

    const removedIds = Array.from(ownerIds);
    removedIds.forEach((sourceId) => {
      this.sourceMap.delete(sourceId);
    });
    this.sourceIdsByOwner.delete(ownerId);

    return removedIds;
  }

  public clear(): void {
    this.sourceMap.clear();
    this.sourceIdsByOwner.clear();
  }

  public size(): number {
    return this.sourceMap.size;
  }

  public ownerCount(): number {
    return this.sourceIdsByOwner.size;
  }

  private generateId(ownerId: string): string {
    this.nextId += 1;
    return `hidden_line_${ownerId}_${this.nextId}`;
  }
}
