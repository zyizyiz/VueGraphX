<div align="center">
  <h1>🌌 VueGraphX</h1>
  <p><strong>基于 Vue 3 + JSXGraph 的互动数学与几何可视化引擎</strong></p>

  <p>
    <a href="https://www.npmjs.com/package/vuegraphx"><img src="https://img.shields.io/npm/v/vuegraphx?color=42b883&style=for-the-badge" alt="NPM Version" /></a>
    <a href="https://zyizyiz.github.io/VueGraphX/"><img src="https://img.shields.io/badge/Demo-Online-blueviolet?style=for-the-badge" alt="Live Demo" /></a>
    <a href="https://github.com/vuejs/vue"><img src="https://img.shields.io/badge/Vue.js-3.4+-4fc08d?style=for-the-badge&logo=vuedotjs" alt="Vue 3" /></a>
    <a href="https://github.com/jsxgraph/jsxgraph"><img src="https://img.shields.io/badge/JSXGraph-1.8.0+-f49c00?style=for-the-badge" alt="JSXGraph" /></a>
    <a href="./LICENSE"><img src="https://img.shields.io/badge/License-Apache_2.0-blue.svg?style=for-the-badge" alt="License" /></a>
  </p>
</div>

[English](./README_en.md) | **简体中文**

## 🌟 简介

VueGraphX 提供两条互补的能力主线：

- 表达式渲染：把 2D/3D 数学表达式、几何指令交给统一渲染管线执行。
- 图形运行时：把具体图形实现收敛为 shape definition，再通过统一 capability API 暴露交互能力。
- scene document：把当前公开内容导出为稳定文档，并按“整体替换 + diagnostics”语义重新加载。

当前 playground 还提供一个实验性的双层模式（dual-layer）：

- 把 2D 对象理解为落在 `z = 0` 工作平面上的内容。
- 把立体对象放在同一坐标系里，但仅允许对象局部旋转，不旋转全局坐标轴。
- 用固定正视角的 `view3d` 承载 3D 场景，再叠加独立的 2D 顶层/底层覆盖，用来模拟更接近数学软件的“平面 + 立体同轴展示”。

它适合两类场景：

- 直接作为数学表达式渲染引擎使用。
- 作为业务侧几何编辑器、教学工具或交互式画板的底层运行时使用。

🌐 在线演示: [https://zyizyiz.github.io/VueGraphX/](https://zyizyiz.github.io/VueGraphX/)

## 🧪 指令总览 Demo

如果你想看“某个 JSXGraph 指令到底会画出什么”，建议直接打开这个总览页：

- 本地开发：运行 `npm run dev` 后访问 [http://localhost:5174/test-vuegraphx-all-commands.html](http://localhost:5174/test-vuegraphx-all-commands.html)
- GitHub Pages：[https://zyizyiz.github.io/VueGraphX/test-vuegraphx-all-commands.html](https://zyizyiz.github.io/VueGraphX/test-vuegraphx-all-commands.html)

这个页面支持：

- 直接搜索指令名
- 区分 2D / 3D / 特殊别名
- 点击指令立即运行示例
- 查看“人话说明 + 技术说明 + 常见参数 + 示例写法”

因为 playground 构建会把这个 HTML 一起打进 GitHub Pages，所以可以直接发链接给别人看，不需要本地单独搭环境。

## ✨ 核心特性

- 🚀 能力优先交互：外部通过 `subscribeCapabilities()` 订阅状态，通过 `executeCapability()` 触发行为，不必记忆每种图形的专用 API。
- 🧩 组合式图形定义：使用 `createComposedShapeDefinition()`、`GraphShapeApi` 和 `GraphShapeContext` 在业务侧组合自己的图形。
- 🎬 共享动画与标注能力：动画轨道、点标注、命中分组、拖拽与悬浮 UI 投影工具都是通用基础设施。
- 📐 统一 2D / 3D 渲染入口：表达式渲染和 view3d 生命周期都通过同一个引擎门面管理。
- 🔗 几何关系层：支持 `createRelation()` / `getRelationSnapshots()`，可对 point / line / segment 建立平行、垂直、等长与距离断言等 explainable relations。
- 💾 Scene 文档模型：支持 `exportScene()` / `loadScene()`，覆盖 commands、serializable shapes、relations 和受支持的 scene 级设置。
- 👓 生产化 hidden-line 3D：支持运行时 profile 切换、snapshot stats / diagnostics，以及 3D 教学场景里的更稳定隐线显示。
- 🧪 playground 双层模式：以 `3d` 引擎模式为底座，叠加独立的 2D 层，并通过对象级旋转查看立体结构。
- 🧱 分层场景基础设施：内置 `view3D.fitToBoard` 和分组级 `bindNativeEvent()`，方便消费侧组合双层/多层交互。
- 🛡️ 类型安全：公共类型、能力契约和 shape authoring API 都完整导出，适合二次封装和 IDE 自动提示。

## 📦 安装

```bash
npm install vuegraphx
```

你还需要在项目中安装 `vue`。如果需要沿用 JSXGraph 默认样式，可额外引入其 CSS。

## 🔨 快速上手

### 1. 初始化引擎

```typescript
import { GraphXEngine, createComposedShapeDefinition } from 'vuegraphx';
import 'jsxgraph/distrib/jsxgraph.css';

const engine = new GraphXEngine('box', {
  boundingbox: [-5, 5, 5, -5],
  axis: true,
  showNavigation: false,
});

const customCircle = createComposedShapeDefinition<{ x: number; y: number }>({
  type: 'circle',
  supportedModes: ['2d', 'geometry'],
  create(_context, payload) {
    if (!payload) return null;

    return {
      entityType: 'circle',
      initialState: {},
      setup(api) {
        const center = api.trackObject(api.board.create('point', [payload.x, payload.y], { visible: false }));
        const radiusPoint = api.trackObject(api.board.create('point', [payload.x + 2, payload.y], { visible: false }));
        const circle = api.trackObject(api.board.create('circle', [center, radiusPoint]));
        circle.on('down', () => Promise.resolve().then(() => api.select()));
      },
      getCapabilityTarget(api) {
        if (!api.selected) return null;

        return {
          entityType: 'circle',
          entityId: api.id,
          entity: { id: api.id },
          remove: () => api.remove()
        };
      }
    };
  }
});

engine.registerShape(customCircle);
engine.createShape('circle', { x: 0, y: 0 });
```

### 2. 订阅能力并驱动交互

```typescript
import type { GraphCapabilitySnapshot } from 'vuegraphx';

const unsubscribe = engine.subscribeCapabilities((snapshot: GraphCapabilitySnapshot) => {
  console.log('当前选中图形:', snapshot.selection);
  console.log('当前可用能力:', snapshot.capabilities);
});

engine.executeCapability('style.stroke', { color: '#ef4444' });
engine.executeCapability('resize.value', { value: 3.5 });
engine.executeCapability('animation.play');

unsubscribe();
```

### 3. 执行表达式渲染

```typescript
engine.executeCommand('function-demo', 'y = sin(x) + 0.5*cos(2*x)', '#ff0000');
engine.executeCommand('geometry-demo', 'c1 = Circle((0,0), (2,0))', '#0000ff');
```

### 4. 导出 / 导入 scene document

```typescript
import { GRAPH_SCENE_DOCUMENT_VERSION } from 'vuegraphx';

const exportResult = engine.exportScene();

if (exportResult.status === 'success' && exportResult.scene) {
  const json = JSON.stringify(exportResult.scene, null, 2);
  console.log('scene version:', GRAPH_SCENE_DOCUMENT_VERSION);
  console.log(json);
}

const loadResult = engine.loadScene(`{
  "version": 1,
  "mode": "2d",
  "commands": [
    { "id": "cmd_1", "expression": "y = sin(x)" }
  ],
  "shapes": []
}`);

if (loadResult.status !== 'failure') {
  console.log('loaded commands:', loadResult.appliedCommands);
}

console.log(loadResult.diagnostics);
```

scene v1 的边界：

- 覆盖公共 `2d` / `3d` / `geometry` mode。
- 保存 commands、显式声明 scene 支持的 shapes、公开 relation records，以及少量 scene 级设置。
- `loadScene()` 默认是 replace，而不是 merge。
- `dual-layer`、选中态、面板状态、动画播放中状态和 URL 分享协议不在 v1 合同内。
- 当当前场景包含未声明为 serializable 的 shape 时，`exportScene()` 会严格失败并返回 diagnostics。

### 4.1 创建几何关系

当前版本支持 geometry-oriented 的关系层。你可以把关系视为独立于命令/shape 的一等内容对象：

```typescript
const created = engine.createRelation({
  kind: 'distance-assertion',
  targets: [
    { ownerType: 'command', ownerId: 'A', targetId: 'primary' },
    { ownerType: 'command', ownerId: 'B', targetId: 'primary' }
  ],
  params: {
    expectedValue: 5
  }
});

console.log(created.snapshot?.status);
console.log(engine.getRelationSnapshots());
```

当前公开支持的 v1 relation kinds：

- `parallel`
- `perpendicular`
- `equal-length`
- `distance-assertion`

当前边界：

- v1 是 explainable relation layer，不是通用 CAD 级全局约束求解器。
- playground 里可以在 geometry 模式下直接使用 `Relations` 面板体验完整流程。
- `distance-assertion` 当前只支持 point-to-point。
- `parallel` / `perpendicular` / `equal-length` 当前是检查型能力；拖拽时会实时更新状态，但不会自动数值求解并强制维持几何。

### 5. 切换到 3D 模式

```typescript
engine.setMode('3d');

const view3d = engine.getView3D();
console.log('当前 3D 视图是否可用:', !!view3d);

engine.executeCommand('surface-demo', 'z = sin(x) * cos(y)', '#42b883');
engine.executeCommand('line-demo', 'Line((0,0,0), (1,1,1))', '#e74c3c');
```

### 5.1 调整 hidden-line 3D

```typescript
engine.setHiddenLineOptions({
  enabled: true,
  profile: 'quality',
  debug: true
});

const hiddenLineSnapshot = engine.getHiddenLineSceneSnapshot();

console.log(hiddenLineSnapshot.options.profile);
console.log(hiddenLineSnapshot.stats.renderedPathCount);
console.log(hiddenLineSnapshot.diagnostics);
```

当前建议：

- `performance`：更适合复杂曲面较少、但更在意流畅度的场景
- `balanced`：默认推荐档位
- `quality`：更适合教学立体、曲面边界更重要的场景

当前明确产品化的 hidden-line 支持矩阵主要围绕：

- `mesh`
- `polyline-set`
- sampled `curve`
- sampled `surface` / `featureCurves`
- command 侧已接好的 3D line / polygon / surface 类场景
- playground 的 `cube` / `wireframe-cube`

更多细节见 `docs/hidden-line-3d.md`。

### 6. 在业务侧实现分层 / 双层场景

如果你的应用要把多个交互层叠在一起，例如：

- 顶层 2D 标注 / 命中层 + 底层 3D 场景
- 底层 2D 坐标网格 + 顶层 3D 立体对象
- 需要让“空白区域穿透、图元本体命中”的教学白板或几何编辑器

当前版本建议优先使用两类公共能力，而不是直接依赖 playground 内部实现：

#### 5.1 `view3D.fitToBoard`

当容器宽高比变化、board 自身 bounding box 发生调整时，`view3d` 默认的固定矩形容易出现“3D 图元移动到边缘后被裁剪”的问题。可以启用：

```typescript
const engine = new GraphXEngine('box', {
  axis: false,
  showNavigation: false,
  view3D: {
    fitToBoard: true,
    rect: [[-8, -8], [16, 16], [[-5, 5], [-5, 5], [-5, 5]]],
    attributes: {
      projection: 'parallel'
    }
  }
});

engine.setMode('3d');
```

启用后，运行时会：

- 在初始化时把 `view3d` 同步到当前 board 的真实可视区域。
- 在 `resize()` 后继续同步。
- 在 board 的 `boundingbox` 变化后继续同步。

这很适合响应式布局、分栏编辑器、嵌入式白板和任意比例的容器。

#### 5.2 `createGroup()` + `bindNativeEvent()`

在多层透传场景中，底层图元有时不能完全依赖 JSXGraph 自己的命中代理。这时可以直接对受管分组的渲染节点绑定原生 DOM 事件：

```typescript
const group = api.createGroup({ face, edge }, { createNativeGroup: false });

const dispose = group.bindNativeEvent('pointerdown', (member, event, node) => {
  event.preventDefault();
  console.log('hit member:', member.key, node.tagName);
}, {
  stopPropagation: true,
  passive: false
});
```

这类 API 适合：

- 双层 / 多层透传布局
- 需要直接控制 `pointerdown` / `touchstart` 的图元
- JSXGraph 默认命中代理不够稳定的组合场景

同时你仍然可以继续使用：

- `group.onHit()` 处理常规命中
- `group.bindDrag()` 处理常规拖拽
- `group.getRenderNode(key)` 获取成员对应的真实渲染节点

### 6. 关于 playground 的双层模式

双层模式当前是 playground 层的组合能力，不是新的公共 `EngineMode`。它的目标是演示一种更接近数学软件的交互方式：

- 全局只有一套坐标系，平面对象按 `z = 0` 语义理解。
- 立体对象和 2D 对象共处同一坐标系，但立体对象允许局部旋转以观察结构。
- 顶层 2D 与底层 3D 可以同时存在，并通过 CSS / 原生命中事件实现“空白穿透、图元接管”。

当前实现位于：

- `playground/App.vue`：双层模式入口、双实例挂载与层级透传样式。
- `playground/types/mode.ts`：把 playground 的 `dual-layer` 映射到底层 3D 引擎配置，并启用 `view3D.fitToBoard`。
- `playground/shapes/index.ts`：区分顶层 2D 图形与底层 3D 图形注册。
- `playground/components/DualLayerPanel.vue`：双层模式专用控制面板。

## 🧠 推荐使用方式

当前版本建议按下面的心智模型接入：

1. 用 `registerShape()` 注册业务自己的图形定义。
2. 用 `createShape()` 或拖拽入口创建实例。
3. 用 `subscribeCapabilities()` 驱动工具栏、属性面板和动画控制 UI。
4. 用 `executeCapability()` 执行删除、样式、缩放、动画、拆分等通用行为。
5. 用 `executeCommand()` 处理表达式渲染类需求。

能力描述统一包含：

- `feature`：能力语义，例如 `resize`、`style`、`delete`。
- `kind`：交互方式，例如 `action`、`toggle`、`input`、`panel`。
- `group`：能力分组，例如 `edit`、`style`、`animation`。
- `active` / `enabled` / `meta`：当前状态、可用性和附加参数。

这意味着 UI 层可以围绕“能力”而不是“图形种类”来写。

## 📚 文档入口

- 📊 [图形支持与 API 对照](./docs/SUPPORTED_GRAPHICS_AND_APIS.md)
- 🧾 [JSXGraph 指令参数与中文说明](./docs/JSXGRAPH_COMMAND_PARAMS_ZH.md)
- 🧪 [全指令交互 Demo（GitHub Pages）](https://zyizyiz.github.io/VueGraphX/test-vuegraphx-all-commands.html)
- 📖 [架构设计文档 (ARCHITECTURE.md)](./docs/ARCHITECTURE.md)
- 🛠 [开发贡献指南 (DEVELOPMENT.md)](./docs/DEVELOPMENT.md)
- 📘 [API 参考文档 (自动生成)](./docs/api/README.md)

更新 API 文档：

```bash
npm run docs:api
```

## 🏗️ 当前目录分层

库代码集中在 `src/` 下：

- `architecture/capabilities/`: 通用能力契约、能力处理器和能力注册表。
- `architecture/shapes/`: shape definition、shape runtime、组合式 authoring API。
- `board/`: JSXGraph board / view3d 生命周期管理。
- `engine/`: 对外门面 `GraphXEngine`。
- `entities/`: 表达式渲染结果的注册、替换与清理。
- `math/`: 共享数学作用域。
- `parsing/`: 文本与表达式解析。
- `rendering/`: 表达式渲染器、指令目录和处理器。
- `types/`: 对外基础类型与引擎配置。

playground 中与双层模式直接相关的文件：

- `playground/App.vue`: playground 模式切换、双层容器挂载与事件透传样式。
- `playground/types/mode.ts`: playground 模式到引擎模式的映射与 `view3D` 配置。
- `playground/components/DualLayerPanel.vue`: 双层模式的添加图形与交互说明。
- `playground/shapes/wireframeCube.ts`: 使用 `createGroup()` 与 `bindNativeEvent()` 的 3D 图形交互示例。

## 🧪 测试与校验

```bash
npm run build
npm run test
npm run check:jsxgraph-3d
```

## 📝 贡献说明

欢迎提交 PR 与 Issue。当前版本有两类主要扩展方式：

- 扩展表达式渲染：在 `src/rendering/handlers/` 中新增或调整处理器，并补覆盖测试。
- 扩展图形运行时：优先通过 `createComposedShapeDefinition()`、能力契约和通用 shape API 完成，而不是把具体图形硬编码进库内。

更详细的贡献约束见 [DEVELOPMENT.md](./docs/DEVELOPMENT.md)。

## 📄 许可证

本项目采用 [Apache License 2.0](./LICENSE) 许可证。
