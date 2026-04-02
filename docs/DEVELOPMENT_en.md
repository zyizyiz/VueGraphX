# 🛠 Development Guide

**English** | [简体中文](./DEVELOPMENT.md)

This document describes how the VueGraphX codebase should be extended. The project includes both an expression rendering path and a shape runtime path.

## Prerequisites

1. Node.js 18 or newer.
2. Use `npm` to install dependencies.

```bash
git clone https://github.com/zyizyiz/VueGraphX.git
cd VueGraphX
npm install
```

## Common Scripts

- `npm run dev`: start the Vite dev server and debug the playground.
- `npm run build`: build the library output into `dist/`.
- `npm run build:playground`: build the playground for demo deployment.
- `npm run test`: run all vitest tests.
- `npm run test:watch`: run tests in watch mode.
- `npm run check:jsxgraph-3d`: validate that the JSXGraph 3D command catalog has not drifted.
- `npm run docs:api`: regenerate the API reference into `docs/api/` with TypeDoc.

## First Decide Which Layer You Are Extending

### 1. Extending expression rendering

Use this path when you are:

- adding new math syntax
- fixing how an expression type is detected
- extending 2D / 3D command mapping to JSXGraph

Main files:

- `src/rendering/handlers/`
- `src/rendering/handlers/createDefaultRegistry.ts`
- `src/rendering/coverage/instructionCases.ts`
- `src/rendering/coverage/__tests__/`

Suggested workflow:

1. Add or modify a `RenderHandler` under `src/rendering/handlers/`.
2. Register it in `createDefaultRegistry.ts` with the correct priority order.
3. If command normalization changes, also review `jsxgraphCommandCatalog` and related tests.
4. Add coverage cases to prove the intended handler is selected.

### 2. Extending shared shape runtime / authoring APIs

Use this path when you are:

- adding reusable runtime infrastructure for shape authors
- improving `GraphShapeApi`, `GraphShapeContext`, groups, annotations, or animation tracks
- adding generic capability contracts or capability handlers

Main files:

- `src/architecture/shapes/`
- `src/architecture/capabilities/`
- `src/engine/GraphXEngine.ts`
- `src/types/`

Suggested workflow:

1. Confirm that the behavior is truly generic infrastructure, not private logic for one business shape.
2. Prefer to place the feature in shape contracts, composition helpers, or capability contracts.
3. If the change affects public API, update exports in `src/index.ts`.
4. If downstream usage changes, update README, architecture docs, and API comments together.

### 3. Building concrete shapes

Use this path when you are creating:

- business-specific shapes
- playground demo shapes
- implementations that should not become part of the library's public export surface

Preferred location:

- consumer code
- the local `playground/` in this repository

Principles:

- the library should primarily expose generic authoring APIs, not a growing list of concrete shapes
- concrete shapes should be composed with `createComposedShapeDefinition()`
- external UI should integrate through the capability-first model whenever possible

### 4. Extending the playground dual-layer mode

Use this path when you are:

- adjusting the “2D layers + 3D scene” interaction model
- changing the fixed camera, layered mounting, work plane, axis, or grid behavior used by dual-layer mode
- adding dual-layer-specific controls, objects, or teaching demos

Main files:

- `playground/App.vue`
- `playground/types/mode.ts`
- `playground/components/DualLayerPanel.vue`
- `playground/shapes/index.ts`

Implementation constraints:

- `dual-layer` is currently a playground mode, not a public `EngineMode`; under the hood it still maps to engine `3d` mode.
- 2D semantics should continue to be organized around the `z = 0` work plane rather than a separate coordinate system.
- Axes and grids should preferably be implemented as an independent 2D layer instead of ordinary 3D scene elements.
- If a need can be generalized, prefer moving it into `src`, for example `view3D.fitToBoard`, `createGroup()`, or `bindNativeEvent()`, instead of keeping reusable infrastructure trapped in playground-only code.
- When rebuilding a large dual-layer scene, prefer wrapping creation/removal in `board.suspendUpdate()` / `board.unsuspendUpdate()` to avoid UI freezes when toggling controls.

Suggested workflow:

1. Start in `playground/types/mode.ts` to define camera, projection, and `view3D` behavior.
2. Then implement dual mounting, layer ordering, and pass-through rules in `playground/App.vue`.
3. Keep dual-layer-specific UI in `DualLayerPanel.vue` instead of coupling it into the other playground modes.
4. If hit/drag behavior needs to bypass JSXGraph's default proxying, prefer `createGroup()` plus `bindNativeEvent()` over ad-hoc DOM hacks inside a demo shape.
5. If the change affects how users should understand dual-layer mode, update the README and architecture docs as well.

### 5. Extending hidden-line 3D runtime

Use this path when you are:

- improving engine-level hidden-line behavior in 3D scenes
- adding or refining adapters from render handlers or shapes into hidden-line sources
- tuning profiles, diagnostics, tessellation, or overlay rendering

Main files:

- `src/rendering/hiddenLine/`
- `src/engine/GraphXEngine.ts`
- `src/rendering/handlers/`
- `playground/components/HiddenLinePanel.vue`
- `playground/composables/useHiddenLineDebug.ts`

Implementation constraints:

- prefer semantic source registration (`mesh`, `polyline-set`, `curve`, `surface`) over reverse-parsing JSXGraph render nodes
- keep hidden-line as an engine-level `3d` capability, not a `dual-layer`-only behavior
- if public options, scene snapshots, or support boundaries change, update README, architecture docs, and hidden-line docs together

Suggested workflow:

1. Decide whether the change belongs in the generic hidden-line manager, a specific render-handler adapter, or playground-only inspection UI.
2. Extend source registration close to the semantic geometry producer instead of adding late DOM or JSXGraph patch-ups.
3. Add or update tests around solver behavior, manager snapshots, and adapter registration when support coverage changes.
4. Regenerate `docs/api/` whenever public hidden-line contracts or engine methods change.

## Recommended Shape Authoring Pattern

The current recommended pattern looks like this:

```typescript
import { createComposedShapeDefinition } from 'vuegraphx';

const shape = createComposedShapeDefinition<{ x: number; y: number }>({
  type: 'example-shape',
  supportedModes: ['2d', 'geometry'],
  create(_context, payload) {
    if (!payload) return null;

    return {
      entityType: 'example-shape',
      initialState: { highlighted: false },
      setup(api) {
        const point = api.trackObject(api.board.create('point', [payload.x, payload.y]));
        point.on('down', () => Promise.resolve().then(() => api.select()));
      },
      getCapabilityTarget(api) {
        if (!api.selected) return null;
        return {
          entityType: 'example-shape',
          entityId: api.id,
          entity: { id: api.id },
          remove: () => api.remove()
        };
      }
    };
  }
});
```

For more advanced shape behavior, prefer the shared primitives:

- `createAnimationTrack()` for playback
- `togglePointAnnotations()` for point labels
- `createGroup()` for hit areas, bulk drag behavior, render-node lookup, and native DOM event binding
- `projectUserBounds()` / `project3DBounds()` for floating UI placement
- `notifyChange()` / `scheduleUiChange()` for syncing external capability UI

## Testing and Documentation Expectations

If your change affects public behavior, at minimum check:

```bash
npm run build
npm run test
npm run docs:api
```

Update handwritten docs whenever:

- public README examples change
- architecture directories or extension entry points change
- the public capability model or shape authoring model changes

## Commit Guidance

These conventional prefixes work well:

- `feat:` new feature
- `fix:` bug fix
- `docs:` documentation change
- `refactor:` refactor
- `test:` test change

If you modify public exports, the capability model, or shape authoring APIs, keep docs and code evolving together.
