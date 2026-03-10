import JXG from 'jsxgraph';
import type { GraphHiddenLinePoint3D } from './contracts';

export interface GraphHiddenLineUserPoint {
  x: number;
  y: number;
}

export interface GraphHiddenLineScreenPoint {
  x: number;
  y: number;
}

export interface GraphHiddenLineProjectedPoint {
  world: GraphHiddenLinePoint3D;
  user: GraphHiddenLineUserPoint;
  screen: GraphHiddenLineScreenPoint;
  depth: number;
}

const isFiniteNumber = (value: unknown): value is number => typeof value === 'number' && Number.isFinite(value);

const toHomogeneousWorldPoint = (point: GraphHiddenLinePoint3D): [number, number, number, number] => [1, point.x, point.y, point.z];

export const getDepthForWorldPoint = (view3d: any, point: GraphHiddenLinePoint3D): number => {
  const row = view3d?.matrix3DRotShift?.[3];
  if (!Array.isArray(row)) return point.z;
  const homogeneous = toHomogeneousWorldPoint(point);
  return row.reduce((sum: number, value: number, index: number) => sum + (value ?? 0) * (homogeneous[index] ?? 0), 0);
};

export const projectWorldPointToUser = (view3d: any, point: GraphHiddenLinePoint3D): GraphHiddenLineUserPoint | null => {
  const projected = view3d?.project3DTo2D?.([point.x, point.y, point.z]);
  if (!Array.isArray(projected) || projected.length < 2) return null;

  const x = projected.length >= 3 ? projected[1] : projected[0];
  const y = projected.length >= 3 ? projected[2] : projected[1];
  if (!isFiniteNumber(x) || !isFiniteNumber(y)) return null;

  return { x, y };
};

export const projectUserPointToScreen = (board: any, point: GraphHiddenLineUserPoint): GraphHiddenLineScreenPoint | null => {
  if (!board) return null;

  const coords = new JXG.Coords(JXG.COORDS_BY_USER, [point.x, point.y], board);
  const x = coords.scrCoords?.[1];
  const y = coords.scrCoords?.[2];
  if (!isFiniteNumber(x) || !isFiniteNumber(y)) return null;

  return { x, y };
};

export const projectWorldPoint = (board: any, view3d: any, point: GraphHiddenLinePoint3D): GraphHiddenLineProjectedPoint | null => {
  const user = projectWorldPointToUser(view3d, point);
  if (!user) return null;

  const screen = projectUserPointToScreen(board, user);
  if (!screen) return null;

  return {
    world: point,
    user,
    screen,
    depth: getDepthForWorldPoint(view3d, point)
  };
};
