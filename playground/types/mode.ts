import type { EngineMode, GraphXOptions } from 'vuegraphx';

export type PlaygroundMode = EngineMode;

export interface PlaygroundViewportSize {
  width: number;
  height: number;
}

export const getEngineModeForPlayground = (mode: PlaygroundMode): EngineMode => mode;

export const getBoardOptionsForPlaygroundMode = (mode: PlaygroundMode, _viewport?: PlaygroundViewportSize): GraphXOptions => {
  if (mode === 'geometry') {
    return { axis: false, showNavigation: false };
  }

  return { axis: true, showNavigation: true };
};