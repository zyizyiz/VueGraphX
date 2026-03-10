import { circleShapeDefinition } from './circle';
import { cubeShapeDefinition } from './cube';
import { triangleShapeDefinition } from './triangle';
import { wireframeCubeShapeDefinition } from './wireframeCube';
import type { GraphXEngine } from 'vuegraphx';

export function registerPlaygroundShapes(engine: GraphXEngine) {
  engine.registerShapes([
    circleShapeDefinition,
    cubeShapeDefinition,
    triangleShapeDefinition,
    wireframeCubeShapeDefinition
  ]);
}

export function registerDualLayerTopShapes(engine: GraphXEngine) {
  engine.registerShapes([
    circleShapeDefinition,
    triangleShapeDefinition
  ]);
}

export function registerDualLayerBottomShapes(engine: GraphXEngine) {
  engine.registerShapes([
    wireframeCubeShapeDefinition
  ]);
}
