import { type GraphShapeApi } from 'vuegraphx';
import {
  createConeSolidTopology,
  createSolid2DShapeDefinition,
  createSolidState,
  degToRad,
  type GraphSolid2DToolbarState
} from './solidInternals';

interface Cone2DState extends GraphSolid2DToolbarState {
  radius: number;
  height: number;
}

interface Cone2DPayload {
  x: number;
  y: number;
}

const getUnfoldProgress = (api: GraphShapeApi<Cone2DState>) => api.getAnimationTrack('unfold')?.progress ?? 0;
const getRotateProgress = (api: GraphShapeApi<Cone2DState>) => api.getAnimationTrack('rotate')?.progress ?? 0;
const getExplodeProgress = (api: GraphShapeApi<Cone2DState>) => api.getAnimationTrack('explode')?.progress ?? 0;

const createRendererState = (api: GraphShapeApi<Cone2DState>) => createSolidState({
  viewMode: 'hybrid',
  unfoldProgress: getUnfoldProgress(api),
  explodeProgress: getExplodeProgress(api),
  rotationX: degToRad(-22),
  rotationY: degToRad(28) + getRotateProgress(api) * Math.PI * 2
});

export const cone2DShapeDefinition = createSolid2DShapeDefinition<Cone2DPayload | void, Cone2DState>({
  type: 'cone-2d',
  entityType: 'cone-2d',
  createInitialState() {
    return {
      toolbarStyle: { left: '50%', top: 'calc(100% - 5rem)' },
      radius: 1.45,
      height: 3.2
    };
  },
  getAnchorPosition(payload) {
    return payload && Number.isFinite(payload.x) && Number.isFinite(payload.y)
      ? [payload.x, payload.y]
      : [0, 0];
  },
  createTopology(api) {
    return createConeSolidTopology({
      radius: api.state.radius,
      height: api.state.height,
      radialSegments: 36
    });
  },
  getRenderState(api) {
    return createRendererState(api);
  },
  patchOrder: ['base', 'lateral'],
  tracks: [
    { id: 'unfold', label: '圆锥展开', duration: 1200 },
    { id: 'rotate', label: '投影旋转', duration: 1800 },
    { id: 'explode', label: '分层散开', duration: 1000 }
  ],
  primaryTrackId: 'unfold',
  createEntity(api, topology) {
    return { id: api.id, points: [], faces: topology.patches.map((patch) => patch.id), scene: 'cone-net' };
  },
  createFromDrop(context, event) {
    if (event.dataTransfer?.getData('shape') !== 'cone-2d') return null;
    const userCoords = context.getUsrCoordFromEvent(event);
    if (!userCoords) return null;
    return { x: userCoords[0], y: userCoords[1] };
  }
});
