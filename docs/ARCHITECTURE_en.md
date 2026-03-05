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
