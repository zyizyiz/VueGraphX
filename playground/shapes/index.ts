import type { GraphXEngine } from 'vuegraphx';
import { circleShapeDefinition } from './circle';
import { cone2DShapeDefinition } from './cone2d';
import { cubeShapeDefinition } from './cube';
import { cube2DShapeDefinition } from './cube2d';
import { cylinder2DShapeDefinition } from './cylinder2d';

export const registerPlaygroundShapes = (engine: GraphXEngine): void => {
  engine.registerShapes([
    circleShapeDefinition,
    cubeShapeDefinition,
    cube2DShapeDefinition,
    cylinder2DShapeDefinition,
    cone2DShapeDefinition
  ]);
};