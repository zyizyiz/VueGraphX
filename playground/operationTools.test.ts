import { describe, expect, it } from 'vitest';
import {
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
  clampOperationCoordinateSystemOrigin,
  createOperationShapeEditCommands,
  createOperationShapeEditTarget,
  createOperationShapeEditVertexCommand,
  createOperationScopedCommands,
  findOperationToolById,
  formatOperationPointTuple,
  OPERATION_SHAPE_EDIT_DEFAULT_SNAP,
  operationToolGroups,
  resolveOperationCommandOrigin,
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
    expect(constructionExpressions.filter((expr) => expr.includes('Segment('))).toHaveLength(2);
    expect(constructionExpressions.some((expr) => expr.includes('自由辅助线构造'))).toBe(true);

    const commands = createOperationScopedCommands(constructionTool!.commands, { x: 0, y: 0 }, 'coord_construct');
    expect(commands.every((command) => (command.options?.coordinateSystem as any)?.id === 'coord_construct')).toBe(true);
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
});
