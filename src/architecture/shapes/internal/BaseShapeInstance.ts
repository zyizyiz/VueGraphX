import JXG from 'jsxgraph';
import type { ShapeCapabilityTarget } from '../../capabilities/contracts';
import type { GraphShapeContext, GraphShapeInstance } from '../contracts';

export abstract class BaseShapeInstance<StateType = Record<string, never>> implements GraphShapeInstance {
  public abstract readonly id: string;
  public abstract readonly entityType: string;

  protected readonly context: GraphShapeContext;
  protected state: StateType;
  protected selected = false;
  private readonly ownedObjects = new Set<any>();

  constructor(context: GraphShapeContext, initialState: StateType) {
    this.context = context;
    this.state = initialState;
  }

  public setSelected(selected: boolean): void {
    if (this.selected === selected) return;
    this.selected = selected;
    this.onSelectionChange(selected);
    this.notifyStateChange();
  }

  public onBoardDown(_e: any, _isClickingObject: boolean): void {}
  public onBoardUp(_e: any, _isClickingObject: boolean): void {}
  public onBoardUpdate(): void {}
  public abstract getCapabilityTarget(): ShapeCapabilityTarget | null;

  public destroy(): void {
    Array.from(this.ownedObjects).reverse().forEach((objectRef) => {
      this.removeObjectSafe(objectRef);
    });
    this.ownedObjects.clear();
  }

  protected onSelectionChange(_selected: boolean): void {}

  protected get engine() {
    return this.context.engine;
  }

  protected get board() {
    return this.context.board;
  }

  protected setState(partialState: Partial<StateType>): void {
    this.state = { ...this.state, ...partialState };
    this.notifyStateChange();
  }

  protected notifyStateChange(): void {
    this.context.notifyChange();
  }

  protected trackObject<T>(objectRef: T): T {
    if (objectRef) {
      this.ownedObjects.add(objectRef);
    }
    return objectRef;
  }

  protected selectSelf(): void {
    this.context.selectShape(this.id);
  }

  protected deselectSelf(): void {
    if (this.context.isShapeSelected(this.id)) {
      this.context.selectShape(null);
    }
  }

  protected removeSelf(): void {
    this.context.removeShape(this.id);
  }

  protected addShape(instance: GraphShapeInstance): void {
    this.context.addShape(instance);
  }

  protected getUsrCoordFromEvent(event: any): [number, number] | null {
    return this.context.getUsrCoordFromEvent(event);
  }

  protected removeObjectSafe(objectRef: any): void {
    try {
      if (this.board && objectRef) this.board.removeObject(objectRef);
    } catch {
      // ignore
    }
  }

  protected uid(prefix = 'id'): string {
    return this.context.generateId(prefix);
  }

  protected toScreenCoordinates(x: number, y: number): { x: number; y: number } | null {
    if (!this.board) return null;
    const coords = new JXG.Coords(JXG.COORDS_BY_USER, [x, y], this.board);
    return {
      x: coords.scrCoords[1],
      y: coords.scrCoords[2]
    };
  }
}
