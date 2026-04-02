export type GraphRelationTargetOwnerType = 'command' | 'shape';
export type GraphRelationTargetFamily = 'point' | 'line-like' | 'segment-like' | 'circle-like';
export type GraphRelationKind = 'parallel' | 'perpendicular' | 'equal-length' | 'distance-assertion';
export type GraphRelationStatus = 'satisfied' | 'violated' | 'unsupported' | 'missing-target' | 'conflicting';
export type GraphRelationDiagnosticSeverity = 'error' | 'warning';
export type GraphRelationResultStatus = 'success' | 'failure';

export interface GraphRelationTargetRef {
  ownerType: GraphRelationTargetOwnerType;
  ownerId: string;
  targetId: string;
}

export interface GraphRelationParams {
  expectedValue?: number;
  tolerance?: number;
}

export interface GraphRelationRecord {
  id: string;
  kind: GraphRelationKind;
  targets: GraphRelationTargetRef[];
  active: boolean;
  params?: GraphRelationParams;
}

export interface GraphRelationTargetDescriptor extends GraphRelationTargetRef {
  key: string;
  family: GraphRelationTargetFamily;
  label: string;
  sourceExpression?: string;
  ownerLabel?: string;
}

export interface GraphRelationDiagnostic {
  code: string;
  message: string;
  severity: GraphRelationDiagnosticSeverity;
  relationId?: string;
}

export interface GraphRelationMeasurement {
  kind: 'distance' | 'length' | 'angle';
  actualValue: number;
  expectedValue?: number;
  delta?: number;
}

export interface GraphRelationSnapshot extends GraphRelationRecord {
  status: GraphRelationStatus;
  explanation: string;
  diagnostics: GraphRelationDiagnostic[];
  targetLabels: string[];
  measurements?: GraphRelationMeasurement[];
}

export interface GraphRelationCreateInput {
  kind: GraphRelationKind;
  targets: GraphRelationTargetRef[];
  active?: boolean;
  params?: GraphRelationParams;
}

export interface GraphRelationCreateResult {
  status: GraphRelationResultStatus;
  relation: GraphRelationRecord | null;
  snapshot: GraphRelationSnapshot | null;
  diagnostics: GraphRelationDiagnostic[];
}

export interface GraphRelationStateSnapshot {
  relations: GraphRelationSnapshot[];
  targets: GraphRelationTargetDescriptor[];
}

export interface GraphRelationAssistOptions {
  parallelSnapEnterAngle?: number;
  parallelSnapExitAngle?: number;
  perpendicularSnapEnterAngle?: number;
  perpendicularSnapExitAngle?: number;
  equalLengthSnapEnterDelta?: number;
  equalLengthSnapExitDelta?: number;
  distanceAssertionSnapEnterDelta?: number;
  distanceAssertionSnapExitDelta?: number;
}

export type GraphRelationListener = (snapshot: GraphRelationStateSnapshot) => void;

export interface GraphSceneRelationNode {
  id: string;
  kind: GraphRelationKind;
  targets: GraphRelationTargetRef[];
  active?: boolean;
  params?: GraphRelationParams;
}
