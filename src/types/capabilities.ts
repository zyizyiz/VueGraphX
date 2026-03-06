export type GraphCapabilityKind = 'action' | 'toggle' | 'input' | 'panel';

export type GraphCapabilityGroup =
  | 'create'
  | 'inspect'
  | 'edit'
  | 'annotate'
  | 'style'
  | 'animation'
  | 'danger';

export interface GraphCapabilityDescriptor {
  id: string;
  feature: string;
  label: string;
  entityType: string;
  kind: GraphCapabilityKind;
  group: GraphCapabilityGroup;
  active?: boolean;
  enabled?: boolean;
  meta?: Record<string, unknown>;
}

export interface GraphSelectionSnapshot {
  entityType: string;
  entityId: string;
  entity: unknown;
  ui?: Record<string, unknown>;
}

export interface GraphCapabilitySnapshot {
  selection: GraphSelectionSnapshot | null;
  capabilities: GraphCapabilityDescriptor[];
}

export type GraphCapabilityListener = (snapshot: GraphCapabilitySnapshot) => void;