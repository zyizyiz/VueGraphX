import { describe, expect, it } from 'vitest';
import {
  createSubjectDynamicPointModel,
  SUBJECT_DYNAMIC_POINT_DEFAULT_COLOR,
  SUBJECT_DYNAMIC_POINT_DEFAULT_RADIUS_PX,
  SUBJECT_OVERLAY_DEFAULT_ANNOTATION_COLORS,
  SUBJECT_OVERLAY_DEFAULT_DASH_STROKE_COLOR,
  SUBJECT_OVERLAY_DASH_PATTERN,
  SUBJECT_OVERLAY_DASH_STROKE_WIDTH
} from '@vuegraphx/math';
import {
  STANDARD_GEOMETRY_ANNOTATION_UI,
  STANDARD_GEOMETRY_MARKER_UI
} from '@vuegraphx/core';
import {
  alignOperationCoordinateSystemOriginToGrid,
  createOperationAuxiliaryConstructionCommands,
  createOperationAuxiliaryConstructionTarget,
  createOperationDynamicPointCommands,
  createOperationDynamicPointDescriptor,
  createOperationDynamicPointFunctionCommand,
  clampOperationCoordinateSystemOrigin,
  getOperationCoordinateSystemAxisRangeAbs,
  createOperationIndependentTriangleCommands,
  createOperationShapeEditCommands,
  createOperationShapeEditTarget,
  createOperationShapeEditVertexCommand,
  createOperationToolCommands,
  createOperationScopedCommands,
  findOperationToolById,
  formatOperationPointTuple,
  isOperationPointInsideCoordinateSystem,
  OPERATION_DYNAMIC_POINT_FUNCTION_COLOR,
  OPERATION_DYNAMIC_POINT_FUNCTION_EXPRESSION,
  OPERATION_SHAPE_EDIT_DEFAULT_SNAP,
  operationToolGroups,
  resolveOperationCommandOrigin,
  resizeOperationCoordinateSystemAxisRange,
  setOperationCoordinateSystemAxisRangeAbs,
  setOperationCoordinateSystemRuntimeOptions,
  updateOperationCoordinateSystemOrigin
} from './operationTools';

describe('resolveOperationCommandOrigin', () => {
  it('places clicked operation tools at the current viewport center', () => {
    expect(resolveOperationCommandOrigin(
      null,
      { width: 600, height: 420 },
      { left: -10, right: 10, top: 7, bottom: -7 }
    )).toEqual({ x: 0, y: 0 });
  });

  it('maps dragged operation tools to the drop point in world coordinates', () => {
    expect(resolveOperationCommandOrigin(
      { x: 450, y: 105 },
      { width: 600, height: 420 },
      { left: -10, right: 10, top: 7, bottom: -7 }
    )).toEqual({ x: 5, y: 3.5 });
  });

  it('clamps operation coordinate-system origins so the full coordinate window stays visible', () => {
    expect(clampOperationCoordinateSystemOrigin(
      { x: 10, y: -10 },
      { left: -10, right: 10, top: 10, bottom: -10 }
    )).toEqual({ x: 4, y: -4 });
    expect(clampOperationCoordinateSystemOrigin(
      { x: -10, y: 10 },
      { left: -10, right: 10, top: 10, bottom: -10 }
    )).toEqual({ x: -4, y: 4 });
  });
});

describe('updateOperationCoordinateSystemOrigin', () => {
  it('snaps initial operation coordinate-system origins to the operation grid', () => {
    const commands = createOperationScopedCommands([
      { expr: 'Function("x", -5, 5)' }
    ], { x: 2.25, y: -1.6 }, 'coord_snap');

    expect(commands.map((command) => (command.options?.coordinateSystem as any)?.origin)).toEqual([
      { x: 2, y: -2 },
      { x: 2, y: -2 }
    ]);
    expect((commands[0].options?.coordinateSystem as any)?.snapToGrid).toEqual({ enabled: true, phase: 'end' });
  });

  it('keeps bounded operation coordinate-system origins on the nearest valid grid point', () => {
    const bounds = { left: -9.5, right: 10.5, top: 10.5, bottom: -9.5 };

    expect(alignOperationCoordinateSystemOriginToGrid({ x: 4.7, y: 0.2 }, bounds)).toEqual({ x: 4, y: 0 });
    expect(createOperationScopedCommands([
      { expr: 'Function("x", -5, 5)' }
    ], { x: 4.7, y: 0.2 }, 'coord_bounded', bounds)
      .map((command) => (command.options?.coordinateSystem as any)?.origin)).toEqual([
      { x: 4, y: 0 },
      { x: 4, y: 0 }
    ]);
  });

  it('persists dragged operation coordinate-system origins across every scoped command', () => {
    const commands = createOperationScopedCommands([
      { expr: 'Function("x", -5, 5)', options: { strokeColor: '#4DA6FF' } },
      { expr: 'Equation("x^2 + y^2 = 4")', options: { strokeColor: '#FF8D1A' } }
    ], { x: 1.25, y: -2.75 }, 'coord_drag');

    const updated = updateOperationCoordinateSystemOrigin(commands, 'coord_drag', { x: 6, y: -1 });

    expect(updated).toBe(3);
    expect(commands.map((command) => (command.options?.coordinateSystem as any)?.origin)).toEqual([
      { x: 6, y: -1 },
      { x: 6, y: -1 },
      { x: 6, y: -1 }
    ]);
  });

  it('does not mutate commands scoped to another coordinate system', () => {
    const commands = [
      ...createOperationScopedCommands([{ expr: 'Function("x", -5, 5)' }], { x: 1, y: 2 }, 'coord_a'),
      ...createOperationScopedCommands([{ expr: 'Function("-x", -5, 5)' }], { x: -1, y: -2 }, 'coord_b')
    ];

    const updated = updateOperationCoordinateSystemOrigin(commands, 'coord_b', { x: 4, y: 5 });

    expect(updated).toBe(2);
    expect((commands[0].options?.coordinateSystem as any).origin).toEqual({ x: 1, y: 2 });
    expect((commands[1].options?.coordinateSystem as any).origin).toEqual({ x: 1, y: 2 });
    expect((commands[2].options?.coordinateSystem as any).origin).toEqual({ x: 4, y: 5 });
    expect((commands[3].options?.coordinateSystem as any).origin).toEqual({ x: 4, y: 5 });
  });

  it('persists operation coordinate-system axis range changes across every scoped command', () => {
    const commands = createOperationScopedCommands([
      { expr: 'Function("x", -5, 5)', options: { strokeColor: '#4DA6FF' } },
      { expr: 'Equation("x^2 + y^2 = 4")', options: { strokeColor: '#FF8D1A' } }
    ], { x: 0, y: 0 }, 'coord_resize');

    expect(resizeOperationCoordinateSystemAxisRange(commands, 'coord_resize', 'x', 1)).toBe(3);
    expect(commands.map((command) => (command.options?.coordinateSystem as any)?.xRange)).toEqual([
      { min: -7, max: 7 },
      { min: -7, max: 7 },
      { min: -7, max: 7 }
    ]);
    expect(commands.map((command) => (command.options?.coordinateSystem as any)?.yRange)).toEqual([
      { min: -6, max: 6 },
      { min: -6, max: 6 },
      { min: -6, max: 6 }
    ]);

    expect(setOperationCoordinateSystemAxisRangeAbs(commands, 'coord_resize', 'y', 4)).toBe(3);
    expect(commands.map((command) => (command.options?.coordinateSystem as any)?.yRange)).toEqual([
      { min: -4, max: 4 },
      { min: -4, max: 4 },
      { min: -4, max: 4 }
    ]);
    expect(getOperationCoordinateSystemAxisRangeAbs((commands[0].options?.coordinateSystem as any), 'y')).toBe(4);
  });

  it('syncs full operation coordinate-system runtime options across scoped commands', () => {
    const commands = createOperationScopedCommands([
      { expr: 'Function("sin(x)", -6, 6)', options: { strokeColor: '#4DA6FF' } }
    ], { x: 0, y: 0 }, 'coord_runtime');

    const runtime = {
      id: 'coord_runtime',
      origin: { x: 2, y: -1 },
      unitScale: 2,
      xRange: { min: -8, max: 8 },
      yRange: { min: -3, max: 3 },
      snapToGrid: { enabled: true, step: 2, phase: 'end' },
      tickPolicy: {
        x: { kind: 'pi' as const, piMultiple: 0.5 },
        y: { kind: 'integer' as const }
      }
    };

    expect(setOperationCoordinateSystemRuntimeOptions(commands, runtime)).toBe(2);
    expect(commands.map((command) => (command.options?.coordinateSystem as any))).toEqual([
      runtime,
      runtime
    ]);
    expect((commands[0].options?.coordinateSystem as any)).not.toBe(commands[1].options?.coordinateSystem);
    expect((commands[0].options?.coordinateSystem as any).tickPolicy).not.toBe(runtime.tickPolicy);
  });

  it('uses core annotation defaults and standard auxiliary-line style in operation tools', () => {
    const tool = operationToolGroups
      .flatMap((group) => group.tools)
      .find((entry) => entry.id === 'quadratic-overlay-tools');
    expect(tool).toBeDefined();

    const symmetryAxis = tool!.commands.find((command) => command.expr.startsWith('Segment('));
    expect(symmetryAxis?.options).toMatchObject({
      strokeColor: SUBJECT_OVERLAY_DEFAULT_DASH_STROKE_COLOR,
      strokeWidth: SUBJECT_OVERLAY_DASH_STROKE_WIDTH,
      selectionStrokeScale: false,
      lineDash: SUBJECT_OVERLAY_DASH_PATTERN
    });

    const vertex = tool!.commands.find((command) => command.expr.includes('"顶点:'));
    const intercept = tool!.commands.find((command) => command.expr.includes('"x 轴交点:'));
    expect(vertex?.options?.strokeColor).toBe(SUBJECT_OVERLAY_DEFAULT_ANNOTATION_COLORS.vertex);
    expect(intercept?.options?.strokeColor).toBe(SUBJECT_OVERLAY_DEFAULT_ANNOTATION_COLORS.intercept);
    expect(vertex?.options).toMatchObject({
      textColor: STANDARD_GEOMETRY_ANNOTATION_UI.textColor,
      fontSize: STANDARD_GEOMETRY_ANNOTATION_UI.textFontSizePx,
      fontFamily: STANDARD_GEOMETRY_ANNOTATION_UI.textFontFamily,
      fontWeight: STANDARD_GEOMETRY_ANNOTATION_UI.textFontWeight,
      lineHeight: STANDARD_GEOMETRY_ANNOTATION_UI.textLineHeightPx,
      textOffsetX: STANDARD_GEOMETRY_ANNOTATION_UI.textOffsetXPx,
      textOffsetY: STANDARD_GEOMETRY_ANNOTATION_UI.textOffsetYPx
    });
  });

  it('exposes a trigonometry operation tool with pi tick policy scoped to the generated coordinate system', () => {
    const tool = operationToolGroups
      .flatMap((group) => group.tools)
      .find((entry) => entry.id === 'trigonometry-pi-ticks');
    expect(tool).toBeDefined();
    expect(tool!.commands.map((command) => command.expr)).toEqual(expect.arrayContaining([
      expect.stringContaining('sin'),
      expect.stringContaining('cos'),
      expect.stringContaining('tan')
    ]));

    const commands = createOperationScopedCommands(tool!.commands, { x: 0, y: 0 }, 'coord_trig');
    const tickPolicy = (commands[0].options?.coordinateSystem as any)?.tickPolicy;

    expect(tickPolicy).toEqual({
      x: { kind: 'pi', piMultiple: 0.5 },
      y: { kind: 'integer' }
    });
    expect(commands.every((command) => (command.options?.coordinateSystem as any)?.tickPolicy === tickPolicy)).toBe(true);
    expect(commands.some((command) => 'operationCoordinateSystem' in (command.options ?? {}))).toBe(false);
  });

  it('exposes conic overlay operation commands for asymptote and directrix helpers', () => {
    const tool = operationToolGroups
      .flatMap((group) => group.tools)
      .find((entry) => entry.id === 'conic-overlay-tools');
    expect(tool).toBeDefined();

    const expressions = tool!.commands.map((command) => command.expr);
    expect(expressions.filter((expr) => expr.startsWith('Equation('))).toHaveLength(2);
    expect(expressions.filter((expr) => expr.startsWith('Segment('))).toHaveLength(3);
    expect(expressions).toEqual(expect.arrayContaining([
      expect.stringContaining('渐近线'),
      expect.stringContaining('准线')
    ]));
  });

  it('exposes geometry transform preview commands in the operation tools panel', () => {
    const tool = operationToolGroups
      .flatMap((group) => group.tools)
      .find((entry) => entry.id === 'geometry-transform-preview');
    expect(tool).toBeDefined();

    const expressions = tool!.commands.map((command) => command.expr);
    expect(expressions.filter((expr) => expr.includes('Polygon('))).toHaveLength(2);
    expect(expressions.filter((expr) => expr.startsWith('Segment('))).toHaveLength(3);
    expect(expressions.filter((expr) => expr.startsWith('Arc('))).toHaveLength(3);
    expect(expressions).toEqual(expect.arrayContaining([
      expect.stringContaining('P ='),
      expect.stringContaining('几何变换预览')
    ]));

    const commands = createOperationScopedCommands(tool!.commands, { x: 0, y: 0 }, 'coord_transform');
    expect(commands.every((command) => (command.options?.coordinateSystem as any)?.id === 'coord_transform')).toBe(true);
  });

  it('exposes geometry editing and auxiliary construction commands in the operation tools panel', () => {
    const tools = operationToolGroups.flatMap((group) => group.tools);
    const editTool = tools.find((entry) => entry.id === 'geometry-shape-edit-preview');
    const constructionTool = tools.find((entry) => entry.id === 'auxiliary-construction-preview');

    expect(editTool).toBeDefined();
    expect(constructionTool).toBeDefined();
    expect(editTool!.interaction).toEqual({ kind: 'geometry-shape-edit' });
    expect(constructionTool!.interaction).toEqual({ kind: 'geometry-auxiliary-construction' });
    expect(OPERATION_SHAPE_EDIT_DEFAULT_SNAP).toEqual({
      enabled: true,
      step: 0.5,
      origin: { x: 0, y: 0 },
      phase: 'end',
      tolerancePx: 12
    });
    expect(findOperationToolById('geometry-shape-edit-preview')).toBe(editTool);

    const editExpressions = editTool!.commands.map((command) => command.expr);
    expect(editExpressions.filter((expr) => expr.includes('Polygon('))).toHaveLength(2);
    expect(editExpressions.filter((expr) => expr.includes('Point('))).toHaveLength(6);
    expect(editExpressions.some((expr) => expr.includes('几何编辑内核'))).toBe(true);

    const constructionExpressions = constructionTool!.commands.map((command) => command.expr);
    expect(constructionExpressions.filter((expr) => expr.includes('Polygon('))).toHaveLength(1);
    expect(constructionExpressions.filter((expr) => expr.includes('Segment('))).toHaveLength(0);
    expect(constructionExpressions.some((expr) => expr.includes('自由辅助线构造'))).toBe(true);

    const commands = createOperationScopedCommands(constructionTool!.commands, { x: 0, y: 0 }, 'coord_construct');
    expect(commands.every((command) => (command.options?.coordinateSystem as any)?.id === 'coord_construct')).toBe(true);
  });

  it('exposes a function dynamic-point operation tool with the expected 8px red marker', () => {
    const tool = operationToolGroups
      .flatMap((group) => group.tools)
      .find((entry) => entry.id === 'function-dynamic-point');
    expect(tool).toBeDefined();
    expect(tool!.interaction).toEqual({ kind: 'function-dynamic-point' });
    expect(tool!.commands.map((command) => command.expr)).toEqual([
      `dynamic_function = Function("${OPERATION_DYNAMIC_POINT_FUNCTION_EXPRESSION}", -6, 6)`,
      'dynamic_P = Point(-6, 5.2)'
    ]);
    expect(tool!.commands[0].options).toMatchObject({
      strokeColor: OPERATION_DYNAMIC_POINT_FUNCTION_COLOR
    });
    expect(tool!.commands[1].options).toMatchObject({
      strokeColor: SUBJECT_DYNAMIC_POINT_DEFAULT_COLOR,
      pointFillColor: SUBJECT_DYNAMIC_POINT_DEFAULT_COLOR,
      pointStrokeColor: SUBJECT_DYNAMIC_POINT_DEFAULT_COLOR,
      pointStrokeWidth: 0,
      size: SUBJECT_DYNAMIC_POINT_DEFAULT_RADIUS_PX,
      selectionStrokeScale: false
    });

    const descriptor = createOperationDynamicPointDescriptor('manual-dynamic', [-2, 3]);
    const model = createSubjectDynamicPointModel(descriptor, { parameter: 1 });
    expect(createOperationDynamicPointCommands('manual', model).map((command) => command.expr)).toEqual([
      `manual_function = Function("${OPERATION_DYNAMIC_POINT_FUNCTION_EXPRESSION}", -2, 3)`,
      'manual_P = Point(1, -1.8)'
    ]);
    expect(createOperationDynamicPointFunctionCommand('manual', [-7, 7])).toBe(`manual_function = Function("${OPERATION_DYNAMIC_POINT_FUNCTION_EXPRESSION}", -7, 7)`);
    expect(createOperationDynamicPointCommands('missing', { ...model, marker: null, dynamicPoint: { ...model.dynamicPoint, point: null } }).map((command) => command.expr)).toEqual([
      `missing_function = Function("${OPERATION_DYNAMIC_POINT_FUNCTION_EXPRESSION}", -2, 3)`
    ]);
    expect(createOperationDynamicPointCommands('missing', { ...model, marker: null, dynamicPoint: { ...model.dynamicPoint, point: null } }, { includePointPlaceholder: true }).map((command) => command.expr)).toEqual([
      `missing_function = Function("${OPERATION_DYNAMIC_POINT_FUNCTION_EXPRESSION}", -2, 3)`,
      ''
    ]);
  });

  it('exposes an independent triangle tool without operation coordinate-system placement', () => {
    const tool = operationToolGroups
      .flatMap((group) => group.tools)
      .find((entry) => entry.id === 'independent-triangle');

    expect(tool).toBeDefined();
    expect(tool!.placement).toBe('world');
    expect(tool!.interaction).toBeUndefined();
    expect(tool!.commands).toEqual(createOperationIndependentTriangleCommands({ x: 0, y: 0 }));

    const commands = createOperationToolCommands(tool!, { origin: { x: 4, y: -2 } });
    expect(commands).toHaveLength(1);
    expect(commands[0].expr).toBe('Polygon((2, -3.3), (6, -3.3), (4, 0))');
    expect(commands[0].options).not.toHaveProperty('coordinateSystem');
    expect(commands[0].options).not.toHaveProperty('operationCoordinateSystem');
  });

  it('creates prefixed commands for interactive geometry shape editing', () => {
    const target = createOperationShapeEditTarget('interactive-edit');
    const commands = createOperationShapeEditCommands('edit_1', target);

    expect(target.vertices).toEqual([
      { x: -3.5, y: -2 },
      { x: 2, y: -2 },
      { x: -1.5, y: 2.5 }
    ]);
    expect(commands.map((command) => command.expr)).toEqual([
      'edit_1_S1 = (-3.5, -2)',
      'edit_1_S2 = (2, -2)',
      'edit_1_S3 = (-1.5, 2.5)',
      'edit_1_before = Polygon(edit_1_S1, edit_1_S2, edit_1_S3)',
      'edit_1_E1 = (-3.5, -2)',
      'edit_1_E2 = (2, -2)',
      'edit_1_E3 = (-1.5, 2.5)',
      'edit_1_after = Polygon(edit_1_E1, edit_1_E2, edit_1_E3)'
    ]);
    expect(commands[0].options).toMatchObject({
      pointFillColor: STANDARD_GEOMETRY_MARKER_UI.pointFillColor,
      pointStrokeColor: STANDARD_GEOMETRY_MARKER_UI.pointStrokeColor,
      pointStrokeWidth: STANDARD_GEOMETRY_MARKER_UI.pointStrokeWidthPx,
      size: STANDARD_GEOMETRY_MARKER_UI.pointRadiusPx
    });
    expect(commands[4].options).toMatchObject({
      pointFillColor: STANDARD_GEOMETRY_MARKER_UI.pointFillColor,
      pointStrokeColor: '#0F766E',
      pointStrokeWidth: STANDARD_GEOMETRY_MARKER_UI.pointStrokeWidthPx,
      size: STANDARD_GEOMETRY_MARKER_UI.pointRadiusPx
    });
    expect(createOperationShapeEditVertexCommand('edit_1', 1, { x: 1.25, y: -0.5 })).toBe('edit_1_E2 = (1.25, -0.5)');
    expect(formatOperationPointTuple({ x: 0.333333, y: -0 })).toBe('(0.333, 0)');
  });

  it('checks whether operation-local points are inside a coordinate system range', () => {
    const coordinateSystem = {
      xRange: { min: -6, max: 6 },
      yRange: { min: -6, max: 6 }
    };

    expect(isOperationPointInsideCoordinateSystem({ x: 0, y: 0 }, coordinateSystem)).toBe(true);
    expect(isOperationPointInsideCoordinateSystem({ x: 6, y: -6 }, coordinateSystem)).toBe(true);
    expect(isOperationPointInsideCoordinateSystem({ x: 6.25, y: 0 }, coordinateSystem)).toBe(false);
    expect(isOperationPointInsideCoordinateSystem({ x: 0, y: -6.25 }, coordinateSystem)).toBe(false);
    expect(isOperationPointInsideCoordinateSystem({ x: Number.NaN, y: 0 }, coordinateSystem)).toBe(false);
  });

  it('creates prefixed commands for interactive auxiliary-line construction', () => {
    const target = createOperationAuxiliaryConstructionTarget('interactive-aux');
    const initialCommands = createOperationAuxiliaryConstructionCommands('aux_1', target, null);

    expect(target.vertices).toEqual([
      { x: -3.5, y: -2 },
      { x: 2.5, y: -2 },
      { x: -0.5, y: 3 }
    ]);
    expect(initialCommands.map((command) => command.expr)).toEqual([
      'aux_1_P1 = (-3.5, -2)',
      'aux_1_P2 = (2.5, -2)',
      'aux_1_P3 = (-0.5, 3)',
      'aux_1_triangle = Polygon(aux_1_P1, aux_1_P2, aux_1_P3)',
      'Text(-4.8, 3.6, "自由辅助线构造: 拖动或两点点击 / contacts=0 / applied=false")'
    ]);

    const pendingCommands = createOperationAuxiliaryConstructionCommands('aux_1', target, null, { x: -1, y: 1 });
    expect(pendingCommands.map((command) => command.expr)).toEqual([
      'aux_1_P1 = (-3.5, -2)',
      'aux_1_P2 = (2.5, -2)',
      'aux_1_P3 = (-0.5, 3)',
      'aux_1_triangle = Polygon(aux_1_P1, aux_1_P2, aux_1_P3)',
      'aux_1_anchor_pending_start = Point(-1, 1)',
      'Text(-4.8, 3.6, "自由辅助线构造: 等待终点 / contacts=0 / applied=false")'
    ]);

    const draftCommands = createOperationAuxiliaryConstructionCommands('aux_1', target, {
      start: { x: -4.4, y: 0.75 },
      end: { x: 3.2, y: 0.75 }
    });
    const expressions = draftCommands.map((command) => command.expr);

    expect(expressions).toEqual(expect.arrayContaining([
      expect.stringContaining('自由辅助线构造: 等待终点 / contacts=0 / applied=false')
    ]));
    expect(expressions.some((expr) => expr.startsWith('aux_1_draft = Segment('))).toBe(false);
    expect(expressions.filter((expr) => expr.includes('Segment('))).toHaveLength(0);
    expect(expressions).toEqual(expect.arrayContaining([
      'aux_1_anchor_start = Point(-4.4, 0.75)'
    ]));
    expect(expressions).not.toContain('aux_1_anchor_end = Point(3.2, 0.75)');
    expect(expressions.filter((expr) => expr.includes('Point('))).toHaveLength(1);

    const committedCommands = createOperationAuxiliaryConstructionCommands('aux_1', target, {
      start: { x: -4.4, y: 0.75 },
      end: { x: 3.2, y: 0.75 }
    }, null, [
      { role: 'start', point: { x: -4.4, y: 0.75 }, fixed: true },
      { role: 'end', point: { x: 3.2, y: 0.75 }, fixed: true }
    ]);
    const committedExpressions = committedCommands.map((command) => command.expr);
    expect(committedExpressions).toEqual(expect.arrayContaining([
      'Segment((-4.4, 0.75), (3.2, 0.75))'
    ]));
    expect(committedCommands.find((command) => command.expr === 'Segment((-4.4, 0.75), (3.2, 0.75))')?.options).toMatchObject({
      lineDash: SUBJECT_OVERLAY_DASH_PATTERN,
      strokeWidth: SUBJECT_OVERLAY_DASH_STROKE_WIDTH,
      selectionStrokeScale: false,
      operationAuxiliaryLine: true
    });
    const contactPointExpressions = committedExpressions
      .filter((expr) => expr.startsWith('aux_1_contact_') && expr.includes('Point('))
      .map((expr) => expr.replace(/^aux_1_contact_\d+ = /, ''));
    expect(new Set(contactPointExpressions)).toEqual(new Set([
      'Point(0.85, 0.75)',
      'Point(-1.85, 0.75)'
    ]));
    expect(committedExpressions.some((expr) => expr.startsWith('aux_1_anchor_'))).toBe(false);

    const endpointAnchoredCommands = createOperationAuxiliaryConstructionCommands('aux_1', target, {
      start: { x: -1, y: 1 },
      end: { x: 3.2, y: 1 }
    }, null, [
      { role: 'start', point: { x: -1, y: 1 }, fixed: true },
      { role: 'end', point: { x: 3.2, y: 1 }, fixed: true }
    ]);
    const endpointAnchoredExpressions = endpointAnchoredCommands.map((command) => command.expr);
    expect(endpointAnchoredExpressions).toEqual(expect.arrayContaining([
      'Segment((-1, 1), (3.2, 1))',
      'aux_1_contact_1 = Point(0.7, 1)',
      expect.stringContaining('自由辅助线构造: contacts=1 / applied=true')
    ]));
    expect(endpointAnchoredExpressions).not.toContain('aux_1_contact_1 = Point(-1, 1)');
    expect(endpointAnchoredExpressions.some((expr) => expr.includes('inside-endpoint'))).toBe(false);
    expect(endpointAnchoredExpressions.some((expr) => expr.startsWith('aux_1_anchor_'))).toBe(false);

    const internalCommands = createOperationAuxiliaryConstructionCommands('aux_1', target, {
      start: { x: -1, y: 1 },
      end: { x: -0.5, y: 1 }
    });
    const internalExpressions = internalCommands.map((command) => command.expr);
    expect(internalExpressions).toEqual(expect.arrayContaining([
      'aux_1_anchor_start = Point(-1, 1)',
      expect.stringContaining('自由辅助线构造: 等待终点 / contacts=0 / applied=false')
    ]));
    expect(internalExpressions.filter((expr) => expr.includes('Segment('))).toHaveLength(0);

    const internalCommittedCommands = createOperationAuxiliaryConstructionCommands('aux_1', target, {
      start: { x: -1, y: 1 },
      end: { x: -0.5, y: 1 }
    }, null, [
      { role: 'start', point: { x: -1, y: 1 }, fixed: true },
      { role: 'end', point: { x: -0.5, y: 1 }, fixed: true }
    ]);
    const internalCommittedExpressions = internalCommittedCommands.map((command) => command.expr);
    expect(internalCommittedExpressions).toEqual(expect.arrayContaining([
      expect.stringContaining('自由辅助线构造: contacts=0 / applied=false')
    ]));
    expect(internalCommittedExpressions.some((expr) => expr.startsWith('aux_1_draft = Segment('))).toBe(false);
    expect(internalCommittedExpressions.filter((expr) => expr.includes('Segment('))).toHaveLength(0);
    expect(internalCommittedExpressions.filter((expr) => expr.includes('_contact_'))).toHaveLength(0);
    expect(internalCommittedExpressions.some((expr) => expr.startsWith('aux_1_anchor_'))).toBe(false);
  });
});
