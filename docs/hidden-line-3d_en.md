# Hidden Line 3D

## Goal

VueGraphX treats hidden-line 3D as an engine-level scene capability, not as one shape's private trick. The goal is to support, through one shared pipeline:

- 3D objects registered from composable shapes
- 3D objects emitted by expression renderers
- future surfaces, curves, meshes, wireframes, and mixed scenes

## Public API

### Engine

`GraphXEngine` exposes:

- `registerHiddenLineSource(ownerId, source)`
- `removeHiddenLineSource(sourceId)`
- `clearHiddenLineSources(ownerId?)`
- `getHiddenLineSceneSnapshot()`
- `getHiddenLineOptions()`
- `setHiddenLineOptions(options?)`

`setHiddenLineOptions()` lets callers toggle hidden-line, switch runtime profiles, enable debug diagnostics, and override sampling without rebuilding the engine.

### Shape API

`GraphShapeApi` exposes:

- `registerHiddenLineSource(source)`
- `removeHiddenLineSource(sourceId)`
- `clearHiddenLineSources()`

Shape authors do not need to pass an `ownerId`; the runtime binds hidden-line sources to the current shape instance automatically.

### Renderer Context

`RenderContext.hiddenLine` exposes bridges for command renderers:

- `isEnabled()`
- `getOptions()`
- `registerSource(source)`
- `clearOwnerSources(ownerId?)`

This lets handlers such as `Expression3DHandler`, `Surface3DHandler`, and `GenericInvocationHandler` register semantic geometry directly instead of reverse-parsing JSXGraph objects.

## Runtime Options

`GraphXOptions.view3D.hiddenLine` now carries three layers of configuration:

- `enabled`: enable or disable hidden-line
- `profile`: `performance` / `balanced` / `quality`
- `debug`: keep extra runtime diagnostics
- `sampling`: optional low-level sampling overrides

Recommended usage:

- start with `balanced` for normal demos and teaching scenes
- switch to `performance` when surface count is high and interactivity matters more
- switch to `quality` when surface / curve boundaries matter more than throughput
- only override `sampling` when the built-in profiles are not enough

## Source Model

The shared model in `src/rendering/hiddenLine/contracts.ts` currently supports:

- `mesh`
- `polyline-set`
- `curve`
- `surface`

Each source returns fresh geometry through `resolve()` during the update cycle, so drag, rotation, and animation stay synchronized with the overlay.

### Official support matrix

The current productized support matrix covers:

- `mesh`
- `polyline-set`
- sampled `curve`
- sampled `surface` plus `featureCurves`
- connected command adapters for 3D line / polygon / surface cases in `Expression3DHandler`, `Surface3DHandler`, and `GenericInvocationHandler`
- shape-side `cube` / `wireframe-cube`

Objects outside that matrix may still render, but they are not part of the current hidden-line support guarantee.

### Occlusion priority

- Later-registered sources occlude earlier sources as a whole scene-order heuristic.
- Self-occlusion inside one source still uses depth-based visibility.
- Playground `cube` / `wireframe-cube` can override `hiddenLine.visible` / `hiddenLine.hidden` styles in their payloads.
- `sampleVisibility()` can force a local segment to `visible` / `hidden` / `auto`; `visible` wins over external occlusion.

### Render path

- tessellation / sampling
- screen-space projection
- segment visibility splitting
- 2D SVG overlay rendering on top of the board container

The original JSXGraph 3D wire edges are hidden in the demo scenes (for example with `strokeOpacity: 0`) so the overlay remains the single visible edge source.

### Snapshot and diagnostics

`getHiddenLineSceneSnapshot()` returns more than source summaries:

- normalized runtime options
- `stats`: active / resolved / skipped source counts, triangle / polyline counts, rendered path count
- `diagnostics`: empty sources, resolve failures, and tessellation warnings / errors

This gives both playground UI and downstream apps a public inspection surface without reading manager-private state.

## Lifecycle

- the engine triggers `GraphHiddenLineManager.update()` after board `update`
- shape disposal, command removal, and board reset all clean up matching owner sources automatically
- `GraphXOptions.view3D.hiddenLine` remains the global configuration entry

## Renderer assumptions

- the most complete rendering path is optimized around the SVG renderer
- the overlay itself is SVG, and native clipping / masking prefers an available SVG root
- when native mask conditions are missing, the system degrades instead of aborting the whole board update

## Non-goals

- guaranteeing production-grade hidden-line support for every JSXGraph 3D object
- exact analytic occlusion; sampling / tessellation approximations are still allowed
- treating hidden-line as a `dual-layer`-only feature; it remains an engine-level 3D capability
- enforcing identical native masking behavior across `canvas`, `vml`, and SVG renderers

## Playground

The playground now ships a `Hidden Line` panel built entirely on top of the public API:

- toggle enable / disable
- switch `performance` / `balanced` / `quality`
- enable `debug`
- inspect source counts, triangle / polyline counts, rendered path counts, and diagnostics

The point of this panel is to make hidden-line a tunable, demonstrable, and verifiable feature instead of an internal architectural experiment.
