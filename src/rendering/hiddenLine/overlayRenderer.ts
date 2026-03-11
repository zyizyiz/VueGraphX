import type { GraphHiddenLineEdgeStyle, GraphHiddenLineNativeTargetSpec } from './contracts';
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

const sanitizeDomId = (value: string): string => value.replace(/[^a-zA-Z0-9_-]+/g, '-');

const resolveStrokeWidth = (target: GraphHiddenLineNativeTargetSpec, element: SVGElement): number => {
  if (Number.isFinite(target.strokeWidth)) {
    return Math.max(2, (target.strokeWidth as number) + 2);
  }

  const attributeWidth = Number.parseFloat(element.getAttribute('stroke-width') ?? '');
  if (Number.isFinite(attributeWidth)) {
    return Math.max(2, attributeWidth + 2);
  }

  if (typeof window !== 'undefined') {
    const computedWidth = Number.parseFloat(window.getComputedStyle(element).strokeWidth ?? '');
    if (Number.isFinite(computedWidth)) {
      return Math.max(2, computedWidth + 2);
    }
  }

  return 4;
};

interface AppliedMaskRecord {
  maskId: string;
  element: SVGElement;
  previousMask: string | null;
}

interface NativeMaskGroup {
  key: string;
  maskId: string;
  target: GraphHiddenLineNativeTargetSpec;
  visiblePaths: GraphHiddenLineRenderedPath[];
}

interface DashCalibrationRecord {
  scale: number;
  referenceLength: number;
}

export class GraphHiddenLineOverlayRenderer {
  private svg: SVGSVGElement | null = null;
  private mountedContainer: HTMLElement | null = null;
  private defsNode: SVGDefsElement | null = null;
  private defsHostSvg: SVGSVGElement | null = null;
  private readonly appliedMasks = new Map<string, AppliedMaskRecord>();
  private readonly dashCalibration = new Map<string, DashCalibrationRecord>();

  public render(board: any, paths: GraphHiddenLineRenderedPath[]): void {
    const container = board?.containerObj as HTMLElement | undefined;
    if (!container || typeof document === 'undefined') return;

    const svg = this.ensureSvg(container);
    const width = Math.max(0, container.clientWidth || container.getBoundingClientRect().width || 0);
    const height = Math.max(0, container.clientHeight || container.getBoundingClientRect().height || 0);

    svg.setAttribute('width', `${width}`);
    svg.setAttribute('height', `${height}`);
    svg.setAttribute('viewBox', `0 0 ${width} ${height}`);
    svg.replaceChildren(...paths.filter((path) => path.mode === 'draw').map((path) => this.createPathNode(path)));
    this.applyNativeMasks(container, width, height, paths);
  }

  public clear(): void {
    if (this.svg) {
      this.svg.replaceChildren();
    }
    this.clearNativeMasks();
  }

  public destroy(): void {
    this.clearNativeMasks();
    this.dashCalibration.clear();
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

  private getBoardSvgRoot(container: HTMLElement): SVGSVGElement | null {
    const svgNodes = Array.from(container.querySelectorAll('svg')) as SVGSVGElement[];
    return svgNodes.find((node) => node.getAttribute('data-vuegraphx-hidden-line-overlay') !== 'true') ?? null;
  }

  private ensureDefs(container: HTMLElement): SVGDefsElement | null {
    const hostSvg = this.getBoardSvgRoot(container);
    if (!hostSvg) {
      this.clearNativeMasks();
      return null;
    }

    if (this.defsNode && this.defsHostSvg === hostSvg) {
      return this.defsNode;
    }

    this.clearNativeMasks();

    const defs = document.createElementNS(SVG_NS, 'defs');
    defs.setAttribute('data-vuegraphx-hidden-line-masks', 'true');
    hostSvg.insertBefore(defs, hostSvg.firstChild);
    this.defsNode = defs;
    this.defsHostSvg = hostSvg;
    return defs;
  }

  private applyNativeMasks(container: HTMLElement, width: number, height: number, paths: GraphHiddenLineRenderedPath[]): void {
    const defs = this.ensureDefs(container);
    if (!defs) return;

    const groups = new Map<string, NativeMaskGroup>();
    paths.forEach((path) => {
      if (!path.nativeTarget) return;
      const key = `${path.sourceId}:${path.polylineId ?? 'default'}`;
      const existing = groups.get(key);
      if (existing) {
        if (path.mode === 'mask') {
          existing.visiblePaths.push(path);
        }
        return;
      }

      groups.set(key, {
        key,
        maskId: `vuegraphx-hidden-mask-${sanitizeDomId(key)}`,
        target: path.nativeTarget,
        visiblePaths: path.mode === 'mask' ? [path] : []
      });
    });

    const activeKeys = new Set(groups.keys());
    Array.from(this.appliedMasks.keys()).forEach((key) => {
      if (!activeKeys.has(key)) {
        this.clearMaskForKey(key);
      }
    });

    groups.forEach((group, key) => {
      const element = group.target.getElement();
      if (!element) {
        this.clearMaskForKey(key);
        return;
      }

      this.upsertMaskNode(defs, group.maskId, width, height, group.visiblePaths, group.target, element);
      this.applyMaskToElement(key, group.maskId, element);
    });

    const usedMaskIds = new Set(Array.from(groups.values()).map((group) => group.maskId));
    Array.from(defs.children).forEach((child) => {
      if (!(child instanceof SVGMaskElement)) return;
      const maskId = child.getAttribute('id');
      if (!maskId || usedMaskIds.has(maskId)) return;
      child.remove();
    });
  }

  private upsertMaskNode(
    defs: SVGDefsElement,
    maskId: string,
    width: number,
    height: number,
    visiblePaths: GraphHiddenLineRenderedPath[],
    target: GraphHiddenLineNativeTargetSpec,
    element: SVGElement
  ): void {
    let mask = defs.querySelector(`#${maskId}`) as SVGMaskElement | null;
    if (!mask) {
      mask = document.createElementNS(SVG_NS, 'mask');
      mask.setAttribute('id', maskId);
      defs.appendChild(mask);
    }

    mask.setAttribute('maskUnits', 'userSpaceOnUse');
    mask.setAttribute('maskContentUnits', 'userSpaceOnUse');
    mask.setAttribute('x', '0');
    mask.setAttribute('y', '0');
    mask.setAttribute('width', `${width}`);
    mask.setAttribute('height', `${height}`);

    const background = document.createElementNS(SVG_NS, 'rect');
    background.setAttribute('x', '0');
    background.setAttribute('y', '0');
    background.setAttribute('width', `${width}`);
    background.setAttribute('height', `${height}`);
    background.setAttribute('fill', '#000');

    const strokeWidth = resolveStrokeWidth(target, element);
    const maskPaths = visiblePaths.map((path) => {
      const node = document.createElementNS(SVG_NS, 'path');
      node.setAttribute('d', buildPathData(path.points));
      node.setAttribute('fill', 'none');
      node.setAttribute('stroke', '#fff');
      node.setAttribute('stroke-width', `${strokeWidth}`);
      node.setAttribute('stroke-linecap', path.style?.lineCap ?? 'round');
      node.setAttribute('stroke-linejoin', 'round');
      node.setAttribute('vector-effect', 'non-scaling-stroke');
      return node;
    });

    mask.replaceChildren(background, ...maskPaths);
  }

  private applyMaskToElement(key: string, maskId: string, element: SVGElement): void {
    const nextMaskValue = `url(#${maskId})`;
    const existing = this.appliedMasks.get(key);

    if (existing && existing.element !== element) {
      this.restoreMask(existing);
      this.appliedMasks.delete(key);
    }

    if (!this.appliedMasks.has(key)) {
      const previousMask = element.getAttribute('mask');
      this.appliedMasks.set(key, {
        maskId,
        element,
        previousMask: previousMask && previousMask !== nextMaskValue ? previousMask : null
      });
    }

    element.setAttribute('mask', nextMaskValue);
  }

  private clearMaskForKey(key: string): void {
    const record = this.appliedMasks.get(key);
    if (!record) return;
    this.restoreMask(record);
    this.appliedMasks.delete(key);

    const maskNode = this.defsNode?.querySelector(`#${record.maskId}`);
    maskNode?.remove();
  }

  private restoreMask(record: AppliedMaskRecord): void {
    if (record.previousMask) {
      record.element.setAttribute('mask', record.previousMask);
      return;
    }
    record.element.removeAttribute('mask');
  }

  private clearNativeMasks(): void {
    this.appliedMasks.forEach((record) => this.restoreMask(record));
    this.appliedMasks.clear();
    this.defsNode?.remove();
    this.defsNode = null;
    this.defsHostSvg = null;
  }

  private resolveDashCalibration(path: GraphHiddenLineRenderedPath): DashCalibrationRecord | null {
    if (!Number.isFinite(path.dashReferenceLength) || !Number.isFinite(path.dashReferenceScreenLength)) {
      return null;
    }

    const referenceLength = path.dashReferenceLength as number;
    const referenceScreenLength = path.dashReferenceScreenLength as number;
    if (referenceLength <= 1e-6 || referenceScreenLength <= 1e-6) {
      return null;
    }

    const key = `${path.sourceId}:${path.polylineId ?? 'default'}`;
    const nextScale = referenceScreenLength / referenceLength;
    const existing = this.dashCalibration.get(key);
    if (!existing) {
      const created = { scale: nextScale, referenceLength };
      this.dashCalibration.set(key, created);
      return created;
    }

    if (Math.abs(existing.referenceLength - referenceLength) > 1e-6) {
      const updated = { scale: nextScale, referenceLength };
      this.dashCalibration.set(key, updated);
      return updated;
    }

    return existing;
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
      const calibration = this.resolveDashCalibration(path);
      if (calibration && Number.isFinite(path.dashPathLength) && (path.dashPathLength as number) > 0) {
        node.setAttribute('pathLength', `${(path.dashPathLength as number) * calibration.scale}`);
      }
      if (calibration && Number.isFinite(path.dashOffset)) {
        node.setAttribute('stroke-dashoffset', `${(path.dashOffset as number) * calibration.scale}`);
      } else if (Number.isFinite(path.dashOffset)) {
        node.setAttribute('stroke-dashoffset', `${path.dashOffset}`);
      }
    }

    return node;
  }
}
