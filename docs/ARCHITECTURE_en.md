# 🏛️ VueGraphX Architecture Design

**English** | [简体中文](./ARCHITECTURE.md)

This document describes the VueGraphX architecture. The project is organized around four parallel workflows:

- Expression rendering for turning string expressions into JSXGraph elements.
- Shape runtime authoring for shape definitions, instance lifecycle, capability snapshots, and capability execution.
- Relation orchestration for turning public geometry targets into explainable relation records.
- Scene document persistence for versioned public content snapshots and replace-based restoration.

## 1. Core Design Principles

- Facade first: `GraphXEngine` is the public entry point for board lifecycle, rendering, shape registration, and capability execution.
- Capability-first interaction: external UI should react to generic capability descriptors instead of calling shape-specific APIs.
- Explicit cross-object semantics: relations are promoted into first-class engine content instead of hiding in ad hoc UI state.
- Decoupled shape authoring: the library exposes reusable authoring primitives, while concrete shapes should usually live in consumer code or the playground.
- Shared 2D / 3D infrastructure: projection helpers, screen bounds, anchors, animation scheduling, and point annotations are reusable across shapes and modes.
- Engine-level hidden-line scene model: 3D edge visibility, runtime tuning, and diagnostics are coordinated centrally instead of being reimplemented per shape.
- Rendering and runtime coexist: command rendering is ideal for expressions, while shape runtime is ideal for complex interactive objects.

## 2. Current Directory Layout

Core code lives under `src/`:

```text
src/
 ├── architecture/
 │   ├── capabilities/   # generic capability contracts, handlers, and registry
 │   └── shapes/         # shape definitions, runtime, and composable authoring API
 ├── board/              # JSXGraph board / view3d lifecycle
 ├── engine/             # public facade GraphXEngine
 ├── entities/           # registration and cleanup of rendered command elements
 ├── math/               # shared math scope
 ├── parsing/            # expression parsing and normalization
 ├── rendering/          # Renderer, command catalog, and render handlers
 └── types/              # public engine and capability types
```

The public entry point is `src/index.ts`. The main exports are now:

- `GraphXEngine`
- `createComposedShapeDefinition()`
- shape contracts and capability contracts
- `BoardManager`, `MathScope`, and public engine types

## 3. Runtime Model

### 3.1 Expression Rendering Flow

The rendering flow targets use cases such as:

- function expressions like `y = sin(x)`
- geometry commands like `Circle((0,0), (2,0))`
- 3D formulas and surfaces

The typical entry point is `GraphXEngine.executeCommand()`, and the flow is:

1. `GraphXEngine` receives a command id, expression, color, and optional extra options.
2. `Renderer` assembles a `RenderContext` with mode, board, entity manager, and math scope.
3. `parsing` preprocesses and normalizes the expression.
4. `RenderRegistry` dispatches the context through registered `RenderHandler`s by priority.
5. The winning handler returns `JXG.GeometryElement[]`.
6. `EntityManager` stores those elements under the command id for later replacement or cleanup.

The handler mechanism still matters, but it is only one extension layer in the modern architecture.

### 3.2 Shape Runtime Flow

The shape runtime targets use cases such as:

- shapes with their own selection state, drag logic, animation, and helper UI
- external toolbars driven by a shared capability model
- shape authors reusing annotations, animation tracks, projection helpers, and groups

The main participants are:

- `GraphShapeDefinition`
- `GraphShapeContext`
- `GraphShapeComposition`
- `GraphShapeApi`
- `GraphShapeInstance`

Typical flow:

1. Consumer code builds a definition with `createComposedShapeDefinition()`.
2. The definition is registered via `GraphXEngine.registerShape()`.
3. An instance is created through `createShape()` or a drag-and-drop entry.
4. The engine creates a runtime instance from the definition and `GraphShapeContext`.
5. `setup()` creates JSXGraph objects, groups, event bindings, animation tracks, and annotations.
6. When selected, the instance exposes shared capability contracts through `getCapabilityTarget()`.

### 3.3 Capability Flow

The capability layer translates shape-private implementation into a generic UI contract:

1. The selected instance returns a `ShapeCapabilityTarget`.
2. Built-in handlers in `capabilityRegistry` decide whether they support that target.
3. Each handler builds a `GraphCapabilityDescriptor`.
4. External UI receives `{ selection, capabilities }` snapshots from `subscribeCapabilities()`.
5. External UI triggers shared behavior through `executeCapability(id, payload)`.

This is valuable because:

- UI can group controls by `group` and `kind`.
- delete, style, resize, split, annotation, and animation behavior can be reused across shapes.
- shapes keep their private implementation details while still exposing a stable public interaction model.

### 3.4 Relation Flow

The relation workflow answers: “How do cross-object geometry semantics become public content instead of one-off interaction artifacts?”

1. Command-rendered or runtime-authored content exposes public relation targets such as `point`, `line-like`, `segment-like`, or `circle-like`.
2. `GraphXEngine` keeps relation records in dedicated engine-owned state instead of mixing them into capability snapshots or playground-only stores.
3. The evaluator produces explainable snapshots such as `satisfied`, `violated`, `missing-target`, `unsupported`, and `conflicting`.
4. Playground panels and consumer applications read relation state through public engine methods such as `createRelation()`, `listRelations()`, `getRelationSnapshots()`, and `subscribeRelations()`.

Current v1 boundaries:

- Focused on geometry-oriented public targets.
- Public kinds currently include `parallel`, `perpendicular`, `equal-length`, and `distance-assertion`.
- The current implementation is an explainable relation layer, not a general CAD-grade global constraint solver.

### 3.5 Scene document workflow

The scene document workflow answers: “How do we persist the current public content and restore it later?”

1. `GraphXEngine.executeCommand()` writes command records into engine-owned scene state, not just runtime render output.
2. `GraphXEngine.createShape()` / `handleDropEvent()` register shape runtime metadata when shapes explicitly opt into scene support.
3. Relation records participate in the same scene contract as commands and shapes instead of using a second import/export protocol.
4. `exportScene()` produces a versioned scene document containing `mode`, supported settings, ordered commands, serializable shapes, and relations.
5. `loadScene()` runs document preflight and then restores content in `commands -> shapes -> relations` order with structured diagnostics.

Important boundaries:

- scene v1 is a public content document, not a full session snapshot.
- `dual-layer` remains a playground-level composition and is not part of the public scene contract.
- shapes participate only when their definitions explicitly declare `scene` support and runtime instances can return `getScenePayload()`.
- missing `relations` is treated as an empty array for compatibility with older scene documents.

### 3.6 Playground dual-layer mode

The playground currently includes an experimental `dual-layer` mode that demonstrates a math-software-style interaction model where 2D layers and a 3D scene cooperate in one composed runtime.

This mode has two important boundaries:

- `dual-layer` is not a public `EngineMode` and is not part of the exported engine type surface; inside the playground it is still mapped to the engine's `3d` mode and then combined with a second 2D board instance.
- It is not a separate renderer. It is composed from the existing `view3d` lifecycle, a fixed front-facing camera configuration, and additional 2D overlay / underlay boards.

The current dual-layer structure is:

1. `playground/types/mode.ts` maps `dual-layer` to engine `3d` mode and enables `view3D.fitToBoard` so the 3D viewport follows the board.
2. `playground/App.vue` mounts two independent board instances: a bottom 3D board and a top 2D board.
3. Solid objects remain true 3D elements, but only object-local rotation is allowed; the global axes do not rotate.
4. CSS layering plus native DOM event binding are used to achieve “pass through empty space, capture actual shapes”.

Why this design exists:

- math-software interaction is closer to “fixed coordinate system + local object inspection” than full scene trackball rotation
- if axes, grids, annotations, or controls are added as normal 3D elements, they inherit face occlusion, layering, and hit behavior that feels wrong for a coordinate system
- dual-layer mode is intentionally treated as a playground-level experiment before expanding the public engine mode surface
- the reusable parts of this experiment, such as `view3D.fitToBoard`, `createGroup()`, and `bindNativeEvent()`, should live in `src` as public API rather than remaining hidden in playground-only code

### 3.7 Hidden-line 3D scene model

Hidden-line 3D is now treated as engine-level scene infrastructure rather than a one-off renderer trick.

The main public integration points are:

- `GraphXEngine.registerHiddenLineSource()` / `removeHiddenLineSource()` / `clearHiddenLineSources()`
- `GraphXEngine.getHiddenLineSceneSnapshot()` / `getHiddenLineOptions()` / `setHiddenLineOptions()`
- `GraphShapeApi.registerHiddenLineSource()` for shape-side registration
- `RenderContext.hiddenLine` for renderer-side adapters

This architecture matters because:

- shapes and render handlers can both contribute semantic hidden-line sources to one shared manager
- runtime tuning stays explicit through `performance` / `balanced` / `quality` profiles
- diagnostics and scene stats are public, so playground tooling and downstream apps can inspect the feature without reaching into private runtime state

The current productized support matrix focuses on:

- `mesh`
- `polyline-set`
- sampled `curve`
- sampled `surface` plus `featureCurves`
- connected 3D line / polygon / surface command adapters
- playground `cube` / `wireframe-cube`

Not every JSXGraph 3D object is guaranteed to participate in hidden-line yet; that boundary is intentional while the support matrix grows.

## 4. Shared Infrastructure for Shape Authors

The current runtime provides several reusable authoring primitives:

- Animation tracks via `createAnimationTrack()` and multi-track animation contracts.
- Point annotations via `togglePointAnnotations()` and point / intersection / midpoint / computed sources.
- Projection helpers such as `projectUserPoint()`, `projectPoint3D()`, `projectUserBounds()`, `project3DBounds()`, and `getBoundsAnchor()`.
- Managed groups via `createGroup()` for hit detection, bulk drag behavior, shared attribute updates, render-node lookup, and native DOM event binding.
- UI synchronization utilities like `notifyChange()` and `scheduleUiChange()`.

This keeps shape authors focused on geometry and capability exposure instead of rebuilding frame scheduling, hit batching, or screen projection logic.

## 5. Recommended Integration Modes

### 5.1 If your use case is expression-driven

Prefer:

- `executeCommand()` to render or replace an expression result
- `removeCommand()` to clean up a specific command
- `setMode()` to switch between `2d`, `3d`, and `geometry`

Note: if you see `dual-layer` in the playground UI, that is a composed demo layer built on top of `3d`, not a public engine mode exposed as `setMode('dual-layer')`.

### 5.2 If your use case is an interactive shape editor

Prefer:

- `registerShape()` to register shape definitions
- `createShape()` to create instances
- `subscribeCapabilities()` to drive UI state
- `executeCapability()` to trigger shared behavior

### 5.3 If you are extending the library itself

Choose the layer first:

- new math syntax or expression semantics: work in `rendering/`
- new generic shape authoring infrastructure: work in `architecture/shapes/`
- new generic external interaction capability: work in `architecture/capabilities/`
- concrete business shapes: keep them in consumer code or the playground rather than exporting them from the library

## 6. Architectural Focus

- `src/` is organized by capabilities, shapes, rendering, engine, and shared types.
- the public interaction API follows a capability-first model.
- shape definition and composition are the primary model for complex interactive shapes.
- animation, annotation, projection, hit handling, and grouping are shared runtime infrastructure.
- the public surface emphasizes generic runtime and authoring APIs.
