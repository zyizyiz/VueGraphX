import type {
  AnimationCapabilityContract,
  AnimationCollectionCapabilityContract,
  ShapeCapabilityTarget
} from '../capabilities/contracts';
import type {
  GraphAnimationTrack,
  GraphAnimationTrackConfig,
  GraphPointAnnotationOptions,
  GraphPointAnnotationSpec,
  GraphScreenAnchor,
  GraphScreenBounds,
  GraphScreenPoint,
  GraphShapeContext,
  GraphShapeDefinition,
  GraphShapeGroup,
  GraphShapeGroupInput,
  GraphShapeInstance,
  GraphViewport,
  GraphViewportPadding
} from './contracts';
import { BaseShapeInstance } from './internal/BaseShapeInstance';

export interface GraphShapeApi<StateType> {
  readonly id: string;
  readonly entityType: string;
  readonly state: StateType;
  readonly selected: boolean;
  readonly context: GraphShapeContext;
  readonly engine: GraphShapeContext['engine'];
  readonly board: GraphShapeContext['board'];
  getViewport(): GraphViewport;
  projectUserPoint(point: [number, number]): GraphScreenPoint | null;
  projectPoint3D(point: [number, number, number]): GraphScreenPoint | null;
  projectUserBounds(points: Array<[number, number]>): GraphScreenBounds | null;
  project3DBounds(points: Array<[number, number, number]>): GraphScreenBounds | null;
  getBoundsAnchor(bounds: GraphScreenBounds, anchor?: GraphScreenAnchor): GraphScreenPoint;
  createAnimationTrack(config: GraphAnimationTrackConfig): GraphAnimationTrack;
  getAnimationTrack(id: string): GraphAnimationTrack | null;
  getAnimationTracks(): GraphAnimationTrack[];
  removeAnimationTrack(id: string): void;
  hasPointAnnotations(): boolean;
  togglePointAnnotations(specs: GraphPointAnnotationSpec[], options?: GraphPointAnnotationOptions): boolean;
  clearPointAnnotations(): void;
  clampScreenPoint(point: GraphScreenPoint, padding?: GraphViewportPadding): GraphScreenPoint;
  setState(partialState: Partial<StateType>): void;
  notifyChange(): void;
  trackObject<T>(objectRef: T): T;
  createGroup(groupInput: GraphShapeGroupInput, options?: { id?: string; createNativeGroup?: boolean }): GraphShapeGroup;
  removeGroup(group: GraphShapeGroup): void;
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

export interface GraphAnimationCapabilityTarget {
  animation: AnimationCapabilityContract;
  animations: AnimationCollectionCapabilityContract;
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
      getViewport() {
        return thisRef.context.getViewport();
      },
      projectUserPoint(point) {
        return thisRef.context.projectUserPoint(point);
      },
      projectPoint3D(point) {
        return thisRef.context.projectPoint3D(point);
      },
      projectUserBounds(points) {
        return thisRef.context.projectUserBounds(points);
      },
      project3DBounds(points) {
        return thisRef.context.project3DBounds(points);
      },
      getBoundsAnchor(bounds, anchor) {
        return thisRef.context.getBoundsAnchor(bounds, anchor);
      },
      createAnimationTrack(config) {
        return thisRef.createAnimationTrack(config);
      },
      getAnimationTrack(id) {
        return thisRef.getAnimationTrack(id);
      },
      getAnimationTracks() {
        return thisRef.getAnimationTracks();
      },
      removeAnimationTrack(id) {
        thisRef.removeAnimationTrack(id);
      },
      hasPointAnnotations() {
        return thisRef.hasPointAnnotations();
      },
      togglePointAnnotations(specs, options) {
        return thisRef.togglePointAnnotations(specs, options);
      },
      clearPointAnnotations() {
        thisRef.clearPointAnnotations();
      },
      clampScreenPoint(point, padding) {
        return thisRef.context.clampScreenPoint(point, padding);
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
      createGroup(objectRefs, options) {
        return thisRef.createGroup(objectRefs, options);
      },
      removeGroup(group) {
        thisRef.removeGroup(group);
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

export const createAnimationCapabilityContract = (track: GraphAnimationTrack): AnimationCapabilityContract => ({
  id: track.id,
  label: track.label,
  isAnimating: track.isAnimating,
  isPaused: track.isPaused,
  loop: track.loop,
  yoyo: track.yoyo,
  progress: track.progress,
  min: track.min,
  max: track.max,
  step: track.step,
  playForward: () => track.playForward(),
  playBackward: () => track.playBackward(),
  pause: () => track.pause(),
  resume: () => track.resume(),
  stop: () => track.stop(),
  setLoop: (value) => track.setLoop(value),
  toggleLoop: () => track.toggleLoop(),
  setYoyo: (value) => track.setYoyo(value),
  toggleYoyo: () => track.toggleYoyo(),
  setProgress: (value) => track.setProgress(value)
});

export const createAnimationCapabilityCollection = (
  tracks: Record<string, GraphAnimationTrack | null | undefined>,
  options?: { primaryTrackId?: string }
): AnimationCollectionCapabilityContract | null => {
  const entries = Object.entries(tracks).filter((entry): entry is [string, GraphAnimationTrack] => !!entry[1]);
  if (entries.length === 0) return null;

  const capabilityTracks = Object.fromEntries(
    entries.map(([id, track]) => [id, createAnimationCapabilityContract(track)])
  ) as Record<string, AnimationCapabilityContract>;

  const primaryTrackId = options?.primaryTrackId && capabilityTracks[options.primaryTrackId]
    ? options.primaryTrackId
    : entries[0][0];

  return {
    primaryTrackId,
    tracks: capabilityTracks
  };
};

export const createAnimationCapabilityTarget = (
  tracks: Record<string, GraphAnimationTrack | null | undefined>,
  options?: { primaryTrackId?: string }
): GraphAnimationCapabilityTarget | null => {
  const animations = createAnimationCapabilityCollection(tracks, options);
  if (!animations) return null;

  const primaryTrackId = animations.primaryTrackId;
  const animation = primaryTrackId
    ? animations.tracks[primaryTrackId]
    : Object.values(animations.tracks)[0];

  if (!animation) return null;

  return {
    animation,
    animations
  };
};

export const createPointAnnotation = (
  key: string,
  point: any,
  options?: Pick<GraphPointAnnotationSpec, 'label' | 'attributes'>
): GraphPointAnnotationSpec => ({
  key,
  label: options?.label,
  attributes: options?.attributes,
  source: { kind: 'point', point }
});

export const createIntersectionAnnotation = (
  key: string,
  elements: any[],
  index = 0,
  options?: Pick<GraphPointAnnotationSpec, 'label' | 'attributes'>
): GraphPointAnnotationSpec => ({
  key,
  label: options?.label,
  attributes: options?.attributes,
  source: { kind: 'intersection', elements, index }
});

export const createPairwiseIntersectionAnnotations = (
  entries: Array<{ key: string; element: any }>,
  options?: {
    createKey?: (left: { key: string; element: any }, right: { key: string; element: any }) => string;
    attributes?: GraphPointAnnotationSpec['attributes'];
  }
): GraphPointAnnotationSpec[] => {
  const specs: GraphPointAnnotationSpec[] = [];

  for (let leftIndex = 0; leftIndex < entries.length; leftIndex += 1) {
    for (let rightIndex = leftIndex + 1; rightIndex < entries.length; rightIndex += 1) {
      const left = entries[leftIndex];
      const right = entries[rightIndex];
      specs.push(createIntersectionAnnotation(
        options?.createKey?.(left, right) ?? `${left.key}:${right.key}`,
        [left.element, right.element],
        0,
        { attributes: options?.attributes }
      ));
    }
  }

  return specs;
};

export const createMidpointAnnotation = (
  key: string,
  firstPoint: any,
  secondPoint: any,
  options?: Pick<GraphPointAnnotationSpec, 'label' | 'attributes'>
): GraphPointAnnotationSpec => ({
  key,
  label: options?.label,
  attributes: options?.attributes,
  source: { kind: 'midpoint', points: [firstPoint, secondPoint] }
});

export const createComputedPointAnnotation = (
  key: string,
  resolve: () => any,
  options?: Pick<GraphPointAnnotationSpec, 'label' | 'attributes'>
): GraphPointAnnotationSpec => ({
  key,
  label: options?.label,
  attributes: options?.attributes,
  source: { kind: 'computed', resolve }
});