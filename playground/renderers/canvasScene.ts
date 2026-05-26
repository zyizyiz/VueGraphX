import * as math from 'mathjs';
import type { GraphObjectNode } from '@vuegraphx/core';
import { compileGraphCommand, normalizeLegacyGraphExpression, type GraphCommandSymbolTable } from '@vuegraphx/commands';

export interface PlaygroundCanvasCommand {
  id: string;
  expression: string;
  color: string;
  options?: Record<string, unknown>;
}

export interface PlaygroundCanvasDiagnostic {
  commandId: string;
  message: string;
}

export interface PlaygroundCanvasSceneResult {
  nodes: GraphObjectNode[];
  diagnostics: PlaygroundCanvasDiagnostic[];
}

export const PLAYGROUND_CANVAS_WORLD_BOUNDS = {
  left: -10,
  top: 10,
  right: 10,
  bottom: -10
} as const;

const SAMPLE_STEPS = 240;
const BUILTIN_SCOPE = { e: Math.E, pi: Math.PI };

export const buildPlaygroundCanvasScene = (commands: readonly PlaygroundCanvasCommand[]): PlaygroundCanvasSceneResult => {
  const diagnostics: PlaygroundCanvasDiagnostic[] = [];
  const nodes: GraphObjectNode[] = [];
  let symbols: GraphCommandSymbolTable = new Map();
  const scope: Record<string, unknown> = { ...BUILTIN_SCOPE };

  for (const command of commands) {
    const expression = command.expression.trim();
    if (!expression) continue;

    const graphCommand = normalizeLegacyGraphExpression(expression);
    if (graphCommand) {
      const result = compileGraphCommand(graphCommand, { symbols });
      if (result.ok && result.value) {
        symbols = result.value.symbols;
        nodes.push(withRenderHints(result.value.node, command));
        continue;
      }
    }

    const mathNodes = buildMathExpressionNodes(command, scope);
    if (mathNodes.ok) {
      nodes.push(...mathNodes.nodes);
      continue;
    }

    diagnostics.push({ commandId: command.id, message: mathNodes.message ?? 'Canvas2D 后端暂不支持该指令。' });
  }

  return { nodes, diagnostics };
};

export const buildPlaygroundBabylonScene = (commands: readonly PlaygroundCanvasCommand[]): PlaygroundCanvasSceneResult => {
  const diagnostics: PlaygroundCanvasDiagnostic[] = [];
  const nodes: GraphObjectNode[] = [];
  let symbols: GraphCommandSymbolTable = new Map();

  for (const command of commands) {
    const expression = command.expression.trim();
    if (!expression) continue;

    const result = compileGraphCommand(normalizeLegacyGraphExpression(expression) ?? expression, { symbols });
    if (result.ok && result.value) {
      symbols = result.value.symbols;
      if (result.value.node.type === 'solid') {
        nodes.push(withRenderHints(result.value.node, command));
      } else if (result.value.node.type !== 'variable') {
        diagnostics.push({ commandId: command.id, message: 'Babylon 后端当前只接收 core Solid(...) 立体对象；曲面/函数仍请切回 JSXGraph。' });
      }
      continue;
    }

    diagnostics.push({
      commandId: command.id,
      message: result.diagnostics[0]?.message ?? 'Babylon 后端暂不支持该指令。'
    });
  }

  return { nodes, diagnostics };
};

const withRenderHints = (node: GraphObjectNode, command: PlaygroundCanvasCommand): GraphObjectNode => ({
  ...node,
  renderHints: {
    strokeColor: readString(command.options?.strokeColor, command.color),
    fillColor: readString(command.options?.fillColor, `${command.color}26`),
    strokeWidth: readNumber(command.options?.strokeWidth, 2),
    radius: readNumber(command.options?.size, 4)
  }
});

const buildMathExpressionNodes = (
  command: PlaygroundCanvasCommand,
  scope: Record<string, unknown>
): { ok: true; nodes: GraphObjectNode[] } | { ok: false; message: string } => {
  let node: math.MathNode;
  try {
    node = math.parse(command.expression);
  } catch (error) {
    return { ok: false, message: `表达式解析失败：${formatError(error)}` };
  }

  try {
    if ((node as any).isAssignmentNode) {
      const variableName = (node as any).object?.name;
      if (variableName !== 'x' && variableName !== 'y') {
        node.compile().evaluate(scope);
        return { ok: true, nodes: [] };
      }
      return createSampledNode(command, (node as any).value, scope);
    }

    if (node.type === 'FunctionAssignmentNode') {
      node.compile().evaluate(scope);
      const params = (node as any).params ?? [];
      if (command.options?.plot === false || params.length !== 1 || params[0] !== 'x') {
        return { ok: true, nodes: [] };
      }
      return createSampledNode(command, (node as any).expr, scope);
    }

    return createSampledNode(command, node, scope);
  } catch (error) {
    return { ok: false, message: `表达式求值失败：${formatError(error)}` };
  }
};

const createSampledNode = (
  command: PlaygroundCanvasCommand,
  expressionNode: math.MathNode,
  scope: Record<string, unknown>
): { ok: true; nodes: GraphObjectNode[] } | { ok: false; message: string } => {
  const code = expressionNode.compile();
  const points: Array<{ x: number; y: number }> = [];
  const { left, right, bottom, top } = PLAYGROUND_CANVAS_WORLD_BOUNDS;

  for (let index = 0; index < SAMPLE_STEPS; index += 1) {
    const x = left + ((right - left) * index) / (SAMPLE_STEPS - 1);
    let y: unknown;
    try {
      y = code.evaluate({ ...scope, x });
    } catch {
      continue;
    }
    if (typeof y === 'number' && Number.isFinite(y) && y >= bottom * 4 && y <= top * 4) {
      points.push({ x, y });
    }
  }

  if (points.length < 2) {
    return { ok: false, message: 'Canvas2D 后端没有采样到可绘制的函数点。' };
  }

  return {
    ok: true,
    nodes: [withRenderHints({
      id: command.id,
      kind: 'shape',
      type: 'function',
      payload: {
        expression: command.expression,
        geometry: { kind: 'polyline', points }
      },
      layerId: 'content'
    }, command)]
  };
};

const readString = (value: unknown, fallback: string): string => typeof value === 'string' ? value : fallback;
const readNumber = (value: unknown, fallback: number): number => typeof value === 'number' && Number.isFinite(value) ? value : fallback;
const formatError = (error: unknown): string => error instanceof Error ? error.message : String(error);
