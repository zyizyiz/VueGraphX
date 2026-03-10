[**vuegraphx**](../README.md)

***

[vuegraphx](../README.md) / GraphXOptions

# Interface: GraphXOptions

Defined in: [types/engine.ts:11](https://github.com/zyizyiz/VueGraphX/blob/5bee1dec6ecd05ac28e6fb1cd1de054ab497d0f4/src/types/engine.ts#L11)

公共引擎门面接受的 JSXGraph 画板配置。

## Properties

### boundingbox?

> `optional` **boundingbox**: \[`number`, `number`, `number`, `number`\]

Defined in: [types/engine.ts:15](https://github.com/zyizyiz/VueGraphX/blob/5bee1dec6ecd05ac28e6fb1cd1de054ab497d0f4/src/types/engine.ts#L15)

初始视口范围，格式为 [left, top, right, bottom]。

***

### axis?

> `optional` **axis**: `boolean`

Defined in: [types/engine.ts:20](https://github.com/zyizyiz/VueGraphX/blob/5bee1dec6ecd05ac28e6fb1cd1de054ab497d0f4/src/types/engine.ts#L20)

是否显示坐标轴。

***

### showNavigation?

> `optional` **showNavigation**: `boolean`

Defined in: [types/engine.ts:25](https://github.com/zyizyiz/VueGraphX/blob/5bee1dec6ecd05ac28e6fb1cd1de054ab497d0f4/src/types/engine.ts#L25)

是否显示 JSXGraph 默认导航控件。

***

### keepaspectratio?

> `optional` **keepaspectratio**: `boolean`

Defined in: [types/engine.ts:30](https://github.com/zyizyiz/VueGraphX/blob/5bee1dec6ecd05ac28e6fb1cd1de054ab497d0f4/src/types/engine.ts#L30)

是否保持横纵比例一致。

***

### showCopyright?

> `optional` **showCopyright**: `boolean`

Defined in: [types/engine.ts:35](https://github.com/zyizyiz/VueGraphX/blob/5bee1dec6ecd05ac28e6fb1cd1de054ab497d0f4/src/types/engine.ts#L35)

是否显示 JSXGraph 默认版权信息。

***

### renderer?

> `optional` **renderer**: `"svg"` \| `"canvas"` \| `"vml"`

Defined in: [types/engine.ts:40](https://github.com/zyizyiz/VueGraphX/blob/5bee1dec6ecd05ac28e6fb1cd1de054ab497d0f4/src/types/engine.ts#L40)

JSXGraph 渲染器类型。

***

### moveTarget?

> `optional` **moveTarget**: `Document` \| `HTMLElement` \| `null`

Defined in: [types/engine.ts:45](https://github.com/zyizyiz/VueGraphX/blob/5bee1dec6ecd05ac28e6fb1cd1de054ab497d0f4/src/types/engine.ts#L45)

JSXGraph 拖拽 move 事件的监听目标。默认会在支持拖拽时使用 document。

***

### drag?

> `optional` **drag**: `object`

Defined in: [types/engine.ts:50](https://github.com/zyizyiz/VueGraphX/blob/5bee1dec6ecd05ac28e6fb1cd1de054ab497d0f4/src/types/engine.ts#L50)

JSXGraph 画板级拖拽开关。

#### enabled?

> `optional` **enabled**: `boolean`

***

### pan?

> `optional` **pan**: `object`

Defined in: [types/engine.ts:57](https://github.com/zyizyiz/VueGraphX/blob/5bee1dec6ecd05ac28e6fb1cd1de054ab497d0f4/src/types/engine.ts#L57)

JSXGraph 画板平移开关。双层区会关闭它，避免与图元自定义拖拽冲突。

#### enabled?

> `optional` **enabled**: `boolean`

#### needShift?

> `optional` **needShift**: `boolean`

#### needTwoFingers?

> `optional` **needTwoFingers**: `boolean`

***

### view3D?

> `optional` **view3D**: `object`

Defined in: [types/engine.ts:66](https://github.com/zyizyiz/VueGraphX/blob/5bee1dec6ecd05ac28e6fb1cd1de054ab497d0f4/src/types/engine.ts#L66)

3D 视图的布局与属性配置。仅在 3D 画板模式下生效。

#### fitToBoard?

> `optional` **fitToBoard**: `boolean`

是否让 3D 视窗自动铺满当前 board 的真实可视区域，并跟随 resize 同步更新。

#### rect?

> `optional` **rect**: \[\[`number`, `number`\], \[`number`, `number`\], \[\[`number`, `number`\], \[`number`, `number`\], \[`number`, `number`\]\]\]

view3d 的创建参数，格式为 [[left, bottom], [width, height], [[x1, x2], [y1, y2], [z1, z2]]]

#### attributes?

> `optional` **attributes**: `Record`\<`string`, `any`\>

透传给 JSXGraph view3d 的属性。
