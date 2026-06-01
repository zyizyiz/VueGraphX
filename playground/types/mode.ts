import type { EngineMode, GraphXOptions } from 'vuegraphx';

export type PlaygroundMode = EngineMode;

export interface PlaygroundViewportSize {
  width: number;
  height: number;
}

export const getEngineModeForPlayground = (mode: PlaygroundMode): EngineMode => mode;

export const getPlaygroundModeForEngineMode = (mode: EngineMode): PlaygroundMode => mode;

export const getBoardOptionsForPlaygroundMode = (mode: PlaygroundMode, _viewport?: PlaygroundViewportSize): GraphXOptions => {
  if (mode === '2d') {
    return {
      axis: true,
      showNavigation: true,
      pan: {
        enabled: true,
        needShift: false,
        needTwoFingers: true
      },
      zoom: {
        enabled: true,
        wheel: true,
        needShift: false,
        pinch: true
      }
    };
  }

  if (mode === 'geometry') {
    return { axis: false, showNavigation: false };
  }

  return {
    axis: true,
    showNavigation: true,
    view3D: {
      hiddenLine: {
        enabled: true,
        profile: 'balanced'
      }
    }
  };
};
