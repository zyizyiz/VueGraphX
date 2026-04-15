<div align="center">
  <h1>🌌 VueGraphX</h1>
  <p><strong>Interactive math and geometry engine built on Vue 3 + JSXGraph</strong></p>

  <p>
    <a href="https://www.npmjs.com/package/vuegraphx"><img src="https://img.shields.io/npm/v/vuegraphx?color=42b883&style=for-the-badge" alt="NPM Version" /></a>
    <a href="https://zyizyiz.github.io/VueGraphX/"><img src="https://img.shields.io/badge/Demo-Online-blueviolet?style=for-the-badge" alt="Live Demo" /></a>
    <a href="https://github.com/vuejs/vue"><img src="https://img.shields.io/badge/Vue.js-3.4+-4fc08d?style=for-the-badge&logo=vuedotjs" alt="Vue 3" /></a>
    <a href="https://github.com/jsxgraph/jsxgraph"><img src="https://img.shields.io/badge/JSXGraph-1.8.0+-f49c00?style=for-the-badge" alt="JSXGraph" /></a>
    <a href="./LICENSE"><img src="https://img.shields.io/badge/License-Apache_2.0-blue.svg?style=for-the-badge" alt="License" /></a>
  </p>
</div>

**English** | [简体中文](./README.md)

## 🌟 Introduction

VueGraphX exposes two complementary workflows:

- Expression rendering for 2D/3D math expressions and geometry commands.
- Shape runtime authoring built around shape definitions plus a capability-first interaction model.

The playground also includes an experimental dual-layer mode:

- 2D objects are treated as content living on the `z = 0` work plane.
- Solid objects share the same coordinate system but rotate only at the object level, without rotating the global axes.
- A fixed front-facing `view3d` hosts the 3D scene while an independent 2D overlay / underlay can be composed around it to mimic math-software-style “plane + solid in one system” behavior.

That makes it suitable both as a standalone rendering engine and as the runtime layer of an interactive geometry editor, education tool, or custom whiteboard.

🌐 Live Demo: [https://zyizyiz.github.io/VueGraphX/](https://zyizyiz.github.io/VueGraphX/)

## ✨ Features

- 🚀 Capability-first interaction: external UI subscribes with `subscribeCapabilities()` and triggers behavior with `executeCapability()` instead of learning one API per shape.
- 🧩 Composable shape authoring: build local shapes with `createComposedShapeDefinition()`, `GraphShapeApi`, and `GraphShapeContext`.
- 🎬 Shared runtime utilities: animation tracks, point annotations, hit groups, drag helpers, and screen projection helpers are reusable across shapes.
- 📐 Unified 2D / 3D entry point: expression rendering and `view3d` lifecycle are managed through the same engine facade.
- 🔗 Geometry relation layer: use `createRelation()` / `getRelationSnapshots()` to attach explainable relations such as parallel, perpendicular, equal-length, and distance assertions to public geometry targets.
- 💾 Scene document model: use `exportScene()` / `loadScene()` to persist commands, serializable shapes, relations, and supported scene-level settings.
- 👓 Productionized hidden-line 3D: switch runtime profiles, inspect snapshot stats / diagnostics, and keep occluded edges stable in teaching-oriented 3D scenes.
- 🧪 Experimental playground dual-layer mode: built on top of engine `3d` mode and composed with an independent 2D layer.
- 🧱 Layered-scene primitives: public `view3D.fitToBoard` and group-level `bindNativeEvent()` make multi-layer interaction easier to build in consumer apps.
- 🛡️ Type-safe public surface: engine options, capability contracts, and shape authoring interfaces are exported for downstream integrations.

## 📦 Installation

```bash
npm install vuegraphx
```

You also need `vue` in your project. If you want the default JSXGraph visual styles, import its CSS as well.

## 🔨 Quick Start

### 1. Initialize the engine

```typescript
import { GraphXEngine, createComposedShapeDefinition } from 'vuegraphx';
import 'jsxgraph/distrib/jsxgraph.css';

const engine = new GraphXEngine('box', {
  boundingbox: [-5, 5, 5, -5],
  axis: true,
  showNavigation: false,
  pan: {
    enabled: true,
    needShift: false,
    needTwoFingers: false
  },
  zoom: {
    enabled: true,
    wheel: true,
    needShift: false,
    pinch: true
  }
});

const customCircle = createComposedShapeDefinition<{ x: number; y: number }>({
  type: 'circle',
  supportedModes: ['2d', 'geometry'],
  create(_context, payload) {
    if (!payload) return null;

    return {
      entityType: 'circle',
      initialState: {},
      setup(api) {
        const center = api.trackObject(api.board.create('point', [payload.x, payload.y], { visible: false }));
        const radiusPoint = api.trackObject(api.board.create('point', [payload.x + 2, payload.y], { visible: false }));
        const circle = api.trackObject(api.board.create('circle', [center, radiusPoint]));
        circle.on('down', () => Promise.resolve().then(() => api.select()));
      },
      getCapabilityTarget(api) {
        if (!api.selected) return null;

        return {
          entityType: 'circle',
          entityId: api.id,
          entity: { id: api.id },
          remove: () => api.remove()
        };
      }
    };
  }
});

engine.registerShape(customCircle);
engine.createShape('circle', { x: 0, y: 0 });
```

Zoom is not enabled by default in the library; if you want a draggable viewport plus wheel / pinch zoom, configure `pan` and `zoom` at initialization.  
If you want touch devices or trackpads to behave as “two-finger move = pan, pinch = zoom”, set `pan.needTwoFingers` to `true`.  
`showNavigation` only controls the default JSXGraph navigation buttons; it does not disable `zoom.wheel` or `zoom.pinch`.

### 2. Subscribe to capabilities and drive UI

```typescript
import type { GraphCapabilitySnapshot } from 'vuegraphx';

const unsubscribe = engine.subscribeCapabilities((snapshot: GraphCapabilitySnapshot) => {
  console.log('Current selection:', snapshot.selection);
  console.log('Available capabilities:', snapshot.capabilities);
});

engine.executeCapability('style.stroke', { color: '#ef4444' });
engine.executeCapability('resize.value', { value: 3.5 });
engine.executeCapability('animation.play');

unsubscribe();
```

### 3. Render expressions

```typescript
engine.executeCommand('function-demo', 'y = sin(x) + 0.5*cos(2*x)', '#ff0000');
engine.executeCommand('geometry-demo', 'c1 = Circle((0,0), (2,0))', '#0000ff');
```

### 4. Export / import scene documents

```typescript
import { GRAPH_SCENE_DOCUMENT_VERSION } from 'vuegraphx';

const exportResult = engine.exportScene();

if (exportResult.status === 'success' && exportResult.scene) {
  console.log('scene version:', GRAPH_SCENE_DOCUMENT_VERSION);
  console.log(JSON.stringify(exportResult.scene, null, 2));
}

const loadResult = engine.loadScene(`{
  "version": 1,
  "mode": "geometry",
  "commands": [
    { "id": "cmd_1", "expression": "A = (0,0)" },
    { "id": "cmd_2", "expression": "B = (3,4)" }
  ],
  "shapes": [],
  "relations": [
    {
      "id": "rel_1",
      "kind": "distance-assertion",
      "targets": [
        { "ownerType": "command", "ownerId": "cmd_1", "targetId": "primary" },
        { "ownerType": "command", "ownerId": "cmd_2", "targetId": "primary" }
      ],
      "params": { "expectedValue": 5 }
    }
  ]
}`);

console.log(loadResult.appliedCommands, loadResult.appliedShapes, loadResult.appliedRelations);
console.log(loadResult.diagnostics);
```

Scene v1 boundaries:

- Covers public `2d` / `3d` / `geometry` modes.
- Persists commands, explicitly serializable shapes, public relation records, and a bounded set of scene-level settings.
- `loadScene()` is replace-based, not merge-based.
- Dual-layer state, active selection, floating-panel state, playback state, and URL-share protocol are not part of the public scene contract.

### 4.1 Create geometry relations

```typescript
const created = engine.createRelation({
  kind: 'distance-assertion',
  targets: [
    { ownerType: 'command', ownerId: 'cmd_1', targetId: 'primary' },
    { ownerType: 'command', ownerId: 'cmd_2', targetId: 'primary' }
  ],
  params: {
    expectedValue: 5
  }
});

console.log(created.snapshot?.status);
console.log(engine.getRelationSnapshots());
```

Current public v1 relation kinds:

- `parallel`
- `perpendicular`
- `equal-length`
- `distance-assertion`

Current boundaries:

- v1 is an explainable relation layer, not a general CAD-style global constraint solver.
- The playground exposes a complete relation authoring panel in `geometry` mode.
- `distance-assertion` is currently point-to-point only.
- `parallel`, `perpendicular`, and `equal-length` currently evaluate and explain state changes during drag, but do not yet numerically force geometry back into compliance.

### 5. Switch to 3D mode

```typescript
engine.setMode('3d');

const view3d = engine.getView3D();
console.log('3D view is ready:', !!view3d);

engine.executeCommand('surface-demo', 'z = sin(x) * cos(y)', '#42b883');
engine.executeCommand('line-demo', 'Line((0,0,0), (1,1,1))', '#e74c3c');
```

### 5.1 Tune hidden-line 3D

```typescript
engine.setHiddenLineOptions({
  enabled: true,
  profile: 'quality',
  debug: true
});

const hiddenLineSnapshot = engine.getHiddenLineSceneSnapshot();

console.log(hiddenLineSnapshot.options.profile);
console.log(hiddenLineSnapshot.stats.renderedPathCount);
console.log(hiddenLineSnapshot.diagnostics);
```

Current guidance:

- `performance`: better for scenes where frame rate matters more than surface-edge fidelity
- `balanced`: the default recommended profile
- `quality`: better for teaching solids and scenes where surface / curve boundaries matter more

The current productized support matrix focuses on:

- `mesh`
- `polyline-set`
- sampled `curve`
- sampled `surface` / `featureCurves`
- connected 3D line / polygon / surface cases handled by the command-side adapters
- playground `cube` / `wireframe-cube`

More details: `docs/hidden-line-3d_en.md`.

### 6. Building layered / dual-layer scenes in your app

If your application needs stacked interaction layers, for example:

- a top 2D annotation layer over a 3D scene
- a bottom 2D axis/grid layer under a 3D solid scene
- whiteboards or geometry editors where empty space should pass through but shapes should still capture input

the current recommended approach is to rely on public engine primitives rather than copying playground-only code.

#### 5.1 `view3D.fitToBoard`

When the container aspect ratio changes, a fixed `view3d` rectangle can cause 3D content to be clipped near the edges. Enable:

```typescript
const engine = new GraphXEngine('box', {
  axis: false,
  showNavigation: false,
  view3D: {
    fitToBoard: true,
    rect: [[-8, -8], [16, 16], [[-5, 5], [-5, 5], [-5, 5]]],
    attributes: {
      projection: 'parallel'
    }
  }
});

engine.setMode('3d');
```

With this option enabled, the runtime keeps the `view3d` viewport synchronized with the board's actual visible region during:

- initial setup
- `resize()`
- board `boundingbox` updates

This is especially useful for responsive layouts, split panes, embeddable editors, and custom aspect ratios.

#### 5.2 `createGroup()` + `bindNativeEvent()`

In layered pass-through layouts, the bottom layer cannot always rely on JSXGraph's default hit proxying. In those cases you can bind directly to the actual render nodes of a managed group:

```typescript
const group = api.createGroup({ face, edge }, { createNativeGroup: false });

const dispose = group.bindNativeEvent('pointerdown', (member, event, node) => {
  event.preventDefault();
  console.log('hit member:', member.key, node.tagName);
}, {
  stopPropagation: true,
  passive: false
});
```

This is useful for:

- dual-layer / multi-layer pass-through layouts
- shapes that need direct `pointerdown` / `touchstart` handling
- cases where JSXGraph's default hit proxy is not enough for a composed interaction model

You can still combine it with the higher-level helpers:

- `group.onHit()` for regular hit handling
- `group.bindDrag()` for regular drag behavior
- `group.getRenderNode(key)` to inspect the actual render node of a member

### 7. About the playground dual-layer mode

Dual-layer mode is currently a playground-level composition, not a new public `EngineMode`. It demonstrates a math-software-oriented interaction model:

- one shared coordinate system where planar objects keep `z = 0` semantics
- solid objects that can be inspected through local rotation
- 2D and 3D layers that can coexist with “pass through empty space, capture actual shapes” behavior

The current implementation lives in:

- `playground/App.vue`: dual-layer entry, dual-engine mounting, and pass-through styling
- `playground/types/mode.ts`: mapping `dual-layer` to the underlying 3D engine configuration and enabling `view3D.fitToBoard`
- `playground/shapes/index.ts`: separate registration for top 2D and bottom 3D shapes
- `playground/components/DualLayerPanel.vue`: dual-layer-specific controls

## 🧠 Recommended Mental Model

The current public API is easiest to use if you think about it in this order:

1. Register your own shape definitions with `registerShape()`.
2. Create instances through `createShape()` or a drag-and-drop entry.
3. Drive toolbars and inspectors from `subscribeCapabilities()`.
4. Execute shared behavior through `executeCapability()`.
5. Use `executeCommand()` for expression-driven rendering.

Each capability descriptor exposes:

- `feature`: semantic meaning such as `resize`, `style`, or `delete`.
- `kind`: interaction model such as `action`, `toggle`, `input`, or `panel`.
- `group`: category such as `edit`, `style`, or `animation`.
- `active` / `enabled` / `meta`: runtime state, availability, and extra payload.

This lets the UI layer reason about capabilities instead of shape-specific implementation details.

## 📚 Documentation

- 📖 [Architecture Design (ARCHITECTURE_en.md)](./docs/ARCHITECTURE_en.md)
- 🛠 [Development Guide (DEVELOPMENT_en.md)](./docs/DEVELOPMENT_en.md)
- 👓 [Hidden Line 3D](./docs/hidden-line-3d_en.md)
- 📘 [API Reference (generated)](./docs/api/README.md)

To regenerate the API reference:

```bash
npm run docs:api
```

## 🏗️ Current Directory Layout

The library is organized under `src/`:

- `architecture/capabilities/`: generic capability contracts, handlers, and registry.
- `architecture/shapes/`: shape definitions, runtime infrastructure, and composable authoring helpers.
- `board/`: JSXGraph board / `view3d` lifecycle.
- `engine/`: public facade `GraphXEngine`.
- `entities/`: registration and cleanup of rendered command elements.
- `math/`: shared math scope.
- `parsing/`: text and expression parsing.
- `rendering/`: renderer, command catalog, and render handlers.
- `types/`: public engine and capability types.

Playground files directly involved in dual-layer mode:

- `playground/App.vue`: playground mode switching, dual-layer mounting, and event pass-through styling
- `playground/types/mode.ts`: playground-to-engine mode mapping and `view3D` configuration
- `playground/components/DualLayerPanel.vue`: dual-layer-specific controls and interaction hints
- `playground/shapes/wireframeCube.ts`: an example 3D shape using `createGroup()` and `bindNativeEvent()` for layered hit handling

## 🧪 Testing & Validation

```bash
npm run build
npm run test
npm run check:jsxgraph-3d
```

## 📝 Contributing

The current codebase has two primary extension paths:

- Extend expression rendering by adding or adjusting handlers under `src/rendering/handlers/` and adding coverage tests.
- Extend shape runtime behavior through `createComposedShapeDefinition()`, capability contracts, and shared shape APIs instead of hard-coding concrete shapes into the library.

See [DEVELOPMENT_en.md](./docs/DEVELOPMENT_en.md) for details.

## 📄 License

This project is licensed under the [Apache License 2.0](./LICENSE).
