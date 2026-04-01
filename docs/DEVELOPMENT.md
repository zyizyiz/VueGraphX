# 🛠 开发与贡献指南

[English](./DEVELOPMENT_en.md) | **简体中文**

本文档描述 VueGraphX 的开发方式。工程同时包含表达式渲染扩展和 shape runtime 扩展两条主线。

## 前置环境

1. Node.js 18 或更高版本。
2. 使用 `npm` 安装依赖。

```bash
git clone https://github.com/zyizyiz/VueGraphX.git
cd VueGraphX
npm install
```

## 常用脚本

- `npm run dev`：启动 Vite 开发服务器，调试 playground。
- `npm run build`：构建库产物到 `dist/`。
- `npm run build:playground`：构建 playground，用于演示站点发布。
- `npm run test`：运行全部 vitest 测试。
- `npm run test:watch`：监听模式测试。
- `npm run check:jsxgraph-3d`：校验 JSXGraph 3D 指令目录是否漂移。
- `npm run docs:api`：基于 TypeDoc 重新生成 API 文档到 `docs/api/`。

## 先判断你在扩展哪一层

在当前架构里，先分清自己改的是哪一类能力：

### 1. 扩展表达式渲染

适用场景：

- 新增一类数学指令
- 修正某类表达式的识别逻辑
- 增补 2D / 3D 指令到 JSXGraph 的映射

主要文件：

- `src/rendering/handlers/`
- `src/rendering/handlers/createDefaultRegistry.ts`
- `src/rendering/coverage/instructionCases.ts`
- `src/rendering/coverage/__tests__/`

建议流程：

1. 在 `src/rendering/handlers/` 新增或修改 `RenderHandler`。
2. 在 `createDefaultRegistry.ts` 中注册它，并确认优先级顺序正确。
3. 如果涉及通用命令映射，同时检查 `jsxgraphCommandCatalog` 和相关测试。
4. 补充覆盖案例，确保命中正确的 handler。

### 2. 扩展通用 shape runtime / authoring API

适用场景：

- 新增图形作者可复用的运行时能力
- 改进 `GraphShapeApi`、`GraphShapeContext`、分组、标注或动画轨道工具
- 增加 scene document 合同、shape scene 接缝或引擎级 import/export 能力
- 增加通用 capability contract 或 capability handler

主要文件：

- `src/architecture/shapes/`
- `src/architecture/capabilities/`
- `src/engine/GraphXEngine.ts`
- `src/types/`

建议流程：

1. 先确认这项能力是否应该是“通用基础设施”，而不是某个业务图形的私有逻辑。
2. 尽量把能力落在 shape contracts、composition helpers 或 capability contracts 上。
3. 如果改动属于公共 API，需要同步更新 `src/index.ts` 导出面。
4. 如果能力会影响外部使用方式，记得同时更新 README、架构文档和 API 注释。

scene document 相关改动的额外约束：

- `GraphXEngine` 继续是唯一公开门面，scene API 不要拆成并列 controller。
- scene state 记录的是内容文档状态，不是 JSXGraph 渲染对象；不要把 `EntityManager` 当成 scene source of truth。
- `loadScene()` 默认保持 replace 语义，partial 通过 diagnostics 表达，不要把 merge 行为偷偷塞进默认路径。
- `dual-layer` 仍然只属于 playground，不要把它提升进公共 scene schema。

### 3. 编写具体图形定义

适用场景：

- 业务方自己的圆、立方体、构造辅助图形
- playground 演示用图形
- 不适合抽象进库公共导出面的具体实现

建议位置：

- 业务项目自身代码
- 当前仓库中的 `playground/`

原则：

- 库优先提供通用 authoring API，不优先内置具体图形。
- 具体图形通过 `createComposedShapeDefinition()` 在消费侧组合。
- 图形交互尽量通过 capability-first 模式暴露给外部 UI。
- 如果图形需要参与 scene persistence，请显式声明 `scene`，并通过 `getScenePayload()` 导出当前内容状态。

### 4. 扩展 playground 的双层模式

适用场景：

- 调整“2D 图层 + 3D 场景协作”的交互方式
- 修改双层模式下的固定视角、分层挂载、工作平面、坐标轴或网格表现
- 增加 dual-layer 专用的控制面板、对象或教学演示

主要文件：

- `playground/App.vue`
- `playground/types/mode.ts`
- `playground/components/DualLayerPanel.vue`
- `playground/shapes/index.ts`

实现约束：

- `dual-layer` 当前是 playground 模式，不是公共 `EngineMode`；底层仍映射到引擎的 `3d` 模式。
- 2D 语义对象应继续围绕 `z = 0` 工作平面组织，不要把 dual-layer 写成第二套独立坐标系。
- 坐标轴和网格优先作为独立 2D 层处理，而不是作为普通 3D 图元加入场景。
- 如果某个需求可以抽象为通用能力，优先沉淀到 `src`，例如 `view3D.fitToBoard`、`createGroup()`、`bindNativeEvent()`；不要把可复用基础设施长期留在 playground 私有代码里。
- dual-layer 场景对象较多时，重建前后应优先使用 `board.suspendUpdate()` / `board.unsuspendUpdate()` 批量包裹，避免切换开关时卡顿。

建议流程：

1. 先在 `playground/types/mode.ts` 明确视角、投影和 `view3D` 配置。
2. 再在 `playground/App.vue` 中处理双实例挂载、层级关系与透传策略。
3. dual-layer 专用 UI 放在 `DualLayerPanel.vue`，避免把 playground 其余模式逻辑耦合进去。
4. 如果命中/拖拽需要绕开 JSXGraph 默认代理，优先通过 `createGroup()` 和 `bindNativeEvent()` 实现，而不是在示例里散落私有 DOM hack。
5. 如果改动影响用户对 dual-layer 模式的理解，记得同步更新 README 和架构文档。

## 当前推荐的图形扩展方式

下面是当前更推荐的 shape authoring 方式：

```typescript
import { createComposedShapeDefinition } from 'vuegraphx';

const shape = createComposedShapeDefinition<{ x: number; y: number }>({
  type: 'example-shape',
  supportedModes: ['2d', 'geometry'],
  create(_context, payload) {
    if (!payload) return null;

    return {
      entityType: 'example-shape',
      initialState: { highlighted: false },
      setup(api) {
        const point = api.trackObject(api.board.create('point', [payload.x, payload.y]));
        point.on('down', () => Promise.resolve().then(() => api.select()));
      },
      getCapabilityTarget(api) {
        if (!api.selected) return null;
        return {
          entityType: 'example-shape',
          entityId: api.id,
          entity: { id: api.id },
          remove: () => api.remove()
        };
      }
    };
  }
});
```

如果图形需要更复杂的行为，优先复用这些基础设施：

- `createAnimationTrack()` 管理动画播放。
- `togglePointAnnotations()` 管理点标注。
- `createGroup()` 管理命中区域、批量拖拽、渲染节点访问和原生 DOM 事件绑定。
- `projectUserBounds()` / `project3DBounds()` 定位悬浮 UI。
- `notifyChange()` / `scheduleUiChange()` 同步外部能力 UI。

## 测试与文档要求

只要改动影响公共行为，至少检查下面几项：

```bash
npm run build
npm run test
npm run docs:api
```

以下情况需要同步更新手写文档：

- README 中的公开示例代码发生变化
- 架构目录或扩展入口发生变化
- 对外能力模型、shape authoring 模型发生变化

## 提交建议

建议使用常见的提交前缀：

- `feat:` 新功能
- `fix:` 修复问题
- `docs:` 文档更新
- `refactor:` 重构
- `test:` 测试补充

如果你修改了公共导出面、能力模型或 shape authoring API，请优先保证文档与代码一起演进。
