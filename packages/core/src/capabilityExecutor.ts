import {
  errorResult,
  mergeGraphObjectPatch,
  okResult,
  type GraphObjectNode,
  type GraphObjectPatch,
  type GraphOperationResult,
  type GraphRuntimeTargetRef
} from './contracts';
import {
  createGraphCoordinateSystemDragPatches,
  createGraphDragPatch,
  type GraphCreateDragPatchOptions,
  type GraphDragDelta
} from './dragOperations';
import type { GraphGridSnapPixelScale } from './gridSnapping';
import { GraphSceneStore } from './sceneDocument';

export interface GraphCapabilityExecutionInput {
  scene: GraphSceneStore;
  capabilityId: string;
  target: GraphRuntimeTargetRef;
  payload?: unknown;
}

export type GraphCapabilityExecutionValue =
  | { action: 'remove'; object: GraphObjectNode }
  | { action: 'update'; object: GraphObjectNode };

type PlainRecord = Record<string, unknown>;

export const executeGraphCapability = (
  input: GraphCapabilityExecutionInput
): GraphOperationResult<GraphCapabilityExecutionValue> => {
  if (input.target.scope === 'scene') {
    if (input.capabilityId === 'math.scene.clear-all') {
      const removed = input.scene.listObjects();
      input.scene.clear();
      return okResult({ action: 'update', object: {
        id: 'scene',
        kind: 'command',
        type: 'scene',
        payload: { removedObjectIds: removed.map((object) => object.id) }
      } });
    }
    if (input.capabilityId === 'math.scene.clear-selection') {
      for (const object of input.scene.listObjects()) {
        input.scene.updateObject(object.id, selectionPatch(object, false));
      }
      return okResult({ action: 'update', object: {
        id: 'scene',
        kind: 'command',
        type: 'scene',
        payload: { selectionCleared: true }
      } });
    }
    if (input.capabilityId.startsWith('math.scene.add-')) {
      const node = readGraphObjectNode(asRecord(input.payload)?.node ?? input.payload);
      if (!node) {
        return errorResult('capability.invalid-scene-node', `Scene capability ${input.capabilityId} requires a serializable GraphObjectNode payload.`, input.target);
      }
      const added = input.scene.addObject(node);
      return added.ok && added.value
        ? okResult({ action: 'update', object: added.value })
        : { ok: false, diagnostics: added.diagnostics };
    }
    return errorResult('capability.unsupported-scene-action', `Scene capability ${input.capabilityId} requires an object factory and is not executed as an object mutation.`, input.target);
  }

  if (input.target.scope === 'viewport') {
    return executeViewportCapability(input);
  }

  if (input.target.scope !== 'object' || !input.target.objectId) {
    return errorResult('capability.unsupported-target', 'Capability execution currently requires an object target.', input.target);
  }

  const node = input.scene.getObject(input.target.objectId);
  if (!node) {
    return errorResult('capability.missing-object', `Graph object ${input.target.objectId} does not exist.`, input.target);
  }

  const familySupport = validateCapabilityObjectFamily(input.capabilityId, node, input.target);
  if (familySupport) return familySupport;

  switch (input.capabilityId) {
    case 'math.object.select':
      return patchObject(input.scene, node, selectionPatch(node, readBoolean(asRecord(input.payload)?.selected ?? input.payload, true)));
    case 'math.object.delete': {
      const removed = input.scene.removeObject(node.id);
      return removed.ok && removed.value
        ? okResult({ action: 'remove', object: removed.value })
        : { ok: false, diagnostics: removed.diagnostics };
    }
    case 'math.object.set-color':
    case 'math.geometry.apply-color':
    case 'math.solid.apply-color':
      return patchObject(input.scene, node, colorPatch(node, input.payload));
    case 'math.object.set-visibility':
      return patchObject(input.scene, node, visibilityPatch(node, input.payload));
    case 'math.object.lock':
      return patchObject(input.scene, node, lockPatch(node, input.payload));
    case 'math.object.move': {
      if (node.type === 'coordinate-system') {
        const delta = asDragDelta(asRecord(input.payload)?.delta ?? input.payload);
        if (!delta) {
          return errorResult('capability.invalid-delta', 'Move capability requires a 2D or 3D drag delta.', input.target);
        }
        const patches = createGraphCoordinateSystemDragPatches(input.scene.listObjects(), node, readDragPatchOptions(input.payload, delta));
        if (!patches.ok || !patches.value) return { ok: false, diagnostics: patches.diagnostics };
        let movedObject: GraphObjectNode | null = null;
        for (const scopedPatch of patches.value) {
          const result = input.scene.updateObject(scopedPatch.objectId, scopedPatch.patch);
          if (!result.ok || !result.value) return { ok: false, diagnostics: result.diagnostics };
          if (scopedPatch.objectId === node.id) movedObject = result.value;
        }
        return movedObject
          ? okResult({ action: 'update', object: movedObject })
          : errorResult('capability.missing-object', `Graph object ${node.id} does not exist.`, input.target);
      }
      const patch = dragPatch(node, input.payload);
      return patch.ok && patch.value
        ? patchObject(input.scene, node, patch.value)
        : { ok: false, diagnostics: patch.diagnostics };
    }
    case 'math.solid.set-parameter':
    case 'math.function.set-parameter':
    case 'math.equation.set-parameter':
      return patchObject(input.scene, node, parameterPatch(node, input.payload));
    case 'math.function.set-expression':
    case 'math.equation.set-expression':
      return patchObject(input.scene, node, expressionPatch(node, input.payload));
    case 'math.function.reset-parameters':
    case 'math.equation.reset-parameters':
      return patchObject(input.scene, node, resetParametersPatch(node));
    case 'math.function.update-piecewise-interval':
      return patchObject(input.scene, node, keyedPayloadPatch(node, 'piecewiseInterval', input.payload));
    case 'math.function.set-dynamic-point-start':
    case 'math.equation.set-dynamic-point-start':
      return patchObject(input.scene, node, nestedPayloadPatch(node, 'dynamicPoint', 'start', input.payload));
    case 'math.function.set-dynamic-point-end':
    case 'math.equation.set-dynamic-point-end':
      return patchObject(input.scene, node, nestedPayloadPatch(node, 'dynamicPoint', 'end', input.payload));
    case 'math.function.set-dynamic-point-speed':
    case 'math.equation.set-dynamic-point-speed':
      return patchObject(input.scene, node, nestedPayloadPatch(node, 'dynamicPoint', 'speed', readFiniteNumber(asRecord(input.payload)?.speed ?? input.payload) ?? 1));
    case 'math.function.reset-dynamic-point':
    case 'math.equation.reset-dynamic-point':
      return patchObject(input.scene, node, keyedPayloadPatch(node, 'dynamicPoint', undefined));
    case 'math.function.play-dynamic-point-backward':
    case 'math.equation.play-dynamic-point-backward':
      return patchObject(input.scene, node, nestedPayloadPatch(node, 'dynamicPoint', 'direction', 'backward'));
    case 'math.function.toggle-dynamic-point-playback':
    case 'math.equation.toggle-dynamic-point-playback':
      return patchObject(input.scene, node, nestedPayloadPatch(node, 'dynamicPoint', 'playing', readBoolean(asRecord(input.payload)?.playing ?? input.payload, !readBoolean(asRecord(asRecord(node.payload)?.dynamicPoint)?.playing, false))));
    case 'math.vector.set-point':
      return patchObject(input.scene, node, vectorEndpointPatch(node, input.payload));
    case 'math.vector.compute-dot-product':
      return patchObject(input.scene, node, metaFlagPatch(node, 'lastVectorOperation', 'dot-product'));
    case 'math.vector.create-operation-result':
      return patchObject(input.scene, node, metaFlagPatch(node, 'lastVectorOperation', 'create-result'));
    case 'math.geometry.apply-rotation':
      return patchObject(input.scene, node, geometryRotationPatch(node, input.payload));
    case 'math.solid.set-section-plane':
      return patchObject(input.scene, node, nestedPayloadPatch(node, 'section', 'plane', input.payload));
    case 'math.solid.set-section-offset':
      return patchObject(input.scene, node, nestedPayloadPatch(node, 'section', 'offset', readFiniteNumber(asRecord(input.payload)?.offset ?? input.payload) ?? 0));
    case 'math.geometry.activate-stroke-color':
    case 'math.solid.activate-stroke-color':
      return patchObject(input.scene, node, metaFlagPatch(node, 'activeColorChannel', 'stroke'));
    case 'math.geometry.activate-fill-color':
    case 'math.solid.activate-fill-color':
      return patchObject(input.scene, node, metaFlagPatch(node, 'activeColorChannel', 'fill'));
    case 'math.geometry.start-assist':
    case 'math.geometry.cancel-assist':
    case 'math.geometry.start-cut':
    case 'math.geometry.cancel-cut':
    case 'math.geometry.confirm-cut':
    case 'math.geometry.remove-selected-helper':
    case 'math.scene.clear-selection':
      return patchObject(input.scene, node, metaFlagPatch(node, 'lastAction', input.capabilityId));
    default:
      if (input.capabilityId.includes('.toggle-') || input.capabilityId.endsWith('.toggle')) {
        return patchObject(input.scene, node, togglePatch(node, input.capabilityId, input.payload));
      }
      return errorResult('capability.unsupported', `Capability ${input.capabilityId} is not implemented by the core executor yet.`, input.target);
  }
};

const patchObject = (
  scene: GraphSceneStore,
  node: GraphObjectNode,
  patch: GraphObjectPatch
): GraphOperationResult<GraphCapabilityExecutionValue> => {
  const updated = scene.updateObject(node.id, patch);
  return updated.ok && updated.value
    ? okResult({ action: 'update', object: updated.value })
    : { ok: false, diagnostics: updated.diagnostics };
};

const validateCapabilityObjectFamily = (
  capabilityId: string,
  node: GraphObjectNode,
  target: GraphRuntimeTargetRef
): GraphOperationResult<never> | null => {
  if (capabilityId.startsWith('math.solid.') && node.type !== 'solid') {
    return errorResult('capability.partial-support', `Capability ${capabilityId} is only supported for solid scene objects; ${node.type} is not a solid.`, target);
  }

  if ((capabilityId.startsWith('math.function.') || capabilityId.startsWith('math.equation.')) && node.type !== 'function' && node.type !== 'implicit') {
    return errorResult('capability.partial-support', `Capability ${capabilityId} is only supported for function or implicit scene objects; ${node.type} is not supported by this family.`, target);
  }

  if (capabilityId.startsWith('math.vector.') && node.type !== 'vector') {
    return errorResult('capability.partial-support', `Capability ${capabilityId} is only supported for vector scene objects; ${node.type} is not a vector.`, target);
  }

  return null;
};

const executeViewportCapability = (
  input: GraphCapabilityExecutionInput
): GraphOperationResult<GraphCapabilityExecutionValue> => {
  const viewportId = input.target.objectId ?? input.target.viewportId ?? 'viewport';
  const node = input.scene.getObject(viewportId);
  const patch = viewportPatch(node ?? createViewportNode(viewportId), input.capabilityId, input.payload);
  if (node) return patchObject(input.scene, node, patch);
  const base = createViewportNode(viewportId);
  const added = input.scene.addObject(mergeGraphObjectPatch(base, patch));
  return added.ok && added.value
    ? okResult({ action: 'update', object: added.value })
    : { ok: false, diagnostics: added.diagnostics };
};

const createViewportNode = (id: string): GraphObjectNode => ({
  id,
  kind: 'viewport',
  type: 'viewport',
  payload: {}
});

const viewportPatch = (node: GraphObjectNode, capabilityId: string, payload: unknown): GraphObjectPatch => {
  const record = asRecord(payload);
  const current = asRecord(node.payload) ?? {};
  switch (capabilityId) {
    case 'math.viewport.select':
      return selectionPatch(node, readBoolean(record?.selected ?? payload, true));
    case 'math.viewport.move':
    case 'math.viewport.pan': {
      const dx = readFiniteNumber(record?.dx) ?? 0;
      const dy = readFiniteNumber(record?.dy) ?? 0;
      const currentPan = asRecord(current.pan) ?? {};
      return {
        payload: {
          ...current,
          pan: {
            x: (readFiniteNumber(currentPan.x) ?? 0) + dx,
            y: (readFiniteNumber(currentPan.y) ?? 0) + dy
          }
        }
      };
    }
    case 'math.viewport.resize': {
      const width = readFiniteNumber(record?.width);
      const height = readFiniteNumber(record?.height);
      return {
        payload: {
          ...current,
          size: {
            ...(asRecord(current.size) ?? {}),
            ...(width !== null ? { width } : {}),
            ...(height !== null ? { height } : {})
          }
        }
      };
    }
    case 'math.viewport.zoom': {
      const scale = readFiniteNumber(record?.scale ?? payload);
      return {
        payload: {
          ...current,
          zoom: scale ?? readFiniteNumber(current.zoom) ?? 1
        }
      };
    }
    default:
      return metaFlagPatch(node, 'lastAction', capabilityId);
  }
};

const selectionPatch = (node: GraphObjectNode, selected: boolean): GraphObjectPatch => ({
  meta: {
    ...(node.meta ?? {}),
    selected
  }
});

const colorPatch = (node: GraphObjectNode, payload: unknown): GraphObjectPatch => {
  const record = asRecord(payload);
  const color = typeof payload === 'string' ? payload : readString(record?.color);
  const strokeColor = readString(record?.strokeColor) ?? color;
  const fillColor = readString(record?.fillColor);

  return {
    renderHints: {
      ...(node.renderHints ?? {}),
      ...(strokeColor ? { strokeColor } : {}),
      ...(fillColor ? { fillColor } : {})
    }
  };
};

const visibilityPatch = (node: GraphObjectNode, payload: unknown): GraphObjectPatch => ({
  renderHints: {
    ...(node.renderHints ?? {}),
    visible: typeof payload === 'boolean'
      ? payload
      : readBoolean(asRecord(payload)?.visible, true)
  }
});

const lockPatch = (node: GraphObjectNode, payload: unknown): GraphObjectPatch => ({
  meta: {
    ...(node.meta ?? {}),
    locked: typeof payload === 'boolean'
      ? payload
      : readBoolean(asRecord(payload)?.locked, true)
  }
});

const dragPatch = (node: GraphObjectNode, payload: unknown): GraphOperationResult<GraphObjectPatch> => {
  const record = asRecord(payload);
  const delta = asDragDelta(record?.delta ?? payload);
  if (!delta) {
    return errorResult('capability.invalid-delta', 'Move capability requires a 2D or 3D drag delta.', {
      scope: 'object',
      objectId: node.id
    });
  }
  return createGraphDragPatch(node, readDragPatchOptions(payload, delta));
};

const readDragPatchOptions = (
  payload: unknown,
  delta: GraphDragDelta
): GraphCreateDragPatchOptions => {
  const record = asRecord(payload);
  const options: GraphCreateDragPatchOptions = {
    delta,
    dragPhase: readDragPhase(payload)
  };
  const tolerancePx = readPositiveFiniteNumber(record?.tolerancePx);
  if (tolerancePx !== undefined) options.tolerancePx = tolerancePx;
  const pixelsPerUnit = readGridSnapPixelScale(record?.pixelsPerUnit);
  if (pixelsPerUnit !== undefined) options.pixelsPerUnit = pixelsPerUnit;
  return options;
};

const readDragPhase = (payload: unknown): 'move' | 'end' | undefined => {
  const phase = asRecord(payload)?.dragPhase;
  return phase === 'move' || phase === 'end' ? phase : undefined;
};

const parameterPatch = (node: GraphObjectNode, payload: unknown): GraphObjectPatch => {
  const record = asRecord(payload);
  const key = readString(record?.key);
  const value = readFiniteNumber(record?.value);
  const currentPayload = asRecord(node.payload);
  const currentParameters = asRecord(currentPayload?.parameters);

  if (!key || value === null) {
    return { payload: node.payload };
  }

  return {
    payload: {
      ...(currentPayload ?? {}),
      parameters: {
        ...(currentParameters ?? {}),
        [key]: value
      }
    }
  };
};

const expressionPatch = (node: GraphObjectNode, payload: unknown): GraphObjectPatch => {
  const record = asRecord(payload);
  const expression = readString(record?.expression) ?? (typeof payload === 'string' ? payload : undefined);
  if (!expression) return { payload: node.payload };
  return {
    payload: {
      ...(asRecord(node.payload) ?? {}),
      expression
    }
  };
};

const resetParametersPatch = (node: GraphObjectNode): GraphObjectPatch => ({
  payload: {
    ...(asRecord(node.payload) ?? {}),
    parameters: {}
  }
});

const keyedPayloadPatch = (node: GraphObjectNode, key: string, value: unknown): GraphObjectPatch => {
  const current = asRecord(node.payload) ?? {};
  if (value === undefined) {
    const next = { ...current };
    delete next[key];
    return { payload: next };
  }
  return { payload: { ...current, [key]: value } };
};

const nestedPayloadPatch = (node: GraphObjectNode, parentKey: string, key: string, value: unknown): GraphObjectPatch => {
  const current = asRecord(node.payload) ?? {};
  const parent = asRecord(current[parentKey]) ?? {};
  return {
    payload: {
      ...current,
      [parentKey]: {
        ...parent,
        [key]: value
      }
    }
  };
};

const metaFlagPatch = (node: GraphObjectNode, key: string, value: unknown): GraphObjectPatch => ({
  meta: {
    ...(node.meta ?? {}),
    [key]: value
  }
});

const togglePatch = (node: GraphObjectNode, capabilityId: string, payload: unknown): GraphObjectPatch => {
  const key = capabilityId
    .replace(/^math\./, '')
    .replace(/\./g, ':');
  const current = asRecord(node.meta?.toggles) ?? {};
  const nextValue = typeof payload === 'boolean' ? payload : !readBoolean(current[key], false);
  return {
    meta: {
      ...(node.meta ?? {}),
      toggles: {
        ...current,
        [key]: nextValue
      }
    }
  };
};

const vectorEndpointPatch = (node: GraphObjectNode, payload: unknown): GraphObjectPatch => {
  const record = asRecord(payload);
  const endpoint = readString(record?.endpoint) ?? 'end';
  const point = asPoint(record?.point ?? payload);
  const current = asRecord(node.payload) ?? {};
  const start = asPoint(current.start);
  const end = asPoint(current.end);
  if (!point || !start || !end || (endpoint !== 'start' && endpoint !== 'end')) return { payload: node.payload };
  const nextStart = endpoint === 'start' ? point : start;
  const nextEnd = endpoint === 'end' ? point : end;
  const isSceneObjectIrVector = current.objectType === 'vector';
  return {
    payload: {
      ...current,
      start: isSceneObjectIrVector ? toCoordinatePointSource(nextStart) : nextStart,
      end: isSceneObjectIrVector ? toCoordinatePointSource(nextEnd) : nextEnd,
      vector: { x: nextEnd.x - nextStart.x, y: nextEnd.y - nextStart.y }
    }
  };
};

const geometryRotationPatch = (node: GraphObjectNode, payload: unknown): GraphObjectPatch => {
  const record = asRecord(payload);
  const angle = readFiniteNumber(record?.angle ?? payload);
  if (angle === null) return { payload: node.payload };
  return {
    meta: {
      ...(node.meta ?? {}),
      transform: {
        ...(asRecord(node.meta?.transform) ?? {}),
        rotation: {
          angle,
          center: asPoint(record?.center) ?? { x: 0, y: 0 }
        }
      }
    }
  };
};

const asRecord = (value: unknown): PlainRecord | null => typeof value === 'object' && value !== null ? value as PlainRecord : null;
const readString = (value: unknown): string | undefined => typeof value === 'string' && value.trim() !== '' ? value : undefined;
const readBoolean = (value: unknown, fallback: boolean): boolean => typeof value === 'boolean' ? value : fallback;
const readFiniteNumber = (value: unknown): number | null => typeof value === 'number' && Number.isFinite(value) ? value : null;
const readPositiveFiniteNumber = (value: unknown): number | undefined => {
  const number = readFiniteNumber(value);
  return number !== null && number > 0 ? number : undefined;
};

const readGridSnapPixelScale = (value: unknown): GraphGridSnapPixelScale | undefined => {
  const scalar = readPositiveFiniteNumber(value);
  if (scalar !== undefined) return scalar;
  const record = asRecord(value);
  if (!record) return undefined;
  const x = readPositiveFiniteNumber(record.x);
  const y = readPositiveFiniteNumber(record.y);
  return x !== undefined || y !== undefined
    ? {
        ...(x !== undefined ? { x } : {}),
        ...(y !== undefined ? { y } : {})
      }
    : undefined;
};

const readGraphObjectNode = (value: unknown): GraphObjectNode | null => {
  const record = asRecord(value);
  if (
    typeof record?.id !== 'string'
    || !isGraphObjectKind(record.kind)
    || typeof record.type !== 'string'
    || !('payload' in record)
  ) {
    return null;
  }
  return {
    ...record,
    id: record.id,
    kind: record.kind as GraphObjectNode['kind'],
    type: record.type,
    payload: record.payload
  } as GraphObjectNode;
};

const isGraphObjectKind = (value: unknown): value is GraphObjectNode['kind'] => (
  value === 'command'
  || value === 'shape'
  || value === 'composite'
  || value === 'viewport'
  || value === 'overlay'
  || value === 'relation'
);

const asPoint = (value: unknown): { x: number; y: number } | null => {
  const record = asRecord(value);
  if (!record) return null;
  const coordinates = asRecord(record.coordinates);
  const source = coordinates ?? record;
  const x = readFiniteNumber(source.x);
  const y = readFiniteNumber(source.y);
  return x === null || y === null ? null : { x, y };
};

const toCoordinatePointSource = (point: { x: number; y: number }): PlainRecord => ({
  coordinates: { dimension: '2d', x: point.x, y: point.y }
});

const asDragDelta = (value: unknown): GraphDragDelta | null => {
  const record = asRecord(value);
  if (!record || (record.dimension !== '2d' && record.dimension !== '3d')) return null;
  const dx = readFiniteNumber(record.dx);
  const dy = readFiniteNumber(record.dy);
  if (dx === null || dy === null) return null;
  if (record.dimension === '3d') {
    const dz = readFiniteNumber(record.dz);
    return dz === null ? null : { dimension: '3d', dx, dy, dz };
  }
  return { dimension: '2d', dx, dy };
};
