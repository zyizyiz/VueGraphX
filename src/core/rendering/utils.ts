import JXG from 'jsxgraph';
import * as math from 'mathjs';
import { EntityManager } from '../entities/EntityManager';
import { InstructionParser } from '../parsing/InstructionParser';
import { MathScope } from '../math/MathScope';

export function safeMathEval(expression: string, mathScope: MathScope): any {
  try {
    const val = math.evaluate(expression, mathScope.data);
    if (typeof val === 'number') return val;
    if (Array.isArray(val)) return val;
    if (val && typeof (val as any).toArray === 'function') return (val as any).toArray();
    return val;
  } catch {
    return undefined;
  }
}

export function evaluateInvocationArg(rawArg: string, entityMgr: EntityManager, mathScope: MathScope): any {
  const arg = rawArg.trim();

  const namedElement = entityMgr.getNamedElement(arg);
  if (namedElement) return namedElement;

  const tupleLiteral = arg.match(/^\((.*)\)$/);
  if (tupleLiteral && tupleLiteral[1].includes(',')) {
    const values = InstructionParser.splitTopLevelArgs(tupleLiteral[1]);
    const evaluated = values.map(v => safeMathEval(v, mathScope));
    if (evaluated.every(v => typeof v === 'number')) {
      return evaluated;
    }
  }

  if (/^[a-zA-Z_]\w*$/.test(arg)) return arg;

  const value = safeMathEval(arg, mathScope);
  if (value !== undefined) return value;

  return arg;
}

export function normalizeAndRegister(shape: any, name: string, entityMgr: EntityManager): JXG.GeometryElement[] {
  const els: JXG.GeometryElement[] = [];

  if (Array.isArray(shape)) {
    const list = shape as JXG.GeometryElement[];
    els.push(...list);
    if (name && list.length > 0) {
      entityMgr.registerNamedElement(name, list[0]);
    }
  } else {
    const one = shape as JXG.GeometryElement;
    els.push(one);
    if (name) {
      entityMgr.registerNamedElement(name, one);
    }
  }

  return els;
}
