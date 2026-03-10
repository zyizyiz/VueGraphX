import { createComposedShapeDefinition, type GraphShapeApi } from 'vuegraphx';

interface TriangleState {
  size: number;
}

const getUserPointFromArgs = (api: GraphShapeApi<TriangleState>, args: any[]): [number, number] | null => {
  for (const arg of args) {
    const point = api.getUsrCoordFromEvent(arg);
    if (point) return point;
  }
  return null;
};

export const triangleShapeDefinition = createComposedShapeDefinition<void, TriangleState>({
  type: 'triangle',
  supportedModes: 'all',
  create() {
    let frameId: number | null = null;

    return {
      entityType: 'triangle',
      initialState: {
        size: 3
      },
      getCapabilityTarget: () => null,
      setup(api) {
        const board = api.engine.getBoard();
        if (!board) return;

        const size = api.state.size;
        const p1 = api.trackObject(board.create('point', [0, size / Math.sqrt(3)], { visible: false, name: 'A' }));
        const p2 = api.trackObject(board.create('point', [-size / 2, -size / (2 * Math.sqrt(3))], { visible: false, name: 'B' }));
        const p3 = api.trackObject(board.create('point', [size / 2, -size / (2 * Math.sqrt(3))], { visible: false, name: 'C' }));
        const polygon = api.trackObject(board.create('polygon', [p1, p2, p3], {
          fillColor: '#6366f1',
          fillOpacity: 0.3,
          strokeColor: '#4f46e5',
          strokeWidth: 2,
          highlight: false,
          hasInnerPoints: true,
          vertices: {
            visible: false,
            highlight: false,
            fixed: true
          }
        }));

        const group = api.createGroup({ polygon }, { createNativeGroup: false });
        let dragStart: [number, number] | null = null;
        let initialVertices: Array<[number, number]> = [];
        let pendingVertices: Array<[number, number]> | null = null;

        const flushPendingVertices = () => {
          if (!pendingVertices || !api.board) return;
          api.board.suspendUpdate?.();
          p1.moveTo(pendingVertices[0], 0);
          p2.moveTo(pendingVertices[1], 0);
          p3.moveTo(pendingVertices[2], 0);
          api.board.unsuspendUpdate?.();
          pendingVertices = null;
        };

        const scheduleGeometryUpdate = () => {
          if (frameId !== null) return;
          frameId = requestAnimationFrame(() => {
            frameId = null;
            flushPendingVertices();
          });
        };

        group.bindDrag({
          keys: ['polygon'],
          selectOnStart: true,
          onStart: (_member, ...args) => {
            dragStart = getUserPointFromArgs(api, args);
            initialVertices = [
              [p1.X(), p1.Y()],
              [p2.X(), p2.Y()],
              [p3.X(), p3.Y()]
            ];
          },
          onMove: (_member, ...args) => {
            const current = getUserPointFromArgs(api, args);
            if (!dragStart || !current || initialVertices.length !== 3) return;

            const dx = current[0] - dragStart[0];
            const dy = current[1] - dragStart[1];
            pendingVertices = [
              [initialVertices[0][0] + dx, initialVertices[0][1] + dy],
              [initialVertices[1][0] + dx, initialVertices[1][1] + dy],
              [initialVertices[2][0] + dx, initialVertices[2][1] + dy]
            ];
            scheduleGeometryUpdate();
          },
          onEnd: () => {
            if (frameId !== null) {
              cancelAnimationFrame(frameId);
              frameId = null;
            }
            flushPendingVertices();
            dragStart = null;
            initialVertices = [];
          }
        });
      },
      onDestroy() {
        if (frameId !== null) {
          cancelAnimationFrame(frameId);
          frameId = null;
        }
      }
    };
  }
});
