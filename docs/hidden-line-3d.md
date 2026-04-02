# Hidden Line 3D

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
- `setHiddenLineOptions(options?)`

`setHiddenLineOptions()` 允许调用方在运行时切换 hidden-line 是否开启、profile、debug 开关和 sampling override，而不必重建整个引擎实例。

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

## Runtime Options

`GraphXOptions.view3D.hiddenLine` 现在同时承载“开关 + 官方档位 + 进阶覆盖”三层配置：

- `enabled`: 是否启用 hidden-line
- `profile`: `performance` / `balanced` / `quality`
- `debug`: 是否保留更多 runtime diagnostics
- `sampling`: 可选的低层采样覆盖项

推荐做法：

- 普通教学 / demo 场景先用 `balanced`
- 混合曲面较多、性能紧张时改用 `performance`
- 需要更高质量的曲面/曲线边界时改用 `quality`
- 只有在 profile 不够用时，再手动覆盖 `sampling`

## Source Model

当前 `src/rendering/hiddenLine/contracts.ts` 定义了统一数据源模型：

- `mesh`
- `polyline-set`
- `curve`
- `surface`

每个 source 都通过 `resolve()` 在更新周期内返回最新几何，因此天然支持拖拽、旋转、动画后的动态场景。

### 当前正式支持矩阵

当前版本明确产品化的是以下几类 source / adapter：

- `mesh`
- `polyline-set`
- sampled `curve`
- sampled `surface` + `featureCurves`
- command 侧的 `Expression3DHandler`、`Surface3DHandler`、`GenericInvocationHandler` 中已接好的 3D line / polygon 类场景
- shape 侧的 `cube` / `wireframe-cube`

没有进入上面矩阵的 3D 对象，不代表一定不能显示，但不属于当前 hidden-line 的正式支持承诺。

### 遮挡优先级

- **后注册（后创建）的图形整体压前面的图形**：`GraphHiddenLineManager` 会为每个 source 记录注册顺序 `order`。求解阶段，后注册的三角形直接遮挡先注册的线/面，不再做逐边逐面排序，降低运算量。  
- 同一个图形内部仍按深度判定遮挡，保证自遮挡正确。
- Playground 示例 `cube` / `wireframe-cube` 支持在创建 payload 中覆盖 `hiddenLine.visible` / `hiddenLine.hidden` 样式（颜色、宽度、虚线节距等），满足按场景自定义的需求。
- `sampleVisibility()` 可以把局部片段显式标记为 `visible` / `hidden` / `auto`；其中 `visible` 会优先于外部遮挡判断。

### 渲染路径

- tessellation/sample → screen-space 投影 → 线段可见性切分 → 2D SVG overlay 绘制（默认附着在 board 容器）。
- JSXGraph 原始 3D 边框不再参与显示（样例中通过 `strokeOpacity: 0` 隐藏），避免与 overlay 重叠。

### Snapshot / Diagnostics

`getHiddenLineSceneSnapshot()` 现在除了 source summaries，还会返回：

- 当前生效的 normalized options
- `stats`：active / resolved / skipped source 数、triangle / polyline 数、rendered path 数
- `diagnostics`：空 source、resolve 失败、无法 tessellate 的 warning / error

这让 playground 和业务侧都可以直接做 hidden-line inspection，而不需要读 manager 私有状态。

## Lifecycle

- 引擎在 `board.on('update')` 之后触发 `GraphHiddenLineManager.update()`
- shape 销毁、命令移除、board reset 时自动清理对应 owner 的 source
- `GraphXOptions.view3D.hiddenLine` 用于承载全局配置

## Renderer Assumption

- 当前最完整的渲染路径围绕 SVG renderer 优化。
- overlay 本身是 SVG；native mask / clipping 也优先依赖可用的 SVG root。
- 当 native mask 条件不满足时，系统会尽量退化而不是中断整个 board update。

## Non-goals

- 不承诺所有 JSXGraph 3D 对象都已经是 hidden-line 生产级支持。
- 不追求解析级精确遮挡；当前仍允许基于采样 / tessellation 的近似求解。
- 不把 hidden-line 绑定成 `dual-layer` 专属能力；它仍然是普通 `3d` mode 的引擎级附加渲染能力。
- 不要求 `canvas` / `vml` renderer 与 SVG 拥有完全同等的 native masking 行为。

## Playground

playground 现在内置 `Hidden Line` 面板，直接消费公共 API：

- 切换启用 / 禁用
- 切换 `performance` / `balanced` / `quality`
- 打开 `debug`
- 查看 source 数、triangle / polyline 数、rendered path 数与 diagnostics

这块 UI 的目标是让 hidden-line 成为“可调、可演示、可验证”的正式能力，而不是只停留在内部架构。
