import { type GraphBackendKind, type GraphLayerId, type GraphObjectKind, type GraphObjectNode, type GraphRuntimeTargetRef } from './contracts';
export type GraphRuntimeSelectionItemKind = 'object' | 'command' | 'relation';
export type GraphRuntimeSelectionChangeReason = 'snapshot' | 'select' | 'deselect' | 'replace' | 'clear' | 'update';
export type GraphRuntimeSelectionChangeSource = 'api' | 'pointer' | 'sync' | 'scene-load' | 'delete' | 'clear';
export interface GraphRuntimeSelectionItem {
    id: string;
    kind: GraphRuntimeSelectionItemKind;
    objectId: string;
    objectKind: GraphObjectKind;
    objectType: string;
    commandId?: string;
    backendId?: GraphBackendKind;
    layerId?: GraphLayerId;
    target: GraphRuntimeTargetRef;
    object: GraphObjectNode;
    payload: unknown;
    meta?: Record<string, unknown>;
}
export interface GraphRuntimeSelectionChangeEvent {
    primary: GraphRuntimeSelectionItem | null;
    selected: GraphRuntimeSelectionItem[];
    previous: GraphRuntimeSelectionItem[];
    reason: GraphRuntimeSelectionChangeReason;
    source: GraphRuntimeSelectionChangeSource;
    revision: number;
}
export type GraphRuntimeSelectionListener = (event: GraphRuntimeSelectionChangeEvent) => void;
export interface GraphRuntimeSelectionItemOptions {
    backendId?: string;
    target?: GraphRuntimeTargetRef;
}
export declare const isGraphRuntimeSelectedNode: (node: GraphObjectNode) => boolean;
export declare const createGraphRuntimeSelectionItem: (node: GraphObjectNode, options?: GraphRuntimeSelectionItemOptions) => GraphRuntimeSelectionItem;
export declare const cloneGraphRuntimeSelectionItem: (item: GraphRuntimeSelectionItem) => GraphRuntimeSelectionItem;
export declare const cloneGraphRuntimeSelectionItems: (items: readonly GraphRuntimeSelectionItem[]) => GraphRuntimeSelectionItem[];
export declare const getGraphRuntimeSelectionItemKey: (item: GraphRuntimeSelectionItem) => string;
export declare const getGraphRuntimeSelectionItemSignature: (item: GraphRuntimeSelectionItem) => string;
export declare const sameGraphRuntimeSelectionItems: (left: readonly GraphRuntimeSelectionItem[], right: readonly GraphRuntimeSelectionItem[]) => boolean;
export declare const sameGraphRuntimeSelectionItemIdentities: (left: readonly GraphRuntimeSelectionItem[], right: readonly GraphRuntimeSelectionItem[]) => boolean;
export declare const resolveGraphRuntimeSelectionChangeReason: (previous: readonly GraphRuntimeSelectionItem[], selected: readonly GraphRuntimeSelectionItem[]) => GraphRuntimeSelectionChangeReason;
