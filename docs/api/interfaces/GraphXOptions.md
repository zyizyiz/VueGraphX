[**vuegraphx**](../README.md)

***

[vuegraphx](../README.md) / GraphXOptions

# Interface: GraphXOptions

Defined in: [types/engine.ts:12](https://github.com/zyizyiz/VueGraphX/blob/9f72605fb698dc53077546b3d3b04f80b67b45d6/src/types/engine.ts#L12)

公共引擎门面接受的 JSXGraph 画板配置。

## Properties

### boundingbox?

> `optional` **boundingbox**: \[`number`, `number`, `number`, `number`\]

Defined in: [types/engine.ts:16](https://github.com/zyizyiz/VueGraphX/blob/9f72605fb698dc53077546b3d3b04f80b67b45d6/src/types/engine.ts#L16)

初始视口范围，格式为 [left, top, right, bottom]。

***

### axis?

> `optional` **axis**: `boolean`

Defined in: [types/engine.ts:21](https://github.com/zyizyiz/VueGraphX/blob/9f72605fb698dc53077546b3d3b04f80b67b45d6/src/types/engine.ts#L21)

是否显示坐标轴。

***

### showNavigation?

> `optional` **showNavigation**: `boolean`

Defined in: [types/engine.ts:26](https://github.com/zyizyiz/VueGraphX/blob/9f72605fb698dc53077546b3d3b04f80b67b45d6/src/types/engine.ts#L26)

是否显示 JSXGraph 默认导航控件。

***

### keepaspectratio?

> `optional` **keepaspectratio**: `boolean`

Defined in: [types/engine.ts:31](https://github.com/zyizyiz/VueGraphX/blob/9f72605fb698dc53077546b3d3b04f80b67b45d6/src/types/engine.ts#L31)

是否保持横纵比例一致。

***

### showCopyright?

> `optional` **showCopyright**: `boolean`

Defined in: [types/engine.ts:36](https://github.com/zyizyiz/VueGraphX/blob/9f72605fb698dc53077546b3d3b04f80b67b45d6/src/types/engine.ts#L36)

是否显示 JSXGraph 默认版权信息。

***

### renderer?

> `optional` **renderer**: `"svg"` \| `"canvas"` \| `"vml"`

Defined in: [types/engine.ts:41](https://github.com/zyizyiz/VueGraphX/blob/9f72605fb698dc53077546b3d3b04f80b67b45d6/src/types/engine.ts#L41)

JSXGraph 渲染器类型。

***

### moveTarget?

> `optional` **moveTarget**: `Document` \| `HTMLElement` \| `null`

Defined in: [types/engine.ts:46](https://github.com/zyizyiz/VueGraphX/blob/9f72605fb698dc53077546b3d3b04f80b67b45d6/src/types/engine.ts#L46)

JSXGraph 拖拽 move 事件的监听目标。默认会在支持拖拽时使用 document。

***

### drag?

> `optional` **drag**: `object`

Defined in: [types/engine.ts:51](https://github.com/zyizyiz/VueGraphX/blob/9f72605fb698dc53077546b3d3b04f80b67b45d6/src/types/engine.ts#L51)

JSXGraph 画板级拖拽开关。

#### enabled?

> `optional` **enabled**: `boolean`

***

### pan?

> `optional` **pan**: `object`

Defined in: [types/engine.ts:58](https://github.com/zyizyiz/VueGraphX/blob/9f72605fb698dc53077546b3d3b04f80b67b45d6/src/types/engine.ts#L58)

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

Defined in: [types/engine.ts:67](https://github.com/zyizyiz/VueGraphX/blob/9f72605fb698dc53077546b3d3b04f80b67b45d6/src/types/engine.ts#L67)

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

#### hiddenLine?

> `optional` **hiddenLine**: [`GraphHiddenLineOptions`](GraphHiddenLineOptions.md)

3D 隐线/遮挡虚线渲染配置。
