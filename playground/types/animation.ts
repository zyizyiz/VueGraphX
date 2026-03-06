export interface DesignerAnimationTrackState {
  id: string;
  label: string;
  progress: number;
  min: number;
  max: number;
  step: number;
  isAnimating: boolean;
  isPaused: boolean;
  loop: boolean;
  yoyo: boolean;
}