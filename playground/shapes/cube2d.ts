import { createAnimationCapabilityTarget, createComposedShapeDefinition, type GraphShapeApi } from 'vuegraphx';
import type { ShapeCapabilityTarget } from 'vuegraphx';

interface Cube2DState {
  toolbarStyle: Record<string, string>;
  size: number;
  depth: number;
}

interface Cube2DPayload {
  x: number;
  y: number;
}

const getExpandProgress = (api: GraphShapeApi<Cube2DState>) => api.getAnimationTrack('expand')?.progress ?? 0;

const getUserPointFromArgs = (api: GraphShapeApi<Cube2DState>, args: any[]): [number, number] | null => {
  for (const arg of args) {
    const point = api.getUsrCoordFromEvent(arg);
    if (point) return point;
  }
  return null;
};

const lerpPoint = (from: [number, number], to: [number, number], t: number): [number, number] => [
  from[0] + (to[0] - from[0]) * t,
  from[1] + (to[1] - from[1]) * t
];

const getCubeGeometry = (api: GraphShapeApi<Cube2DState>, anchor: any) => {
  const centerX = anchor.X();
  const centerY = anchor.Y();
  const size = api.state.size;
  const depth = api.state.depth;
  const half = size / 2;
  const expand = getExpandProgress(api);
  const foldOffsetX = depth * 0.72;
  const foldOffsetY = depth * 0.38;
  const collapseEpsilon = size * 0.02;
  const baseY = centerY;

  const frontTL: [number, number] = [centerX - half, baseY + half];
  const frontTR: [number, number] = [centerX + half, baseY + half];
  const frontBR: [number, number] = [centerX + half, baseY - half];
  const frontBL: [number, number] = [centerX - half, baseY - half];

  const foldedTopOuterL: [number, number] = [frontTL[0] + foldOffsetX, frontTL[1] + foldOffsetY];
  const foldedTopOuterR: [number, number] = [frontTR[0] + foldOffsetX, frontTR[1] + foldOffsetY];
  const foldedRightOuterT: [number, number] = [frontTR[0] + foldOffsetX, frontTR[1] + foldOffsetY];
  const foldedRightOuterB: [number, number] = [frontBR[0] + foldOffsetX, frontBR[1] + foldOffsetY];

  const flatTopOuterL: [number, number] = [frontTL[0], frontTL[1] + size];
  const flatTopOuterR: [number, number] = [frontTR[0], frontTR[1] + size];
  const flatRightOuterT: [number, number] = [frontTR[0] + size, frontTR[1]];
  const flatRightOuterB: [number, number] = [frontBR[0] + size, frontBR[1]];
  const flatLeftOuterT: [number, number] = [frontTL[0] - size, frontTL[1]];
  const flatLeftOuterB: [number, number] = [frontBL[0] - size, frontBL[1]];
  const flatBottomOuterL: [number, number] = [frontBL[0], frontBL[1] - size];
  const flatBottomOuterR: [number, number] = [frontBR[0], frontBR[1] - size];
  const flatBackOuterT: [number, number] = [flatRightOuterT[0] + size, flatRightOuterT[1]];
  const flatBackOuterB: [number, number] = [flatRightOuterB[0] + size, flatRightOuterB[1]];

  const collapsedLeftOuterT: [number, number] = [frontTL[0] - collapseEpsilon, frontTL[1]];
  const collapsedLeftOuterB: [number, number] = [frontBL[0] - collapseEpsilon, frontBL[1]];
  const collapsedBottomOuterL: [number, number] = [frontBL[0], frontBL[1] - collapseEpsilon];
  const collapsedBottomOuterR: [number, number] = [frontBR[0], frontBR[1] - collapseEpsilon];
  const collapsedBackOuterT: [number, number] = [foldedRightOuterT[0] + collapseEpsilon, foldedRightOuterT[1]];
  const collapsedBackOuterB: [number, number] = [foldedRightOuterB[0] + collapseEpsilon, foldedRightOuterB[1]];

  const topOuterL = lerpPoint(foldedTopOuterL, flatTopOuterL, expand);
  const topOuterR = lerpPoint(foldedTopOuterR, flatTopOuterR, expand);
  const rightOuterT = lerpPoint(foldedRightOuterT, flatRightOuterT, expand);
  const rightOuterB = lerpPoint(foldedRightOuterB, flatRightOuterB, expand);
  const leftOuterT = lerpPoint(collapsedLeftOuterT, flatLeftOuterT, expand);
  const leftOuterB = lerpPoint(collapsedLeftOuterB, flatLeftOuterB, expand);
  const bottomOuterL = lerpPoint(collapsedBottomOuterL, flatBottomOuterL, expand);
  const bottomOuterR = lerpPoint(collapsedBottomOuterR, flatBottomOuterR, expand);
  const backOuterT = lerpPoint(collapsedBackOuterT, flatBackOuterT, expand);
  const backOuterB = lerpPoint(collapsedBackOuterB, flatBackOuterB, expand);

  return {
    frontTL,
    frontTR,
    frontBR,
    frontBL,
    topOuterL,
    topOuterR,
    rightOuterT,
    rightOuterB,
    leftOuterT,
    leftOuterB,
    bottomOuterL,
    bottomOuterR,
    backOuterT,
    backOuterB
  };
};

const projectToolbar = (api: GraphShapeApi<Cube2DState>, anchor: any) => {
  if (!api.selected) return;
  const geometry = getCubeGeometry(api, anchor);
  const bounds = api.projectUserBounds([
    geometry.frontTL,
    geometry.frontTR,
    geometry.frontBR,
    geometry.frontBL,
    geometry.topOuterL,
    geometry.topOuterR,
    geometry.rightOuterT,
    geometry.rightOuterB,
    geometry.leftOuterT,
    geometry.leftOuterB,
    geometry.bottomOuterL,
    geometry.bottomOuterR,
    geometry.backOuterT,
    geometry.backOuterB
  ]);
  if (!bounds) return;

  const anchorPoint = api.getBoundsAnchor(bounds, 'bottom');
  const clampedPoint = api.clampScreenPoint(
    { x: anchorPoint.x, y: anchorPoint.y + 22 },
    { left: 160, right: 160, top: 16, bottom: 90 }
  );

  const toolbarStyle = {
    left: `${clampedPoint.x}px`,
    top: `${clampedPoint.y}px`
  };

  if (api.state.toolbarStyle.left !== toolbarStyle.left || api.state.toolbarStyle.top !== toolbarStyle.top) {
    api.setState({ toolbarStyle });
    api.scheduleUiChange();
  }
};

const createPoint = (api: GraphShapeApi<Cube2DState>, resolver: (geometry: ReturnType<typeof getCubeGeometry>) => [number, number], anchor: any) => {
  return api.trackObject(api.board.create('point', [
    () => resolver(getCubeGeometry(api, anchor))[0],
    () => resolver(getCubeGeometry(api, anchor))[1]
  ], { visible: false, name: '' }));
};

const createCube2DComposition = (payload?: Cube2DPayload) => {
  let anchor: any = null;
  let dragOffset: [number, number] | null = null;
  let leftFace: any = null;
  let bottomFace: any = null;
  let backFace: any = null;

  const syncFoldedFaceVisibility = (api: GraphShapeApi<Cube2DState>) => {
    const visible = getExpandProgress(api) > 0.01;
    leftFace?.setAttribute({ visible });
    bottomFace?.setAttribute({ visible });
    backFace?.setAttribute({ visible });
  };

  return {
    entityType: 'cube-2d',
    initialState: {
      toolbarStyle: { left: '50%', top: 'calc(100% - 5rem)' },
      size: 2.8,
      depth: 1.05
    },
    setup(api: GraphShapeApi<Cube2DState>) {
      if (!api.board) return;

      anchor = api.trackObject(api.board.create('point', [payload?.x ?? 0, payload?.y ?? 0], {
        visible: false,
        fixed: false,
        name: ''
      }));

      const frontTL = createPoint(api, (geometry) => geometry.frontTL, anchor);
      const frontTR = createPoint(api, (geometry) => geometry.frontTR, anchor);
      const frontBR = createPoint(api, (geometry) => geometry.frontBR, anchor);
      const frontBL = createPoint(api, (geometry) => geometry.frontBL, anchor);
      const topOuterL = createPoint(api, (geometry) => geometry.topOuterL, anchor);
      const topOuterR = createPoint(api, (geometry) => geometry.topOuterR, anchor);
      const rightOuterT = createPoint(api, (geometry) => geometry.rightOuterT, anchor);
      const rightOuterB = createPoint(api, (geometry) => geometry.rightOuterB, anchor);
      const leftOuterT = createPoint(api, (geometry) => geometry.leftOuterT, anchor);
      const leftOuterB = createPoint(api, (geometry) => geometry.leftOuterB, anchor);
      const bottomOuterL = createPoint(api, (geometry) => geometry.bottomOuterL, anchor);
      const bottomOuterR = createPoint(api, (geometry) => geometry.bottomOuterR, anchor);
      const backOuterT = createPoint(api, (geometry) => geometry.backOuterT, anchor);
      const backOuterB = createPoint(api, (geometry) => geometry.backOuterB, anchor);

      const top = api.trackObject(api.board.create('polygon', [frontTL, frontTR, topOuterR, topOuterL], {
        fillColor: '#c7d2fe',
        fillOpacity: 0.94,
        borders: { strokeWidth: 2, strokeColor: '#4338ca' },
        vertices: { visible: false },
        highlight: false,
        fixed: false,
        hasInnerPoints: true
      }));
      const right = api.trackObject(api.board.create('polygon', [frontTR, rightOuterT, rightOuterB, frontBR], {
        fillColor: '#4f46e5',
        fillOpacity: 0.94,
        borders: { strokeWidth: 2, strokeColor: '#312e81' },
        vertices: { visible: false },
        highlight: false,
        fixed: false,
        hasInnerPoints: true
      }));
      const front = api.trackObject(api.board.create('polygon', [frontTL, frontTR, frontBR, frontBL], {
        fillColor: '#818cf8',
        fillOpacity: 0.96,
        borders: { strokeWidth: 2, strokeColor: '#3730a3' },
        vertices: { visible: false },
        highlight: false,
        fixed: false,
        hasInnerPoints: true
      }));
      leftFace = api.trackObject(api.board.create('polygon', [leftOuterT, frontTL, frontBL, leftOuterB], {
        fillColor: '#a5b4fc',
        fillOpacity: 0.9,
        borders: { strokeWidth: 2, strokeColor: '#4f46e5' },
        vertices: { visible: false },
        highlight: false,
        fixed: false,
        hasInnerPoints: true,
        visible: false
      }));
      bottomFace = api.trackObject(api.board.create('polygon', [frontBL, frontBR, bottomOuterR, bottomOuterL], {
        fillColor: '#cbd5e1',
        fillOpacity: 0.92,
        borders: { strokeWidth: 2, strokeColor: '#64748b' },
        vertices: { visible: false },
        highlight: false,
        fixed: false,
        hasInnerPoints: true,
        visible: false
      }));
      backFace = api.trackObject(api.board.create('polygon', [rightOuterT, backOuterT, backOuterB, rightOuterB], {
        fillColor: '#e0e7ff',
        fillOpacity: 0.92,
        borders: { strokeWidth: 2, strokeColor: '#6366f1' },
        vertices: { visible: false },
        highlight: false,
        fixed: false,
        hasInnerPoints: true,
        visible: false
      }));

      const cubeGroup = api.createGroup({
        anchor,
        top,
        right,
        front,
        left: leftFace,
        bottom: bottomFace,
        back: backFace,
        frontTL,
        frontTR,
        frontBR,
        frontBL,
        topOuterL,
        topOuterR,
        rightOuterT,
        rightOuterB,
        leftOuterT,
        leftOuterB,
        bottomOuterL,
        bottomOuterR,
        backOuterT,
        backOuterB
      }, { createNativeGroup: false });

      cubeGroup.hide([
        'anchor',
        'frontTL',
        'frontTR',
        'frontBR',
        'frontBL',
        'topOuterL',
        'topOuterR',
        'rightOuterT',
        'rightOuterB',
        'leftOuterT',
        'leftOuterB',
        'bottomOuterL',
        'bottomOuterR',
        'backOuterT',
        'backOuterB'
      ]);
      cubeGroup.bindSelectOnHit({ keys: ['front', 'top', 'right', 'left', 'bottom', 'back'] });
      cubeGroup.bindDrag({
        keys: ['front', 'top', 'right', 'left', 'bottom', 'back'],
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
          if (!point || !dragOffset) return;
          anchor.moveTo([point[0] + dragOffset[0], point[1] + dragOffset[1]], 0);
          projectToolbar(api, anchor);
          api.board?.update();
        },
        onEnd: () => {
          dragOffset = null;
        }
      });

      api.createAnimationTrack({
        id: 'expand',
        label: '六面展开',
        initialProgress: 0,
        min: 0,
        max: 1,
        step: 0.01,
        duration: 1200,
        onProgress: () => {
          syncFoldedFaceVisibility(api);
          api.board?.update();
        }
      });

      syncFoldedFaceVisibility(api);
      projectToolbar(api, anchor);
      api.board.update();
    },
    onSelectionChange(api: GraphShapeApi<Cube2DState>) {
      if (anchor) projectToolbar(api, anchor);
    },
    onBoardUpdate(api: GraphShapeApi<Cube2DState>) {
      if (api.selected && anchor) {
        projectToolbar(api, anchor);
      }
    },
    onDestroy(api: GraphShapeApi<Cube2DState>) {
      api.removeAnimationTrack('expand');
    },
    getCapabilityTarget(api: GraphShapeApi<Cube2DState>): ShapeCapabilityTarget | null {
      if (!api.selected || !anchor) return null;
      const expandTrack = api.getAnimationTrack('expand');
      if (!expandTrack) return null;

      const animationCapabilityTarget = createAnimationCapabilityTarget(
        { expand: expandTrack },
        { primaryTrackId: 'expand' }
      );
      if (!animationCapabilityTarget) return null;

      return {
        entityType: 'cube-2d',
        entityId: api.id,
        entity: { id: api.id, points: [], faces: [], scene: 'cube-net' },
        ui: {
          toolbarStyle: { ...api.state.toolbarStyle }
        },
        animations: animationCapabilityTarget.animations,
        animation: animationCapabilityTarget.animation,
        remove: () => api.remove()
      };
    }
  };
};

export const cube2DShapeDefinition = createComposedShapeDefinition<Cube2DPayload | void, Cube2DState>({
  type: 'cube-2d',
  supportedModes: 'geometry',
  create(_context, payload) {
    if (payload && Number.isFinite(payload.x) && Number.isFinite(payload.y)) {
      return createCube2DComposition(payload);
    }
    return createCube2DComposition();
  },
  createFromDrop(context, event) {
    if (event.dataTransfer?.getData('shape') !== 'cube-2d') return null;
    const userCoords = context.getUsrCoordFromEvent(event);
    if (!userCoords) return null;
    return createCube2DComposition({ x: userCoords[0], y: userCoords[1] });
  }
});