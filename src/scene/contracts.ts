import type { EngineMode } from '../types/engine';
import type { GraphSceneRelationNode } from '../relation/contracts';

export const GRAPH_SCENE_DOCUMENT_VERSION = 1;

export interface GraphSceneSettings {
  boundingbox?: [number, number, number, number];
  axis?: boolean;
  showNavigation?: boolean;
  keepaspectratio?: boolean;
  view3D?: {
    hiddenLine?: {
      enabled?: boolean;
    };
  };
}

export interface GraphSceneCommandNode {
  id: string;
  expression: string;
  color?: string;
  options?: unknown;
}

export interface GraphSceneShapeNode {
  id?: string;
  type: string;
  payload?: unknown;
}

export interface GraphSceneDocument {
  version: typeof GRAPH_SCENE_DOCUMENT_VERSION;
  mode: EngineMode;
  settings?: GraphSceneSettings;
  commands: GraphSceneCommandNode[];
  shapes: GraphSceneShapeNode[];
  relations?: GraphSceneRelationNode[];
}

export type GraphSceneDiagnosticSeverity = 'error' | 'warning';
export type GraphSceneDiagnosticNodeKind = 'document' | 'command' | 'shape' | 'relation';
export type GraphSceneLoadStatus = 'success' | 'partial' | 'failure';
export type GraphSceneExportStatus = 'success' | 'failure';

export interface GraphSceneDiagnostic {
  code: string;
  message: string;
  severity: GraphSceneDiagnosticSeverity;
  nodeKind?: GraphSceneDiagnosticNodeKind;
  nodeId?: string;
  nodeType?: string;
  nodeIndex?: number;
}

export interface GraphSceneExportResult {
  status: GraphSceneExportStatus;
  scene: GraphSceneDocument | null;
  diagnostics: GraphSceneDiagnostic[];
}

export interface GraphSceneLoadResult {
  status: GraphSceneLoadStatus;
  scene: GraphSceneDocument | null;
  diagnostics: GraphSceneDiagnostic[];
  appliedCommands: number;
  appliedShapes: number;
  appliedRelations: number;
}
