# 🏛️ VueGraphX 架构设计文档

[English](./ARCHITECTURE_en.md) | **简体中文**

本文档旨在详述 `VueGraphX` 的核心架构设计思想、模块职责划分与系统内部流转机制。

## 1. 核心设计原则 (Core Design Principles)

- **控制反转与职责分离**：通过注册中心 (`Registry`) 管理渲染逻辑，避免在主程序中堆砌大量 `if-else`。
- **外观模式（Facade）对外暴露**：开发者只与 `GraphXEngine` 进行交互，底层引擎如解析(`parsing`)、画板环境(`board`)、内存/实体回收(`entities`) 完全对用户透明。
- **无缝集成 Vue**：内置基于 Vue 3 的 `shallowRef` 管理几何对象状态，完美支持在 Vue 组件树中实现图元交互。

## 2. 目录架构层级 (Directory Structure)

核心代码集中在 `src/core` 目录下：

```text
src/core/
 ├── board/       # 画板管理 (JXG.Board 和 View3D 实例包装)
 ├── engine/      # 全局外观 (GraphXEngine)
 ├── entities/    # 实体池与生命周期管理，解决图元更新与销毁
 ├── math/        # 上下文域，存储用户定义的变量和自定义数学函数
 ├── parsing/     # 解析管线，包含 LaTeX 转义及表达式标准化
 ├── rendering/   # ★核心渲染引擎 (分发逻辑与 Handlers 实装)
 └── types/       # 类型定义与接口声明
```

## 3. 指令渲染生命周期 (Rendering Pipeline)

`VueGraphX` 在接受到用户输入的字符串时，其生命周期分为下面四步：

### 3.1 解析阶段 (Parsing)
输入：例如用户的 LaTeX 公式 `y = \sin(x)` 或纯文本 `Circle((0,0), (2,2))`。
由 `parsing` 模块进行转义，将其归一化、去除多余字符并转换成 `mathjs` 及 `jsxgraph` 可识别的标准 AST 文本表达式。

### 3.2 注入上下文 (Context Assembly)
系统组装一个 `RenderContext`，其中不仅包含解析后的表达式，还会封装当前的 `Board` 实例、`math` 域内变量上下文、指定颜色（Color），以及绘制模式（`2d` 还是 `3d`）。

### 3.3 处理器分发 (Handler Dispatch)
通过注册中心（`RenderRegistry`），引擎会按照预设优先级，将上下文按顺序分发给所有已注册的 `RenderHandler`。
每个 Handler 需要实现一个方法：`supports(ctx: RenderContext): boolean`。第一个返回 `true` 的处理器会接管此指令的执行。

### 3.4 图元注册与执行 (Execution & Entity Registration)
命中处理策略（如 `Expression2DHandler` 处理显式 2D 函数），Handler 产出 `JXG.GeometryElement[]`。引擎随后会将这些产生的元素送入 `entities` 的生命周期池，便于将来快速修改样式、移除或垃圾回收。

## 4. 2D / 3D 差异化处理

`VueGraphX` 采用统一渲染入口，但针对 3D 渲染，引擎做出了如下智能适配：

- **自动化 3D View 创建**：如探测到渲染模式为 `3d` 且上下文尚未初始化 3D 画布，引擎会自动生成 `view3d`。
- **JSXGraph 命令映射**：底层 3D 命令（如 `curve3d`、`surface3d`）已经统一记录在映射表中（如 `jsxgraphCommandCatalog`），用户只需输入通用的 `Surface(...)`，系统会自动归一化。

## 5. 易于扩展的系统 (Extensibility)

若需要扩展一套属于“抛物线焦点探测指令”，只需：
1. 实现 `RenderHandler` 接口。
2. 重写 `supports` 以匹配特定标识符。
3. 重写 `handle` 利用 `ctx.board.create` 绘制元素。
4. 挂载到 `RenderRegistry` 以提升优先级。

## 6. 图形能力层 (Capability Layer)

旧设计中，交互能力主要挂载在具体图形插件里，例如“圆形插件”同时承担了圆形数据、辅助线、标注、裁切、颜色等全部职责。这样虽然实现快，但对外部用户来说，接入方式会退化成“记住每种图形各自的专用 API”。

现在的设计将“图形实现”和“图形能力”彻底拆开：

- 内部图形运行时只负责维护图形数据、选中态和底层 JSXGraph 对象。
- 图形运行时通过 `getCapabilityTarget()` 暴露自己支持的通用能力契约，而不是直接拼装能力列表。
- 引擎使用一组完全通用的能力处理器，把这些契约转换成统一能力描述与执行入口。
- 外部只通过 `GraphXEngine.subscribeCapabilities()` 订阅能力快照。
- 外部只通过 `GraphXEngine.executeCapability()` 触发能力，创建图形则通过 `GraphXEngine.createShape()`。

核心接口如下：

```typescript
interface GraphCapabilityDescriptor {
	id: string;
	feature: string;
	label: string;
	entityType: string;
	kind: 'action' | 'toggle' | 'input' | 'panel';
	group: 'create' | 'inspect' | 'edit' | 'annotate' | 'style' | 'animation' | 'danger';
	active?: boolean;
	enabled?: boolean;
	meta?: Record<string, unknown>;
}
```

这层抽象带来的收益：

- 新图形只需要声明“自己支持哪些通用能力契约”，不必重新设计一套外部 API。
- UI 层可以按能力分组动态渲染工具栏，而不是写死 `if shape === circle` 的控制分支。
- 同类能力能形成稳定语义，例如 `resize`、`style`、`delete`，更适合做二次封装、低代码和扩展生态。
- 引擎继续保留图形私有实现空间，不会把每个图形的内部细节暴露给业务层。
