export interface InspectCapabilityContract {
  active: boolean;
  setActive: (active: boolean) => void;
}

export interface ResizeCapabilityContract {
  active: boolean;
  value: number;
  min?: number;
  max?: number;
  step?: number;
  toggle: () => void;
  setValue: (value: number) => void;
}

export interface ToggleCapabilityContract {
  active: boolean;
  toggle: () => void;
}

export interface StylePanelCapabilityContract {
  active: boolean;
  selectedColor: string;
  toggle: () => void;
}

export interface ColorStyleCapabilityContract {
  active: boolean;
  selectedColor: string;
  activate: () => void;
  applyColor: (color: string) => void;
}

export interface SplitCapabilityContract {
  active: boolean;
  hasDraft: boolean;
  canConfirm: boolean;
  toggle: () => void;
  cancel: () => void;
  confirm: () => void;
}

export interface AnimationCapabilityContract {
  isAnimating: boolean;
  progress: number;
  min?: number;
  max?: number;
  step?: number;
  playForward: () => void;
  playBackward: () => void;
  stop: () => void;
  setProgress: (value: number) => void;
}

export interface ShapeCapabilityTarget {
  entityType: string;
  entityId: string;
  entity: unknown;
  ui?: Record<string, unknown>;
  inspect?: InspectCapabilityContract;
  resize?: ResizeCapabilityContract;
  auxiliaryLine?: ToggleCapabilityContract;
  projection?: ToggleCapabilityContract;
  annotation?: ToggleCapabilityContract;
  split?: SplitCapabilityContract;
  stylePanel?: StylePanelCapabilityContract;
  strokeStyle?: ColorStyleCapabilityContract;
  fillStyle?: ColorStyleCapabilityContract;
  animation?: AnimationCapabilityContract;
  remove?: () => void;
}
