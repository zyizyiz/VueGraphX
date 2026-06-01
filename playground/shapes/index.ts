import { circleShapeDefinition } from './circle';
import { cone2DShapeDefinition } from './cone2d';
import { cubeShapeDefinition } from './cube';
import { cube2DShapeDefinition } from './cube2d';
import { cylinder2DShapeDefinition } from './cylinder2d';
import { triangleShapeDefinition } from './triangle';
import { wireframeCubeShapeDefinition } from './wireframeCube';
import type { GraphXEngine } from 'vuegraphx';

export function registerPlaygroundShapes(engine: GraphXEngine) {
  engine.registerShapes([
    circleShapeDefinition,
    cubeShapeDefinition,
    cube2DShapeDefinition,
    cylinder2DShapeDefinition,
    cone2DShapeDefinition,
    triangleShapeDefinition,
    wireframeCubeShapeDefinition
  ]);
}
