import { createAnimationCapabilityTarget, createComposedShapeDefinition, type GraphShapeApi } from 'vuegraphx';
import type { ShapeCapabilityTarget } from 'vuegraphx';
import { cuboidFaceIds, cuboidFaceStyles, getCuboidFaceVertices3D, getCuboidVertices3D, type CuboidFaceId } from './cuboidShared';

interface CubeState {
  toolbarStyle: Record<string, string>;
  halfEdge: number;
}

const getUnfoldProgress = (api: GraphShapeApi<CubeState>) => api.getAnimationTrack('unfold')?.progress ?? 0;
const getRotateProgress = (api: GraphShapeApi<CubeState>) => api.getAnimationTrack('rotate')?.progress ?? 0;

const getEdgeSize = (api: GraphShapeApi<CubeState>) => api.state.halfEdge * 2;

const updateToolbarPosition = (api: GraphShapeApi<CubeState>) => {
  if (!api.selected) return;
  const bounds = api.project3DBounds(getCuboidVertices3D(getEdgeSize(api), getUnfoldProgress(api), getRotateProgress(api)));
  if (!bounds) return;
  const screenPoint = api.getBoundsAnchor(bounds, 'bottom');

  const clampedPoint = api.clampScreenPoint(
    { x: screenPoint.x, y: screenPoint.y + 24 },
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

const createFacePoints = (api: GraphShapeApi<CubeState>, faceId: CuboidFaceId): Array<() => [number, number, number]> => [0, 1, 2, 3].map((index) => () => {
  return getCuboidFaceVertices3D(getEdgeSize(api), getUnfoldProgress(api), getRotateProgress(api), faceId)[index] ?? [0, 0, 0];
});

export const cubeShapeDefinition = createComposedShapeDefinition<void, CubeState>({
  type: 'cube',
  supportedModes: '3d',
  create() {
    return {
      entityType: 'cube',
      initialState: {
        toolbarStyle: { left: '50%', top: 'calc(100% - 5rem)' },
        halfEdge: 1
      },
      setup(api) {
        const view3d = api.engine.getView3D();
        if (!api.board || !view3d) return;
        api.createAnimationTrack({
          id: 'unfold',
          label: '展开',
          initialProgress: 0,
          min: 0,
          max: 1,
          step: 0.01,
          duration: 1500,
          onProgress: () => {
            api.board?.update();
          }
        });
        api.createAnimationTrack({
          id: 'rotate',
          label: '旋转',
          initialProgress: 0,
          min: 0,
          max: 1,
          step: 0.01,
          duration: 1800,
          onProgress: () => {
            api.board?.update();
          }
        });

        const groupedObjects: any[] = [];

        cuboidFaceIds.forEach((faceId, index) => {
          const corners = createFacePoints(api, faceId);
          const faceStyle = cuboidFaceStyles[faceId];
          const p1 = api.trackObject(view3d.create('point3d', corners[0], { visible: false }));
          const p2 = api.trackObject(view3d.create('point3d', corners[1], { visible: false }));
          const p3 = api.trackObject(view3d.create('point3d', corners[2], { visible: false }));
          const p4 = api.trackObject(view3d.create('point3d', corners[3], { visible: false }));
          const polygon = api.trackObject(view3d.create('polygon3d', [p1, p2, p3, p4], {
            fillColor: faceStyle.fillColor,
            fillOpacity: Math.min(faceStyle.fillOpacity, 0.85),
            borders: { strokeWidth: 1.5, strokeColor: faceStyle.strokeColor }
          }));
          const faceGroup = api.createGroup({ p1, p2, p3, p4, face: polygon }, { id: `cube_face_${index}_${faceId}`, createNativeGroup: false });
          faceGroup.hide(['p1', 'p2', 'p3', 'p4']);
          faceGroup.bindSelectOnHit({ keys: 'face' });
          groupedObjects.push(p1, p2, p3, p4, polygon);
        });

        api.createGroup(groupedObjects, { createNativeGroup: false });
        api.board.update();
      },
      onSelectionChange(api) {
        updateToolbarPosition(api);
      },
      onBoardUpdate(api) {
        if (api.selected) updateToolbarPosition(api);
      },
      onDestroy(api) {
        api.removeAnimationTrack('unfold');
        api.removeAnimationTrack('rotate');
      },
      getCapabilityTarget(api): ShapeCapabilityTarget | null {
        if (!api.selected) return null;

        const unfoldTrack = api.getAnimationTrack('unfold');
        const rotateTrack = api.getAnimationTrack('rotate');
        if (!unfoldTrack || !rotateTrack) return null;

        const animationCapabilityTarget = createAnimationCapabilityTarget(
          {
            unfold: unfoldTrack,
            rotate: rotateTrack
          },
          { primaryTrackId: 'unfold' }
        );
        if (!animationCapabilityTarget) return null;

        return {
          entityType: 'cube',
          entityId: api.id,
          entity: { id: api.id, points: [], faces: [...cuboidFaceIds] },
          ui: {
            toolbarStyle: { ...api.state.toolbarStyle }
          },
          animations: animationCapabilityTarget.animations,
          animation: animationCapabilityTarget.animation,
          remove: () => api.remove()
        };
      }
    };
  },
  createFromDrop(_context, event) {
    if (event.dataTransfer?.getData('shape') !== 'cube') return null;
    return this.create(_context);
  }
});