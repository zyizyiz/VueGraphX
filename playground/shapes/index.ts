import type { GraphXEngine } from 'vuegraphx';
import { circleShapeDefinition } from './circle';
import { cubeShapeDefinition } from './cube';
import { cube2DShapeDefinition } from './cube2d';

export const registerPlaygroundShapes = (engine: GraphXEngine): void => {
  engine.registerShapes([
    circleShapeDefinition,
    cubeShapeDefinition,
    cube2DShapeDefinition
  ]);
};