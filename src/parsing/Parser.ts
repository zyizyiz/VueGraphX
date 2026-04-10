import nerdamer from 'nerdamer';
import 'nerdamer/all';

export class Parser {
  private static readonly LATEX_TRIG_MAP: Record<string, string> = {
    '\\arcsinh': 'asinh',
    '\\arccosh': 'acosh',
    '\\arctanh': 'atanh',
    '\\arcsin': 'asin',
    '\\arccos': 'acos',
    '\\arctan': 'atan',
    '\\sinh': 'sinh',
    '\\cosh': 'cosh',
    '\\tanh': 'tanh',
    '\\sin': 'sin',
    '\\cos': 'cos',
    '\\tan': 'tan',
    '\\sec': 'sec',
    '\\csc': 'csc',
    '\\cot': 'cot'
  };

  private static readonly LATEX_INVERSE_TRIG_MAP: Record<string, string> = {
    '\\sin': 'asin',
    '\\cos': 'acos',
    '\\tan': 'atan',
    '\\sec': 'asec',
    '\\csc': 'acsc',
    '\\cot': 'acot',
    '\\sinh': 'asinh',
    '\\cosh': 'acosh',
    '\\tanh': 'atanh'
  };

  private static readonly SORTED_LATEX_TRIG_COMMANDS = Object.keys(Parser.LATEX_TRIG_MAP)
    .sort((left, right) => right.length - left.length);

  public static preprocessLaTeX(expr: string): string {
    let pureExpr = expr.replace(/^\$+(.*?)\$+$/, '$1').trim();

    if (!pureExpr.includes('\\')) {
      return pureExpr;
    }

    try {
      if ((nerdamer as any).fromLatex) {
        const parsed = (nerdamer as any).fromLatex(pureExpr);
        if (parsed) {
          return parsed.toString();
        }
      }
    } catch {
    }

    return this.latexFallbackPreprocessor(pureExpr);
  }

  private static latexFallbackPreprocessor(expr: string): string {
    let res = expr;

    const extractGroup = (str: string, pos: number): [string, number] => {
      const open = str[pos];
      const close = open === '{' ? '}' : open === '(' ? ')' : open === '[' ? ']' : '';
      if (!close) return ['', pos];
      let depth = 0;
      let start = pos;
      let inner = '';
      for (let i = pos; i < str.length; i++) {
        const c = str[i];
        if (c === open) { depth++; if (depth === 1) { start = i; } else inner += c; }
        else if (c === close) {
          depth--;
          if (depth === 0) return [inner || str.slice(start + 1, i), i];
          inner += c;
        } else if (depth > 0) inner += c;
      }
      return [inner, str.length - 1];
    };

    const stripWrappingGroup = (value: string): string => {
      if (value.length < 2) return value;
      const first = value[0];
      const last = value[value.length - 1];
      if (!((first === '{' && last === '}') || (first === '(' && last === ')') || (first === '[' && last === ']'))) {
        return value;
      }

      const [inner, endIndex] = extractGroup(value, 0);
      return endIndex === value.length - 1 ? inner : value;
    };

    const skipSpaces = (str: string, index: number): number => {
      let cursor = index;
      while (cursor < str.length && /\s/.test(str[cursor])) cursor++;
      return cursor;
    };

    const extractLatexAtom = (str: string, index: number): { value: string; nextIndex: number } | null => {
      const cursor = skipSpaces(str, index);
      if (cursor >= str.length) return null;

      const char = str[cursor];
      if (char === '{' || char === '(' || char === '[') {
        const [, endIndex] = extractGroup(str, cursor);
        if (endIndex <= cursor) return null;
        return {
          value: str.slice(cursor, endIndex + 1),
          nextIndex: endIndex + 1
        };
      }

      if (char === '+' || char === '-') {
        const next = extractLatexAtom(str, cursor + 1);
        if (!next) return null;
        return {
          value: str.slice(cursor, next.nextIndex),
          nextIndex: next.nextIndex
        };
      }

      if (char === '\\') {
        const commandMatch = str.slice(cursor).match(/^\\[a-zA-Z]+/);
        if (!commandMatch) return null;

        const command = commandMatch[0];
        let commandCursor = cursor + command.length;

        if (command === '\\frac') {
          const numerator = extractLatexAtom(str, commandCursor);
          if (!numerator) return { value: command, nextIndex: commandCursor };
          const denominator = extractLatexAtom(str, numerator.nextIndex);
          if (!denominator) {
            return { value: str.slice(cursor, numerator.nextIndex), nextIndex: numerator.nextIndex };
          }
          return {
            value: str.slice(cursor, denominator.nextIndex),
            nextIndex: denominator.nextIndex
          };
        }

        if (command === '\\sqrt' || command === '\\abs') {
          const argument = extractLatexAtom(str, commandCursor);
          if (!argument) return { value: command, nextIndex: commandCursor };
          return {
            value: str.slice(cursor, argument.nextIndex),
            nextIndex: argument.nextIndex
          };
        }

        return {
          value: command,
          nextIndex: commandCursor
        };
      }

      const plainMatch = str.slice(cursor).match(/^(?:\d+(?:\.\d+)?|[a-zA-Z]+(?:_[a-zA-Z0-9]+)?)/);
      if (!plainMatch) return null;

      const plainToken = plainMatch[0];
      const plainTokenEnd = cursor + plainToken.length;
      const functionArgsStart = skipSpaces(str, plainTokenEnd);
      if (/^[a-zA-Z]/.test(plainToken) && str[functionArgsStart] === '(') {
        const [, endIndex] = extractGroup(str, functionArgsStart);
        if (endIndex > functionArgsStart) {
          return {
            value: str.slice(cursor, endIndex + 1),
            nextIndex: endIndex + 1
          };
        }
      }

      return {
        value: plainToken,
        nextIndex: plainTokenEnd
      };
    };

    const normalizeExponent = (value: string): string => {
      const stripped = stripWrappingGroup(value);
      return /^[a-zA-Z0-9_.-]+$/.test(stripped) ? stripped : `(${stripped})`;
    };

    const normalizeTrigShorthand = (str: string): string => {
      let result = '';
      let cursor = 0;

      while (cursor < str.length) {
        const command = Parser.SORTED_LATEX_TRIG_COMMANDS.find((entry) => str.startsWith(entry, cursor));
        if (!command) {
          result += str[cursor];
          cursor += 1;
          continue;
        }

        let nextCursor = cursor + command.length;
        const exponentStart = skipSpaces(str, nextCursor);
        let exponent: string | null = null;

        if (str[exponentStart] === '^') {
          const exponentToken = extractLatexAtom(str, exponentStart + 1);
          if (exponentToken) {
            exponent = normalizeExponent(exponentToken.value);
            nextCursor = exponentToken.nextIndex;
          } else {
            result += str[cursor];
            cursor += 1;
            continue;
          }
        } else {
          nextCursor = exponentStart;
        }

        const argumentStart = skipSpaces(str, nextCursor);
        const argument = extractLatexAtom(str, nextCursor);
        if (!argument) {
          result += str[cursor];
          cursor += 1;
          continue;
        }

        let argumentValue = argument.value;
        let finalCursor = argument.nextIndex;
        const trailingExponentStart = skipSpaces(str, argument.nextIndex);
        if (str[trailingExponentStart] === '^') {
          const trailingExponent = extractLatexAtom(str, trailingExponentStart + 1);
          if (trailingExponent) {
            argumentValue = str.slice(argumentStart, trailingExponent.nextIndex);
            finalCursor = trailingExponent.nextIndex;
          }
        }

        const inverseFunctionName = exponent === '-1'
          ? Parser.LATEX_INVERSE_TRIG_MAP[command]
          : null;
        const functionName = inverseFunctionName ?? Parser.LATEX_TRIG_MAP[command];

        result += `${functionName}(${stripWrappingGroup(argumentValue)})`;
        if (exponent && !inverseFunctionName) {
          result += `^${exponent}`;
        }
        cursor = finalCursor;
      }

      return result;
    };

    res = res.replace(/\\left\s*\(/g, '(');
    res = res.replace(/\\right\s*\)/g, ')');
    res = res.replace(/\\left\s*\[/g, '[');
    res = res.replace(/\\right\s*\]/g, ']');
    res = res.replace(/\\left\s*\{/g, '(');
    res = res.replace(/\\right\s*\}/g, ')');
    res = res.replace(/\\left\|([^|]*?)\\right\|/g, 'abs($1)');

    res = normalizeTrigShorthand(res);

    const processFrac = (s: string): string => {
      const fracReg = /\\frac\s*\{/g;
      let match: RegExpExecArray | null;
      let result = s;
      let offset = 0;
      const orig = s;
      while ((match = fracReg.exec(orig)) !== null) {
        const startPos = match.index + offset;
        const brace1Pos = result.indexOf('{', startPos);
        const [num, end1] = extractGroup(result, brace1Pos);
        const brace2Idx = result.indexOf('{', end1 + 1);
        if (brace2Idx !== -1) {
          const [den, end2] = extractGroup(result, brace2Idx);
          const replaceStr = `(${processFrac(num)})/(${processFrac(den)})`;
          result = result.slice(0, startPos) + replaceStr + result.slice(end2 + 1);
          offset += replaceStr.length - (end2 + 1 - startPos);
        }
      }
      return result;
    };
    res = processFrac(res);

    res = res.replace(/\\sqrt\s*\{([^}]*)\}/g, 'sqrt($1)');
    res = res.replace(/\\sqrt\s+([a-zA-Z0-9])/g, 'sqrt($1)');

    res = res.replace(/\\abs\s*\{([^}]*)\}/g, 'abs($1)');
    res = res.replace(/\\left\|([^|]*?)\\right\|/g, 'abs($1)');

    res = res.replace(/\^\{([^}]*)\}/g, '^($1)');
    res = res.replace(/_\{([^}]*)\}/g, '_$1');
    res = res.replace(/_([a-zA-Z0-9])/g, '_$1');

    Object.entries(Parser.LATEX_TRIG_MAP).forEach(([k, v]) => {
      res = res.replaceAll(k, v);
    });

    res = res.replace(/\\log_\{([^}]*)\}\s*/g, 'log($1, ');
    res = res.replace(/\\log\b/g, 'log10');
    res = res.replace(/\\ln\b/g, 'log');
    res = res.replace(/\\exp\b/g, 'exp');
    res = res.replace(/\\lg\b/g, 'log10');

    res = res.replace(/\\lim\b/g, 'lim');
    res = res.replace(/\\max\b/g, 'max');
    res = res.replace(/\\min\b/g, 'min');
    res = res.replace(/\\gcd\b/g, 'gcd');
    res = res.replace(/\\lcm\b/g, 'lcm');
    res = res.replace(/\\floor\b/g, 'floor');
    res = res.replace(/\\ceil\b/g, 'ceil');

    res = res.replace(/\\pi\b/g, 'pi');
    res = res.replace(/\\infty\b/g, 'Infinity');
    res = res.replace(/\\e\b/g, 'e');

    const greekMap: Record<string, string> = {
      '\\alpha': 'alpha', '\\beta': 'beta', '\\gamma': 'gamma', '\\delta': 'delta',
      '\\epsilon': 'epsilon', '\\zeta': 'zeta', '\\eta': 'eta', '\\theta': 'theta',
      '\\iota': 'iota', '\\kappa': 'kappa', '\\lambda': 'lambda', '\\mu': 'mu',
      '\\nu': 'nu', '\\xi': 'xi', '\\rho': 'rho', '\\sigma': 'sigma',
      '\\tau': 'tau', '\\upsilon': 'upsilon', '\\phi': 'phi', '\\chi': 'chi',
      '\\psi': 'psi', '\\omega': 'omega'
    };
    Object.entries(greekMap).forEach(([k, v]) => {
      res = res.replaceAll(k, v);
    });

    res = res.replace(/\\cdot\b/g, '*');
    res = res.replace(/\\times\b/g, '*');
    res = res.replace(/\\ast\b/g, '*');
    res = res.replace(/\\div\b/g, '/');
    res = res.replace(/\\pm\b/g, '+');
    res = res.replace(/\\mp\b/g, '-');
    res = res.replace(/\\le\b/g, '<=');
    res = res.replace(/\\ge\b/g, '>=');
    res = res.replace(/\\neq?\b/g, '!=');
    res = res.replace(/\\approx\b/g, '~=');

    res = res.replace(/\\left\s*\(/g, '(');
    res = res.replace(/\\right\s*\)/g, ')');
    res = res.replace(/\\left\s*\[/g, '[');
    res = res.replace(/\\right\s*\]/g, ']');
    res = res.replace(/\\left\s*\{/g, '(');
    res = res.replace(/\\right\s*\}/g, ')');

    res = res.replace(/\\[a-zA-Z]+/g, '');
    res = res.replace(/\{/g, '(').replace(/\}/g, ')');
    res = res.replace(/\s+/g, ' ').trim();

    res = res.replace(/(\d)([a-zA-Z])/g, '$1*$2');
    res = res.replace(/\)(?=[a-zA-Z(])/g, ')*');
    res = res.replace(/(\d)\(/g, '$1*(');

    return res;
  }
}
