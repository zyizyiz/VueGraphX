import {
  createCylinderSolidTopology,
  createSolid2DShapeDefinition,
  createSolidState,
  degToRad,
  type GraphShapeApi,
  type GraphSolid2DToolbarState
} from 'vuegraphx';

interface Cylinder2DState extends GraphSolid2DToolbarState {
  radius: number;
  height: number;
}

interface Cylinder2DPayload {
  x: number;
  y: number;
}

const getUnfoldProgress = (api: GraphShapeApi<Cylinder2DState>) => api.getAnimationTrack('unfold')?.progress ?? 0;
const getRotateProgress = (api: GraphShapeApi<Cylinder2DState>) => api.getAnimationTrack('rotate')?.progress ?? 0;
const getExplodeProgress = (api: GraphShapeApi<Cylinder2DState>) => api.getAnimationTrack('explode')?.progress ?? 0;

const createRendererState = (api: GraphShapeApi<Cylinder2DState>) => createSolidState({
  viewMode: 'hybrid',
  unfoldProgress: getUnfoldProgress(api),
  explodeProgress: getExplodeProgress(api),
  rotationX: degToRad(-24),
  rotationY: degToRad(32) + getRotateProgress(api) * Math.PI * 2
});

const shouldShowCylinderPatch = (patchId: string, unfoldProgress: number): boolean => {
  if (patchId !== 'bottom') return true;
  return unfoldProgress > 0.01;
};

export const cylinder2DShapeDefinition = createSolid2DShapeDefinition<Cylinder2DPayload | void, Cylinder2DState>({
  type: 'cylinder-2d',
  entityType: 'cylinder-2d',
  createInitialState() {
    return {
      toolbarStyle: { left: '50%', top: 'calc(100% - 5rem)' },
      radius: 1.35,
      height: 3.1
    };
  },
  getAnchorPosition(payload) {
    return payload && Number.isFinite(payload.x) && Number.isFinite(payload.y)
      ? [payload.x, payload.y]
      : [0, 0];
  },
  createTopology(api) {
    return createCylinderSolidTopology({
      radius: api.state.radius,
      height: api.state.height,
      radialSegments: 36
    });
  },
  getRenderState(api) {
    return createRendererState(api);
  },
  patchOrder: ['bottom', 'lateral', 'top'],
  isPatchVisible(api, patch) {
    return shouldShowCylinderPatch(patch.id, getUnfoldProgress(api));
  },
  tracks: [
    { id: 'unfold', label: '圆柱展开', duration: 1200 },
    { id: 'rotate', label: '投影旋转', duration: 1800 },
    { id: 'explode', label: '分层散开', duration: 1000 }
  ],
  primaryTrackId: 'unfold',
  createEntity(api, topology) {
    return { id: api.id, points: [], faces: topology.patches.map((patch) => patch.id), scene: 'cylinder-net' };
  },
  createFromDrop(context, event) {
    if (event.dataTransfer?.getData('shape') !== 'cylinder-2d') return null;
    const userCoords = context.getUsrCoordFromEvent(event);
    if (!userCoords) return null;
    return { x: userCoords[0], y: userCoords[1] };
  }
});
