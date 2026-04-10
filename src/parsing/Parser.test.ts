import * as math from 'mathjs';
import { describe, expect, it } from 'vitest';
import { Parser } from './Parser';

describe('Parser.preprocessLaTeX trig shorthand', () => {
  it('normalizes powered trig shorthand into mathjs-call syntax', () => {
    expect(Parser.preprocessLaTeX('$$y = \\sec^2 x$$')).toBe('y = sec(x)^2');
  });

  it('normalizes shorthand trig arguments with greek symbols', () => {
    expect(Parser.preprocessLaTeX('$$y = \\sin x + \\cos^2 \\theta$$'))
      .toBe('y = sin(x) + cos(theta)^2');
  });

  it('keeps fraction arguments grouped inside shorthand trig calls', () => {
    expect(Parser.preprocessLaTeX('$$y = \\tan \\frac{x}{2}$$'))
      .toBe('y = tan((x)/(2))');
  });

  it('keeps powers on shorthand arguments inside the trig call', () => {
    expect(Parser.preprocessLaTeX('$$y = \\sin x^2$$'))
      .toBe('y = sin(x^2)');
  });

  it('supports shorthand trig arguments wrapped in latex absolute-value bars', () => {
    expect(Parser.preprocessLaTeX('$$y = \\sin \\left|x\\right|$$'))
      .toBe('y = sin(abs(x))');
  });

  it('treats trig shorthand to the power of negative one as inverse trig', () => {
    expect(Parser.preprocessLaTeX('$$y = \\sin^{-1} x + \\sec^{-1} x + \\sinh^{-1} x$$'))
      .toBe('y = asin(x) + asec(x) + asinh(x)');
  });

  it('keeps other negative powers as ordinary exponents instead of inverse trig', () => {
    expect(Parser.preprocessLaTeX('$$y = \\sin^{-2} x$$'))
      .toBe('y = sin(x)^-2');
  });

  it('produces mathjs-evaluable output for powered shorthand trig curves', () => {
    const processed = Parser.preprocessLaTeX('$$y = \\sec^2 x$$');
    const node = math.parse(processed);
    const value = (node as any).value.compile().evaluate({ x: 1, e: Math.E, pi: Math.PI });

    expect(value).toBeCloseTo(1 / (Math.cos(1) ** 2));
  });

  it('produces mathjs-evaluable output for inverse trig shorthand curves', () => {
    const processed = Parser.preprocessLaTeX('$$y = \\sin^{-1} x$$');
    const node = math.parse(processed);
    const value = (node as any).value.compile().evaluate({ x: 0.5, e: Math.E, pi: Math.PI });

    expect(value).toBeCloseTo(Math.asin(0.5));
  });
});
