import type { EngineMode, GraphXOptions } from 'vuegraphx';

export type PlaygroundMode = EngineMode | 'mixed';

export interface PlaygroundViewportSize {
  width: number;
  height: number;
}

export const getEngineModeForPlayground = (mode: PlaygroundMode): EngineMode => mode === 'mixed' ? '3d' : mode;

export const getBoardOptionsForPlaygroundMode = (mode: PlaygroundMode, viewport?: PlaygroundViewportSize): GraphXOptions => {
  if (mode === 'geometry') {
    return { axis: false, showNavigation: false };
  }

  if (mode === 'mixed') {
    const width = Math.max(viewport?.width ?? 1, 1);
    const height = Math.max(viewport?.height ?? 1, 1);
    const aspectRatio = width / height;
    const halfHeight = 8.6;
    const halfWidth = Math.max(8.6, halfHeight * aspectRatio);

    return {
      axis: false,
      showNavigation: false,
      keepaspectratio: true,
      view3D: {
        rect: [[-halfWidth, -halfHeight], [halfWidth * 2, halfHeight * 2], [[-6, 6], [-6, 6], [-6, 6]]],
        attributes: {
          projection: 'parallel',
          axesPosition: 'center',
          depthOrder: { enabled: true },
          trackball: { enabled: false },
          az: {
            pointer: { enabled: false },
            keyboard: { enabled: false },
            slider: { visible: false, start: Math.PI }
          },
          el: {
            pointer: { enabled: false },
            keyboard: { enabled: false },
            slider: { visible: false, start: Math.PI / 2 }
          },
          bank: {
            pointer: { enabled: false },
            keyboard: { enabled: false },
            slider: { visible: false, start: 0 }
          },
          xPlaneFront: { visible: false },
          yPlaneFront: { visible: false },
          zPlaneFront: { visible: false },
          xPlaneRear: { visible: false },
          yPlaneRear: { visible: false },
          zPlaneRear: { visible: false },
          xAxis: { strokeColor: '#b91c1c', strokeWidth: 2 },
          yAxis: { strokeColor: '#0f766e', strokeWidth: 2 },
          zAxis: { visible: false }
        }
      }
    };
  }

  return { axis: true, showNavigation: true };
};