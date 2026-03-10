# Hidden Line 3D Architecture

## Goal

VueGraphX 的 3D 隐线能力定位为引擎级场景能力，而不是单个 shape 的局部逻辑。目标是统一支持：

- 组合式 shape 注册的 3D 图形
- 指令渲染器产出的 3D 图形
- 未来的曲面、曲线、网格、线框与混合对象

## Public API

### Engine

`GraphXEngine` 新增：

- `registerHiddenLineSource(ownerId, source)`
- `removeHiddenLineSource(sourceId)`
- `clearHiddenLineSources(ownerId?)`
- `getHiddenLineSceneSnapshot()`
- `getHiddenLineOptions()`

### Shape API

`GraphShapeApi` 新增：

- `registerHiddenLineSource(source)`
- `removeHiddenLineSource(sourceId)`
- `clearHiddenLineSources()`

shape 侧注册时不需要自己传 `ownerId`，运行时会自动绑定到当前实例 id。

### Renderer Context

`RenderContext.hiddenLine` 新增了命令渲染器可用的桥接能力：

- `isEnabled()`
- `getOptions()`
- `registerSource(source)`
- `clearOwnerSources(ownerId?)`

这允许 `Expression3DHandler`、`Surface3DHandler` 等 handler 在未来直接把曲面/曲线语义几何注册到隐线系统，而不是反向解析 JSXGraph 对象。

## Source Model

当前 `src/rendering/hiddenLine/contracts.ts` 定义了统一数据源模型：

- `mesh`
- `polyline-set`
- `curve`
- `surface`

每个 source 都通过 `resolve()` 在更新周期内返回最新几何，因此天然支持拖拽、旋转、动画后的动态场景。

### 遮挡优先级

- **后注册（后创建）的图形整体压前面的图形**：`GraphHiddenLineManager` 会为每个 source 记录注册顺序 `order`。求解阶段，后注册的三角形直接遮挡先注册的线/面，不再做逐边逐面排序，降低运算量。  
- 同一个图形内部仍按深度判定遮挡，保证自遮挡正确。
- Playground 示例 `cube` / `wireframe-cube` 支持在创建 payload 中覆盖 `hiddenLine.visible` / `hiddenLine.hidden` 样式（颜色、宽度、虚线节距等），满足按场景自定义的需求。

### 渲染路径

- tessellation/sample → screen-space 投影 → 线段可见性切分 → 2D SVG overlay 绘制（默认附着在 board 容器）。
- JSXGraph 原始 3D 边框不再参与显示（样例中通过 `strokeOpacity: 0` 隐藏），避免与 overlay 重叠。

## Lifecycle

- 引擎在 `board.on('update')` 之后触发 `GraphHiddenLineManager.update()`
- shape 销毁、命令移除、board reset 时自动清理对应 owner 的 source
- `GraphXOptions.view3D.hiddenLine` 用于承载全局配置

## Current Scope

这次提交先把通用架构、公共 contracts、注册机制、更新时机和文档落到 `src`。

后续真正的遮挡求解可以继续沿这条链路推进：

1. tessellation / sampling
2. scene aggregation
3. screen-space spatial index
4. edge visibility segmentation
5. 2D overlay renderer
