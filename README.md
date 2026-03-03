# VueGraphX

基于 Vue + JSXGraph 的数学可视化项目，支持二维函数、几何构造和三维曲面。

## Core 架构分层

`src/core` 现已按职责拆分：

- `board/`：画布与 3D 视图生命周期管理
- `entities/`：图元引用注册与回收
- `math/`：数学作用域（变量/函数上下文）
- `parsing/`：LaTeX 预处理与指令结构化解析
- `rendering/`：渲染调度与指令处理器
- `engine/`：对外门面 `GraphXEngine`
- `types/`：核心类型定义

## 指令处理机制（统一 2D / 3D）

渲染入口是 `Renderer.render(mode, expr, color, options)`，其内部流程为：

1. 预处理表达式（LaTeX → 可执行表达式）
2. 组装 `RenderContext`
3. 交给 `RenderRegistry` 按优先级顺序执行 handlers
4. 首个成功处理的 handler 返回图元，结束本次指令

默认 handlers 在 `src/core/rendering/handlers`：

- `GenericInvocationHandler`：通用调用式指令（如 `Circle(...)`）
- `TuplePointHandler`：坐标点（2D/3D）
- `Surface3DHandler`：`Surface(...)` 参数曲面
- `Expression2DHandler`：2D 表达式/函数图像
- `Expression3DHandler`：3D 显式曲面（如 `z = f(x,y)`）

其中 2D/Geometry 的调用式指令（如 `Circle(...)`、`Segment(...)`）由运行时 `JXG.elements` 动态驱动，
不再手工维护固定列表，能自动与 JSXGraph 版本保持同步。

3D 调用式指令由 `jsxgraphCommandCatalog` 统一映射，已补全并接入以下命令族：

- `circle3d`
- `curve3d`
- `functiongraph3d`
- `intersectioncircle3d`
- `intersectionline3d`
- `line3d`
- `parametricsurface3d`
- `plane3d`
- `point3d`
- `polygon3d`
- `sphere3d`

并支持常用别名自动归一化（例如 `Line(...) -> line3d`、`Plane(...) -> plane3d`、`Point(...) -> point3d`）。

## 如何新增指令（推荐）

1. 在 `src/core/rendering/handlers` 新建一个 handler 类，实现 `RenderHandler` 接口。
2. 在 `supports(ctx)` 中精确判断是否处理该指令。
3. 在 `handle(ctx)` 中只做本指令的解析和绘制，返回 `JXG.GeometryElement[] | null`。
4. 在 `createDefaultRegistry.ts` 注册 handler，并设置合理 `priority`。

这样可以保证：

- 不改动渲染主流程
- 2D / 3D 指令扩展一致
- 回归风险最小，便于测试与维护

## 指令覆盖校验

项目内置了基于 handler 分发的覆盖样例，位于：

- `src/core/rendering/coverage/instructionCases.ts`
- `src/core/rendering/coverage/__tests__/instructionCoverage.test.ts`

运行方式：

- `npm run test`：执行完整覆盖测试
- `npm run test:watch`：开发时持续监听
- `npm run check:jsxgraph-3d`：校验 JSXGraph 升级后 3D 指令目录是否漂移

新增指令时，建议同时补充一条 `instructionCoverageCases`，确保“表达式 -> handler”分发关系可回归验证。

## 指令能力矩阵（当前基线）

### 2D

| 场景 | 示例表达式 | 命中 Handler |
|---|---|---|
| 显式点坐标 | `A = (1, 2)` | `tuple-point` |
| 函数图像表达式 | `y = sin(x) + 0.5*cos(2*x)` | `expression-2d` |

### Geometry

| 场景 | 示例表达式 | 命中 Handler |
|---|---|---|
| 圆形构造指令 | `c1 = Circle((0,0), (2,0))` | `generic-invocation` |
| 大小写混合指令 | `c2 = cIrClE((0,0), (3,0))` | `generic-invocation` |

### 3D

| 场景 | 示例表达式 | 命中 Handler |
|---|---|---|
| 参数曲面指令 | `Surface((3 + cos(v))*cos(u), (3 + cos(v))*sin(u), sin(v))` | `surface-3d` |
| 显式曲面表达式 | `z = sin(x)*cos(y)` | `expression-3d` |
| 显式点坐标 | `P = (1, 2, 3)` | `tuple-point` |

> 该矩阵与 `instructionCoverageCases.ts` 保持一一对应，修改或新增指令时请同步更新测试样例与本节内容。

## JSXGraph 升级检查（3D）

项目提供了自动检查脚本：

- `scripts/check-jsxgraph-3d-catalog.mjs`

检查逻辑：

1. 从 `node_modules/jsxgraph/src/index.d.ts` 的 `ElementType`（兼容旧版 `CreateElementType`）提取全部 3D 指令（排除 `view3d`）。
2. 对比本地目录清单 `src/core/rendering/known3dElementTypes.json`。
3. 若存在缺失或多余项，脚本会返回非 0 退出码。

建议在升级 `jsxgraph` 版本后执行：

- `npm run check:jsxgraph-3d`
- `npm run test`
- `npm run build`
