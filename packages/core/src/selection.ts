import {
  createGraphObjectNode,
  type GraphBackendKind,
  type GraphLayerId,
  type GraphObjectKind,
  type GraphObjectNode,
  type GraphRuntimeTargetRef
} from './contracts';

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

export const isGraphRuntimeSelectedNode = (node: GraphObjectNode): boolean => (
  node.meta?.selected === true || node.renderHints?.selected === true
);

export const createGraphRuntimeSelectionItem = (
  node: GraphObjectNode,
  options: GraphRuntimeSelectionItemOptions = {}
): GraphRuntimeSelectionItem => {
  const object = createGraphObjectNode(node);
  const meta = object.meta ? { ...object.meta } : undefined;
  const commandId = typeof meta?.ownerCommandId === 'string' ? meta.ownerCommandId : undefined;
  const backendId = options.backendId ?? object.backendHint;
  const layerId = options.target?.layerId ?? object.layerId;
  const target: GraphRuntimeTargetRef = options.target
    ? { ...options.target }
    : {
        scope: 'object',
        objectId: object.id,
        backendId,
        layerId
      };

  return {
    id: object.id,
    kind: commandId ? 'command' : object.kind === 'relation' ? 'relation' : 'object',
    objectId: object.id,
    objectKind: object.kind,
    objectType: object.type,
    commandId,
    backendId,
    layerId,
    target,
    object,
    payload: object.payload,
    meta
  };
};

export const cloneGraphRuntimeSelectionItem = (
  item: GraphRuntimeSelectionItem
): GraphRuntimeSelectionItem => ({
  ...item,
  target: { ...item.target },
  object: createGraphObjectNode(item.object),
  meta: item.meta ? { ...item.meta } : undefined
});

export const cloneGraphRuntimeSelectionItems = (
  items: readonly GraphRuntimeSelectionItem[]
): GraphRuntimeSelectionItem[] => items.map(cloneGraphRuntimeSelectionItem);

export const getGraphRuntimeSelectionItemKey = (item: GraphRuntimeSelectionItem): string => `${item.kind}:${item.id}`;

export const getGraphRuntimeSelectionItemSignature = (item: GraphRuntimeSelectionItem): string => JSON.stringify({
  key: getGraphRuntimeSelectionItemKey(item),
  commandId: item.commandId,
  backendId: item.backendId,
  layerId: item.layerId,
  target: item.target,
  object: item.object,
  meta: item.meta
});

export const sameGraphRuntimeSelectionItems = (
  left: readonly GraphRuntimeSelectionItem[],
  right: readonly GraphRuntimeSelectionItem[]
): boolean => (
  sameGraphRuntimeSelectionItemIdentities(left, right)
    && left.every((item, index) => getGraphRuntimeSelectionItemSignature(item) === getGraphRuntimeSelectionItemSignature(right[index]))
);

export const sameGraphRuntimeSelectionItemIdentities = (
  left: readonly GraphRuntimeSelectionItem[],
  right: readonly GraphRuntimeSelectionItem[]
): boolean => (
  left.length === right.length
    && left.every((item, index) => getGraphRuntimeSelectionItemKey(item) === getGraphRuntimeSelectionItemKey(right[index]))
);

export const resolveGraphRuntimeSelectionChangeReason = (
  previous: readonly GraphRuntimeSelectionItem[],
  selected: readonly GraphRuntimeSelectionItem[]
): GraphRuntimeSelectionChangeReason => {
  if (selected.length === 0) return 'clear';
  if (previous.length === 0) return 'select';
  if (sameGraphRuntimeSelectionItemIdentities(previous, selected)) return 'update';
  if (selected.length > previous.length && isRuntimeSelectionSubset(previous, selected)) return 'select';
  if (selected.length < previous.length && isRuntimeSelectionSubset(selected, previous)) return 'deselect';
  return 'replace';
};

const isRuntimeSelectionSubset = (
  subset: readonly GraphRuntimeSelectionItem[],
  superset: readonly GraphRuntimeSelectionItem[]
): boolean => {
  const supersetKeys = new Set(superset.map(getGraphRuntimeSelectionItemKey));
  return subset.every((item) => supersetKeys.has(getGraphRuntimeSelectionItemKey(item)));
};
