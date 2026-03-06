import type { ShapeCapabilityTarget } from '../capabilities/contracts';
import type { GraphShapeContext, GraphShapeDefinition, GraphShapeInstance } from './contracts';
import { BaseShapeInstance } from './internal/BaseShapeInstance';

export interface GraphShapeApi<StateType> {
  readonly id: string;
  readonly entityType: string;
  readonly state: StateType;
  readonly selected: boolean;
  readonly context: GraphShapeContext;
  readonly engine: GraphShapeContext['engine'];
  readonly board: GraphShapeContext['board'];
  setState(partialState: Partial<StateType>): void;
  notifyChange(): void;
  trackObject<T>(objectRef: T): T;
  select(): void;
  deselect(): void;
  remove(): void;
  addShape(instance: GraphShapeInstance): void;
  createShape<ChildState>(composition: GraphShapeComposition<ChildState>): GraphShapeInstance;
  getUsrCoordFromEvent(event: any): [number, number] | null;
  removeObjectSafe(objectRef: any): void;
  uid(prefix?: string): string;
  toScreenCoordinates(x: number, y: number): { x: number; y: number } | null;
}

export interface GraphShapeComposition<StateType> {
  id?: string;
  entityType: string;
  initialState: StateType;
  setup?(api: GraphShapeApi<StateType>): void;
  getCapabilityTarget(api: GraphShapeApi<StateType>): ShapeCapabilityTarget | null;
  onSelectionChange?(api: GraphShapeApi<StateType>, selected: boolean): void;
  onBoardDown?(api: GraphShapeApi<StateType>, event: any, isClickingObject: boolean): void;
  onBoardUp?(api: GraphShapeApi<StateType>, event: any, isClickingObject: boolean): void;
  onBoardUpdate?(api: GraphShapeApi<StateType>): void;
  onDestroy?(api: GraphShapeApi<StateType>): void;
}

export interface GraphShapeDefinitionComposition<Payload = unknown, StateType = unknown> {
  type: string;
  supportedModes: GraphShapeDefinition['supportedModes'];
  create(context: GraphShapeContext, payload?: Payload): GraphShapeComposition<StateType> | null;
  createFromDrop?(context: GraphShapeContext, event: DragEvent): GraphShapeComposition<StateType> | null;
}

class ComposedShapeInstance<StateType> extends BaseShapeInstance<StateType> {
  public readonly id: string;
  public readonly entityType: string;

  private readonly composition: GraphShapeComposition<StateType>;
  private readonly api: GraphShapeApi<StateType>;

  constructor(context: GraphShapeContext, composition: GraphShapeComposition<StateType>) {
    super(context, composition.initialState);
    this.composition = composition;
    this.id = composition.id ?? context.generateId(composition.entityType);
    this.entityType = composition.entityType;
    this.api = this.createApi();
    this.composition.setup?.(this.api);
  }

  public override onBoardDown(event: any, isClickingObject: boolean): void {
    this.composition.onBoardDown?.(this.api, event, isClickingObject);
  }

  public override onBoardUp(event: any, isClickingObject: boolean): void {
    this.composition.onBoardUp?.(this.api, event, isClickingObject);
  }

  public override onBoardUpdate(): void {
    this.composition.onBoardUpdate?.(this.api);
  }

  public getCapabilityTarget(): ShapeCapabilityTarget | null {
    return this.composition.getCapabilityTarget(this.api);
  }

  public override destroy(): void {
    this.composition.onDestroy?.(this.api);
    super.destroy();
  }

  protected override onSelectionChange(selected: boolean): void {
    this.composition.onSelectionChange?.(this.api, selected);
  }

  private createApi(): GraphShapeApi<StateType> {
    const thisRef = this;

    return {
      get id() {
        return thisRef.id;
      },
      get entityType() {
        return thisRef.entityType;
      },
      get state() {
        return thisRef.state;
      },
      get selected() {
        return thisRef.selected;
      },
      get context() {
        return thisRef.context;
      },
      get engine() {
        return thisRef.engine;
      },
      get board() {
        return thisRef.board;
      },
      setState(partialState) {
        thisRef.setState(partialState);
      },
      notifyChange() {
        thisRef.notifyStateChange();
      },
      trackObject(objectRef) {
        return thisRef.trackObject(objectRef);
      },
      select() {
        thisRef.selectSelf();
      },
      deselect() {
        thisRef.deselectSelf();
      },
      remove() {
        thisRef.removeSelf();
      },
      addShape(instance) {
        thisRef.addShape(instance);
      },
      createShape(composition) {
        return createComposedShape(thisRef.context, composition);
      },
      getUsrCoordFromEvent(event) {
        return thisRef.getUsrCoordFromEvent(event);
      },
      removeObjectSafe(objectRef) {
        thisRef.removeObjectSafe(objectRef);
      },
      uid(prefix) {
        return thisRef.uid(prefix);
      },
      toScreenCoordinates(x, y) {
        return thisRef.toScreenCoordinates(x, y);
      }
    };
  }
}

export const createComposedShape = <StateType>(
  context: GraphShapeContext,
  composition: GraphShapeComposition<StateType>
): GraphShapeInstance => new ComposedShapeInstance(context, composition);

export const createComposedShapeDefinition = <Payload = unknown, StateType = unknown>(
  definition: GraphShapeDefinitionComposition<Payload, StateType>
): GraphShapeDefinition => ({
  type: definition.type,
  supportedModes: definition.supportedModes,
  createShape(context, payload) {
    const composition = definition.create(context, payload as Payload);
    return composition ? createComposedShape(context, composition) : null;
  },
  createFromDrop: definition.createFromDrop
    ? (context, event) => {
        const composition = definition.createFromDrop?.(context, event);
        return composition ? createComposedShape(context, composition) : null;
      }
    : undefined
});