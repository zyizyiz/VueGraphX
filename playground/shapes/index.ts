import type { GraphXEngine } from 'vuegraphx';
import { circleShapeDefinition } from './circle';
import { cubeShapeDefinition } from './cube';

export const registerPlaygroundShapes = (engine: GraphXEngine): void => {
  engine.registerShapes([
    circleShapeDefinition,
    cubeShapeDefinition
  ]);
};