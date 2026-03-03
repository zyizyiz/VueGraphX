import nerdamer from 'nerdamer';
import 'nerdamer/all';

export class Parser {
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

    const extractBraces = (str: string, pos: number): [string, number] => {
      if (str[pos] !== '{') return ['', pos];
      let depth = 0;
      let start = pos;
      let inner = '';
      for (let i = pos; i < str.length; i++) {
        const c = str[i];
        if (c === '{') { depth++; if (depth === 1) { start = i; } else inner += c; }
        else if (c === '}') {
          depth--;
          if (depth === 0) return [inner || str.slice(start + 1, i), i];
          inner += c;
        } else if (depth > 0) inner += c;
      }
      return [inner, str.length - 1];
    };

    const processFrac = (s: string): string => {
      const fracReg = /\\frac\s*\{/g;
      let match: RegExpExecArray | null;
      let result = s;
      let offset = 0;
      const orig = s;
      while ((match = fracReg.exec(orig)) !== null) {
        const startPos = match.index + offset;
        const brace1Pos = result.indexOf('{', startPos);
        const [num, end1] = extractBraces(result, brace1Pos);
        const brace2Idx = result.indexOf('{', end1 + 1);
        if (brace2Idx !== -1) {
          const [den, end2] = extractBraces(result, brace2Idx);
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

    const trigMap: Record<string, string> = {
      '\\sin': 'sin', '\\cos': 'cos', '\\tan': 'tan',
      '\\sec': 'sec', '\\csc': 'csc', '\\cot': 'cot',
      '\\arcsin': 'asin', '\\arccos': 'acos', '\\arctan': 'atan',
      '\\sinh': 'sinh', '\\cosh': 'cosh', '\\tanh': 'tanh',
      '\\arcsinh': 'asinh', '\\arccosh': 'acosh', '\\arctanh': 'atanh',
    };
    Object.entries(trigMap).forEach(([k, v]) => {
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
