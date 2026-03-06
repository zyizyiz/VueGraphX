# 🏛️ VueGraphX Architecture Design

**English** | [简体中文](./ARCHITECTURE.md)

This document intends to elaborate on the core architectural design principles of `VueGraphX`, the responsibilities of various modules, and the internal logical mechanisms of the system.

## 1. Core Design Principles

- **Inversion of Control and Separation of Concerns**: Managing rendering logic through a centralized `Registry`, avoiding the accumulation of massive `if-else` branches in the main program.
- **Facade Pattern for External Interface**: Developers interact only with `GraphXEngine`. The underlying engine functionalities such as parsing (`parsing`), board environments (`board`), and memory/entity recovery (`entities`) remain completely transparent to the user.
- **Seamless Vue Integration**: Built-in support for Vue 3's `shallowRef` to manage the geometric object state, perfectly enabling graph element interaction within the Vue component tree.

## 2. Directory Hierarchy

The core codebase is centralized within the `src/core` directory:

```text
src/core/
 ├── board/       # Board management (JXG.Board and View3D instance wrappers)
 ├── engine/      # Global Facade (GraphXEngine)
 ├── entities/    # Entity pool and lifecycle management for updating and destroying
 ├── math/        # Mathematical context domain containing variables and user functions
 ├── parsing/     # Parsing pipeline, handling LaTeX escapes and AST normalization
 ├── rendering/   # ★ Core Rendering Engine (dispatch logic and Handlers execution)
 └── types/       # Global type definitions and interface declarations
```

## 3. Rendering Pipeline Lifecycle

Whenever `VueGraphX` receives a string inputted by the user, its lifecycle goes through the following four steps:

### 3.1 Parsing Phase
Input: e.g., user's LaTeX formula `y = \sin(x)` or pure text `Circle((0,0), (2,2))`.
The `parsing` module performs escape transitions to normalize it, stripping away redundant characters, and translates the string into standard AST text expressions recognized by both `mathjs` and `jsxgraph`.

### 3.2 Context Assembly
The system assembles a `RenderContext`, which includes not only the parsed expression but also the current `Board` instance, variable scopes from the `math` domain, specified Color, and the render mode (`2d` or `3d`).

### 3.3 Handler Dispatch
Through the registration center (`RenderRegistry`), the engine distributes the context sequentially to all registered `RenderHandler`s based on their pre-configured priorities.
Each Handler must implement a method: `supports(ctx: RenderContext): boolean`. The first handler that returns `true` will take over the execution of this instruction.

### 3.4 Entity Registration and Execution
When a strategy hits (such as the `Expression2DHandler` evaluating an explicit 2D function), the Handler produces an array of `JXG.GeometryElement[]`. The engine subsequently sends these generated elements into the lifecycle pool inside `entities`, facilitating rapid styling changes, removal, or garbage collection in the future.

## 4. Differentiated Processing of 2D / 3D

`VueGraphX` employs a unified rendering entry point, but it performs the following intelligent adaptations for 3D rendering specifically:

- **Automated 3D View Initialization**: If the render mode is detected as `3d` and the context hasn't initialized a 3D canvas yet, the engine automatically generates the `view3d` underlying structure.
- **JSXGraph Command Mapping**: Underlying 3D commands (e.g., `curve3d`, `surface3d`) are uniformly registered in a mapping table (e.g., `jsxgraphCommandCatalog`). Users only need to input the generic `Surface(...)`, and the system automatically normalizes the command execution.

## 5. Highly Extensible System

If you wish to expand an instruction suite, for example, a "Parabola Focal Point Detection Instruction", you only need to:
1. Implement the `RenderHandler` interface.
2. Override `supports` to match specific identifiers.
3. Override `handle` to utilize `ctx.board.create` to draw elements.
4. Mount your handler into `RenderRegistry` to elevate its execution priority.

## 6. Capability Layer

In the previous design, interaction features were attached directly to shape-specific plugins. For example, the circle plugin simultaneously owned circle state, helper lines, marking, cutting, and color tools. That implementation was fast to ship, but it forced consumers to learn a different API surface for each shape.

The new design fully separates shape implementation from shape capability:

- Internal shape runtimes own shape state, selection state, and low-level JSXGraph objects.
- Each shape runtime exposes generic capability contracts through `getCapabilityTarget()` instead of assembling capability lists directly.
- The engine uses a fully generic capability handler layer to turn those contracts into descriptors and executable actions.
- External integrations subscribe through `GraphXEngine.subscribeCapabilities()`.
- External integrations trigger behavior through `GraphXEngine.executeCapability()`, while shape creation goes through `GraphXEngine.createShape()`.

Core interface:

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

Benefits of this layer:

- New shapes only declare which generic capability contracts they support instead of inventing a brand new public API.
- The UI can render toolbars by capability group rather than hard-coding `if shape === circle` branches.
- Shared semantics such as `resize`, `style`, and `delete` become stable extension points for wrappers, low-code builders, and extension ecosystems.
- The engine still preserves shape-private implementation details while exposing a much friendlier external contract.
