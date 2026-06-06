import type { GraphObjectNode } from './contracts';

export type GraphDragPolicyNode = Pick<GraphObjectNode, 'id' | 'type' | 'meta' | 'renderHints'>;

export interface GraphDragPolicyOptions {
  allowCoordinateScoped?: boolean;
}

export const isGraphRelationDrivenDrag = (node: GraphDragPolicyNode): boolean => {
  const meta = node.meta as Record<string, unknown> | undefined;
  return meta?.relationDriven === true || meta?.dragMode === 'relation-driven';
};

export const isGraphObjectDraggableByPolicy = (
  node: GraphDragPolicyNode | null | undefined
): boolean => !!node && readGraphDragPolicyDisabledReason(node) === null;

export const readGraphDragPolicyDisabledReason = (
  node: GraphDragPolicyNode,
  options: GraphDragPolicyOptions = {}
): string | null => {
  if ((node.meta as Record<string, unknown> | undefined)?.locked === true) {
    return `Graph object ${node.id} is locked and cannot be dragged.`;
  }
  if (isGraphRelationDrivenDrag(node)) {
    return `Graph object ${node.id} is relation-driven and must be recomputed from its dependencies instead of directly dragged.`;
  }
  return readGraphDragDisabledReason(node, options);
};

export const readGraphDragDisabledReason = (
  node: GraphDragPolicyNode,
  options: GraphDragPolicyOptions = {}
): string | null => {
  const meta = node.meta as Record<string, unknown> | undefined;
  const renderHints = node.renderHints as Record<string, unknown> | undefined;
  const coordinateSystemId = typeof meta?.coordinateSystemId === 'string' ? meta.coordinateSystemId : null;
  const configuredReason = typeof meta?.dragDisabledReason === 'string' ? meta.dragDisabledReason : null;
  if (coordinateSystemId && node.type !== 'coordinate-system' && options.allowCoordinateScoped) {
    return null;
  }
  if (meta?.draggable === false || renderHints?.draggable === false || meta?.dragDisabled === true || meta?.dragMode === 'disabled') {
    return configuredReason ?? `Graph object ${node.id} is not draggable.`;
  }
  if (coordinateSystemId && node.type !== 'coordinate-system' && !isCoordinateScopedDragExplicitlyEnabled(node)) {
    return configuredReason ?? `Graph object ${node.id} belongs to coordinate system ${coordinateSystemId} and cannot be freely dragged.`;
  }
  return null;
};

const isCoordinateScopedDragExplicitlyEnabled = (node: GraphDragPolicyNode): boolean => {
  const meta = node.meta as Record<string, unknown> | undefined;
  const renderHints = node.renderHints as Record<string, unknown> | undefined;
  return meta?.draggable === true || renderHints?.draggable === true;
};
