import JXG from 'jsxgraph';
import { createComposedShapeDefinition, type GraphShapeApi } from 'vuegraphx';
import type { ShapeCapabilityTarget } from 'vuegraphx';

interface CubeState {
  isAnimating: boolean;
  unfoldProgress: number;
  toolbarStyle: Record<string, string>;
  rafId: number | null;
  animationId: number | null;
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

const updateToolbarPosition = (api: GraphShapeApi<CubeState>) => {
  if (!api.selected || !api.engine || !api.board) return;
  const view3d = api.engine.getView3D();
  if (!view3d) return;
  const projected = view3d.project3DTo2D([0, 0, 0]);
  if (!projected || projected.length < 2) return;

  const screenPoint = new JXG.Coords(JXG.COORDS_BY_USER, projected, api.board);
  const boardWidth = api.board.canvasWidth || 1000;
  const boardHeight = api.board.canvasHeight || 700;
  const toolbarStyle = {
    left: `${Math.max(160, Math.min(boardWidth - 160, screenPoint.scrCoords[1]))}px`,
    top: `${Math.max(16, Math.min(boardHeight - 90, screenPoint.scrCoords[2] + 150))}px`
  };

  if (api.state.toolbarStyle.left !== toolbarStyle.left || api.state.toolbarStyle.top !== toolbarStyle.top) {
    api.setState({ toolbarStyle });
    notifyFastChange(api);
  }
};

const createFacePoints = (api: GraphShapeApi<CubeState>, name: string): Array<() => [number, number, number]> => [0, 1, 2, 3].map((index) => () => {
  const angle = api.state.unfoldProgress * (Math.PI / 2);
  const half = api.state.halfEdge;
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

  if (name === 'bottom') return [b0, b1, b2, b3][index];
  if (name === 'front') return rotateX([b0, b1, t1, t0][index], angle, -half, -half);
  if (name === 'back') return rotateX([b3, b2, t2, t3][index], -angle, half, -half);
  if (name === 'left') return rotateY([b0, t0, t3, b3][index], -angle, -half, -half);
  if (name === 'right') return rotateY([b1, b2, t2, t1][index], angle, half, -half);
  if (name === 'top') {
    const rotatedSelf = rotateX([t3, t2, t1, t0][index], -angle, half, half);
    return rotateX(rotatedSelf, -angle, half, -half);
  }
  return [0, 0, 0];
});

export const cubeShapeDefinition = createComposedShapeDefinition<void, CubeState>({
  type: 'cube',
  supportedModes: '3d',
  create() {
    return {
      entityType: 'cube',
      initialState: {
        isAnimating: false,
        unfoldProgress: 0,
        toolbarStyle: { left: '50%', top: 'calc(100% - 5rem)' },
        rafId: null,
        animationId: null,
        halfEdge: 1
      },
      setup(api) {
        const view3d = api.engine.getView3D();
        if (!api.board || !view3d) return;
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
        if (api.state.animationId !== null) cancelAnimationFrame(api.state.animationId);
        if (api.state.rafId !== null) cancelAnimationFrame(api.state.rafId);
      },
      getCapabilityTarget(api): ShapeCapabilityTarget | null {
        if (!api.selected) return null;

        const stopAnimation = () => {
          if (api.state.animationId !== null) cancelAnimationFrame(api.state.animationId);
          api.setState({ animationId: null, isAnimating: false });
        };

        const setUnfoldProgress = (value: number) => {
          if (api.state.isAnimating && api.state.animationId === null) {
            api.setState({ isAnimating: false });
          }
          api.setState({ unfoldProgress: Math.max(0, Math.min(1, value)) });
          notifyFastChange(api);
          api.board?.update();
        };

        const animateTo = (target: number) => {
          stopAnimation();
          const startValue = api.state.unfoldProgress;
          if (startValue === target) return;

          const duration = 1500;
          let startTime: number | null = null;
          api.setState({ isAnimating: true });

          const step = (timestamp: number) => {
            if (!api.state.isAnimating) return;
            if (startTime === null) startTime = timestamp;

            const elapsed = timestamp - startTime;
            const rawProgress = Math.min(elapsed / duration, 1);
            const easedProgress = rawProgress < 0.5
              ? 2 * rawProgress * rawProgress
              : -1 + (4 - 2 * rawProgress) * rawProgress;

            setUnfoldProgress(startValue + (target - startValue) * easedProgress);

            if (rawProgress < 1) {
              api.setState({ animationId: requestAnimationFrame(step) });
              return;
            }

            api.setState({ animationId: null, isAnimating: false });
          };

          api.setState({ animationId: requestAnimationFrame(step) });
        };

        return {
          entityType: 'cube',
          entityId: api.id,
          entity: { id: api.id, points: [], faces: [] },
          ui: {
            toolbarStyle: { ...api.state.toolbarStyle }
          },
          animation: {
            isAnimating: api.state.isAnimating,
            progress: api.state.unfoldProgress,
            min: 0,
            max: 1,
            step: 0.01,
            playForward: () => animateTo(1),
            playBackward: () => animateTo(0),
            stop: stopAnimation,
            setProgress: setUnfoldProgress
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