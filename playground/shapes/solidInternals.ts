export {
  clampSolidProgress,
  createConeSolidTopology,
  createCuboidSolidTopology,
  createCylinderSolidTopology,
  createSolidState,
  degToRad,
  lerpPoint2D,
  lerpPoint3D,
  rotatePointAroundX,
  rotatePointAroundY,
  rotatePointAroundZ
} from '../../src/architecture/solids/geometry';

export type {
  GraphSolidDefinition,
  GraphSolidPoint2D,
  GraphSolidPoint3D,
  GraphSolidPolygonPatch,
  GraphSolidTopology
} from '../../src/architecture/solids/contracts';

export {
  createSolid2DShapeDefinition,
  createSolid2DScene
} from '../../src/architecture/solids/shape2d';

export type {
  GraphSolid2DScene,
  GraphSolid2DToolbarState
} from '../../src/architecture/solids/shape2d';