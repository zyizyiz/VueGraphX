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

### 4. Extending the playground mixed mode

Use this path when you are:

- adjusting the “plane + solid in one coordinate system” interaction model
- changing the fixed camera, work plane, axis, or grid behavior used by mixed mode
- adding mixed-specific controls, objects, or teaching demos

Main files:

- `playground/App.vue`
- `playground/types/mode.ts`
- `playground/composables/useMixedModeScene.ts`
- `playground/components/MixedModePanel.vue`

Implementation constraints:

- `mixed` is currently a playground mode, not a public `EngineMode`; under the hood it still maps to engine `3d` mode.
- 2D semantics should continue to be organized around the `z = 0` work plane rather than a separate coordinate system.
- Axes and grids should preferably be implemented as an independent 2D bottom layer instead of ordinary 3D scene elements.
- When rebuilding a large mixed scene, prefer wrapping creation/removal in `board.suspendUpdate()` / `board.unsuspendUpdate()` to avoid UI freezes when toggling controls.

Suggested workflow:

1. Start in `playground/types/mode.ts` to define camera, projection, and `view3D` container behavior.
2. Then implement the work plane, solid objects, and 2D bottom coordinate layer in `useMixedModeScene.ts`.
3. Keep mixed-specific UI in `MixedModePanel.vue` instead of coupling it into the other playground modes.
4. If the change affects how users should understand mixed mode, update the README and architecture docs as well.

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
- `createGroup()` for hit areas and bulk drag behavior
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
