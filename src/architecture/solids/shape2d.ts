import type { ShapeCapabilityTarget } from '../capabilities/contracts';
import {
  createAnimationCapabilityTarget,
  createComposedShapeDefinition,
  type GraphShapeApi
} from '../shapes/composition';
import type {
  GraphShapeContext,
  GraphShapeDefinition,
  GraphShapeGroup,
  GraphViewportPadding
} from '../shapes/contracts';
import { renderSolidTopology2D } from './renderer2d';
import type {
  GraphSolidPatch,
  GraphSolidPoint2D,
  GraphSolidState,
  GraphSolidTopology
} from './contracts';

export interface GraphSolid2DToolbarState {
  toolbarStyle: Record<string, string>;
}

export interface GraphSolid2DScene {
  group: GraphShapeGroup;
  patchIds: string[];
  patchPolygons: Record<string, any>;
  syncVisibility(): void;
  getAllPoints(): Array<[number, number]>;
  getPatchOutline(patchId: string): Array<[number, number]>;
}

export interface CreateSolid2DSceneOptions<StateType> {
  api: GraphShapeApi<StateType>;
  anchor: any;
  topology: GraphSolidTopology;
  getAnchor: () => GraphSolidPoint2D;
  getRenderState: () => Partial<GraphSolidState>;
  patchOrder?: string[];
  isPatchVisible?: (patch: GraphSolidPatch) => boolean;
}

export interface GraphSolid2DAnimationTrackSpec<StateType> {
  id: string;
  label: string;
  initialProgress?: number;
  min?: number;
  max?: number;
  step?: number;
  duration?: number;
  onProgress?: (api: GraphShapeApi<StateType>, scene: GraphSolid2DScene) => void;
}

export interface CreateSolid2DShapeDefinitionOptions<Payload, StateType extends GraphSolid2DToolbarState> {
  type: string;
  entityType?: string;
  supportedModes?: GraphShapeDefinition['supportedModes'];
  createInitialState: (payload?: Payload) => StateType;
  getAnchorPosition: (payload?: Payload) => [number, number];
  createTopology: (api: GraphShapeApi<StateType>, payload?: Payload) => GraphSolidTopology;
  getRenderState: (api: GraphShapeApi<StateType>) => Partial<GraphSolidState>;
  createScene?: (api: GraphShapeApi<StateType>, options: {
    anchor: any;
    topology: GraphSolidTopology;
    payload?: Payload;
  }) => GraphSolid2DScene;
  patchOrder?: string[] | ((api: GraphShapeApi<StateType>, topology: GraphSolidTopology, payload?: Payload) => string[]);
  isPatchVisible?: (api: GraphShapeApi<StateType>, patch: GraphSolidPatch) => boolean;
  tracks: GraphSolid2DAnimationTrackSpec<StateType>[];
  primaryTrackId?: string;
  toolbarOffsetY?: number;
  toolbarPadding?: GraphViewportPadding;
  createEntity?: (api: GraphShapeApi<StateType>, topology: GraphSolidTopology) => Record<string, unknown>;
  createFromDrop?: (context: GraphShapeContext, event: DragEvent) => Payload | null;
  setup?: (api: GraphShapeApi<StateType>) => void | (() => void);
  getCapabilityTarget?: (api: GraphShapeApi<StateType>) => Record<string, unknown>;
}

const toTuplePoints = (points: GraphSolidPoint2D[]): Array<[number, number]> => points.map((point) => [point.x, point.y]);

export const createSolid2DScene = <StateType>({
  api,
  anchor,
  topology,
  getAnchor,
  getRenderState,
  patchOrder,
  isPatchVisible
}: CreateSolid2DSceneOptions<StateType>): GraphSolid2DScene => {
  const renderScene = () => renderSolidTopology2D(topology, getRenderState(), {
    anchor: getAnchor(),
    sortByDepth: false,
    isPatchVisible
  });

  const getPatchMap = () => new Map(renderScene().patches.map((patch) => [patch.patchId, patch]));
  const initialPatchMap = getPatchMap();
  const orderedPatchIds = patchOrder ?? topology.patches.map((patch) => patch.id);
  const patchPolygons: Record<string, any> = {};
  const groupMembers: Record<string, any> = { anchor };
  const hiddenKeys = ['anchor'];

  orderedPatchIds.forEach((patchId) => {
    const renderedPatch = initialPatchMap.get(patchId);
    if (!renderedPatch || renderedPatch.outline.length < 3) return;

    const patch = topology.patches.find((candidate) => candidate.id === patchId);
    if (!patch) return;

    const points = renderedPatch.outline.map((_, index) => {
      const pointKey = `${patchId}_point_${index}`;
      const point = api.trackObject(api.board.create('point', [
        () => getPatchMap().get(patchId)?.outline[index]?.x ?? getAnchor().x,
        () => getPatchMap().get(patchId)?.outline[index]?.y ?? getAnchor().y
      ], { visible: false, name: '' }));
      groupMembers[pointKey] = point;
      hiddenKeys.push(pointKey);
      return point;
    });

    patchPolygons[patchId] = api.trackObject(api.board.create('polygon', points, {
      fillColor: patch.style?.fillColor,
      fillOpacity: patch.style?.fillOpacity,
      borders: {
        strokeWidth: patch.style?.strokeWidth,
        strokeColor: patch.style?.strokeColor
      },
      vertices: { visible: false },
      highlight: false,
      fixed: false,
      hasInnerPoints: true,
      visible: renderedPatch.visible
    }));
    groupMembers[patchId] = patchPolygons[patchId];
  });

  const group = api.createGroup(groupMembers, { createNativeGroup: false });
  group.hide(hiddenKeys);

  return {
    group,
    patchIds: orderedPatchIds.filter((patchId) => !!patchPolygons[patchId]),
    patchPolygons,
    syncVisibility() {
      const patchMap = getPatchMap();
      Object.entries(patchPolygons).forEach(([patchId, polygon]) => {
        polygon.setAttribute({ visible: patchMap.get(patchId)?.visible ?? true });
      });
    },
    getAllPoints() {
      return renderScene().patches.flatMap((patch) => toTuplePoints(patch.outline));
    },
    getPatchOutline(patchId: string) {
      const patch = getPatchMap().get(patchId);
      return patch ? toTuplePoints(patch.outline) : [];
    }
  };
};

const getUserPointFromArgs = <StateType>(api: GraphShapeApi<StateType>, args: any[]): [number, number] | null => {
  for (const arg of args) {
    const point = api.getUsrCoordFromEvent(arg);
    if (point) return point;
  }
  return null;
};

const projectToolbar = <StateType extends GraphSolid2DToolbarState>(
  api: GraphShapeApi<StateType>,
  scene: GraphSolid2DScene,
  toolbarOffsetY: number,
  toolbarPadding: GraphViewportPadding
) => {
  if (!api.selected) return;
  const bounds = api.projectUserBounds(scene.getAllPoints());
  if (!bounds) return;

  const anchorPoint = api.getBoundsAnchor(bounds, 'bottom');
  const clampedPoint = api.clampScreenPoint(
    { x: anchorPoint.x, y: anchorPoint.y + toolbarOffsetY },
    toolbarPadding
  );

  const toolbarStyle = {
    left: `${clampedPoint.x}px`,
    top: `${clampedPoint.y}px`
  };

  if (api.state.toolbarStyle.left !== toolbarStyle.left || api.state.toolbarStyle.top !== toolbarStyle.top) {
    api.setState({ toolbarStyle } as unknown as Partial<StateType>);
    api.scheduleUiChange();
  }
};

export const createSolid2DShapeDefinition = <Payload = unknown, StateType extends GraphSolid2DToolbarState = GraphSolid2DToolbarState>(
  options: CreateSolid2DShapeDefinitionOptions<Payload, StateType>
) => {
  const createComposition = (payload?: Payload) => {
    let anchor: any = null;
    let dragOffset: [number, number] | null = null;
    let scene: GraphSolid2DScene | null = null;
    let topology: GraphSolidTopology | null = null;
    let cleanup: void | (() => void) = undefined;

    return {
      entityType: options.entityType ?? options.type,
      initialState: options.createInitialState(payload),
      setup(api: GraphShapeApi<StateType>) {
        if (!api.board) return;

        const anchorPosition = options.getAnchorPosition(payload);
        anchor = api.trackObject(api.board.create('point', [anchorPosition[0], anchorPosition[1]], {
          visible: false,
          fixed: false,
          name: ''
        }));

        topology = options.createTopology(api, payload);
        const patchOrder = typeof options.patchOrder === 'function'
          ? options.patchOrder(api, topology, payload)
          : options.patchOrder;

        scene = options.createScene
          ? options.createScene(api, { anchor, topology, payload })
          : createSolid2DScene({
              api,
              anchor,
              topology,
              getAnchor: () => ({ x: anchor.X(), y: anchor.Y() }),
              getRenderState: () => options.getRenderState(api),
              patchOrder,
              isPatchVisible: options.isPatchVisible ? (patch) => options.isPatchVisible!(api, patch) : undefined
            });

        const sceneKeys = scene.patchIds;
        scene.group.bindSelectOnHit({ keys: sceneKeys });
        scene.group.bindDrag({
          keys: sceneKeys,
          selectOnStart: true,
          onStart: (_member, ...args) => {
            const point = getUserPointFromArgs(api, args);
            if (!point) {
              dragOffset = null;
              return;
            }
            dragOffset = [anchor.X() - point[0], anchor.Y() - point[1]];
          },
          onMove: (_member, ...args) => {
            const point = getUserPointFromArgs(api, args);
            if (!point || !dragOffset || !scene) return;
            anchor.moveTo([point[0] + dragOffset[0], point[1] + dragOffset[1]], 0);
            projectToolbar(
              api,
              scene,
              options.toolbarOffsetY ?? 22,
              options.toolbarPadding ?? { left: 160, right: 160, top: 16, bottom: 90 }
            );
            api.board?.update();
          },
          onEnd: () => {
            dragOffset = null;
          }
        });

        options.tracks.forEach((track) => {
          api.createAnimationTrack({
            id: track.id,
            label: track.label,
            initialProgress: track.initialProgress ?? 0,
            min: track.min ?? 0,
            max: track.max ?? 1,
            step: track.step ?? 0.01,
            duration: track.duration ?? 1200,
            onProgress: () => {
              scene?.syncVisibility();
              if (scene && track.onProgress) {
                track.onProgress(api, scene);
              }
              api.board?.update();
            }
          });
        });

        scene.syncVisibility();
        projectToolbar(
          api,
          scene,
          options.toolbarOffsetY ?? 22,
          options.toolbarPadding ?? { left: 160, right: 160, top: 16, bottom: 90 }
        );

        if (options.setup) {
          cleanup = options.setup(api);
        }

        api.board.update();
      },
      onSelectionChange(api: GraphShapeApi<StateType>) {
        if (scene) {
          projectToolbar(
            api,
            scene,
            options.toolbarOffsetY ?? 22,
            options.toolbarPadding ?? { left: 160, right: 160, top: 16, bottom: 90 }
          );
        }
      },
      onBoardUpdate(api: GraphShapeApi<StateType>) {
        if (api.selected && scene) {
          projectToolbar(
            api,
            scene,
            options.toolbarOffsetY ?? 22,
            options.toolbarPadding ?? { left: 160, right: 160, top: 16, bottom: 90 }
          );
        }
      },
      onDestroy(api: GraphShapeApi<StateType>) {
        options.tracks.forEach((track) => {
          api.removeAnimationTrack(track.id);
        });
        if (typeof cleanup === 'function') {
          cleanup();
        }
      },
      getCapabilityTarget(api: GraphShapeApi<StateType>): ShapeCapabilityTarget | null {
        if (!api.selected || !topology) return null;

        const trackMap = Object.fromEntries(
          options.tracks
            .map((track) => [track.id, api.getAnimationTrack(track.id)])
            .filter((entry): entry is [string, NonNullable<ReturnType<typeof api.getAnimationTrack>>] => !!entry[1])
        );

        if (Object.keys(trackMap).length !== options.tracks.length) return null;

        const animationCapabilityTarget = createAnimationCapabilityTarget(trackMap, {
          primaryTrackId: options.primaryTrackId ?? options.tracks[0]?.id
        });
        if (!animationCapabilityTarget) return null;

        return {
          entityType: options.entityType ?? options.type,
          entityId: api.id,
          entity: options.createEntity
            ? options.createEntity(api, topology)
            : { id: api.id, points: [], faces: topology.patches.map((patch) => patch.id) },
          ui: {
            toolbarStyle: { ...api.state.toolbarStyle }
          },
          animations: animationCapabilityTarget.animations,
          animation: animationCapabilityTarget.animation,
          remove: () => api.remove(),
          ...(options.getCapabilityTarget ? options.getCapabilityTarget(api) : {})
        };
      }
    };
  };

  return createComposedShapeDefinition<Payload, StateType>({
    type: options.type,
    supportedModes: options.supportedModes ?? 'geometry',
    create(_context, payload) {
      return createComposition(payload);
    },
    createFromDrop: options.createFromDrop
      ? (context, event) => {
          const payload = options.createFromDrop?.(context, event);
          return payload === null ? null : createComposition(payload as Payload);
        }
      : undefined
  });
};
