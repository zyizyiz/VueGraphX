import type { GraphHiddenLineEdgeStyle } from './contracts';
import type { GraphHiddenLineRenderedPath } from './solver';

const SVG_NS = 'http://www.w3.org/2000/svg';

const DASH_MAP: Record<number, number[]> = {
  1: [2, 6],
  2: [6, 6],
  3: [10, 8],
  4: [16, 10],
  5: [10, 6, 18, 6],
  6: [10, 4, 18, 4],
  7: [1, 6]
};

const round = (value: number): string => Number(value.toFixed(2)).toString();

const buildPathData = (points: GraphHiddenLineRenderedPath['points']): string => points
  .map((point, index) => `${index === 0 ? 'M' : 'L'}${round(point.x)} ${round(point.y)}`)
  .join(' ');

const toDashArray = (style: GraphHiddenLineEdgeStyle | undefined): string | null => {
  const dash = style?.dash;
  if (!dash || dash <= 0) return null;
  const basePattern = DASH_MAP[dash] ?? DASH_MAP[2];
  const scale = style?.dashScale ? Math.max(1, (style.strokeWidth ?? 1) / 2) : 1;
  return basePattern.map((value) => value * scale).join(' ');
};

export class GraphHiddenLineOverlayRenderer {
  private svg: SVGSVGElement | null = null;
  private mountedContainer: HTMLElement | null = null;

  public render(board: any, paths: GraphHiddenLineRenderedPath[]): void {
    const container = board?.containerObj as HTMLElement | undefined;
    if (!container || typeof document === 'undefined') return;

    const svg = this.ensureSvg(container);
    const width = Math.max(0, container.clientWidth || container.getBoundingClientRect().width || 0);
    const height = Math.max(0, container.clientHeight || container.getBoundingClientRect().height || 0);

    svg.setAttribute('width', `${width}`);
    svg.setAttribute('height', `${height}`);
    svg.setAttribute('viewBox', `0 0 ${width} ${height}`);
    svg.replaceChildren(...paths.map((path) => this.createPathNode(path)));
  }

  public clear(): void {
    if (this.svg) {
      this.svg.replaceChildren();
    }
  }

  public destroy(): void {
    this.svg?.remove();
    this.svg = null;
    this.mountedContainer = null;
  }

  private ensureSvg(container: HTMLElement): SVGSVGElement {
    if (this.svg && this.mountedContainer === container) {
      return this.svg;
    }

    this.destroy();

    const svg = document.createElementNS(SVG_NS, 'svg');
    svg.setAttribute('data-vuegraphx-hidden-line-overlay', 'true');
    svg.style.position = 'absolute';
    svg.style.left = '0';
    svg.style.top = '0';
    svg.style.width = '100%';
    svg.style.height = '100%';
    svg.style.pointerEvents = 'none';
    svg.style.overflow = 'visible';
    svg.style.zIndex = '12';

    container.appendChild(svg);
    this.svg = svg;
    this.mountedContainer = container;
    return svg;
  }

  private createPathNode(path: GraphHiddenLineRenderedPath): SVGPathElement {
    const node = document.createElementNS(SVG_NS, 'path');
    node.setAttribute('d', buildPathData(path.points));
    node.setAttribute('fill', 'none');
    node.setAttribute('vector-effect', 'non-scaling-stroke');
    node.setAttribute('stroke', path.style?.strokeColor ?? '#475569');
    node.setAttribute('stroke-width', `${path.style?.strokeWidth ?? 2}`);
    node.setAttribute('stroke-opacity', `${path.style?.strokeOpacity ?? 1}`);
    node.setAttribute('stroke-linecap', path.style?.lineCap ?? 'round');
    node.setAttribute('stroke-linejoin', 'round');
    node.setAttribute('data-owner-id', path.ownerId);
    node.setAttribute('data-source-id', path.sourceId);
    node.setAttribute('data-hidden', path.hidden ? 'true' : 'false');

    const dashArray = toDashArray(path.style);
    if (dashArray) {
      node.setAttribute('stroke-dasharray', dashArray);
    }

    return node;
  }
}
