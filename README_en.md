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

The playground also includes an experimental mixed mode:

- 2D objects are treated as content living on the `z = 0` work plane.
- Solid objects share the same coordinate system but rotate only at the object level, without rotating the global axes.
- A fixed front-facing `view3d` hosts the 3D scene while an independent 2D axis/grid layer is rendered underneath to mimic math-software-style “plane + solid in one system” behavior.

That makes it suitable both as a standalone rendering engine and as the runtime layer of an interactive geometry editor, education tool, or custom whiteboard.

🌐 Live Demo: [https://zyizyiz.github.io/VueGraphX/](https://zyizyiz.github.io/VueGraphX/)

## ✨ Features

- 🚀 Capability-first interaction: external UI subscribes with `subscribeCapabilities()` and triggers behavior with `executeCapability()` instead of learning one API per shape.
- 🧩 Composable shape authoring: build local shapes with `createComposedShapeDefinition()`, `GraphShapeApi`, and `GraphShapeContext`.
- 🎬 Shared runtime utilities: animation tracks, point annotations, hit groups, drag helpers, and screen projection helpers are reusable across shapes.
- 📐 Unified 2D / 3D entry point: expression rendering and `view3d` lifecycle are managed through the same engine facade.
- 🧪 Experimental playground mixed mode: built on top of engine `3d` mode, but organized around a `z = 0` work plane plus object-local solid rotation.
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

### 4. Switch to 3D mode

```typescript
engine.setMode('3d');

const view3d = engine.getView3D();
console.log('3D view is ready:', !!view3d);

engine.executeCommand('surface-demo', 'z = sin(x) * cos(y)', '#42b883');
engine.executeCommand('line-demo', 'Line((0,0,0), (1,1,1))', '#e74c3c');
```

### 5. About the playground mixed mode

Mixed mode is currently a playground-level composition, not a new public `EngineMode`. It demonstrates a math-software-oriented interaction model:

- one shared coordinate system where planar objects keep `z = 0` semantics
- solid objects that can be inspected through local rotation
- an independent 2D axis/grid layer instead of treating axes as ordinary 3D scene elements

The current implementation lives in:

- `playground/App.vue`: mixed-mode entry and mode switching
- `playground/types/mode.ts`: mapping `mixed` to engine `3d` mode plus fixed-view `view3D` configuration
- `playground/composables/useMixedModeScene.ts`: `z = 0` work plane, cube scene, and 2D bottom axis/grid layer
- `playground/components/MixedModePanel.vue`: mixed-mode-specific controls

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

Playground files directly involved in mixed mode:

- `playground/App.vue`: playground mode switching and mixed panel mounting
- `playground/types/mode.ts`: playground-to-engine mode mapping and board configuration
- `playground/composables/useMixedModeScene.ts`: mixed scene, 2D coordinate layer, object-level rotation, and interaction scheduling
- `playground/components/MixedModePanel.vue`: mixed-mode visibility and pose controls

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
