# 🛠 Development and Contribution Guide

**English** | [简体中文](./DEVELOPMENT.md)

Thank you for your interest and contributions to the open-source project VueGraphX. To maintain high quality and stability of the project, developers attempting to participate in core code contribution or secondary feature development are highly encouraged to consult this document.

## Prerequisite Environment Setup

1. **Node.js**: Please use version 18.x or higher.
2. **Package Manager**: This project uses `npm` to manage the dependency tree.

```bash
git clone https://github.com/zyizyiz/VueGraphX.git
cd VueGraphX
npm install
```

## Available Source Scripts

Comprehensive testing and build instructions are defined within `package.json`:

- `npm run dev`: Starts the local development server referencing the `playground` components (based on Vite) for intuitive preview and debug.
- `npm run build`: Executes production packaging for the core classes (Core Engine), outputting to the `dist/` compilation directory.
- `npm run build:playground`: Packages the Playground specifically for Github Pages live demo deployment.
- `npm run test`: Runs全 full unit tests via `vitest`.
- `npm run test:watch`: Listens and triggers tasks for real-time testing during development phases.
- `npm run check:jsxgraph-3d`: Targetingly validates underlying 3D API drifts caused by upstream `jsxgraph` updates.

## 🚀 Core Rendering Handler Specifications

If you plan to **add support for a new mathematical instruction command**, please abide by the following standards:

### 1. Refuse Hardcoding in Main Logic
The core rendering main method `Renderer.render` is not permitted to be directly appended with specific instruction logic. All custom rendering tasks MUST be extended utilizing the Handler pattern.

### 2. Creating Custom Handlers
Establish your class file under `src/core/rendering/handlers`:

```typescript
import type { RenderContext, RenderHandler } from '../types';

export class CustomFeatureHandler implements RenderHandler {
  // Define high priority to ensure it triggers before wildcards handlers
  priority = 100;

  supports(ctx: RenderContext): boolean {
    // Determine a match according to ctx.expression or ctx.mode
    return ctx.expression.startsWith('MyFeature');
  }

  handle(ctx: RenderContext) {
    // 1. Perform parameter extraction specifically
    // 2. Extensively utilize ctx.board.create to instantiate graphical elements
    // 3. Always return an array of JSXGraph elements, or null in case of parameter misconducts
    return [ /* JSXGraph Elements */ ];
  }
}
```

### 3. Handler Registering
Inside `src/core/rendering/createDefaultRegistry.ts`, import and register your newly introduced handler securely:

```typescript
import { CustomFeatureHandler } from './handlers/CustomFeatureHandler';

export function createDefaultRegistry(): RenderRegistry {
  const registry = new RenderRegistry();
  // Remember to register sequentially matching the priority execution stream
  registry.register(new CustomFeatureHandler());
  // ... other core handlers
  return registry;
}
```

## 🧪 Coverage Testing Requirement

Every time new rendering support functionality is added, comprehensive fallback tests matching its case must be provided alongside it.

Please browse to `src/core/rendering/coverage/instructionCases.ts` and attach the respective mock verification execution:

```typescript
{
  name: "Custom Featured Showcase",
  mode: "2d", // or "3d"
  expression: "MyFeature((1,2), (3,4))",
  expectedHandler: CustomFeatureHandler.name, // To ensure it is correctly resolved by your Handler
  expectedElementName: "MyFeature" 
}
```
If passing by executing `npm run test`, it proves the instruction can now be accurately distributed with sufficient regression coverage guarantees.

## Commit Message Guidelines

This project conforms to standard open-source branch operations. Using the following conventional Git Commit Prefix Message configurations are strongly advocated:
- `feat:` Adds a new feature
- `fix:` Patches a bug
- `docs:` Documentation additions or modifications
- `refactor:` Code refactoring (doesn't alter API logic rules)
- `test:` Appends unit testing procedures

We await eagerly for your Pull Requests!
