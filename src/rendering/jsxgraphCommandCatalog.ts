import JXG from 'jsxgraph';
import known3DElementTypes from './known3dElementTypes.json';

function normalizeTypeName(input: string): string {
  return input.trim().toLowerCase().replace(/[_\-\s]/g, '');
}

let cachedMap: Map<string, string> | null = null;

const KNOWN_3D_ELEMENT_TYPES = known3DElementTypes as string[];

const THREE_D_ALIASES: Record<string, string> = {
  circle: 'circle3d',
  curve: 'curve3d',
  functiongraph: 'functiongraph3d',
  graph3d: 'functiongraph3d',
  intersectioncircle: 'intersectioncircle3d',
  intersectionline: 'intersectionline3d',
  line: 'line3d',
  surface: 'parametricsurface3d',
  parametricsurface: 'parametricsurface3d',
  plane: 'plane3d',
  point: 'point3d',
  polygon: 'polygon3d',
  sphere: 'sphere3d'
};

function ensureCatalog(): Map<string, string> {
  if (cachedMap) return cachedMap;

  const map = new Map<string, string>();
  const keys = Object.keys((JXG as any).elements || {});

  keys.forEach((key) => {
    map.set(normalizeTypeName(key), key);
  });

  cachedMap = map;
  return map;
}

export function resolve2DElementType(typeInput: string): string | null {
  const normalized = normalizeTypeName(typeInput);
  if (!normalized) return null;

  const map = ensureCatalog();
  return map.get(normalized) || null;
}

export function listAll2DElementTypes(): string[] {
  return Object.keys((JXG as any).elements || {}).sort((a, b) => a.localeCompare(b));
}

export function resolve3DElementType(typeInput: string): string | null {
  const normalized = normalizeTypeName(typeInput);
  if (!normalized) return null;

  const direct = KNOWN_3D_ELEMENT_TYPES.find(
    (item) => normalizeTypeName(item) === normalized
  );
  if (direct) return direct;

  const byAlias = THREE_D_ALIASES[normalized];
  if (byAlias) return byAlias;

  if (normalized.endsWith('3d')) {
    const candidate = KNOWN_3D_ELEMENT_TYPES.find(
      (item) => normalizeTypeName(item) === normalized
    );
    if (candidate) return candidate;
  }

  const with3d = `${normalized}3d`;
  const autoCandidate = KNOWN_3D_ELEMENT_TYPES.find(
    (item) => normalizeTypeName(item) === with3d
  );
  return autoCandidate || null;
}

export function listAll3DElementTypes(): string[] {
  return [...KNOWN_3D_ELEMENT_TYPES];
}
