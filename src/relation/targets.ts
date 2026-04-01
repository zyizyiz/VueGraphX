import type {
  GraphRelationTargetDescriptor,
  GraphRelationTargetFamily,
  GraphRelationTargetOwnerType,
  GraphRelationTargetRef
} from './contracts';

export interface GraphRelationPointGeometry {
  family: 'point';
  x: number;
  y: number;
}

export interface GraphRelationLineGeometry {
  family: 'line-like';
  x1: number;
  y1: number;
  x2: number;
  y2: number;
}

export interface GraphRelationSegmentGeometry {
  family: 'segment-like';
  x1: number;
  y1: number;
  x2: number;
  y2: number;
}

export interface GraphRelationCircleGeometry {
  family: 'circle-like';
  cx: number;
  cy: number;
  radius: number;
}

export type GraphRelationGeometry =
  | GraphRelationPointGeometry
  | GraphRelationLineGeometry
  | GraphRelationSegmentGeometry
  | GraphRelationCircleGeometry;

export interface GraphRelationTargetRegistration {
  ownerType?: GraphRelationTargetOwnerType;
  targetId?: string;
  family: GraphRelationTargetFamily;
  label: string;
  sourceExpression?: string;
  ownerLabel?: string;
  getGeometry: () => GraphRelationGeometry | null;
}

export interface GraphRelationTargetRecord extends GraphRelationTargetDescriptor {
  getGeometry: () => GraphRelationGeometry | null;
}

export const DEFAULT_RELATION_TARGET_ID = 'primary';

export const buildRelationTargetKey = (ref: GraphRelationTargetRef): string => `${ref.ownerType}:${ref.ownerId}:${ref.targetId}`;

export const toRelationTargetRef = (target: Pick<GraphRelationTargetDescriptor, 'ownerType' | 'ownerId' | 'targetId'>): GraphRelationTargetRef => ({
  ownerType: target.ownerType,
  ownerId: target.ownerId,
  targetId: target.targetId
});

export const toRelationTargetDescriptor = (
  ownerId: string,
  registration: GraphRelationTargetRegistration
): GraphRelationTargetDescriptor => {
  const ownerType = registration.ownerType ?? 'command';
  const targetId = registration.targetId ?? DEFAULT_RELATION_TARGET_ID;
  const ref = {
    ownerType,
    ownerId,
    targetId
  } as const;

  return {
    ...ref,
    key: buildRelationTargetKey(ref),
    family: registration.family,
    label: registration.label,
    sourceExpression: registration.sourceExpression,
    ownerLabel: registration.ownerLabel
  };
};

export const toRelationTargetRecord = (
  ownerId: string,
  registration: GraphRelationTargetRegistration
): GraphRelationTargetRecord => ({
  ...toRelationTargetDescriptor(ownerId, registration),
  getGeometry: registration.getGeometry
});
