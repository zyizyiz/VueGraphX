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
  manualRotateX: number;
  manualRotateY: number;
  isManualRotating: boolean;
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
      size: 2.8,
      manualRotateX: 0,
      manualRotateY: 0,
      isManualRotating: false
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
  setup(api) {
    let lastPos: [number, number] | null = null;
    let isDragging = false;

    const onDown = (e: any) => {
      if (!api.state.isManualRotating || !api.selected) return;
      isDragging = true;
      lastPos = api.getUsrCoordFromEvent(e);
    };

    const onMove = (e: any) => {
      if (!isDragging || !lastPos || !api.selected) return;
      const currentPos = api.getUsrCoordFromEvent(e);
      if (!currentPos) return;

      const dx = currentPos[0] - lastPos[0];
      const dy = currentPos[1] - lastPos[1];
      
      // 灵敏度换算：屏幕坐标差映射到角度。
      // 为保证交互直观，左右拖动对应 Y轴旋转，上下拖动对应 X轴旋转
      const sensitivity = 50; 
      const newX = api.state.manualRotateX - dy * sensitivity;
      const newY = api.state.manualRotateY + dx * sensitivity;

      api.setState({
        manualRotateX: newX,
        manualRotateY: newY
      });
      
      lastPos = currentPos;
      api.board?.update();
    };

    const onUp = () => {
      isDragging = false;
      lastPos = null;
    };

    api.board?.on('down', onDown);
    api.board?.on('move', onMove);
    window.addEventListener('mouseup', onUp);

    return () => {
      api.board?.off('down', onDown);
      api.board?.off('move', onMove);
      window.removeEventListener('mouseup', onUp);
    };
  },
  getCapabilityTarget(api) {
    return {
      toggleManualRotation: () => {
        const next = !api.state.isManualRotating;
        api.setState({ isManualRotating: next });
        
        // 开启手动后暂停自动旋转，反之亦然
        if (next) {
          api.getAnimationTrack('rotate')?.pause();
        } else {
          api.getAnimationTrack('rotate')?.resume();
        }
        api.scheduleUiChange();
      }
    };
  },
  patchOrder: ['back', 'left', 'bottom', 'front', 'right', 'top'],
  isPatchVisible(api, patch) {
    return shouldShowCuboidFace(patch.id as CuboidFaceId, getUnfoldProgress(api));
  },
  tracks: [
    { id: 'unfold', label: '六面展开', duration: 1200 },
    { id: 'rotate', label: '投影旋转', duration: 1800 },
    { id: 'explode', label: '分面散开', duration: 1000 }
  ],
  primaryTrackId: 'unfold',
  createEntity(api) {
    return { 
      id: api.id, 
      points: [], 
      faces: [...cuboidFaceIds], 
      scene: 'cube-net',
      isManualRotating: api.state.isManualRotating
    };
  },
  createFromDrop(context, event) {
    if (event.dataTransfer?.getData('shape') !== 'cube-2d') return null;
    const userCoords = context.getUsrCoordFromEvent(event);
    if (!userCoords) return null;
    return { x: userCoords[0], y: userCoords[1] };
  }
});