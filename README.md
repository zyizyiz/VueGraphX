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

它适合两类场景：

- 直接作为数学表达式渲染引擎使用。
- 作为业务侧几何编辑器、教学工具或交互式画板的底层运行时使用。

🌐 在线演示: [https://zyizyiz.github.io/VueGraphX/](https://zyizyiz.github.io/VueGraphX/)

## ✨ 核心特性

- 🚀 能力优先交互：外部通过 `subscribeCapabilities()` 订阅状态，通过 `executeCapability()` 触发行为，不必记忆每种图形的专用 API。
- 🧩 组合式图形定义：使用 `createComposedShapeDefinition()`、`GraphShapeApi` 和 `GraphShapeContext` 在业务侧组合自己的图形。
- 🎬 共享动画与标注能力：动画轨道、点标注、命中分组、拖拽与悬浮 UI 投影工具都是通用基础设施。
- 📐 统一 2D / 3D 渲染入口：表达式渲染和 view3d 生命周期都通过同一个引擎门面管理。
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

### 4. 切换到 3D 模式

```typescript
engine.setMode('3d');

const view3d = engine.getView3D();
console.log('当前 3D 视图是否可用:', !!view3d);

engine.executeCommand('surface-demo', 'z = sin(x) * cos(y)', '#42b883');
engine.executeCommand('line-demo', 'Line((0,0,0), (1,1,1))', '#e74c3c');
```

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
