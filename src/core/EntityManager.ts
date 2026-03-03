import JXG from 'jsxgraph';

/**
 * EntityManager: 图形实体状态追踪与生命周期回收器
 * 职责：
 * 1. 提供稳定可靠的命名图元查找表 (namedElements)，以规避底层框架的查询黑洞。
 * 2. 映射从外部 UI (command Id) 到内部 JXG 实体组的绑定，接管热更新时的安全销毁。
 */
export class EntityManager {
  // 实体管理器：以指令的唯一 id 为键，记录其散发的全部 jsxgraph 图形元素
  private entityMap: Map<string, JXG.GeometryElement[]> = new Map();

  // 命名元素注册表：指令创建命名元素（点、圆、线等）时同时注册这里
  // 替代 board.objects 的名称查找（board.objects 在 Demo 切换后或局部抹除时可能级联断裂）
  private namedElements: Map<string, JXG.GeometryElement> = new Map();

  /**
   * 按全局外部指令 ID 注册产出的全部对应表现图层元素
   */
  public registerCommandElements(cmdId: string, elements: JXG.GeometryElement[]): void {
    if (elements && elements.length > 0) {
      this.entityMap.set(cmdId, elements);
    }
  }

  /**
   * 安全抹除特定 ID 下级联的所有可视化实体
   * 并同步从专属的自建索引池中注销
   */
  public removeCommandElements(cmdId: string, board: JXG.Board): void {
    const records = this.entityMap.get(cmdId);
    if (!records) return;

    records.forEach(el => {
      try {
        if (el && el.name) {
          this.namedElements.delete(el.name);
        }
        if (board) {
          board.removeObject(el);
        }
      } catch (e) {
        // 静默丢弃级联深层已经死亡的孤儿节点异常
      }
    });
    this.entityMap.delete(cmdId);
  }

  /**
   * 将具备确定性命名（如点A，线段seg1）的元素登记入高速名册
   */
  public registerNamedElement(name: string, element: JXG.GeometryElement): void {
    if (name && element) {
      this.namedElements.set(name, element);
    }
  }

  /**
   * 优先提取专属索引名册中的元素，比 JSXGraph 原生搜寻安全可靠
   */
  public getNamedElement(name: string): JXG.GeometryElement | undefined {
    return this.namedElements.get(name);
  }

  /**
   * 环境硬切换（如重置底图）时彻底释放所有的追踪引用防溢出
   */
  public clearAll(): void {
    this.entityMap.clear();
    this.namedElements.clear();
  }
}
