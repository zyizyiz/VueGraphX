# VueGraphX Renderer-Agnostic Math Graph System Roadmap

## Goal

VueGraphX must become a renderer-agnostic npm ecosystem for mathematical graphics and mathematical computation, not a JSXGraph wrapper.

The target package responsibilities are:

- `@vuegraphx/core`: owns scene documents, viewport, graph objects, relations, capabilities, picking, dragging, layer pass-through, runtime state, diagnostics, and backend contracts.
- `@vuegraphx/math`: owns an independent math kernel that is usable without Vue, JSXGraph, Canvas, Babylon, or DOM. It should cover secondary-school and common undergraduate-facing math: functions, equations, inequalities, analytic geometry, plane geometry, solid geometry, vectors, trigonometry, sequences, probability/statistics, derivatives/basic calculus, parametric curves, implicit curves, geometric construction, and object relations.
- `@vuegraphx/commands`: owns a JSXGraph/GeoGebra-like command DSL that compiles into VueGraphX core IR with no renderer side effects.
- Backend packages (`@vuegraphx/backend-jsxgraph`, `@vuegraphx/backend-canvas2d`, `@vuegraphx/backend-babylon`, and future Pixi/Fabric/Konva/Three backends): remain replaceable renderers behind the same backend contract.
- `vuegraphx` and `@vuegraphx/vue`: stay compatibility/integration surfaces, not the source of renderer truth.

## Current baseline from `dev-1.3`

Verified on branch `agent/ceo/717e79c5` from `origin/dev-1.3`:

- Package boundaries exist for `core`, `math`, `commands`, `vue`, JSXGraph, Canvas2D, Babylon, Pixi, Fabric, Konva, and Three.
- `scripts/verify-package-boundaries.mjs` verifies package-owned source roots, backend peer dependency manifests, and `tsconfig` aliases.
- `@vuegraphx/core` already contains runtime contracts, scene documents, backend registry, event routing, capability model/executor, and drag operations.
- `@vuegraphx/math` already contains `MathScope`, geometry, functions, solids, and kernel tests, but is still not a complete curriculum-level math kernel.
- `@vuegraphx/commands` compiles a starter command DSL into core IR and has compiler tests.
- JSXGraph, Canvas2D, and Babylon backend packages have real source; Pixi/Fabric/Konva/Three are package-boundary placeholders.
- Root `README.md` still presents the project as Vue 3 + JSXGraph, so public positioning is behind the intended architecture.

## Non-negotiable architecture rules

1. Core scene state is canonical; no backend object should become the source of truth.
2. Math computations live in `@vuegraphx/math`; backend adapters may render evaluated results but must not own symbolic/geometric semantics.
3. Command DSL compiles to typed IR first; renderers consume IR through the core runtime/backend contract.
4. Each backend must be optional by peer dependency and must be swappable at runtime or integration boundary.
5. Capability execution, picking, dragging, selection, diagnostics, and layer pass-through must behave the same at the core API level across backends.
6. Legacy root APIs may remain for compatibility, but new features land in package-owned source first.
7. Tests must include renderer-free unit tests plus at least one cross-backend contract test for every shared behavior.

## M0 architecture intake matrix

This section is the M0 intake artifact for subsequent implementation issues. It records package ownership, dependency direction, priority tiers, feature/capability coverage, and the evidence format that every milestone must report before entering review.

### Package ownership and dependency direction

| Package / surface | Owns | May depend on | Must not depend on / become |
|---|---|---|---|
| `@vuegraphx/core` | Scene documents, viewport, graph object IR, relations, capabilities, diagnostics, picking/drag/layer pass-through contracts, backend adapter contracts. | Renderer-free shared types/utilities. | JSXGraph, Canvas2D, Babylon, Vue, DOM, or any backend object as semantic truth. |
| `@vuegraphx/math` | Renderer-free math kernel: typed results, tolerance, domain errors, numeric diagnostics, geometry/formula helpers. | Math libraries and renderer-free shared type contracts only. | Vue/DOM/backend imports; backend-specific objects; a full CAS commitment in the first implementation slice. |
| `@vuegraphx/commands` | Command catalog, aliases, arity/type metadata, parser/compiler, symbol table, command diagnostics. | `@vuegraphx/core` IR contracts and public `@vuegraphx/math` APIs. | Direct JSXGraph/Canvas/Babylon calls; 100% GeoGebra/JSXGraph syntax compatibility as an M0-M3 promise. |
| `@vuegraphx/backend-*` | Projection from core IR/math typed results into renderer-specific objects; declared capability implementation. | `@vuegraphx/core` contracts and public math results. | Source of truth for scene semantics; silent no-op on unsupported capability. |
| `vuegraphx` / `@vuegraphx/vue` | Compatibility and Vue integration surface, examples, consumer ergonomics. | Stable scoped packages and selected backend integrations. | Canonical owner of core/math/command/backend semantics. |

Dependency direction: `core contracts -> math typed results -> commands IR -> backend adapters -> vue/root integration`. Backends consume declarations; they do not define architecture. If shared diagnostic/type definitions are needed between math and core, they should be kept renderer-free and reviewed during M1/M2 rather than introduced ad hoc.

### Priority tiers for roadmap execution

| Tier | Scope | Rationale |
|---|---|---|
| P0 | Renderer-agnostic positioning; core IR/capability diagnostics; renderer-free math typed results for a first algebra/analytic geometry slice; command IR foundation; JSXGraph/Canvas2D/Babylon declared capability parity for selected object families; evidence format. | Establishes the architecture contract and prevents further JSXGraph-wrapper drift. |
| P1 | Shared picking/drag/layer pass-through runtime; broader command catalog; backend parity expansion; migration/compatibility docs for root APIs. | Builds interactive parity after the core contract is stable. |
| P2 | Pixi/Fabric/Konva/Three production adapters; full curriculum-level math expansion; release hardening/semver/API docs after contracts stabilize. | Valuable extensions, but risky to promise before P0/P1 contract slices are proven. |

### Feature / capability matrix

| Area | Current baseline | P0 target | Later targets | Evidence required |
|---|---|---|---|---|
| Public positioning | README now names renderer-agnostic goals; older examples still mention JSXGraph as an available renderer/style dependency. | Root docs clearly say VueGraphX is not a JSXGraph wrapper and link this roadmap. | Package-level README/API docs per public package. | README/README_en diff or explicit no-diff evidence. |
| Package responsibility | Scoped packages exist for core/math/commands/vue/backends. | Ownership table and dependency direction are documented before implementation. | Automated import-boundary checks stay green for new packages. | M0 matrix + `npm run verify:packages`. |
| Core scene/capability contract | Core has runtime contracts, scene documents, capability model/executor, event routing, drag operations. | M1 issue must harden IR + typed diagnostics before backend/runtime work. | Full object family coverage and cross-backend contract fixtures. | Renderer-free round-trip + capability diagnostic tests. |
| Math kernel | Math package has functions/geometry/solids/tests but is not complete curriculum coverage. | First math slice returns stable typed results with tolerance/domain diagnostics and no renderer imports. | Broader algebra, analytic geometry, plane/solid geometry, trigonometry, statistics, calculus, curves, relation solving. | Renderer-free math unit tests with numeric tolerance and edge cases. |
| Command DSL | Starter compiler exists. | Catalog/symbol/diagnostics foundation compiles only to core IR. | Wider JSXGraph/GeoGebra-like command families and migration aliases where practical. | Compiler success + diagnostic tests; no renderer imports. |
| Backend adapters | JSXGraph/Canvas2D/Babylon have real source; Pixi/Fabric/Konva/Three are placeholders. | Declared P0 object families render consistently across supported JSXGraph/Canvas2D/Babylon capabilities. | Additional production backends after locked capability matrix. | Shared backend contract tests + typed unsupported diagnostics. |
| Interaction runtime | Capability/picking/drag/layer primitives exist in core areas. | M5 waits for M1/M4 contracts; memory + Canvas2D + one DOM backend use the same fixture. | Rich relation-aware interaction, layer pass-through, handles, measurements. | Cross-backend interaction contract tests, not DOM-only assertions. |
| Release / compatibility | Package verification scripts exist. | M6 remains post-contract; no early semver/API lock-in. | Release verify, dist/types checks, migration/deprecation guide. | `npm run release:verify` or scoped release gate when M6 starts. |

### M4 backend capability matrix

This matrix records the first backend parity vertical slice. It is intentionally narrower than the full roadmap: shared contract tests cover representative P0 object families and require typed diagnostics for object families that a backend declares as unsupported or partial.

Status legend:

- Supported: `create()` returns an ok core handle with no renderer object leakage.
- Partial: `create()` returns `ok: false` with a `backend.partial-support` warning diagnostic.
- Unsupported: `create()` returns `ok: false` with a `backend.unsupported-object` error diagnostic.
- Placeholder: package boundary exists, but it is not counted as contract support.

| Backend | Tier | Declared runtime capabilities | P0/P1 object-family status in shared contract tests | Known gaps |
|---|---|---|---|---|
| Memory fixture | Test-only | pick, project, unproject, drag, layers, 2D | Point, solid, and implicit fixtures are accepted to prove renderer-free source compatibility. | Not a production renderer; no visual output guarantee. |
| JSXGraph | P0/P1 | pick, project, unproject, drag, layers, 2D and 3D | Point and stable 2D geometry/function/vector/measurement families are supported. Solids, implicit curves, and parametric curves return partial-support diagnostics. | JSXGraph remains renderer-owned only; it must not become math/core truth. Broader curve and 3D parity still needs later slices. |
| Canvas2D | P0/P1 | pick, project, unproject, drag, layers, 2D | Point and stable 2D drawable geometry/function/vector/measurement families are supported. Solids return partial-support diagnostics. Implicit curves return unsupported diagnostics. | Canvas2D is the 2D proof backend and still lacks production export hooks and broader curve sampling. |
| Babylon | P0/P1 | pick, project, unproject, drag, layers, 3D | Solids are supported. Point and implicit-curve fixtures return unsupported diagnostics because they are outside the current 3D solid slice. | Curves, surfaces, measurements, drag handles, and richer material/camera controls remain later Babylon parity work. |
| Pixi | P2 | Placeholder package boundary only | Not in the shared contract PASS set. | Experimental until a retained 2D adapter is implemented with typed diagnostics. |
| Fabric | P2 | Placeholder package boundary only | Not in the shared contract PASS set. | Experimental until object-editing canvas workflows are implemented with typed diagnostics. |
| Konva | P2 | Placeholder package boundary only | Not in the shared contract PASS set. | Experimental until retained Canvas layers/events are implemented with typed diagnostics. |
| Three | P2 | Placeholder package boundary only | Not in the shared contract PASS set. | Experimental until alternative 3D rendering/raycasting is implemented with typed diagnostics. |

Every unsupported or partial result in the shared contract tests must include a typed diagnostic target with `scope: object`, `objectId`, `backendId`, and `layerId`. This prevents silent no-op behavior and keeps the same scene/command source switchable across backends where the target capability is supported.

### Required evidence format for milestone comments

Every M0-M6 milestone result must include:

1. Requirement mapping: which Discovery/Architecture clause is covered and which non-goals remain out of scope.
2. Change scope: changed files plus explicit confirmation that forbidden package/source areas were not touched.
3. Test evidence: exact command(s), result, and failure logs if the environment prevents execution.
4. Diagnostics evidence where relevant: typed unsupported/partial/domain errors, not silent no-ops.
5. Review routing: Code Review Gate before QA; no direct parent issue merge/done from implementation.
6. Three-line retrospective: waste observed, prevention rule, whether process/agent/skill updates are needed.

## Milestone plan

### M0 — Governance and public positioning

**Outcome:** the repository clearly communicates that VueGraphX is renderer-agnostic.

Tasks:

1. Update `README.md` / `README_en.md` from “Vue 3 + JSXGraph” to “renderer-agnostic math graph engine,” with JSXGraph listed as one backend.
2. Add package architecture docs covering dependency direction and which package owns each concern.
3. Add a feature matrix for math, DSL, runtime, and backend parity.
4. Add roadmap checkboxes for release readiness.

Acceptance criteria:

- Root docs no longer describe JSXGraph as the defining architecture.
- New contributors can identify where to implement math, commands, core runtime, and backend rendering.
- `npm run verify:packages` remains green.

### M1 — Core contract hardening

**Outcome:** `@vuegraphx/core` can model all renderer-neutral graph state required by the roadmap.

Tasks:

1. Extend typed scene object IR for points, lines, segments, rays, polygons, conics, text, function plots, parametric curves, implicit curves, vectors, transformations, measurements, and solids.
2. Normalize viewport and coordinate systems for 2D, 2.5D dual-layer, and 3D scenes.
3. Make relation snapshots first-class and serializable, including dependencies and invalidation.
4. Define backend capability contract for create/update/delete, picking, drag, layer pass-through, hit groups, style projection, and diagnostics.
5. Add compatibility adapters from legacy root engine objects into core scene documents.

Acceptance criteria:

- Scene export/import round-trips every core object type without a backend.
- Capability executor tests cover success, unsupported, partial-support, and diagnostics paths.
- Backend contract tests can run against in-memory, Canvas2D, JSXGraph, and Babylon adapter fixtures.

### M2 — Independent math kernel coverage

**Outcome:** `@vuegraphx/math` is a useful math computation package without any renderer dependency.

Task groups:

1. Algebra/function basics: expression parse/evaluate, simplification wrappers, equations, inequalities, domains/ranges, intersections, roots, extrema.
2. Analytic geometry: point/line/segment/ray/circle/conic formulas, distance, angle, projection, tangent/normal, locus helpers.
3. Plane geometry construction: perpendicular/parallel, midpoint, angle bisector, polygon metrics, circle through points, transformations.
4. Solid geometry and vectors: vector algebra, planes, lines in 3D, polyhedra metrics, intersections, projection to 2D views.
5. Trigonometry/sequences/statistics/calculus: common identities, sequence generation/sums, descriptive statistics/probability distributions, derivative/basic integral helpers, tangent/normal curve utilities.
6. Curves: parametric and implicit curve sampling, adaptive refinement, singularity/discontinuity diagnostics, bounding boxes.
7. Relation solver: explainable validation for parallel/perpendicular/equal length/tangent/incidence constraints.

Acceptance criteria:

- Every module has renderer-free tests with numeric tolerance and edge-case diagnostics.
- Math APIs expose stable typed results, not backend-specific objects.
- Commands and backends consume math through public `@vuegraphx/math` exports only.

### M3 — GeoGebra/JSXGraph-level command DSL

**Outcome:** `@vuegraphx/commands` can express common mathematical constructions and compile them into core IR.

Tasks:

1. Create a command catalog with aliases, arity, parameter types, examples, and backend support metadata.
2. Implement parser/compiler coverage for point, line, segment, ray, polygon, circle, conic, angle, vector, function, parametric curve, implicit curve, transformation, measurement, and solid commands.
3. Add symbol table and dependency tracking so command outputs can reference prior objects.
4. Add diagnostics for ambiguous commands, invalid references, domain errors, and backend unsupported features.
5. Provide migration aliases for JSXGraph-like syntax and GeoGebra-like syntax where practical.

Acceptance criteria:

- DSL compiler test suite covers both success and diagnostic cases per command family.
- DSL emits core IR only; it does not call JSXGraph/Babylon/Canvas APIs.
- The command catalog can drive playground examples and documentation.

### M4 — Backend parity and adapter migration

**Outcome:** renderer backends are replaceable for their supported capabilities.

Tasks:

1. Finish JSXGraph adapter migration for remaining legacy renderer handlers; legacy root renderer becomes compatibility-only.
2. Promote Canvas2D from contract fixture to production 2D backend with picking, dragging, styles, text, axes/grid, and export hooks.
3. Expand Babylon into a complete 3D mathematical backend: solids, curves/surfaces, ray picking, drag handles, measurements, and diagnostics.
4. Turn Pixi/Fabric/Konva/Three placeholders into minimal real adapters in priority order:
   - Pixi: high-performance retained 2D rendering.
   - Konva: retained Canvas layers/events.
   - Fabric: object-editing canvas workflows.
   - Three: alternative 3D rendering/raycasting.
5. Maintain backend capability matrices so unsupported features fail gracefully with diagnostics.

Acceptance criteria:

- Shared backend contract tests pass for each backend’s declared capabilities.
- Playground can switch backends without changing scene/command source for supported objects.
- Unsupported backend features return typed diagnostics, not silent no-ops.

### M5 — Interaction runtime: picking, drag, relations, layers

**Outcome:** interactive behavior is defined once in core and projected through backend adapters.

Tasks:

1. Implement core picking pipeline with hit groups, z/layer ordering, pass-through rules, hover/selection state, and diagnostics.
2. Implement drag operations for points, constrained points, relation-driven objects, 2D objects in 3D plane, and 3D handles.
3. Add relation-aware invalidation/recompute so dependent objects update predictably.
4. Normalize keyboard/pointer/touch events through core event router.
5. Add layered rendering passes for background grid/axes, main objects, annotations, selection handles, overlays, and measurement labels.

Acceptance criteria:

- Same scene interaction tests pass against memory/Canvas2D and at least one DOM backend fixture.
- Relation constraints explain why an operation succeeded, was clamped, or failed.
- Layer pass-through behavior is testable without relying on DOM implementation details.

### M6 — Packaging, release, and compatibility

**Outcome:** package publication is reliable and consumer migration is safe.

Tasks:

1. Keep `npm run release:verify` as the release gate; add backend-specific subsets for faster CI.
2. Add package README files and examples for each public package.
3. Add compatibility guide from root `vuegraphx` APIs to scoped packages.
4. Add semver policy for core IR, math APIs, command DSL, and backend capabilities.
5. Add docs-generated API reference per package.

Acceptance criteria:

- `npm run release:verify` passes before release.
- Package tarballs expose expected dist/types and no unintended source coupling.
- Consumers can install only core/math/commands without renderer dependencies.

## Suggested Multica implementation breakdown

Use small vertical slices. Avoid parallel agents editing the same core files in the same round.

1. **Docs/positioning slice** — update public README and add architecture matrix.
   - Owner: product/docs + technical lead.
   - Verify: docs diff + `npm run verify:packages`.
2. **Core IR object family slice** — add one object family at a time, starting with conics/curves.
   - Owner: core engineer.
   - Verify: renderer-free round-trip tests.
3. **Math kernel family slice** — implement one curriculum family at a time.
   - Owner: math engineer.
   - Verify: unit tests with numeric tolerance and edge cases.
4. **Command family slice** — add DSL commands for the matching math/core family.
   - Owner: command DSL engineer.
   - Verify: compiler tests + diagnostics.
5. **Backend parity slice** — wire the same family into JSXGraph/Canvas2D/Babylon as applicable.
   - Owner: backend engineer per backend.
   - Verify: shared backend contract tests.
6. **Interaction slice** — add picking/drag/layer behavior only after core object and backend support exist.
   - Owner: runtime engineer.
   - Verify: cross-backend behavior tests.
7. **Release slice** — package docs, dist verification, compatibility notes.
   - Owner: release engineer.
   - Verify: `npm run release:verify`.

## Dependency graph

```text
Package architecture docs
  -> Core IR/backend contract
    -> Math kernel typed outputs
      -> Command DSL typed IR
        -> Backend adapters
          -> Playground backend switching
            -> Release verification and public docs
```

Interactions (`picking`, `drag`, `layer pass-through`) depend on both core contract and at least one backend fixture, so they should not be implemented before the relevant object families are represented in core.

## Immediate next recommended issues

1. **Reposition docs and architecture matrix**: update README/README_en and add package dependency/feature matrix.
2. **Math kernel M2-A algebra + analytic geometry**: domains, roots/intersections, line/circle/conic formulas, diagnostics.
3. **Command DSL M3-A catalog + symbol table**: command metadata, aliases, dependency references, diagnostics.
4. **Core/backend M1/M4-A conics and curves parity**: core IR + JSXGraph/Canvas2D support + tests.
5. **Babylon M4-B 3D math backend parity**: typed solids/curves/surfaces, ray picking, diagnostics.
6. **Runtime M5-A shared picking/drag contract**: memory fixture + Canvas2D + DOM backend contract tests.

## Verification performed for this roadmap

Commands run from repository root:

```bash
npm install
npm run verify:packages
npm run test:cross-backend
npm run test:capabilities
```

Result:

- Package boundary verification passed.
- Cross-backend/command tests passed: 2 files, 14 tests.
- Core runtime capability tests passed: 1 file, 10 tests.

## Three-line retrospective

- Waste observed: the roadmap-level request was broad enough that direct development would have caused scope creep and conflicting edits.
- Prevention rule: convert broad architecture goals into milestone slices with explicit package ownership and cross-backend acceptance tests before assigning implementation agents.
- Process update needed: future VueGraphX roadmap issues should attach this document or a narrower milestone slice before entering implementation.
