import JXG from 'jsxgraph';
import { BaseDesignerPlugin } from './BaseDesignerPlugin';

export interface CubeModel {
  id: string;
  points: any[];
  faces: any[];
}

export interface CubeDesignerState {
  cubes: CubeModel[];
  selectedId: string | null;
}

export interface CubeDesignerFastState {
  unfoldProgress: number; // 0 to 1
  toolbarStyle: Record<string, string>;
}

export class CubeDesignerPlugin extends BaseDesignerPlugin<CubeDesignerState> {
  public readonly name = 'cube';
  public readonly requiredMode = '3d';

  private fastListeners: ((state: CubeDesignerFastState) => void)[] = [];
  private fastState: CubeDesignerFastState = {
    unfoldProgress: 0,
    toolbarStyle: { left: '50%', top: 'calc(100% - 5rem)' }
  };
  private rafId: number | null = null;
  
  // 基础常数值（正方体中心点及边长/2），作为局部静态网格参考
  private readonly h = 1; // 边长的一半

  constructor() {
    super({
      cubes: [],
      selectedId: null
    });
  }

  public subscribeFast(listener: (state: CubeDesignerFastState) => void): () => void {
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

  protected onInstall(): void {}

  protected onUninstall(): void {
    this.setState({
      cubes: [],
      selectedId: null
    });
    this.fastState = {
      unfoldProgress: 0,
      toolbarStyle: { left: '50%', top: 'calc(100% - 5rem)' }
    };
    this.notifyFastChange();
  }

  public get selected(): CubeModel | null {
    return this.state.cubes.find(c => c.id === this.state.selectedId) || null;
  }

  public onBoardUpdate(): void {
    this.updateToolbarPosition();
  }

  public updateToolbarPosition(): void {
    const sel = this.selected;
    if (!sel || !this.engine) return;

    // View3D
    const view3d = this.engine.getView3D();
    if (!view3d) return;
    
    // 正方体底面中心通常是原点或 [0,0,0]。这里简化取视图中心进行面板挂载
    const cx = 0, cy = 0, cz = 0; 
    // project3D to 2D
    const p2d = view3d.project3DTo2D([cx, cy, cz]);
    
    const board = this.board;
    if (!board || p2d.length < 2) return;

    // Convert to screen coordinates
    const usr = new JXG.Coords(JXG.COORDS_BY_USER, p2d, board);
    const sx = usr.scrCoords[1];
    const sy = usr.scrCoords[2];

    const boardWidth = board.canvasWidth || 1000;
    const boardHeight = board.canvasHeight || 700;

    const clampedLeft = Math.max(160, Math.min(boardWidth - 160, sx));
    // 面板放在物体下方
    const top = sy + 150; 
    const clampedTop = Math.max(16, Math.min(boardHeight - 90, top));

    const toolbarStyle = {
      left: `${clampedLeft}px`,
      top: `${clampedTop}px`
    };

    if (this.fastState.toolbarStyle.left !== toolbarStyle.left || 
        this.fastState.toolbarStyle.top !== toolbarStyle.top) {
      this.fastState.toolbarStyle = toolbarStyle;
      this.notifyFastChange();
    }
  }

  // ============== 核心实现：展开动画数学模型 ==============

  // 定义正方体的一个面：由 4 个 3D 坐标函数构成
  // 在 3D 渲染里，JSXGraph 的 view3d 支持函数式坐标，所以只需动态返回旋转后的 [x, y, z]
  
  // 底部面固定在 z=0
  // p0: [-h, -h, 0], p1: [h, -h, 0], p2: [h, h, 0], p3: [-h, h, 0]

  // 展开角度：进度 p (0 到 1) -> a = p * (Math.PI / 2)
  private getAngle() {
    return this.fastState.unfoldProgress * (Math.PI / 2);
  }

  // 旋转矩阵工具: 绕特定轴旋转点
  // axis: 'x', 'y' 等，或者给出具体基点和方向
  // 简单起见，利用标准的轴旋转（平移 -> 旋转 -> 平移回）

  private rotateX(pt: [number, number, number], angle: number, pivotY: number, pivotZ: number): [number, number, number] {
    const [x, y, z] = pt;
    const dy = y - pivotY;
    const dz = z - pivotZ;
    const cosA = Math.cos(angle);
    const sinA = Math.sin(angle);
    const ny = dy * cosA - dz * sinA;
    const nz = dy * sinA + dz * cosA;
    return [x, ny + pivotY, nz + pivotZ];
  }

  private rotateY(pt: [number, number, number], angle: number, pivotX: number, pivotZ: number): [number, number, number] {
    const [x, y, z] = pt;
    const dx = x - pivotX;
    const dz = z - pivotZ;
    const cosA = Math.cos(angle);
    const sinA = Math.sin(angle);
    const nx = dx * cosA + dz * sinA;
    const nz = -dx * sinA + dz * cosA;
    return [nx + pivotX, y, nz + pivotZ];
  }

  // 每个面生成 4 个点的动态函数数组
  private createFacePoints(name: string): Array<() => [number, number, number]> {
    return [0, 1, 2, 3].map(i => {
      return () => {
        const a = this.getAngle();
        const half = this.h;
        
        // 我们定义正方体的中心在 [0,0,0]。
        // 底面 (Bottom): z = -half
        // 顶面 (Top):    z = half
        // 前面 (Front):  y = -half
        // 后面 (Back):   y = half
        // 左面 (Left):   x = -half
        // 右面 (Right):  x = half

        // 顶点定义:
        // 底面
        const b0: [number, number, number] = [-half, -half, -half];
        const b1: [number, number, number] = [ half, -half, -half];
        const b2: [number, number, number] = [ half,  half, -half];
        const b3: [number, number, number] = [-half,  half, -half];
        
        // 顶面
        const t0: [number, number, number] = [-half, -half, half];
        const t1: [number, number, number] = [ half, -half, half];
        const t2: [number, number, number] = [ half,  half, half];
        const t3: [number, number, number] = [-half,  half, half];

        if (name === 'bottom') {
          return [b0, b1, b2, b3][i];
        }

        if (name === 'front') {
          // Front 面位于 y=-half，绕 y=-half 底边向 -y 方向倒下
          // 绕 X 轴旋转：由于是右手法则展开向外，所以必须使用正数 a
          const pt = [b0, b1, t1, t0][i];
          return this.rotateX(pt, a, -half, -half);
        }

        if (name === 'back') {
          // Back 面位于 y=half，向 +y 倒下
          // 绕 X 轴旋转：由于向另一侧展开翻转，必须使用负数 -a
          const pt = [b3, b2, t2, t3][i];
          return this.rotateX(pt, -a, half, -half);
        }

        if (name === 'left') {
          // Left 面位于 x=-half，向 -x 倒下 
          // 绕 Y 轴旋转：结合矩阵算法要求，需要使用负数 -a 才能向左侧正确翻折
          const pt = [b0, t0, t3, b3][i];
          return this.rotateY(pt, -a, -half, -half);
        }

        if (name === 'right') {
          // Right 面位于 x=half，向 +x 倒下
          // 绕 Y 轴旋转：向右外翻倒使用正数 a 
          const pt = [b1, b2, t2, t1][i];
          return this.rotateY(pt, a, half, -half);
        }

        if (name === 'top') {
          // Top 面
          // 为了让它展开成十字形，Top 连在 Back 面上。
          // 原本的四个点顺序我们取 [t3, t2, t1, t0] 匹配 Back 的边 [t3, t2] (也就是 z=half, y=half 边)
          const pt = [t3, t2, t1, t0][i];
          
          // 第1步：Top 自己绕与 Back 的交线 [t3-t2] (也就是 y=half, z=half) 旋转
          // 它需要向后延展展开，配合 Back 的 -a 旋转，自身也需要设定为 -a
          const rotatedSelf = this.rotateX(pt, -a, half, half);
          
          // 第2步：随着 Back 面整体绕 [b3-b2] (y=half, z=-half) 旋转
          // 保持和 Back 一致的受力状态 -a
          return this.rotateX(rotatedSelf, -a, half, -half);
        }

        return [0, 0, 0];
      };
    });
  }

  public createCube(): void {
    const view3d = this.engine?.getView3D();
    if (!this.board || !view3d) return;

    // 清空现有的
    this.state.cubes.forEach(c => {
      c.faces.forEach((f: any) => this.removeObjectSafe(f));
    });
    this.setState({ cubes: [], selectedId: null });

    const faceNames = ['bottom', 'top', 'front', 'back', 'left', 'right'];
    const colors = ['#f87171', '#38bdf8', '#fbbf24', '#34d399', '#a78bfa', '#f472b6'];
    
    const facesObjects = faceNames.map((name, idx) => {
      const fns = this.createFacePoints(name);
      
      const p1 = view3d.create('point3d', fns[0], { visible: false });
      const p2 = view3d.create('point3d', fns[1], { visible: false });
      const p3 = view3d.create('point3d', fns[2], { visible: false });
      const p4 = view3d.create('point3d', fns[3], { visible: false });

      const poly = view3d.create('polygon3d', [p1, p2, p3, p4], {
        fillColor: colors[idx],
        fillOpacity: 0.8,
        borders: { strokeWidth: 1.5, strokeColor: '#1e293b' }
      });
      return poly;
    });

    const cubeModel: CubeModel = {
      id: this.uid('cube'),
      points: [], // inner points are hidden
      faces: facesObjects
    };

    this.setState({ cubes: [cubeModel], selectedId: cubeModel.id });
    this.updateToolbarPosition();
    this.board.update();
  }

  public setUnfoldProgress(val: number): void {
    if (val < 0) val = 0;
    if (val > 1) val = 1;
    this.fastState.unfoldProgress = val;
    this.notifyFastChange();
    this.board?.update();
  }
}
