import JXG from 'jsxgraph';
import { BaseDesignerPlugin } from './BaseDesignerPlugin';
import type { EngineMode } from '../../types/engine';

export interface HelperLine {
  id: string;
  p1: any;
  p2: any;
  line: any;
}

export interface IntuitiveView {
  curve?: any;
  left?: any;
  sector?: any;
}

export interface CutDraft {
  p1: any;
  p2: any;
  line: any;
  icon: any;
}

export interface CircleModel {
  id: string;
  isPiece?: boolean;
  group?: any;
  circle: any;
  center: any;
  radiusPoint?: any;
  radiusLine?: any;
  bbox?: any;
  helpers: HelperLine[];
  marks: any[];
  markNameMap: Map<string, string>;
  nextLetterIndex: number;
  intuitive: IntuitiveView | null;
  cutDraft: CutDraft | null;
  cutConfirmed: boolean;
  cutPieces: any[];
}

export type ActiveToolType = 'none' | 'size' | 'assist' | 'crop' | 'color-stroke' | 'color-fill';

export interface CircleDesignerFastState {
  radiusValue: number;
  toolbarStyle: Record<string, string>;
  sizeInputStyle: Record<string, string>;
}

export interface CircleDesignerState {
  circles: CircleModel[];
  selectedId: string | null;
  showFeature: boolean;
  showColorPanel: boolean;
  activeTool: ActiveToolType;
  selectedColor: string;
  isRadiusDragging: boolean;
}

export class CircleDesignerPlugin extends BaseDesignerPlugin<CircleDesignerState> {
  public readonly name = 'circle';
  public readonly requiredMode: EngineMode[] = ['2d', 'geometry'];

  private cropCache: any = null;
  private assistCache: any = null;
  
  private fastListeners: ((state: CircleDesignerFastState) => void)[] = [];
  private fastState: CircleDesignerFastState = {
    radiusValue: 2,
    toolbarStyle: { left: '50%', top: 'calc(100% - 5rem)' },
    sizeInputStyle: { left: '50%', top: '50%' }
  };
  private rafId: number | null = null;

  public subscribeFast(listener: (state: CircleDesignerFastState) => void): () => void {
    this.fastListeners.push(listener);
    listener(this.fastState);
    return () => {
      this.fastListeners = this.fastListeners.filter(l => l !== listener);
    };
  }

  private notifyFastChange(): void {
    if (this.rafId) cancelAnimationFrame(this.rafId);
    this.rafId = requestAnimationFrame(() => {
      const newState = { ...this.fastState };
      this.fastListeners.forEach(l => l(newState));
      this.rafId = null;
    });
  }

  constructor() {
    super({
      circles: [],
      selectedId: null,
      showFeature: false,
      showColorPanel: false,
      activeTool: 'none',
      selectedColor: '#0ea5e9',
      isRadiusDragging: false
    });
  }

  protected onInstall(): void {}

  protected onUninstall(): void {
    this.cropCache = null;
    this.assistCache = null;
    this.setState({
      circles: [],
      selectedId: null,
      showFeature: false,
      showColorPanel: false,
      activeTool: 'none',
      selectedColor: '#0ea5e9',
      isRadiusDragging: false
    });
    this.fastState = {
      radiusValue: 2,
      toolbarStyle: { left: '50%', top: 'calc(100% - 5rem)' },
      sizeInputStyle: { left: '50%', top: '50%' }
    };
    this.notifyFastChange();
  }

  protected setState(partial: Partial<CircleDesignerState>): void {
    const oldTool = this.state?.activeTool;
    super.setState(partial);
    
    if (partial.activeTool !== undefined && partial.activeTool !== 'size' && oldTool === 'size') {
      this.state.circles.forEach(c => {
        if (c.radiusPoint) c.radiusPoint.setAttribute({ visible: false });
        if (c.radiusLine) c.radiusLine.setAttribute({ visible: false });
        if (c.bbox?.borders) c.bbox.borders.forEach((b: any) => b.setAttribute({ visible: false }));
      });
      this.updateToolbarPosition();
    }
  }

  public onBoardUpdate(): void {
    this.updateToolbarPosition();
  }

  public onDrop(e: DragEvent): void {
    if (e.dataTransfer?.getData('shape') !== 'circle') return;
    const usrCoords = this.getUsrCoordFromEvent(e);
    if (!usrCoords) return;
    this.createCircleAt(usrCoords[0], usrCoords[1]);
  }

  public get selected(): CircleModel | null {
    return this.state.circles.find(c => c.id === this.state.selectedId) || null;
  }

  public setShowFeature(val: boolean): void {
    this.setState({ showFeature: val });
  }

  public clearSelections(): void {
    this.state.circles.forEach(c => {
      if (c.intuitive) this.closeIntuitiveTarget(c);
      c.radiusPoint?.setAttribute({ visible: false });
      c.radiusLine?.setAttribute({ visible: false });
      c.bbox?.borders.forEach((b: any) => b.setAttribute({ visible: false }));
    });

    this.setState({
      showFeature: false,
      showColorPanel: false,
      activeTool: 'none',
      selectedId: null
    });
    this.updateToolbarPosition();
    this.board?.update();
  }

  public selectCircle(id: string): void {
    if (this.state.selectedId === id) return;

    this.state.circles.forEach(c => {
      if (c.id !== id && c.intuitive) this.closeIntuitiveTarget(c);
      c.radiusPoint?.setAttribute({ visible: false });
      c.radiusLine?.setAttribute({ visible: false });
      c.bbox?.borders.forEach((b: any) => b.setAttribute({ visible: false }));
    });

    const model = this.state.circles.find(c => c.id === id);
    let newRadius = this.fastState.radiusValue;
    if (model) {
      newRadius = model.radiusPoint ? model.center.Dist(model.radiusPoint) : 0;
    }

    this.setState({
      selectedId: id,
      showFeature: false,
      showColorPanel: false,
      activeTool: 'none'
    });
    
    this.fastState.radiusValue = newRadius;
    this.updateToolbarPosition();
    this.board?.update();
  }

  public updateToolbarPosition(): void {
    const sel = this.selected;
    if (!sel || !this.board) {
      if (this.fastState.toolbarStyle.top !== 'calc(100% - 5rem)') {
        this.fastState.toolbarStyle = { left: '50%', top: 'calc(100% - 5rem)' };
        this.notifyFastChange();
      }
      return;
    }

    const cx = sel.center.X();
    const cy = sel.center.Y();
    const radius = sel.radiusPoint ? sel.center.Dist(sel.radiusPoint) : 1;
    const bottomEdgeY = cy - radius;

    const usr = new JXG.Coords(JXG.COORDS_BY_USER, [cx, bottomEdgeY], this.board);
    const sx = usr.scrCoords[1];
    const sy = usr.scrCoords[2];

    const boardWidth = this.board.canvasWidth || 1000;
    const boardHeight = this.board.canvasHeight || 700;

    const clampedLeft = Math.max(160, Math.min(boardWidth - 160, sx));
    const paddingY = 20;
    const top = sy + paddingY;
    const clampedTop = Math.max(16, Math.min(boardHeight - 90, top));

    const toolbarStyle = {
      left: `${clampedLeft}px`,
      top: `${clampedTop}px`
    };

    let sizeInputStyle = this.fastState.sizeInputStyle;
    if (this.state.activeTool === 'size' && sel.radiusPoint) {
      const mx = (sel.center.X() + sel.radiusPoint.X()) / 2;
      const my = (sel.center.Y() + sel.radiusPoint.Y()) / 2;
      const musr = new JXG.Coords(JXG.COORDS_BY_USER, [mx, my], this.board);
      sizeInputStyle = {
        left: `${musr.scrCoords[1]}px`,
        top: `${musr.scrCoords[2]}px`,
      };
    }

    if (this.fastState.toolbarStyle.left === toolbarStyle.left && 
        this.fastState.toolbarStyle.top === toolbarStyle.top &&
        this.fastState.sizeInputStyle.left === sizeInputStyle.left &&
        this.fastState.sizeInputStyle.top === sizeInputStyle.top) {
      return; 
    }

    this.fastState.toolbarStyle = toolbarStyle;
    this.fastState.sizeInputStyle = sizeInputStyle;
    this.notifyFastChange();
  }

  public applyColorImmediately(color: string): void {
    this.setState({ selectedColor: color });
    const sel = this.selected;
    if (!sel || !this.board) return;

    if (this.state.activeTool === 'color-stroke') {
      sel.circle.setAttribute({ strokeColor: color });
      if (sel.intuitive?.sector) sel.intuitive.sector.setAttribute({ strokeColor: color });
      if (sel.intuitive?.curve) sel.intuitive.curve.setAttribute({ strokeColor: color });
    } else if (this.state.activeTool === 'color-fill') {
      sel.circle.setAttribute({ fillColor: color, fillOpacity: 0.35 });
      if (sel.intuitive?.sector) sel.intuitive.sector.setAttribute({ fillColor: color });
      if (sel.intuitive?.curve) sel.intuitive.curve.setAttribute({ fillColor: color });
    }

    this.board.update();
  }

  public applyColorIfNeeded(target: any, kind: 'stroke' | 'fill' | 'both'): boolean {
    if (this.state.activeTool !== 'color-stroke' && this.state.activeTool !== 'color-fill') return false;

    let applied = false;
    if (this.state.activeTool === 'color-stroke' && (kind === 'stroke' || kind === 'both')) {
      target.setAttribute({ strokeColor: this.state.selectedColor });
      applied = true;
    }

    if (this.state.activeTool === 'color-fill' && (kind === 'fill' || kind === 'both')) {
      target.setAttribute({ fillColor: this.state.selectedColor, fillOpacity: 0.35 });
      applied = true;
    }

    if (applied) {
      this.board?.update();
    }
    return applied;
  }

  private attachInteractiveHandlers(model: CircleModel): void {
    model.circle.on('down', () => {
      if (!this.applyColorIfNeeded(model.circle, 'both')) {
        if (model.isPiece && model.radiusLine && this.applyColorIfNeeded(model.radiusLine, 'stroke')) return;
        Promise.resolve().then(() => this.selectCircle(model.id));
      }
    });

    if (model.radiusLine && model.isPiece) {
      model.radiusLine.on('down', () => {
        if (!this.applyColorIfNeeded(model.radiusLine, 'stroke')) {
          Promise.resolve().then(() => this.selectCircle(model.id));
        }
      });
    }

    model.center.on('down', () => {
      Promise.resolve().then(() => this.selectCircle(model.id));
    });

    if (model.radiusPoint) {
      model.radiusPoint.on('down', () => {
        Promise.resolve().then(() => this.selectCircle(model.id));
        this.setState({ isRadiusDragging: true });
      });

      model.radiusPoint.on('drag', () => {
        this.fastState.radiusValue = parseFloat(model.center.Dist(model.radiusPoint).toFixed(2));
        this.notifyFastChange();
      });

      model.radiusPoint.on('up', () => {
        this.fastState.radiusValue = model.center.Dist(model.radiusPoint);
        this.notifyFastChange();
        setTimeout(() => {
          this.setState({ isRadiusDragging: false });
        }, 0);
      });
    }
  }

  public createCircleAt(x: number, y: number): void {
    if (!this.board) return;

    const center = this.board.create('point', [x, y], {
      visible: false,
      name: '',
      size: 2
    });

    const radiusPoint = this.board.create('point', [x + 2, y], {
      visible: false,
      name: '',
      size: 3,
      strokeColor: '#0ea5e9',
      fillColor: '#0ea5e9'
    });

    const circle = this.board.create('circle', [center, radiusPoint], {
      strokeColor: '#0ea5e9',
      fillColor: '#0ea5e9',
      fillOpacity: 0.12,
      strokeWidth: 2,
      highlight: false,
      hasInnerPoints: true
    });

    const radiusLine = this.board.create('segment', [center, radiusPoint], {
      visible: false,
      strokeColor: '#64748b',
      strokeWidth: 1.5,
    });

    const r = () => center.Dist(radiusPoint);
    const cx = () => center.X();
    const cy = () => center.Y();

    const p1 = this.board.create('point', [() => cx() - r(), () => cy() + r()], { visible: false });
    const p2 = this.board.create('point', [() => cx() + r(), () => cy() + r()], { visible: false });
    const p3 = this.board.create('point', [() => cx() + r(), () => cy() - r()], { visible: false });
    const p4 = this.board.create('point', [() => cx() - r(), () => cy() - r()], { visible: false });

    const bbox = this.board.create('polygon', [p1, p2, p3, p4], {
      fillOpacity: 0,
      borders: { strokeColor: '#0ea5e9', strokeWidth: 1, visible: false },
      vertices: { visible: false },
      hasInnerPoints: false
    });

    const model: CircleModel = {
      id: this.uid('circle'),
      circle,
      center,
      radiusPoint,
      radiusLine,
      bbox,
      helpers: [],
      marks: [],
      markNameMap: new Map(),
      nextLetterIndex: 0,
      intuitive: null,
      cutDraft: null,
      cutConfirmed: false,
      cutPieces: []
    };

    this.attachInteractiveHandlers(model);
    
    const newCircles = [...this.state.circles, model];
    this.setState({ circles: newCircles });
    
    this.selectCircle(model.id);
    this.updateToolbarPosition();
    this.board.update();
  }

  public toggleSizeMode(): void {
    const sel = this.selected;
    if (!sel) return;

    const isSize = this.state.activeTool !== 'size';
    
    if (isSize && sel.intuitive) this.closeIntuitiveTarget(sel);

    this.state.circles.forEach(c => {
      const visible = c.id === this.state.selectedId && isSize;
      c.radiusPoint?.setAttribute({ visible });
      c.radiusLine?.setAttribute({ visible });
      c.bbox?.borders.forEach((b: any) => b.setAttribute({ visible }));
    });

    if (isSize && sel.radiusPoint) {
      this.fastState.radiusValue = parseFloat(sel.center.Dist(sel.radiusPoint).toFixed(2));
      this.notifyFastChange();
    }

    this.setState({
      showColorPanel: false,
      activeTool: isSize ? 'size' : 'none'
    });
    
    this.updateToolbarPosition();
    this.board?.update();
  }

  public applyRadiusInput(val: number): void {
    const sel = this.selected;
    if (!sel || this.state.activeTool !== 'size' || !sel.radiusPoint) return;

    this.fastState.radiusValue = val;
    this.notifyFastChange();

    const centerX = sel.center.X();
    const centerY = sel.center.Y();
    const dx = sel.radiusPoint.X() - centerX;
    const dy = sel.radiusPoint.Y() - centerY;
    const len = Math.sqrt(dx * dx + dy * dy) || 1;

    const targetR = Math.max(0.2, Number(val) || 0.2);
    sel.radiusPoint.moveTo([centerX + (dx / len) * targetR, centerY + (dy / len) * targetR], 0);
    this.updateToolbarPosition();
    this.board?.update();
  }

  public startAssistMode(): void {
    const sel = this.selected;
    if (!sel) return;

    const newTool = this.state.activeTool === 'assist' ? 'none' : 'assist';
    
    this.setState({
      activeTool: newTool,
      showColorPanel: false
    });

    if (newTool === 'assist' && sel.intuitive) this.closeIntuitiveTarget(sel);

    if (newTool !== 'assist' && this.assistCache?.p1) {
      this.removeObjectSafe(this.assistCache.p1);
      this.assistCache = null;
    }
  }

  public toggleIntuitive(): void {
    const sel = this.selected;
    if (!sel || !this.board) return;

    if (this.state.activeTool === 'size') {
      this.setState({ activeTool: 'none' });
    }

    if (sel.intuitive) {
      this.closeIntuitiveTarget(sel);
      this.board.update();
      this.notifyStateChange(); // Force Vue to react to intuitive null
      return;
    }

    sel.circle.setAttribute({ visible: false });

    const cx = () => sel.center.X();
    const cy = () => sel.center.Y();
    const r = () => sel.radiusPoint ? sel.center.Dist(sel.radiusPoint) : 1;

    const curve = this.board.create('curve', [
      (t: number) => cx() + r() * Math.cos(t) + (Math.sqrt(2) / 4) * r() * Math.sin(t),
      (t: number) => cy() + (Math.sqrt(2) / 4) * r() * Math.sin(t),
      0,
      2 * Math.PI
    ], {
      fillColor: '#ef4444',
      fillOpacity: 0.2,
      strokeColor: '#ef4444',
      strokeWidth: 2,
      highlight: false,
      hasInnerPoints: true,
      fixed: false
    });

    (curve as any).on('down', () => {
      if (!this.applyColorIfNeeded(curve, 'both')) {
        Promise.resolve().then(() => this.selectCircle(sel.id));
      }
    });

    sel.intuitive = { curve };
    this.board.update();
    this.notifyStateChange();
  }

  public closeIntuitiveTarget(model: CircleModel): void {
    if (!model.intuitive) return;
    if (model.intuitive.left) this.removeObjectSafe(model.intuitive.left);
    if (model.intuitive.sector) this.removeObjectSafe(model.intuitive.sector);
    if (model.intuitive.curve) this.removeObjectSafe(model.intuitive.curve);
    model.intuitive = null;
    if (model.circle) model.circle.setAttribute({ visible: true });
    this.notifyStateChange();
  }

  public closeIntuitive(): void {
    if (!this.selected) return;
    this.closeIntuitiveTarget(this.selected);
    this.board?.update();
  }

  public toggleMarking(): void {
    const sel = this.selected;
    if (!sel || !this.board) return;

    if (sel.marks.length > 0) {
      sel.marks.forEach(m => {
        if (m === sel.center) {
          m.setAttribute({ name: '', withLabel: false, visible: false });
        } else {
          this.removeObjectSafe(m);
        }
      });
      sel.marks = [];
      this.board.update();
      return;
    }

    const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';

    sel.center.setAttribute({
      name: 'O',
      withLabel: true,
      visible: true,
      size: 2,
      strokeColor: '#0f172a',
      fillColor: '#0f172a'
    });
    sel.marks.push(sel.center);

    sel.helpers.forEach((helper) => {
      [0, 1].forEach((idx) => {
        const key = `${helper.id}:${idx}`;
        let label = sel.markNameMap.get(key);
        if (!label) {
          label = alphabet[sel.nextLetterIndex % alphabet.length];
          sel.nextLetterIndex += 1;
          sel.markNameMap.set(key, label);
        }
        const pt = this.board!.create('intersection', [helper.line, sel.circle, idx], {
          name: label,
          withLabel: true,
          size: 2,
          strokeColor: '#0f172a',
          fillColor: '#0f172a'
        });
        sel.marks.push(pt);
      });
    });

    this.board.update();
  }

  public startCropMode(): void {
    const sel = this.selected;
    if (!sel) return;

    const newTool = this.state.activeTool === 'crop' ? 'none' : 'crop';
    
    this.setState({
      showColorPanel: false,
      activeTool: newTool
    });

    if (newTool === 'crop' && sel.intuitive) this.closeIntuitiveTarget(sel);

    if (newTool !== 'crop' && this.cropCache?.p1) {
      this.removeObjectSafe(this.cropCache.p1);
      this.cropCache = null;
    }
  }

  public cancelCut(): void {
    const sel = this.selected;
    if (!sel) return;
    const cut = sel.cutDraft;
    if (!cut) return;

    this.removeObjectSafe(cut.p1);
    this.removeObjectSafe(cut.p2);
    this.removeObjectSafe(cut.line);
    if (cut.icon) {
      cut.icon.setAttribute({ visible: false });
      this.removeObjectSafe(cut.icon);
    }
    sel.cutDraft = null;
    
    this.setState({ activeTool: 'none' });
    this.board?.update();
  }

  public confirmCut(): void {
    const sel = this.selected;
    if (!sel || !this.board || !sel.cutDraft) return;
    
    const cut = sel.cutDraft;
    const cx = sel.center.X();
    const cy = sel.center.Y();
    
    const px1 = cut.p1.X();
    const py1 = cut.p1.Y();
    const px2 = cut.p2.X();
    const py2 = cut.p2.Y();

    const colorStroke = sel.circle.getAttribute('strokeColor');
    const colorFill = sel.circle.getAttribute('fillColor');

    this.removeObjectSafe(cut.p1);
    this.removeObjectSafe(cut.p2);
    this.removeObjectSafe(cut.line);
    if (cut.icon) {
      cut.icon.setAttribute({ visible: false });
      this.removeObjectSafe(cut.icon);
    }
    sel.cutDraft = null;

    const offsetX = 0.5;
    const offsetY = -0.5;

    this.createPieceAt(cx - offsetX, cy - offsetY, px1 - offsetX, py1 - offsetY, px2 - offsetX, py2 - offsetY, false, colorStroke, colorFill);
    this.createPieceAt(cx + offsetX, cy + offsetY, px1 + offsetX, py1 + offsetY, px2 + offsetX, py2 + offsetY, true, colorStroke, colorFill);

    this.removeSelected();
  }

  private createPieceAt(cx: number, cy: number, px1: number, py1: number, px2: number, py2: number, isReverse: boolean, colorStroke: string, colorFill: string): void {
    if (!this.board) return;

    const center = this.board.create('point', [cx, cy], { visible: false, name: '' });
    let pArc1, pArc2;

    if (isReverse) {
      pArc1 = this.board.create('point', [px2, py2], { visible: false, name: '' });
      pArc2 = this.board.create('point', [px1, py1], { visible: false, name: '' });
    } else {
      pArc1 = this.board.create('point', [px1, py1], { visible: false, name: '' });
      pArc2 = this.board.create('point', [px2, py2], { visible: false, name: '' });
    }

    const arc = this.board.create('arc', [center, pArc1, pArc2], {
      strokeColor: colorStroke,
      fillColor: colorFill,
      fillOpacity: 0.35,
      strokeWidth: 2,
      highlight: false,
      hasInnerPoints: true,
      fixed: false
    });

    const chord = this.board.create('segment', [pArc1, pArc2], {
      strokeColor: colorStroke,
      strokeWidth: 2,
      highlight: false,
      fixed: false,
      layer: 9
    });

    const group = this.board.create('group', [center, pArc1, pArc2, arc, chord]);

    const pieceModel: CircleModel = {
      id: this.uid('piece'),
      isPiece: true,
      group,
      circle: arc,
      center,
      radiusLine: chord,
      helpers: [],
      marks: [],
      markNameMap: new Map(),
      nextLetterIndex: 0,
      intuitive: null,
      cutDraft: null,
      cutConfirmed: false,
      cutPieces: []
    };

    this.attachInteractiveHandlers(pieceModel);
    this.setState({ circles: [...this.state.circles, pieceModel] });
  }

  public toggleColorPanel(): void {
    const show = !this.state.showColorPanel;
    this.setState({
      showColorPanel: show,
      activeTool: show ? 'color-stroke' : 'none'
    });
  }
  
  public setActiveTool(tool: ActiveToolType): void {
     this.setState({ activeTool: tool });
  }

  public removeSelected(): void {
    const sel = this.selected;
    if (!sel) return;

    sel.helpers.forEach((h) => {
      this.removeObjectSafe(h.p1);
      this.removeObjectSafe(h.p2);
      this.removeObjectSafe(h.line);
    });

    sel.marks.forEach(m => {
      if (m !== sel.center) {
        this.removeObjectSafe(m);
      }
    });

    if (sel.intuitive) {
      if (sel.intuitive.left) this.removeObjectSafe(sel.intuitive.left);
      if (sel.intuitive.sector) this.removeObjectSafe(sel.intuitive.sector);
      if (sel.intuitive.curve) this.removeObjectSafe(sel.intuitive.curve);
    }

    if (sel.cutDraft) {
      this.removeObjectSafe(sel.cutDraft.p1);
      this.removeObjectSafe(sel.cutDraft.p2);
      this.removeObjectSafe(sel.cutDraft.line);
      this.removeObjectSafe(sel.cutDraft.icon);
    }

    this.removeObjectSafe(sel.radiusLine);
    if (sel.bbox) {
      this.removeObjectSafe(sel.bbox);
      sel.bbox.vertices.forEach((v: any) => this.removeObjectSafe(v));
      sel.bbox.borders.forEach((b: any) => this.removeObjectSafe(b));
    }

    sel.cutPieces.forEach(p => this.removeObjectSafe(p));
    this.removeObjectSafe(sel.circle);
    this.removeObjectSafe(sel.center);
    this.removeObjectSafe(sel.radiusPoint);
    
    if (sel.group) {
      if (sel.isPiece) {
        if (sel.circle.parents) {
          sel.circle.parents.forEach((parentId: string) => {
             const p = (this.board as any)?.objects[parentId];
             if (p) this.removeObjectSafe(p);
          });
        }
      }
      this.removeObjectSafe(sel.group);
    }

    this.setState({
      circles: this.state.circles.filter(c => c.id !== sel.id),
      selectedId: null,
      showFeature: false,
      showColorPanel: false,
      activeTool: 'none'
    });

    this.board?.update();
  }

  public onBoardUp(e: any, isClickingObject: boolean): void {
    if (!isClickingObject) {
      this.clearSelections();
      return;
    }

    const sel = this.selected;
    if (!sel) return;

    if (this.state.activeTool === 'size' && !this.state.isRadiusDragging) {
      return;
    }

    if (this.state.activeTool === 'assist') {
      const usr = this.getUsrCoordFromEvent(e);
      if (!usr) return;

      if (!this.assistCache) {
        this.assistCache = {
          p1: this.board!.create('glider', [usr[0], usr[1], sel.circle], { name: '', size: 3, strokeColor: '#64748b', fillColor: '#white', strokeWidth: 2 })
        };
      } else {
        const p2 = this.board!.create('glider', [usr[0], usr[1], sel.circle], { name: '', size: 3, strokeColor: '#64748b', fillColor: '#white', strokeWidth: 2 });
        const line = this.board!.create('line', [this.assistCache.p1, p2], {
          straightFirst: false,
          straightLast: false,
          dash: 2,
          strokeWidth: 2,
          strokeColor: '#64748b'
        });

        const helper: HelperLine = { id: this.uid('assist'), p1: this.assistCache.p1, p2, line };
        helper.line.on('down', () => {
          if (this.applyColorIfNeeded(helper.line, 'stroke')) return;
          Promise.resolve().then(() => {
            this.removeObjectSafe(helper.p1);
            this.removeObjectSafe(helper.p2);
            this.removeObjectSafe(helper.line);
            sel.helpers = sel.helpers.filter(h => h.id !== helper.id);
            this.board?.update();
          });
        });

        helper.p1.on('down', () => Promise.resolve().then(() => this.selectCircle(sel.id)));
        helper.p2.on('down', () => Promise.resolve().then(() => this.selectCircle(sel.id)));

        sel.helpers.push(helper);
        this.assistCache = null;
        this.setState({ activeTool: 'none' });
      }

      this.board?.update();
      this.notifyStateChange();
      return;
    }

    if (this.state.activeTool === 'crop') {
      const usr = this.getUsrCoordFromEvent(e);
      if (!usr) return;

      if (!this.cropCache) {
        const p1 = this.board!.create('glider', [usr[0], usr[1], sel.circle], { name: '', size: 4, strokeColor: '#ef4444', fillColor: '#white', strokeWidth: 2 });
        this.cropCache = { p1 };
      } else {
        const cropP1 = this.cropCache.p1;
        const p2 = this.board!.create('glider', [usr[0], usr[1], sel.circle], { name: '', size: 4, strokeColor: '#ef4444', fillColor: '#white', strokeWidth: 2 });
        const line = this.board!.create('line', [cropP1, p2], {
          straightFirst: false,
          straightLast: false,
          dash: 0,
          strokeWidth: 3,
          strokeColor: '#ef4444'
        });
        const icon = this.board!.create('text', [
          () => (cropP1.X() + p2.X()) / 2,
          () => (cropP1.Y() + p2.Y()) / 2,
          '✂️'
        ], {
          anchorX: 'middle',
          anchorY: 'middle',
          fixed: true
        });

        sel.cutDraft = { p1: cropP1, p2, line, icon };
        this.cropCache = null;
      }

      this.board?.update();
      this.setState({ circles: [...this.state.circles] });
      return;
    }
  }
}
