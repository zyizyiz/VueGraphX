import {
  type GraphClientPoint,
  type GraphLayerId,
  type GraphObjectNode,
  type GraphOperationDiagnostic,
  type GraphOperationResult,
  type GraphPickOptions,
  type GraphPickResult
} from './contracts';
import type { GraphRuntimeSelectionChangeSource } from './selection';

export type GraphObjectSelectionAction = 'selected' | 'cleared' | 'ignored';

export interface GraphObjectSelectionPointerInput {
  pointerId: number;
  point: GraphClientPoint;
}

export interface GraphObjectSelectionRuntime {
  scene: {
    getObject(objectId: string): GraphObjectNode | null | undefined;
  };
  router: {
    pick?(point: GraphClientPoint, input?: GraphObjectSelectionPickInput): GraphPickResult | null;
    pickWithDiagnostics?(point: GraphClientPoint, input?: GraphObjectSelectionPickInput): GraphObjectSelectionPickResult;
  };
  selectObject(
    objectId: string,
    options?: { source?: GraphRuntimeSelectionChangeSource; exclusive?: boolean }
  ): GraphOperationResult<GraphObjectNode>;
  clearSelection(options?: { source?: GraphRuntimeSelectionChangeSource }): GraphOperationResult<GraphObjectNode[]>;
}

export interface GraphObjectSelectionPickInput {
  layerOrder?: readonly GraphLayerId[];
  pickOptions?: Omit<GraphPickOptions, 'layerOrder'>;
}

export interface GraphObjectSelectionPickResult {
  pick: GraphPickResult | null;
  diagnostics: GraphOperationDiagnostic[];
}

export interface GraphObjectSelectionControllerOptions {
  runtime: GraphObjectSelectionRuntime;
  pickOptions?: GraphPickOptions;
  isSelectableNode?: (node: GraphObjectNode | null | undefined, pick: GraphPickResult) => boolean;
  clearOnMiss?: boolean;
  clearOnNonSelectableHit?: boolean;
  consumeSelected?: boolean;
  consumeCleared?: boolean;
  exclusive?: boolean;
  source?: GraphRuntimeSelectionChangeSource;
}

export interface GraphObjectSelectionControllerResult {
  handled: boolean;
  action: GraphObjectSelectionAction;
  objectId?: string;
  pick?: GraphPickResult;
  diagnostics: GraphOperationDiagnostic[];
}

export interface GraphObjectSelectionController {
  pointerDown(input: GraphObjectSelectionPointerInput): GraphObjectSelectionControllerResult;
  clear(): GraphObjectSelectionControllerResult;
}

type PlainRecord = Record<string, unknown>;

export const createGraphObjectSelectionController = (
  options: GraphObjectSelectionControllerOptions
): GraphObjectSelectionController => {
  const isSelectableNode = options.isSelectableNode ?? isGraphObjectSelectableNode;
  const source = options.source ?? 'pointer';

  const clearSelection = (): GraphObjectSelectionControllerResult => {
    const cleared = options.runtime.clearSelection({ source });
    return {
      handled: options.consumeCleared ?? false,
      action: cleared.ok ? 'cleared' : 'ignored',
      diagnostics: cleared.diagnostics
    };
  };

  return {
    pointerDown(input) {
      const routed = pickGraphObjectSelectionTarget(options.runtime, input.point, options.pickOptions);
      const pick = routed.pick;
      const objectId = pick?.target.objectId;
      if (!objectId) {
        if (options.clearOnMiss ?? true) {
          const cleared = clearSelection();
          return { ...cleared, diagnostics: [...routed.diagnostics, ...cleared.diagnostics] };
        }
        return { handled: false, action: 'ignored', diagnostics: routed.diagnostics };
      }

      const node = options.runtime.scene.getObject(objectId);
      if (!isSelectableNode(node, pick)) {
        if (options.clearOnNonSelectableHit) {
          const cleared = clearSelection();
          return {
            ...cleared,
            objectId,
            pick,
            diagnostics: [...routed.diagnostics, ...cleared.diagnostics]
          };
        }
        return {
          handled: false,
          action: 'ignored',
          objectId,
          pick,
          diagnostics: routed.diagnostics
        };
      }

      const selected = options.runtime.selectObject(objectId, {
        source,
        exclusive: options.exclusive ?? true
      });
      return {
        handled: selected.ok ? options.consumeSelected ?? true : false,
        action: selected.ok ? 'selected' : 'ignored',
        objectId,
        pick,
        diagnostics: [...routed.diagnostics, ...selected.diagnostics]
      };
    },

    clear: clearSelection
  };
};

export const pickGraphObjectSelectionTarget = (
  runtime: GraphObjectSelectionRuntime,
  point: GraphClientPoint,
  pickOptions: GraphPickOptions = {}
): GraphObjectSelectionPickResult => {
  const { layerOrder, ...backendPickOptions } = pickOptions;
  const input = { layerOrder, pickOptions: backendPickOptions };

  if (runtime.router.pickWithDiagnostics) {
    return runtime.router.pickWithDiagnostics(point, input);
  }

  return {
    pick: runtime.router.pick?.(point, input) ?? null,
    diagnostics: []
  };
};

export const isGraphObjectSelectableNode = (
  node: { meta?: PlainRecord; renderHints?: PlainRecord } | null | undefined
): boolean => (
  !!node
  && node.meta?.selectable !== false
  && node.meta?.selectionDisabled !== true
  && node.meta?.clickDisabled !== true
  && node.meta?.locked !== true
  && node.meta?.interactive !== false
  && node.renderHints?.selectable !== false
  && node.renderHints?.selectionDisabled !== true
  && node.renderHints?.clickDisabled !== true
  && node.renderHints?.interactive !== false
  && node.renderHints?.visible !== false
);
