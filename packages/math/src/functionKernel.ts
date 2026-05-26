import * as math from 'mathjs';

export interface GraphFunctionDescriptor {
  expression: string;
  variable: string;
  domain?: [number, number];
}

export interface GraphEquationDescriptor {
  expression: string;
  variables: string[];
}

export const createFunctionDescriptor = (
  expression: string,
  domain?: [number, number],
  variable = 'x'
): GraphFunctionDescriptor => ({
  expression,
  variable,
  domain: domain ? [...domain] as [number, number] : undefined
});

export const createEquationDescriptor = (expression: string, variables: string[] = ['x', 'y']): GraphEquationDescriptor => ({
  expression,
  variables: [...variables]
});

export const evaluateFunctionDescriptor = (
  descriptor: GraphFunctionDescriptor,
  value: number,
  scope: Record<string, unknown> = {}
): number => {
  const code = math.parse(descriptor.expression).compile();
  const result = code.evaluate({
    ...scope,
    [descriptor.variable]: value,
    e: Math.E,
    pi: Math.PI
  });
  return typeof result === 'number' && Number.isFinite(result) ? result : NaN;
};

export const derivativeExpression = (
  descriptor: GraphFunctionDescriptor
): string => math.derivative(descriptor.expression, descriptor.variable).toString();

export const createDerivativeDescriptor = (
  descriptor: GraphFunctionDescriptor
): GraphFunctionDescriptor => createFunctionDescriptor(
  derivativeExpression(descriptor),
  descriptor.domain,
  descriptor.variable
);

export const sampleFunction = (
  descriptor: GraphFunctionDescriptor,
  evaluate: (expression: string, variable: string, value: number) => number,
  steps = 64
): Array<{ x: number; y: number }> => {
  const [min, max] = descriptor.domain ?? [-10, 10];
  const count = Math.max(2, Math.floor(steps));
  const samples: Array<{ x: number; y: number }> = [];
  for (let index = 0; index < count; index += 1) {
    const x = min + ((max - min) * index) / (count - 1);
    const y = evaluate(descriptor.expression, descriptor.variable, x);
    if (Number.isFinite(y)) samples.push({ x, y });
  }
  return samples;
};
