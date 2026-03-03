export interface InvocationInstruction {
  raw: string;
  name: string;
  type: string;
  args: string[];
}

export interface TupleInstruction {
  raw: string;
  name: string;
  values: string[];
}

export class InstructionParser {
  private static hasBalancedBrackets(input: string): boolean {
    let depth = 0;
    for (const char of input) {
      if (char === '(' || char === '[' || char === '{') depth++;
      if (char === ')' || char === ']' || char === '}') {
        depth--;
        if (depth < 0) return false;
      }
    }
    return depth === 0;
  }

  public static splitTopLevelArgs(input: string): string[] {
    const args: string[] = [];
    let current = '';
    let depth = 0;

    for (const char of input) {
      if (char === '(' || char === '[' || char === '{') depth++;
      else if (char === ')' || char === ']' || char === '}') depth--;
      else if (char === ',' && depth === 0) {
        args.push(current.trim());
        current = '';
        continue;
      }
      current += char;
    }

    if (current.trim()) args.push(current.trim());
    return args;
  }

  public static parseInvocation(expr: string): InvocationInstruction | null {
    const match = expr.match(/^(?:([a-zA-Z_]\w*)\s*=\s*)?([a-zA-Z_]\w*)\s*\((.*)\)$/);
    if (!match) return null;

    const argsString = match[3] || '';
    if (!this.hasBalancedBrackets(argsString)) return null;

    return {
      raw: expr,
      name: match[1] || '',
      type: (match[2] || '').trim(),
      args: this.splitTopLevelArgs(argsString)
    };
  }

  public static parseTuple(expr: string): TupleInstruction | null {
    const match = expr.match(/^(?:([a-zA-Z_]\w*)\s*=?\s*)?\((.*)\)$/);
    if (!match) return null;

    const values = this.splitTopLevelArgs(match[2] || '');
    if (values.length < 2) return null;

    return {
      raw: expr,
      name: match[1] || '',
      values
    };
  }
}
