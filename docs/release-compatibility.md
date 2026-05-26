# VueGraphX Release Compatibility Gate

This document is the M6 release/compatibility preparation artifact. It defines the gate we must use before publishing npm packages, but it does **not** turn the current `dev-1.3` baseline into a release candidate. M6 remains deferred until the M0-M5 core/math/commands/backend contracts and test baseline stabilize.

## Scope and trigger

- Applies to the root `vuegraphx` package and scoped packages under `packages/*`.
- Allowed M6 preparation work: package README gaps, release verification scripts/checklists, compatibility and migration docs, exports/types verification.
- Forbidden in this slice: changing core, math, command, backend, or runtime behavior to make a release pass early.
- Trigger to run as a blocking release gate: after M0-M5 contract issues pass Code Review, QA, Final Acceptance, and Branch Land.

## Release verification gate

The full release gate is:

```bash
npm run release:verify
```

At the root package this currently expands to:

```bash
npm run verify:packages \
  && npm run typecheck \
  && npm test \
  && npm run build:packages \
  && npm run verify:package-dist \
  && npm run build \
  && npm run build:playground
```

Backend-specific subsets are allowed for faster preflight, but they do not replace the full release gate:

| Subset | Command | Use |
|---|---|---|
| Package boundary | `npm run verify:packages` | Validate package source ownership, backend peer manifests, and tsconfig alias boundaries. |
| Dist/types | `npm run build:packages && npm run verify:package-dist` | Validate generated package `dist` and declaration output. |
| Core capabilities | `npm run test:capabilities` | Validate renderer-free runtime capability contracts. |
| Backend contract | `npm run test:backend-contract` | Validate backend capability behavior for the current proof backend. |
| Cross-backend | `npm run test:cross-backend` | Validate shared command/backend contract fixtures. |

A release cannot be published unless the full gate passes, or an explicit release-manager exception documents which failing command is a pre-existing deferred M0-M5 blocker and why publication is still safe.

## Dist, types, and tarball checklist

Before publishing any scoped package:

1. Run `npm ci` from a clean checkout.
2. Run `npm run build:packages`.
3. Run `npm run verify:package-dist`.
4. For each public package, run `npm pack --dry-run --json` from its package directory.
5. Confirm the tarball contains:
   - `package.json`.
   - `dist/index.js` or the package's documented JavaScript entry point.
   - `dist/index.d.ts` matching the package `types` field.
   - Any intentionally published README/license files once package-level READMEs are added.
6. Confirm the tarball does **not** contain unintended source coupling:
   - no `src/*` source files for scoped packages whose manifest uses `files: ["dist"]`;
   - no tests, fixtures, coverage output, local scripts, or workspace-only config;
   - no backend peer dependency bundled into renderer-free packages.
7. Confirm `package.json` `exports` / `types` / `files` are consistent with the tarball.

Current expected scoped-package manifest shape:

| Package class | Expected published files | Renderer peer dependency rule |
|---|---|---|
| `@vuegraphx/core` | `dist/*`, `package.json` | No renderer, Vue, DOM, Canvas, Babylon, JSXGraph, Pixi, Fabric, Konva, or Three dependency. |
| `@vuegraphx/math` | `dist/*`, `package.json` | Math-only dependencies are allowed; no renderer peer. |
| `@vuegraphx/commands` | `dist/*`, `package.json` | May depend on `@vuegraphx/core` and `@vuegraphx/math`; no renderer peer. |
| `@vuegraphx/backend-*` | `dist/*`, `package.json` | Renderer package is optional/peer-owned by the backend package only. |
| `@vuegraphx/vue` | `dist/*`, `package.json` | Vue peer stays on the Vue integration package, not on core/math/commands. |

## Consumer install smoke tests

Release verification must prove that renderer-free consumers can install only the packages they need:

```bash
tmpdir=$(mktemp -d)
cd "$tmpdir"
npm init -y
npm install /path/to/VueGraphX/packages/core/*.tgz \
  /path/to/VueGraphX/packages/math/*.tgz \
  /path/to/VueGraphX/packages/commands/*.tgz
node -e "import('@vuegraphx/core'); import('@vuegraphx/math'); import('@vuegraphx/commands');"
npm ls vue jsxgraph @babylonjs/core pixi.js fabric konva three --depth=0 || true
```

Expected result:

- `@vuegraphx/core` installs without dependencies or renderer peers.
- `@vuegraphx/math` installs with only math-kernel dependencies such as `mathjs`.
- `@vuegraphx/commands` installs with only `@vuegraphx/core` and `@vuegraphx/math` dependencies.
- Installing core/math/commands does not pull Vue, JSXGraph, Babylon, Pixi, Fabric, Konva, or Three.

Backend smoke tests should install the target backend package plus its renderer peer explicitly, for example `@vuegraphx/backend-jsxgraph` + `jsxgraph`. Backend peers must not leak into the renderer-free package set.

## Semver and compatibility policy

M6 must not freeze long-term APIs before M0-M5 are stable. Once the release gate is activated, apply this policy:

| Surface | Patch | Minor | Major |
|---|---|---|---|
| Core IR and scene documents | Bug fixes, stricter diagnostics, non-breaking metadata additions. | Add object families, optional fields, new diagnostics, new capability kinds with fallback behavior. | Remove/rename fields, change canonical semantics, change document version without migration. |
| Math APIs | Fix incorrect numeric/symbolic results; improve tolerance handling without changing valid inputs. | Add functions, typed result variants, diagnostics, or optional parameters. | Change return shapes, diagnostic codes, tolerance defaults, or accepted input semantics incompatibly. |
| Command DSL | Fix parser/compiler bugs for documented syntax. | Add commands, aliases, examples, warnings, and metadata. | Remove commands/aliases, change parse meaning, or change emitted IR incompatibly. |
| Backend capabilities | Fix renderer projection bugs while preserving declared capability behavior. | Add supported capability/object families or richer diagnostics. | Downgrade/remove declared support or change backend capability contract semantics. |
| Root `vuegraphx` compatibility API | Fix adapters and docs for existing imports. | Add migration helpers and deprecation warnings. | Remove legacy root APIs after the published deprecation window. |

Deprecation rules:

1. New canonical APIs must live in the owning scoped package first.
2. Root `vuegraphx` may re-export or adapt stable scoped APIs for compatibility.
3. Deprecated root APIs require a migration target, warning text, and at least one minor-release window before removal.
4. Backend capability downgrades require a major release unless the capability was explicitly marked experimental.
5. Release notes must list all semver-relevant changes by surface.

## Root `vuegraphx` migration guide skeleton

Current root imports are compatibility-first:

```ts
import { GraphXEngine } from 'vuegraphx';
```

Preferred post-contract imports should move to package-owned surfaces:

```ts
import type { GraphSceneDocument } from '@vuegraphx/core';
import { evaluateExpression } from '@vuegraphx/math';
import { compileCommand } from '@vuegraphx/commands';
// backend packages are installed only when the consumer chooses that renderer
```

Migration steps for consumers:

1. Identify which responsibility the code uses: core scene/runtime, math computation, command DSL, backend rendering, or Vue integration.
2. Replace root imports with the owning scoped package when that scoped API is stable.
3. Install only needed renderer backend packages and their peer dependencies.
4. Keep root `vuegraphx` imports only for legacy engine compatibility while migration is in progress.
5. During the deprecation window, follow root warnings and update release notes before the major version that removes compatibility shims.

Package README gaps to fill before a real M6 release:

| Package | README gap |
|---|---|
| `@vuegraphx/core` | Core scene document, capability, backend contract, and renderer-free examples. |
| `@vuegraphx/math` | Function/geometry API examples, typed results, numeric tolerance and diagnostics. |
| `@vuegraphx/commands` | DSL syntax, catalog, symbol table, diagnostics, and emitted IR examples. |
| `@vuegraphx/backend-*` | Renderer peer installation, declared capabilities, unsupported diagnostics, and minimal usage. |
| `@vuegraphx/vue` | Vue integration setup and how it composes scoped core/backend packages. |
| Root `vuegraphx` | Compatibility status, deprecation timeline, migration map, and release policy link. |

## Current M6 status

This document is a prepared gate/checklist, not a release approval. Known current blocker: full `npm run release:verify` can fail while M0-M5 contracts/tests are still being reconciled. That failure must remain visible as a pre-release blocker; it must not be patched in this M6 documentation slice by changing core/math/commands/backend/runtime behavior.
