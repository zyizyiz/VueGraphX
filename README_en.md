<div align="center">
  <h1>🌌 VueGraphX</h1>
  <p><strong>Next-generation interactive math & geometry visualization engine based on Vue 3 + JSXGraph</strong></p>

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

**VueGraphX** is a modern mathematics engine built for frontend development and education. It deeply integrates Vue's reactivity system with JSXGraph's underlying rendering capabilities. It provides a comprehensive solution for 2D/3D geometric construction, mathematical expression parsing (with LaTeX preprocessing support), and interactive visualization.

🌐 **Live Demo:** [https://zyizyiz.github.io/VueGraphX/](https://zyizyiz.github.io/VueGraphX/)

## ✨ Features

- 🚀 **Reactive Integration:** Natively supports Vue 3's reactivity system (optimized based on `shallowRef`), enabling data-driven updates of graphical elements.
- 📐 **Fully Automated 2D/3D Rendering:** Unified command distribution mechanism (Unified Handler System) supporting everything from 2D function graphs to complex 3D parametric surfaces.
- 📝 **Out-of-the-box LaTeX Parsing:** Automatically handles the conversion of LaTeX format input into executable mathematical expressions.
- 🧩 **High Extensibility:** Register custom renderers (Handlers) seamlessly through `RenderRegistry` to expand new math instructions without altering the core codebase.
- 🛡️ **Type Safety:** Written completely in TypeScript, providing superb type inference and auto-completion.

## 📦 Installation

It is recommended to install using npm, pnpm or yarn:

```bash
npm install vuegraphx
```

*You also need to ensure that `vue` and `jsxgraph` are installed as peer dependencies.*

## 🔨 Quick Start

### 1. Engine Initialization

```typescript
import { GraphXEngine } from 'vuegraphx';
// Import JSXGraph style if not imported globally
import 'jsxgraph/distrib/jsxgraph.css'; 

// Bind to a DOM element with defined width and height
const engine = new GraphXEngine('box', {
  boundingbox: [-5, 5, 5, -5],
  axis: true,
  showNavigation: false,
});
```

### 2. Draw 2D Function Graphs

```typescript
// Draw a 2D function directly through expressions
engine.renderer.render('2d', 'y = sin(x) + 0.5*cos(2*x)', '#ff0000');

// Draw geometric primitives (e.g. circle passing through two points)
engine.renderer.render('2d', 'c1 = Circle((0,0), (2,0))', '#0000ff');
```

### 3. Draw in 3D Space

```typescript
// Initialize 3D view (view3d will be mounted automatically inside)
const view3d = engine.board.get3DView();

// Draw explicit 3D surface
engine.renderer.render('3d', 'z = sin(x)*cos(y)', '#42b883');

// Draw a 3D spatial line
engine.renderer.render('3d', 'Line((0,0,0), (1,1,1))', '#e74c3c');
```

## 📚 Advanced Documentation

For detailed architectural instructions and secondary development guidelines, please consult:

- 📖 [Architecture Design (ARCHITECTURE_en.md)](./docs/ARCHITECTURE_en.md)
- 🛠 [Development Guideline (DEVELOPMENT_en.md)](./docs/DEVELOPMENT_en.md)

## 🏗️ Core Architecture Layering

The responsibilities of `src/core` are clearly defined to support modular invocation:

- `board/`: Lifecycle management for canvas and 3D views.
- `entities/`: Graphical elements reference pool (registration, update, and garbage collection).
- `math/`: Math domain environments, handling variables and function contexts.
- `parsing/`: LaTeX preprocessing and AST text parsing.
- `rendering/`: The core rendering dispatch mechanism and command handler list.
- `engine/`: The external Facade encapsulating the core API: `GraphXEngine`.

## 🧪 Testing & Coverage

The project is built with comprehensive unit testing and command coverage validation:

```bash
# Run full coverage tests
npm run test

# Validate whether the 3D API directory drifts after upgrading JSXGraph 
npm run check:jsxgraph-3d
```

## 📝 Contributing

PRs and Issues are welcome! Please refer to [DEVELOPMENT_en.md](./docs/DEVELOPMENT_en.md) for specific guidelines. 
When adding new instructions, it's recommended: **Do not modify the main rendering process directly**, but inherit `RenderHandler` and register it into `RenderRegistry` instead.

## 📄 License

This project is licensed under the [Apache License 2.0](./LICENSE).
