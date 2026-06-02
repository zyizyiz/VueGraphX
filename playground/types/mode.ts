import type { EngineMode, GraphXOptions } from 'vuegraphx';

export type PlaygroundMode = EngineMode | 'operation';

export interface PlaygroundViewportSize {
  width: number;
  height: number;
}

export const getEngineModeForPlayground = (mode: PlaygroundMode): EngineMode => (
  mode === 'operation' ? 'geometry' : mode
);

export const getPlaygroundModeForEngineMode = (mode: EngineMode): PlaygroundMode => mode;

export const getBoardOptionsForPlaygroundMode = (
  mode: PlaygroundMode,
  _viewport?: PlaygroundViewportSize
): GraphXOptions => {
  if (mode === '2d') {
    return {
      axis: true,
      showNavigation: true,
      grid: true,
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

  if (mode === 'geometry' || mode === 'operation') {
    return { axis: false, showNavigation: false, grid: true };
  }

  return {
    axis: true,
    showNavigation: true,
    grid: true,
    view3D: {
      hiddenLine: {
        enabled: true,
        profile: 'balanced'
      }
    }
  };
};
