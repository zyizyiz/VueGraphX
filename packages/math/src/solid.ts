import type { MathPoint3D } from './geometry';

export type GraphSolidFamily =
  | 'cylinder'
  | 'rectangular-prism'
  | 'cube'
  | 'triangular-prism'
  | 'pentagonal-prism'
  | 'hexagonal-prism'
  | 'triangular-pyramid'
  | 'quadrangular-pyramid'
  | 'triangular-frustum'
  | 'quadrangular-frustum'
  | 'cone'
  | 'conical-frustum'
  | 'sphere';

export interface GraphSolidDescriptor {
  family: GraphSolidFamily;
  parameters: Record<string, number>;
  origin?: MathPoint3D;
  rotation?: MathPoint3D;
}

export const createSolidDescriptor = (
  family: GraphSolidFamily,
  parameters: Record<string, number>,
  origin?: MathPoint3D
): GraphSolidDescriptor => ({
  family,
  parameters: { ...parameters },
  origin: origin ? { ...origin } : undefined
});

export const getSolidDefaultParameters = (family: GraphSolidFamily): Record<string, number> => {
  switch (family) {
    case 'sphere':
      return { radius: 1 };
    case 'cylinder':
    case 'cone':
      return { radius: 1, height: 2 };
    case 'conical-frustum':
      return { topRadius: 0.5, bottomRadius: 1, height: 2 };
    case 'cube':
      return { size: 1 };
    case 'rectangular-prism':
      return { width: 2, depth: 1, height: 1 };
    case 'triangular-frustum':
    case 'quadrangular-frustum':
      return { topScale: 0.5, bottomScale: 1, height: 2 };
    default:
      return { radius: 1, height: 2 };
  }
};
