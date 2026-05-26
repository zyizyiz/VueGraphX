import { type GraphObjectNode, type GraphOperationDiagnostic, type GraphOperationResult } from './contracts';
export declare const GRAPH_RELATION_SNAPSHOT_VERSION = 1;
export type GraphRelationSnapshotDiagnosticCode = 'relation-snapshot.invalid-snapshot' | 'relation-snapshot.missing-object' | 'relation-snapshot.missing-dependency' | 'relation-snapshot.missing-relation' | 'relation-snapshot.invalid-relation-object';
export interface GraphRelationSnapshotDiagnostic extends GraphOperationDiagnostic {
    code: GraphRelationSnapshotDiagnosticCode;
    details?: Record<string, unknown>;
}
export interface GraphObjectRelationSnapshot {
    objectId: string;
    dependencyIds: string[];
    relationIds: string[];
}
export interface GraphRelationSnapshotEntry {
    relationId: string;
    relationType: string;
    dependencyIds: string[];
}
export interface GraphSceneRelationSnapshot {
    version: typeof GRAPH_RELATION_SNAPSHOT_VERSION;
    objects: GraphObjectRelationSnapshot[];
    relations: GraphRelationSnapshotEntry[];
}
export declare const createGraphRelationSnapshot: (objects: readonly GraphObjectNode[]) => GraphOperationResult<GraphSceneRelationSnapshot>;
export declare const validateGraphRelationSnapshot: (snapshot: unknown, objects?: readonly GraphObjectNode[]) => GraphOperationResult<GraphSceneRelationSnapshot>;
