import type { EngineMode, GraphXOptions } from 'vuegraphx';

export type PlaygroundMode = EngineMode | 'dual-layer';

export interface PlaygroundViewportSize {
  width: number;
  height: number;
}

export const getEngineModeForPlayground = (mode: PlaygroundMode): EngineMode => {
  if (mode === 'dual-layer') return '3d'; // 默认底座是 3D，稍后在 App.vue 处理双实例
  return mode;
};

export const getBoardOptionsForPlaygroundMode = (mode: PlaygroundMode, viewport?: PlaygroundViewportSize): GraphXOptions => {
  if (mode === 'geometry') {
    return { axis: false, showNavigation: false };
  }

  if (mode === 'dual-layer') {
    return {
      axis: false,
      showNavigation: false,
      keepaspectratio: true,
      pan: { enabled: false },
      // 3D 层的视角为 0 (正面)
      view3D: {
        fitToBoard: true,
        rect: [[-8, -8], [16, 16], [[-5, 5], [-5, 5], [-5, 5]]],
        hiddenLine: {
          enabled: true
        },
        attributes: {
          projection: 'parallel',
          trackball: { enabled: false },
          verticaldrag: { enabled: false },
          az: {
            slider: { visible: false, start: Math.PI },
            pointer: { enabled: false },
            keyboard: { enabled: false }
          },
          el: {
            slider: { visible: false, start: Math.PI / 2 },
            pointer: { enabled: false },
            keyboard: { enabled: false }
          },
          bank: {
            slider: { visible: false, start: 0 },
            pointer: { enabled: false },
            keyboard: { enabled: false }
          },
          mainAxes: { visible: false },
          xAxis: { visible: false },
          yAxis: { visible: false },
          zAxis: { visible: false },
          axes: { visible: false },
          xPlaneFront: { visible: false },
          yPlaneFront: { visible: false },
          zPlaneFront: { visible: false },
          xPlaneRear: { visible: false },
          yPlaneRear: { visible: false },
          zPlaneRear: { visible: false }
        }
      }
    };
  }

  return {
    axis: true,
    showNavigation: true,
    view3D: {
      hiddenLine: {
        enabled: true
      }
    }
  };
};
