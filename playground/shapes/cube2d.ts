import { createSolid2DShapeDefinition, createSolidState, degToRad, type GraphShapeApi, type GraphSolid2DToolbarState } from 'vuegraphx';
import {
  createCuboidFoldLikeScene2D,
  cuboidFaceIds,
  getCuboidTopology,
  shouldShowCuboidFace,
  type CuboidFaceId
} from './cuboidShared';

interface Cube2DState extends GraphSolid2DToolbarState {
  size: number;
}

interface Cube2DPayload {
  x: number;
  y: number;
}

const getUnfoldProgress = (api: GraphShapeApi<Cube2DState>) => api.getAnimationTrack('unfold')?.progress ?? 0;
const getRotateProgress = (api: GraphShapeApi<Cube2DState>) => api.getAnimationTrack('rotate')?.progress ?? 0;
const getExplodeProgress = (api: GraphShapeApi<Cube2DState>) => api.getAnimationTrack('explode')?.progress ?? 0;

const createRendererState = (api: GraphShapeApi<Cube2DState>) => createSolidState({
  viewMode: 'hybrid',
  unfoldProgress: getUnfoldProgress(api),
  explodeProgress: getExplodeProgress(api),
  rotationX: degToRad(-28),
  rotationY: degToRad(34) + getRotateProgress(api) * Math.PI * 2
});
export const cube2DShapeDefinition = createSolid2DShapeDefinition<Cube2DPayload | void, Cube2DState>({
  type: 'cube-2d',
  entityType: 'cube-2d',
  createInitialState() {
    return {
      toolbarStyle: { left: '50%', top: 'calc(100% - 5rem)' },
      size: 2.8
    };
  },
  getAnchorPosition(payload) {
    return payload && Number.isFinite(payload.x) && Number.isFinite(payload.y)
      ? [payload.x, payload.y]
      : [0, 0];
  },
  createTopology(api) {
    return getCuboidTopology(api.state.size);
  },
  getRenderState(api) {
    return createRendererState(api);
  },
  createScene(api, { anchor }) {
    return createCuboidFoldLikeScene2D({
      api,
      anchor,
      edgeSize: api.state.size,
      getUnfoldProgress: () => getUnfoldProgress(api),
      getRotateProgress: () => getRotateProgress(api),
      getExplodeProgress: () => getExplodeProgress(api),
      patchOrder: ['back', 'left', 'bottom', 'front', 'right', 'top']
    });
  },
  patchOrder: ['back', 'left', 'bottom', 'front', 'right', 'top'],
  isPatchVisible(api, patch) {
    return shouldShowCuboidFace(patch.id as CuboidFaceId, getUnfoldProgress(api));
  },
  tracks: [
    {
      id: 'unfold',
      label: '六面展开',
      duration: 1200
    },
    {
      id: 'rotate',
      label: '投影旋转',
      duration: 1800
    },
    {
      id: 'explode',
      label: '分面散开',
      duration: 1000
    }
  ],
  primaryTrackId: 'unfold',
  createEntity(api) {
    return { id: api.id, points: [], faces: [...cuboidFaceIds], scene: 'cube-net' };
  },
  createFromDrop(context, event) {
    if (event.dataTransfer?.getData('shape') !== 'cube-2d') return null;
    const userCoords = context.getUsrCoordFromEvent(event);
    if (!userCoords) return null;
    return { x: userCoords[0], y: userCoords[1] };
  }
});