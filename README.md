<div align="center">
  <h1>🌌 VueGraphX</h1>
  <p><strong>基于 Vue 3 + JSXGraph 的下一代互动数学与几何可视化引擎</strong></p>

  <p>
    <a href="https://www.npmjs.com/package/vuegraphx"><img src="https://img.shields.io/npm/v/vuegraphx?color=42b883&style=for-the-badge" alt="NPM Version" /></a>
    <a href="https://zyizyiz.github.io/VueGraphX/"><img src="https://img.shields.io/badge/Demo-Online-blueviolet?style=for-the-badge" alt="Live Demo" /></a>
    <a href="https://github.com/vuejs/vue"><img src="https://img.shields.io/badge/Vue.js-3.4+-4fc08d?style=for-the-badge&logo=vuedotjs" alt="Vue 3" /></a>
    <a href="https://github.com/jsxgraph/jsxgraph"><img src="https://img.shields.io/badge/JSXGraph-1.8.0+-f49c00?style=for-the-badge" alt="JSXGraph" /></a>
    <a href="./LICENSE"><img src="https://img.shields.io/badge/License-Apache_2.0-blue.svg?style=for-the-badge" alt="License" /></a>
  </p>
</div>

[English](./README_en.md) | **简体中文**

## 🌟 简介 (Introduction)

**VueGraphX** 是一个专为前端和教育领域打造的现代化数学引擎，深度集成了 Vue 的响应式系统与 JSXGraph 的底层渲染能力。它提供了一套完整的 2D/3D 几何图形构造、数学表达式解析（支持 LaTeX 预处理）和交互式可视化解决方案。

🌐 **在线演示:** [https://zyizyiz.github.io/VueGraphX/](https://zyizyiz.github.io/VueGraphX/)

## ✨ 核心特性 (Features)

- 🚀 **响应式集成：** 原生支持 Vue 3 响应式系统（基于 `shallowRef` 优化），实现数据驱动的图元更新。
- 📐 **全自动 2D/3D 渲染：** 支持从二维函数图像到复杂三维参数曲面的统一指令分发机制（Unified Handler System）。
- 📝 **开箱即用的 LaTeX 解析：** 自动处理 LaTeX 格式输入到可执行数学表达式的转换。
- 🧩 **高可扩展性：** 通过 `RenderRegistry` 灵活注册自定义渲染器（Handlers），不修改核心代码即可扩展新的数学指令。
- 🛡️ **类型安全：** 全面基于 TypeScript 编写，提供完善的类型推导与自动提示。

## 📦 安装 (Installation)

推荐使用 npm、pnpm 或 yarn 安装：

```bash
npm install vuegraphx
```

*你还需要确保安装了 `vue` 和 `jsxgraph` 作为对等依赖（Peer Dependencies）。*

## 🔨 快速上手 (Quick Start)

### 1. 初始化引擎

```typescript
import { GraphXEngine, createComposedShapeDefinition } from 'vuegraphx';
// 如果未全局导入，需引入 JSXGraph 样式
import 'jsxgraph/distrib/jsxgraph.css'; 

// 绑定到一个具有确定高宽的 DOM 元素上
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
```

### 2. 绘制 2D 函数图像

```typescript
// 直接通过表达式绘制 2D 函数图像
engine.renderer.render('2d', 'y = sin(x) + 0.5*cos(2*x)', '#ff0000');

// 绘制几何图形（如：经过两点的圆）
engine.renderer.render('2d', 'c1 = Circle((0,0), (2,0))', '#0000ff');
```

### 3. 三维空间作图

```typescript
// 初始化 3D 视图（内部会自动挂载 view3d）
const view3d = engine.board.get3DView();

// 绘制显式 3D 曲面
engine.renderer.render('3d', 'z = sin(x)*cos(y)', '#42b883');

// 绘制 3D 空间直线
engine.renderer.render('3d', 'Line((0,0,0), (1,1,1))', '#e74c3c');
```

### 4. 统一图形能力接口

从当前版本开始，推荐外部使用者面向“能力”和“图形组合协议”编程。业务方新增图形时，不需要修改引擎内部，也不需要向库里增加某个特定图形类；只需要在自己的业务代码里组合出一个 shape definition，然后注册到引擎。

```typescript
import type { GraphCapabilitySnapshot } from 'vuegraphx';

const unsubscribe = engine.subscribeCapabilities((snapshot: GraphCapabilitySnapshot) => {
  console.log('当前选中图形:', snapshot.selection);
  console.log('当前可用能力:', snapshot.capabilities);
});

// 图形创建与能力执行分离
engine.createShape('circle', { x: 0, y: 0 });

// 所有图形共用同一套能力 ID
engine.executeCapability('animation.play');
engine.executeCapability('style.stroke', { color: '#ef4444' });
engine.executeCapability('resize.value', { value: 3.5 });

unsubscribe();
```

能力描述统一包含：

- `feature`：能力语义，例如 `resize`、`style`、`delete`。
- `kind`：交互方式，例如 `action`、`toggle`、`input`、`panel`。
- `group`：能力分组，例如 `edit`、`style`、`animation`。
- `active` / `enabled` / `meta`：当前状态、可用性和附加参数。

只要某个图形声明自己支持这些契约，外部就不需要再关心它是圆、矩形、多边形还是圆柱。

## 📚 开发图谱与进阶使用

详细的架构说明和二次开发指南，请参阅：

- 📖 [架构设计文档 (ARCHITECTURE.md)](./docs/ARCHITECTURE.md)
- 🛠 [开发贡献指南 (DEVELOPMENT.md)](./docs/DEVELOPMENT.md)

## 🏗️ Core 架构分层

`src/core` 职责清晰，支持模块化按需调用：

- `board/`：画布与 3D 视图生命周期管理。
- `entities/`：图元引用池（注册、更新与垃圾回收）。
- `math/`：数学域环境，处理变量和函数的上下文。
- `parsing/`：LaTeX 预处理及 AST 文本解析。
- `rendering/`：核心模块，渲染调度机制与指令处理器列表。
- `engine/`：对外门面（Facade），封装核心 API：`GraphXEngine`。

## 🧪 测试与校验 (Testing & Coverage)

项目内建完善的单元测试与指令集漂移校验：

```bash
# 运行完整覆盖测试
npm run test

# 校验 JSXGraph 升级引发的 3D 指令目录漂移
npm run check:jsxgraph-3d
```

## 📝 贡献说明 (Contributing)

欢迎提交 PR 与 Issue！具体规范请参考 [DEVELOPMENT.md](./docs/DEVELOPMENT.md)。
我们在新增指令时推荐：**不要直接修改渲染主流程**，而是继承 `RenderHandler` 并注册进 `RenderRegistry`。

## 📄 许可证 (License)

本项目采用 [Apache License 2.0](./LICENSE) 许可证。
