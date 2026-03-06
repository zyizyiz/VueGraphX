import { createComposedShapeDefinition, type GraphShapeApi } from 'vuegraphx';
import type { ShapeCapabilityTarget } from 'vuegraphx';

interface CubeState {
  toolbarStyle: Record<string, string>;
  rafId: number | null;
  halfEdge: number;
}

const notifyFastChange = (api: GraphShapeApi<CubeState>) => {
  if (api.state.rafId !== null) cancelAnimationFrame(api.state.rafId);
  api.setState({
    rafId: requestAnimationFrame(() => {
      api.notifyChange();
      api.setState({ rafId: null });
    })
  });
};

const getUnfoldProgress = (api: GraphShapeApi<CubeState>) => api.getAnimationTrack('unfold')?.progress ?? 0;
const getRotateProgress = (api: GraphShapeApi<CubeState>) => api.getAnimationTrack('rotate')?.progress ?? 0;

const getCubeVertices = (unfoldProgress: number, rotateProgress: number, halfEdge: number, name?: string): Array<[number, number, number]> => {
  const angle = unfoldProgress * (Math.PI / 2);
  const rotateAngle = rotateProgress * Math.PI * 2;
  const half = halfEdge;
  const b0: [number, number, number] = [-half, -half, -half];
  const b1: [number, number, number] = [half, -half, -half];
  const b2: [number, number, number] = [half, half, -half];
  const b3: [number, number, number] = [-half, half, -half];
  const t0: [number, number, number] = [-half, -half, half];
  const t1: [number, number, number] = [half, -half, half];
  const t2: [number, number, number] = [half, half, half];
  const t3: [number, number, number] = [-half, half, half];

  const rotateX = (point: [number, number, number], rotateAngle: number, pivotY: number, pivotZ: number): [number, number, number] => {
    const [x, y, z] = point;
    const deltaY = y - pivotY;
    const deltaZ = z - pivotZ;
    const cosValue = Math.cos(rotateAngle);
    const sinValue = Math.sin(rotateAngle);
    return [x, deltaY * cosValue - deltaZ * sinValue + pivotY, deltaY * sinValue + deltaZ * cosValue + pivotZ];
  };

  const rotateY = (point: [number, number, number], rotateAngle: number, pivotX: number, pivotZ: number): [number, number, number] => {
    const [x, y, z] = point;
    const deltaX = x - pivotX;
    const deltaZ = z - pivotZ;
    const cosValue = Math.cos(rotateAngle);
    const sinValue = Math.sin(rotateAngle);
    return [deltaX * cosValue + deltaZ * sinValue + pivotX, y, -deltaX * sinValue + deltaZ * cosValue + pivotZ];
  };

  const rotateScene = (point: [number, number, number]): [number, number, number] => {
    const [x, y, z] = point;
    const cosValue = Math.cos(rotateAngle);
    const sinValue = Math.sin(rotateAngle);
    return [x * cosValue + z * sinValue, y, -x * sinValue + z * cosValue];
  };

  const facePoints = (() => {
    if (name === 'bottom') return [b0, b1, b2, b3];
    if (name === 'front') return [b0, b1, t1, t0].map((point) => rotateX(point, angle, -half, -half));
    if (name === 'back') return [b3, b2, t2, t3].map((point) => rotateX(point, -angle, half, -half));
    if (name === 'left') return [b0, t0, t3, b3].map((point) => rotateY(point, -angle, -half, -half));
    if (name === 'right') return [b1, b2, t2, t1].map((point) => rotateY(point, angle, half, -half));
    if (name === 'top') {
      return [t3, t2, t1, t0].map((point) => {
        const rotatedSelf = rotateX(point, -angle, half, half);
        return rotateX(rotatedSelf, -angle, half, -half);
      });
    }

    return ['bottom', 'front', 'back', 'left', 'right', 'top'].flatMap((faceName) => getCubeVertices(unfoldProgress, 0, halfEdge, faceName));
  })();

  return facePoints.map((point) => rotateScene(point));
};

const updateToolbarPosition = (api: GraphShapeApi<CubeState>) => {
  if (!api.selected) return;
  const bounds = api.project3DBounds(getCubeVertices(getUnfoldProgress(api), getRotateProgress(api), api.state.halfEdge));
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
    notifyFastChange(api);
  }
};

const createFacePoints = (api: GraphShapeApi<CubeState>, name: string): Array<() => [number, number, number]> => [0, 1, 2, 3].map((index) => () => {
  return getCubeVertices(getUnfoldProgress(api), getRotateProgress(api), api.state.halfEdge, name)[index] ?? [0, 0, 0];
});

export const cubeShapeDefinition = createComposedShapeDefinition<void, CubeState>({
  type: 'cube',
  supportedModes: '3d',
  create() {
    return {
      entityType: 'cube',
      initialState: {
        toolbarStyle: { left: '50%', top: 'calc(100% - 5rem)' },
        rafId: null,
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

        const faceNames = ['bottom', 'top', 'front', 'back', 'left', 'right'];
        const colors = ['#f87171', '#38bdf8', '#fbbf24', '#34d399', '#a78bfa', '#f472b6'];
        const groupedObjects: any[] = [];

        faceNames.forEach((name, index) => {
          const corners = createFacePoints(api, name);
          const p1 = api.trackObject(view3d.create('point3d', corners[0], { visible: false }));
          const p2 = api.trackObject(view3d.create('point3d', corners[1], { visible: false }));
          const p3 = api.trackObject(view3d.create('point3d', corners[2], { visible: false }));
          const p4 = api.trackObject(view3d.create('point3d', corners[3], { visible: false }));
          const polygon = api.trackObject(view3d.create('polygon3d', [p1, p2, p3, p4], {
            fillColor: colors[index],
            fillOpacity: 0.8,
            borders: { strokeWidth: 1.5, strokeColor: '#1e293b' }
          }));
          const faceGroup = api.createGroup({ p1, p2, p3, p4, face: polygon }, { id: `cube_face_${index}`, createNativeGroup: false });
          faceGroup.hide(['p1', 'p2', 'p3', 'p4']);
          faceGroup.pick('face').on('down', (member) => {
            if (member.key !== 'face') return;
            Promise.resolve().then(() => api.select());
          });
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
        if (api.state.rafId !== null) cancelAnimationFrame(api.state.rafId);
      },
      getCapabilityTarget(api): ShapeCapabilityTarget | null {
        if (!api.selected) return null;

        const unfoldTrack = api.getAnimationTrack('unfold');
        const rotateTrack = api.getAnimationTrack('rotate');
        if (!unfoldTrack || !rotateTrack) return null;

        return {
          entityType: 'cube',
          entityId: api.id,
          entity: { id: api.id, points: [], faces: [] },
          ui: {
            toolbarStyle: { ...api.state.toolbarStyle }
          },
          animations: {
            primaryTrackId: 'unfold',
            tracks: {
              unfold: {
                id: unfoldTrack.id,
                label: '展开',
                isAnimating: unfoldTrack.isAnimating,
                isPaused: unfoldTrack.isPaused,
                loop: unfoldTrack.loop,
                yoyo: unfoldTrack.yoyo,
                progress: unfoldTrack.progress,
                min: unfoldTrack.min,
                max: unfoldTrack.max,
                step: unfoldTrack.step,
                playForward: () => unfoldTrack.playForward(),
                playBackward: () => unfoldTrack.playBackward(),
                pause: () => unfoldTrack.pause(),
                resume: () => unfoldTrack.resume(),
                stop: () => unfoldTrack.stop(),
                setLoop: (value) => unfoldTrack.setLoop(value),
                toggleLoop: () => unfoldTrack.toggleLoop(),
                setYoyo: (value) => unfoldTrack.setYoyo(value),
                toggleYoyo: () => unfoldTrack.toggleYoyo(),
                setProgress: (value) => unfoldTrack.setProgress(value)
              },
              rotate: {
                id: rotateTrack.id,
                label: '旋转',
                isAnimating: rotateTrack.isAnimating,
                isPaused: rotateTrack.isPaused,
                loop: rotateTrack.loop,
                yoyo: rotateTrack.yoyo,
                progress: rotateTrack.progress,
                min: rotateTrack.min,
                max: rotateTrack.max,
                step: rotateTrack.step,
                playForward: () => rotateTrack.playForward(),
                playBackward: () => rotateTrack.playBackward(),
                pause: () => rotateTrack.pause(),
                resume: () => rotateTrack.resume(),
                stop: () => rotateTrack.stop(),
                setLoop: (value) => rotateTrack.setLoop(value),
                toggleLoop: () => rotateTrack.toggleLoop(),
                setYoyo: (value) => rotateTrack.setYoyo(value),
                toggleYoyo: () => rotateTrack.toggleYoyo(),
                setProgress: (value) => rotateTrack.setProgress(value)
              }
            }
          },
          animation: {
            id: unfoldTrack.id,
            label: '展开',
            isAnimating: unfoldTrack.isAnimating,
            isPaused: unfoldTrack.isPaused,
            loop: unfoldTrack.loop,
            yoyo: unfoldTrack.yoyo,
            progress: unfoldTrack.progress,
            min: unfoldTrack.min,
            max: unfoldTrack.max,
            step: unfoldTrack.step,
            playForward: () => unfoldTrack.playForward(),
            playBackward: () => unfoldTrack.playBackward(),
            pause: () => unfoldTrack.pause(),
            resume: () => unfoldTrack.resume(),
            stop: () => unfoldTrack.stop(),
            setLoop: (value) => unfoldTrack.setLoop(value),
            toggleLoop: () => unfoldTrack.toggleLoop(),
            setYoyo: (value) => unfoldTrack.setYoyo(value),
            toggleYoyo: () => unfoldTrack.toggleYoyo(),
            setProgress: (value) => unfoldTrack.setProgress(value)
          },
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