import { Parser } from './src/core/Parser.js';
console.log(Parser.preprocessLaTeX('z = \\cos(x)\\sin(y)'));
console.log(Parser.preprocessLaTeX('x = \\cos(u)\\sin(v)'));
