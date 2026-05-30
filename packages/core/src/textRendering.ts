import type { GraphObjectNode, GraphWorldPoint } from './contracts';

export type GraphTextRenderFormat = 'plain' | 'latex' | 'markdown';

export interface GraphLatexSource {
  latex: string;
  displayMode: boolean;
}

export interface GraphTextRenderDescriptor {
  text: string;
  format: GraphTextRenderFormat;
  latex?: string;
  displayMode?: boolean;
}

const GRAPH_TEXT_FORMATS = new Set<string>(['plain', 'latex', 'markdown']);

export const inferGraphTextFormat = (text: string): GraphTextRenderFormat => (
  isDelimitedLatexText(text) ? 'latex' : 'plain'
);

export const normalizeGraphLatexSource = (text: string): GraphLatexSource => {
  const source = text.trim();
  const displayDelimited = stripDelimitedLatex(source, '$$', '$$') ?? stripDelimitedLatex(source, '\\[', '\\]');
  if (displayDelimited !== null) return { latex: displayDelimited, displayMode: true };

  const inlineDelimited = stripDelimitedLatex(source, '$', '$') ?? stripDelimitedLatex(source, '\\(', '\\)');
  if (inlineDelimited !== null) return { latex: inlineDelimited, displayMode: false };

  return { latex: source, displayMode: false };
};

export const resolveGraphTextRenderDescriptor = (
  node: GraphObjectNode
): GraphTextRenderDescriptor | null => {
  const payload = asRecord(node.payload);
  const text = firstNonEmptyString(payload?.text, payload?.content, payload?.label, payload?.name)
    ?? measurementTextFallback(node, payload);
  if (!text) return null;

  const format = readTextFormat(payload?.format)
    ?? readTextFormat(node.renderHints?.textFormat)
    ?? readTextFormat(node.meta?.textFormat)
    ?? inferGraphTextFormat(text);

  if (format !== 'latex') return { text, format };

  const latex = normalizeGraphLatexSource(text);
  return {
    text,
    format,
    latex: latex.latex,
    displayMode: latex.displayMode
  };
};

export const resolveGraphTextAnchor = (node: GraphObjectNode): GraphWorldPoint | null => {
  const payload = asRecord(node.payload);
  const geometry = asRecord(payload?.geometry);
  const candidates = [
    payload?.point,
    payload?.anchor,
    payload?.position,
    payload?.vertex,
    geometry?.center,
    geometry?.point,
    geometry?.origin,
    geometry?.start,
    geometry?.end
  ];

  for (const candidate of candidates) {
    const point = readWorldPoint(candidate);
    if (point) return point;
  }
  return null;
};

const readTextFormat = (value: unknown): GraphTextRenderFormat | null => (
  typeof value === 'string' && GRAPH_TEXT_FORMATS.has(value)
    ? value as GraphTextRenderFormat
    : null
);

const isDelimitedLatexText = (text: string): boolean => {
  const source = text.trim();
  return stripDelimitedLatex(source, '$$', '$$') !== null
    || stripDelimitedLatex(source, '$', '$') !== null
    || stripDelimitedLatex(source, '\\[', '\\]') !== null
    || stripDelimitedLatex(source, '\\(', '\\)') !== null;
};

const stripDelimitedLatex = (source: string, open: string, close: string): string | null => {
  if (!source.startsWith(open) || !source.endsWith(close)) return null;
  if (source.length <= open.length + close.length) return null;
  return source.slice(open.length, source.length - close.length).trim();
};

const measurementTextFallback = (
  node: GraphObjectNode,
  payload: Record<string, unknown> | null
): string | null => {
  if (node.type !== 'measurement') return null;
  const measurementKind = typeof payload?.measurementKind === 'string' ? payload.measurementKind : 'measure';
  if (typeof payload?.value === 'number' && Number.isFinite(payload.value)) {
    return `${measurementKind}: ${formatDisplayNumber(payload.value)}`;
  }
  const expression = firstNonEmptyString(payload?.expression);
  return expression ? `${measurementKind}: ${expression}` : null;
};

const firstNonEmptyString = (...values: unknown[]): string | null => {
  for (const value of values) {
    if (typeof value !== 'string') continue;
    const trimmed = value.trim();
    if (trimmed) return trimmed;
  }
  return null;
};

const readWorldPoint = (value: unknown): GraphWorldPoint | null => {
  const record = asRecord(value);
  const point = asRecord(record?.coordinates) ?? record;
  if (!point) return null;
  if (point?.dimension === '3d' && isFiniteNumber(point.x) && isFiniteNumber(point.y) && isFiniteNumber(point.z)) {
    return { dimension: '3d', x: point.x, y: point.y, z: point.z };
  }
  if ((point.dimension === '2d' || point.dimension === undefined) && isFiniteNumber(point.x) && isFiniteNumber(point.y)) {
    return { dimension: '2d', x: point.x, y: point.y };
  }
  return null;
};

const isFiniteNumber = (value: unknown): value is number => typeof value === 'number' && Number.isFinite(value);

const asRecord = (value: unknown): Record<string, unknown> | null => (
  typeof value === 'object' && value !== null && !Array.isArray(value) ? value as Record<string, unknown> : null
);

const formatDisplayNumber = (value: number): string => (
  Number.isInteger(value) ? String(value) : value.toFixed(3).replace(/0+$/, '').replace(/\.$/, '')
);
