# 🏛️ VueGraphX 架构设计文档

[English](./ARCHITECTURE_en.md) | **简体中文**

本文档描述 VueGraphX 的架构。工程围绕两条并行主线组织：

- 表达式渲染主线：负责把字符串表达式转换为 JSXGraph 图元。
- 图形运行时主线：负责 shape definition、实例生命周期、能力快照与能力执行。

## 1. 核心设计原则

- 门面优先：对外统一由 `GraphXEngine` 承担入口，负责画板生命周期、表达式渲染、图形注册与能力执行。
- capability-first：外部 UI 围绕统一能力描述渲染工具栏、面板和动画控制。
- shape authoring 与 engine runtime 解耦：库提供通用组合式 authoring API，具体图形定义应尽量写在业务侧或 playground 中。
- 2D / 3D 共用基础设施：视口投影、屏幕包围盒、锚点解析、动画调度与点标注都是跨图形、跨模式复用的能力。
- 表达式渲染与图形运行时并存：命令渲染适合函数/几何表达式，shape runtime 适合复杂交互式对象，两者都由同一个引擎门面协调。

## 2. 当前目录结构

核心代码位于 `src/`：

```text
src/
 ├── architecture/
 │   ├── capabilities/   # 通用能力契约、能力处理器和注册表
 │   └── shapes/         # shape definition、runtime、组合式 authoring API
 ├── board/              # JSXGraph board / view3d 生命周期
 ├── engine/             # GraphXEngine 对外门面
 ├── entities/           # 表达式渲染结果的注册与清理
 ├── math/               # 共享数学作用域
 ├── parsing/            # 指令与表达式解析
 ├── rendering/          # Renderer、指令目录、渲染处理器
 └── types/              # 引擎与能力公共类型
```

公共导出入口为 `src/index.ts`。当前对外暴露的重点不是某组内置图形，而是：

- `GraphXEngine`
- `createComposedShapeDefinition()`
- shape contracts 与 capability contracts
- `BoardManager`、`MathScope`、基础类型定义

## 3. 双主线运行模型

### 3.1 表达式渲染主线

表达式渲染面向这类需求：

- 输入 `y = sin(x)` 一类函数表达式
- 输入 `Circle((0,0), (2,0))` 一类几何命令
- 输入 3D 公式或曲面定义

调用入口通常是 `GraphXEngine.executeCommand()`，整体流程如下：

1. `GraphXEngine` 接收命令 id、表达式、颜色和额外参数。
2. `Renderer` 组装 `RenderContext`，包含当前模式、board、entity manager、math scope 等上下文。
3. `parsing` 负责对表达式做预处理与标准化。
4. `RenderRegistry` 按优先级分发给各个 `RenderHandler`。
5. 命中的 handler 返回 `JXG.GeometryElement[]`。
6. `EntityManager` 以命令 id 为单位登记这些元素，便于后续覆盖更新和移除。

这条主线仍然保留 handler 扩展机制，但它已经只是整个系统中的一部分，而不是唯一扩展点。

### 3.2 图形运行时主线

图形运行时面向这类需求：

- 一个图形拥有自己的选中态、拖拽、动画和辅助 UI
- 外部需要围绕统一工具栏和面板驱动多种图形
- 图形作者希望复用点标注、动画轨道、投影和分组基础设施

这条主线由以下对象协作完成：

- `GraphShapeDefinition`
- `GraphShapeContext`
- `GraphShapeComposition`
- `GraphShapeApi`
- `GraphShapeInstance`

典型流程如下：

1. 业务代码通过 `createComposedShapeDefinition()` 组合出一个 shape definition。
2. 调用 `GraphXEngine.registerShape()` 注册定义。
3. 调用 `createShape()` 或拖拽入口创建实例。
4. 引擎基于 `GraphShapeContext` 和组合对象生成运行时实例。
5. `setup()` 中创建 JSXGraph 对象、分组、事件、动画轨道和点标注。
6. 选中态变化时，实例通过 `getCapabilityTarget()` 暴露统一能力契约。

### 3.3 capability 主线

能力层把“图形内部实现”转换成“外部 UI 可消费的统一语义”：

1. 当前选中实例返回一个 `ShapeCapabilityTarget`。
2. `capabilityRegistry` 中的通用能力处理器根据 target 判断自己是否适用。
3. 每个能力处理器生成一个 `GraphCapabilityDescriptor`。
4. 外部通过 `subscribeCapabilities()` 获得 `{ selection, capabilities }` 快照。
5. 外部通过 `executeCapability(id, payload)` 调用统一执行入口。

当前 capability 体系的重点收益是：

- UI 可以按 `group` 和 `kind` 自动组织控件。
- 同一个删除、样式、缩放、动画能力可以跨图形复用。
- 图形内部仍保留私有实现细节，不必把每种图形的专用操作暴露给外部。

## 4. shape authoring 的共享基础设施

当前版本针对图形作者提供了几类重要的共享能力：

- 动画轨道：`createAnimationTrack()`、多轨 animation contract、共享帧调度器。
- 点标注：`togglePointAnnotations()`、`clearPointAnnotations()` 以及 point / intersection / midpoint / computed 等来源。
- 投影工具：`projectUserPoint()`、`projectPoint3D()`、`projectUserBounds()`、`project3DBounds()`、`getBoundsAnchor()`。
- 受管分组：`createGroup()`、分组命中、批量拖拽、批量属性控制。
- UI 同步：`notifyChange()` 和 `scheduleUiChange()` 用于同步外部工具栏与悬浮 UI。

这让图形作者只关注“几何如何变化”和“能力如何暴露”，而不必重复实现 requestAnimationFrame、命中批处理或投影换算。

## 4.1 可展开立体抽象

针对“立方体、圆柱、圆锥等立体在 2D 中投影展示、旋转、展开/收起”的需求，当前新增了一层实验性的 solids 抽象，代码位于 `src/architecture/solids/`。

这层抽象把立体统一表示为三部分：

- patch：面片语义，当前统一为 `polygon`、`band`、`disk`、`sector` 四类。
- hinge：面片之间的铰链关系，负责描述折叠态与展开态之间的角度变化。
- state：统一驱动 `rotationX/Y/Z`、`unfoldProgress`、`explodeProgress` 与 `viewMode`。

这样做的目标不是立即替换现有 playground 图形，而是先把“通用几何层”从具体 shape 里抽出来。后续像 cube、cylinder、cone 一类图形可以只提供：

- 参数模型，例如边长、半径、高度、母线长、分段数。
- patch 拓扑与 hinge 树。
- 样式和能力映射。

然后由上层 shape runtime 复用同一套：

- 折叠态投影到 2D
- 展开态净图布局
- 旋转与展开动画轨道
- 统一工具栏与 capability 面板

当前这层又向前推进了一步：

- `src/architecture/solids/renderer2d.ts` 提供通用 `renderSolidTopology2D()`，统一把 `polygon`、`band`、`disk`、`sector` 四类 patch 渲染成 2D 轮廓。
- renderer 支持三种视图：`projected`、`net`、`hybrid`，其中 `hybrid` 会按 `unfoldProgress` 在折叠投影和展开净图之间插值。
- renderer 也统一处理 `explodeProgress`，把面片沿整体包围盒中心向外分离，适合作为教学展示或结构拆解动画。
- `src/architecture/solids/shape2d.ts` 提供 `createSolid2DScene()` 和 `createSolid2DShapeDefinition()`，把 renderer 输出接成 JSXGraph polygon 集合，并进一步把拖拽、工具栏定位、动画轨道和 capability 暴露收敛成通用 authoring API。

## 5. 推荐的外部接入方式

### 5.1 如果你的需求是表达式驱动

优先使用：

- `executeCommand()` 渲染或替换一条表达式
- `removeCommand()` 清理指定命令结果
- `setMode()` 在 2D / 3D / geometry 之间切换

### 5.2 如果你的需求是交互式图形编辑

优先使用：

- `registerShape()` 注册 shape definition
- `createShape()` 创建实例
- `subscribeCapabilities()` 驱动外部 UI
- `executeCapability()` 统一执行交互行为

### 5.3 如果你的需求是扩展库本身

先判断你改动的是哪一层：

- 新数学指令或表达式语义：改 `rendering/`。
- 新的通用图形 authoring 能力：改 `architecture/shapes/`。
- 新的通用外部交互能力：改 `architecture/capabilities/`。
- 某个具体业务图形：优先放在 consumer 或 playground，不直接塞进库导出面。

## 6. 架构关注点

- `src/` 目录按能力、图形、渲染、引擎和基础类型分层组织。
- 公共交互 API 采用 capability-first 模式。
- `shape definition` 与 `composition` 是扩展复杂交互图形的主要方式。
- 动画、点标注、投影、命中与分组属于共享基础设施。
- 公共导出面聚焦通用 runtime 和 authoring API。
