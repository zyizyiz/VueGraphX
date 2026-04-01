import type { GraphSceneCommandNode } from '../scene/contracts';

const cloneSceneValue = <T>(value: T): T => {
  if (value === undefined || value === null) return value;

  if (typeof structuredClone === 'function') {
    try {
      return structuredClone(value);
    } catch {
    }
  }

  if (Array.isArray(value)) {
    return value.map((item) => cloneSceneValue(item)) as T;
  }

  if (typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>).map(([key, entry]) => [key, cloneSceneValue(entry)])
    ) as T;
  }

  return value;
};

export interface GraphSceneStateShapeRecord {
  id: string;
  entityType: string;
  definitionType?: string;
  serializable: boolean;
}

export class GraphSceneState {
  private readonly commandMap = new Map<string, GraphSceneCommandNode>();
  private readonly commandOrder: string[] = [];
  private readonly shapeMap = new Map<string, GraphSceneStateShapeRecord>();
  private readonly shapeOrder: string[] = [];

  public upsertCommand(command: GraphSceneCommandNode): void {
    if (!command.id || !command.expression) {
      throw new Error('Graph scene command records require non-empty id and expression');
    }

    if (!this.commandMap.has(command.id)) {
      this.commandOrder.push(command.id);
    }
    this.commandMap.set(command.id, {
      id: command.id,
      expression: command.expression,
      color: command.color,
      options: cloneSceneValue(command.options)
    });
  }

  public removeCommand(commandId: string): void {
    if (!this.commandMap.has(commandId)) return;
    this.commandMap.delete(commandId);
    const index = this.commandOrder.indexOf(commandId);
    if (index >= 0) {
      this.commandOrder.splice(index, 1);
    }
  }

  public listCommands(): GraphSceneCommandNode[] {
    return this.commandOrder
      .map((commandId) => this.commandMap.get(commandId))
      .filter((command): command is GraphSceneCommandNode => !!command)
      .map((command) => ({
        id: command.id,
        expression: command.expression,
        color: command.color,
        options: cloneSceneValue(command.options)
      }));
  }

  public hasCommand(commandId: string): boolean {
    return this.commandMap.has(commandId);
  }

  public addShape(shape: GraphSceneStateShapeRecord): void {
    if (!shape.id || !shape.entityType) {
      throw new Error('Graph scene shape records require non-empty id and entityType');
    }

    if (!this.shapeMap.has(shape.id)) {
      this.shapeOrder.push(shape.id);
    }
    this.shapeMap.set(shape.id, {
      id: shape.id,
      entityType: shape.entityType,
      definitionType: shape.definitionType,
      serializable: shape.serializable
    });
  }

  public removeShape(shapeId: string): void {
    if (!this.shapeMap.has(shapeId)) return;
    this.shapeMap.delete(shapeId);
    const index = this.shapeOrder.indexOf(shapeId);
    if (index >= 0) {
      this.shapeOrder.splice(index, 1);
    }
  }

  public listShapes(): GraphSceneStateShapeRecord[] {
    return this.shapeOrder
      .map((shapeId) => this.shapeMap.get(shapeId))
      .filter((shape): shape is GraphSceneStateShapeRecord => !!shape)
      .map((shape) => ({
        id: shape.id,
        entityType: shape.entityType,
        definitionType: shape.definitionType,
        serializable: shape.serializable
      }));
  }

  public clearCommands(): void {
    this.commandMap.clear();
    this.commandOrder.length = 0;
  }

  public clearShapes(): void {
    this.shapeMap.clear();
    this.shapeOrder.length = 0;
  }

  public clearAll(): void {
    this.clearCommands();
    this.clearShapes();
  }
}
