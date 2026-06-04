# VueGraphX renderer-agnostic runtime architecture

Date reviewed: 2026-06-04.

VueGraphX is split by authority, not by renderer preference:

- `@vuegraphx/core` owns scene/object IR, backend contracts, capability descriptors, event routing, target refs, and scene serialization.
- `@vuegraphx/math` owns geometry/function/equation/solid math truth. It does not call JSXGraph, Babylon, Canvas, Pixi, Fabric, Konva, or Three.
- `@vuegraphx/commands` parses JSXGraph/GeoGebra-style commands into VueGraphX IR. Commands never create renderer objects.
- `@vuegraphx/vue` owns Vue composables/injection around the core runtime. It is not a core re-export.
- Backend packages (`@vuegraphx/backend-*`) render and report normalized picks. Backend resources stay inside backend handles/ports.
- `vuegraphx` remains the compatibility aggregate for current users.

## NPM package division

The publishable package manifests under `packages/*/package.json` are the npm boundaries. The root package keeps the compatibility aggregate and declares npm workspaces for development. Real source lives in `packages/*/src`; root `src/core`, `src/math`, `src/commands`, and `src/backends` are compatibility shims/aggregates only. Backend renderer peers are recorded on their backend packages and marked optional in workspace metadata so a root install does not pull every renderer; consumers install only the backend package and renderer peer they choose. `npm run verify:packages` enforces that package sources do not import root shims, that core/math/commands/vue stay renderer-free, and that `@vuegraphx/*` aliases point at `packages/*/src`.

Renderer peer dependencies are intentionally isolated:

| Package | Renderer peer |
| --- | --- |
| `@vuegraphx/backend-jsxgraph` | `jsxgraph` |
| `@vuegraphx/backend-babylon` | `@babylonjs/core` |
| `@vuegraphx/backend-canvas2d` | none |
| `@vuegraphx/backend-pixi` | `pixi.js` |
| `@vuegraphx/backend-fabric` | `fabric` |
| `@vuegraphx/backend-konva` | `konva` |
| `@vuegraphx/backend-three` | `three` |

## Backend contract rule

Backends implement the same lifecycle:

1. `mount(host, options)`
2. `create(node, context)`
3. `update(handle, patch, context)`
4. `pick(clientPoint, options)` returns VueGraphX `GraphTargetRef`
5. `project` / `unproject`
6. `resize`, `flush`, `destroy`

The backend may hold JSXGraph elements, Babylon meshes, Pixi containers, Fabric objects, Konva nodes, Three objects, DOM elements, or canvas paths internally. Those objects must not appear in `GraphSceneStore.toJSON()` or core public object payloads.

## Math ownership

JSXGraph is no longer treated as the math authority. It can still render analytic objects in the JSXGraph adapter, but point/vector/line/circle/polygon relations, intersections, transforms, command dependency resolution, and capability availability are owned by VueGraphX math/core.

Canvas2D is the baseline proof: because it has no retained math object model, it forces VueGraphX to provide its own math and hit testing. Babylon is the 3D proof: picking and render-loop ownership are injected through a runtime port so Babylon mesh/camera/material types do not leak into core.

## Subject tool primitives

Subject-tool behavior is represented as renderer-free primitives, not as packaged UI components. Applications own menus, panels, tabs, icons, and theme chrome; VueGraphX exposes serializable policies and math descriptors that those UIs can drive.

- `@vuegraphx/core` owns subject canvas state, coordinate-system policy, tick strategies, color allocation, object drag policy, and scene payload serialization. Coordinate-system defaults remain package defaults unless callers pass options.
- `@vuegraphx/math` owns subject function/equation descriptors, sampling, dynamic points, computed properties, annotations, auxiliary-line candidates, and renderer-free geometry transform previews for common plane geometry workflows.
- Backends consume the resulting scene payloads and overlay descriptors. Canvas2D remains the active 2D subject backend; Babylon remains scoped to native 3D solid rendering and picking.

## Existing JSXGraph mainline integration

The compatibility `GraphXEngine` path now writes every executed command into a `GraphSceneStore` before calling the legacy JSXGraph renderer:

1. `executeCommand()` compiles the expression through `@vuegraphx/commands` into renderer-neutral objects where possible.
2. Unsupported renderer-era expressions are preserved as serializable `legacy-expression` command nodes instead of leaking JSXGraph objects.
3. Supported 2D command objects now render through the `@vuegraphx/backend-jsxgraph` adapter first: points, lines/rays/segments, vectors, circles, polygons, midpoint/intersection/angle/transform constructions, parallel/perpendicular/tangent lines, functions, and derivatives no longer need to enter the legacy root render-handler path.
4. Unsupported renderer-era expressions are the fallback path, not the new authority: the old JSXGraph renderer is kept only for compatibility commands that do not yet compile into core IR.
5. `executeRuntimeCapability()` runs common actions (`move`, `set-color`, `set-visibility`, `lock`, `delete`, scene clear/selection clear, selected parameter updates) against core state first, then synchronizes compatible command-owned objects back through the active renderer path.

This is the important architectural shift requested by the project owner: the old path is no longer only “new packages beside old code”; the existing engine uses core scene authority first and only falls back to legacy rendering for commands not yet covered by backend adapters.

## Core runtime and interaction loop

`GraphSceneRuntime` binds a `GraphSceneStore` to one `GraphRenderBackend`:

- `addObject()` / `updateObject()` / `removeObject()` mutate core scene first.
- Backend handles are private runtime data and never appear in scene JSON.
- `applyDragToObject()` creates a core drag patch, updates the scene, then calls backend `update()`.
- `GraphInteractionRouter` can be used with the runtime backend for UI pass-through and pick/drag routing.

Interaction routing is a core contract, not a backend convention:

- `GraphPickOptions.hitGroups` lets callers ask for stable hit categories such as `vertex`, `edge`, `label`, or a backend-neutral object family. Backends may compute the hit internally, but returned `GraphPickResult` data must stay serializable and include normalized `hitGroup`/`meta.hitGroups` when known.
- `GraphInteractionRouter.pickWithDiagnostics()` reports typed routing decisions: UI ownership, layer pass-through/blocking, backend misses, hit-group filtering, and target resolution. The older `pick()` API remains as a convenience wrapper that returns only the resolved pick.
- Layer pass-through is tested through policy, not DOM behavior. Non-interactive pass-through layers allow lower layers to pick; non-interactive blocking layers stop routing and return a `pick.layer-blocked` diagnostic.
- `resolveGraphDragOperation()` explains core drag outcomes before backend redraw. Free objects return `success`, bounded objects may return `clamped` with a warning diagnostic, and relation-driven objects fail with `drag.relation-driven-object` so they can be recomputed from dependency state instead of moved directly.
- `createGraphRelationInvalidationPlan()` gives renderer-free invalidation output: changed/removed seeds, dirty object ids, relation ids, and deterministic recompute order.

The playground Canvas2D switch now uses this runtime instead of directly writing nodes into the backend. JSXGraph and Canvas2D therefore render from the same command list, including core geometry constructions such as `Angle(...)`, but Canvas2D proves the path through core IR/runtime rather than JSXGraph math objects.

## Official docs checked

- JSXGraph Board and Angle references: https://jsxgraph.org/docs/symbols/JXG.Board.html and https://jsxgraph.org/docs/symbols/Angle.html
- Babylon Scene picking and Engine render loop typedoc: https://doc.babylonjs.com/typedoc/classes/BABYLON.Scene and https://doc.babylonjs.com/typedoc/classes/BABYLON.Engine
- PixiJS v8 federated events: https://pixijs.com/8.x/guides/components/events
- Fabric Canvas API and events: https://fabricjs.com/api/classes/canvas/ and https://fabricjs.com/docs/events/
- Konva events: https://konvajs.org/docs/events/Binding_Events.html
- Three Raycaster: https://threejs.org/docs/#api/en/core/Raycaster
- MDN Canvas hit testing / OffscreenCanvas: https://developer.mozilla.org/en-US/docs/Web/API/CanvasRenderingContext2D/isPointInPath and https://developer.mozilla.org/en-US/docs/Web/API/OffscreenCanvas

Latest package versions were rechecked with `npm view` on 2026-05-25: `jsxgraph@1.12.2`, `@babylonjs/core@9.9.1`, `pixi.js@8.18.1`, `fabric@7.4.0`, `konva@10.3.0`, `three@0.184.0`.

## Babylon runtime factory

`@vuegraphx/backend-babylon` now exposes two layers:

- `BabylonGraphBackend`: the core-facing adapter implementing `GraphRenderBackend`.
- `createBabylonRuntime(BABYLON, options)`: a concrete optional-peer runtime factory. Consumers pass the imported Babylon namespace from `@babylonjs/core`, so VueGraphX packages can stay buildable without making Babylon a core dependency.

The runtime factory creates its own canvas, Babylon engine, scene, default camera/light, render loop, solid mesh resources, and normalized pick mapping. Mesh metadata is private to the backend and is converted back to `{ objectId, componentId }` before it reaches core. The default canvas style uses `pointer-events: none` so applications can keep DOM/UI pass-through behavior and call core routing/picking explicitly.
