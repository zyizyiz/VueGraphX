import { type GraphObjectNode, type GraphOperationResult, type GraphRuntimeTargetRef } from './contracts';
import { GraphSceneStore } from './sceneDocument';
export interface GraphCapabilityExecutionInput {
    scene: GraphSceneStore;
    capabilityId: string;
    target: GraphRuntimeTargetRef;
    payload?: unknown;
}
export type GraphCapabilityExecutionValue = {
    action: 'remove';
    object: GraphObjectNode;
} | {
    action: 'update';
    object: GraphObjectNode;
};
export declare const executeGraphCapability: (input: GraphCapabilityExecutionInput) => GraphOperationResult<GraphCapabilityExecutionValue>;
