import JXG from 'jsxgraph';

export class EntityManager {
  private entityMap: Map<string, JXG.GeometryElement[]> = new Map();
  private namedElements: Map<string, JXG.GeometryElement> = new Map();

  public registerCommandElements(cmdId: string, elements: JXG.GeometryElement[]): void {
    if (elements && elements.length > 0) {
      this.entityMap.set(cmdId, elements);
    }
  }

  public removeCommandElements(cmdId: string, board: JXG.Board): void {
    const records = this.entityMap.get(cmdId);
    if (!records) return;

    board?.suspendUpdate?.();
    try {
      records.forEach(el => {
        try {
          if (el && el.name) {
            this.namedElements.delete(el.name);
          }
          if (board) {
            board.removeObject(el);
          }
        } catch {
        }
      });
    } finally {
      board?.unsuspendUpdate?.();
    }
    this.entityMap.delete(cmdId);
  }

  public registerNamedElement(name: string, element: JXG.GeometryElement): void {
    if (name && element) {
      this.namedElements.set(name, element);
    }
  }

  public getNamedElement(name: string): JXG.GeometryElement | undefined {
    return this.namedElements.get(name);
  }

  public clearAll(): void {
    this.entityMap.clear();
    this.namedElements.clear();
  }
}
