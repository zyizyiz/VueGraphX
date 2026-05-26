import type {
  GraphOperationDiagnostic,
  GraphOperationResult,
  GraphRuntimeTargetRef
} from '@vuegraphx/core';

export type GraphCommandDiagnosticCode =
  | 'commands.invalid-command'
  | 'commands.syntax'
  | 'commands.unsupported-command'
  | 'commands.arity'
  | 'commands.invalid-argument'
  | 'commands.invalid-reference'
  | 'commands.ambiguous-reference'
  | 'commands.ambiguous-result'
  | 'commands.domain-error'
  | 'commands.unsupported-capability';

export interface GraphCommandDiagnostic extends GraphOperationDiagnostic {
  code: GraphCommandDiagnosticCode;
  details?: Record<string, unknown>;
}

export const createGraphCommandDiagnostic = (
  code: GraphCommandDiagnosticCode,
  message: string,
  target?: GraphRuntimeTargetRef,
  details?: Record<string, unknown>
): GraphCommandDiagnostic => ({
  code,
  message,
  severity: 'error',
  target,
  details
});

export const commandError = <T = never>(
  code: GraphCommandDiagnosticCode,
  message: string,
  target?: GraphRuntimeTargetRef,
  details?: Record<string, unknown>
): GraphOperationResult<T> => ({
  ok: false,
  diagnostics: [createGraphCommandDiagnostic(code, message, target, details)]
});
