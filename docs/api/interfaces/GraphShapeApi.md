[**vuegraphx**](../README.md)

***

[vuegraphx](../README.md) / GraphShapeApi

# Interface: GraphShapeApi\<StateType\>

Defined in: [architecture/shapes/composition.ts:28](https://github.com/zyizyiz/VueGraphX/blob/5bee1dec6ecd05ac28e6fb1cd1de054ab497d0f4/src/architecture/shapes/composition.ts#L28)

在组合式图形实例内部提供给作者使用的高层 API。

## Type Parameters

### StateType

`StateType`

## Properties

### id

> `readonly` **id**: `string`

Defined in: [architecture/shapes/composition.ts:32](https://github.com/zyizyiz/VueGraphX/blob/5bee1dec6ecd05ac28e6fb1cd1de054ab497d0f4/src/architecture/shapes/composition.ts#L32)

当前图形实例 id。

***

### entityType

> `readonly` **entityType**: `string`

Defined in: [architecture/shapes/composition.ts:37](https://github.com/zyizyiz/VueGraphX/blob/5bee1dec6ecd05ac28e6fb1cd1de054ab497d0f4/src/architecture/shapes/composition.ts#L37)

当前图形实例的实体类型。

***

### state

> `readonly` **state**: `StateType`

Defined in: [architecture/shapes/composition.ts:42](https://github.com/zyizyiz/VueGraphX/blob/5bee1dec6ecd05ac28e6fb1cd1de054ab497d0f4/src/architecture/shapes/composition.ts#L42)

当前图形的可变状态对象。

***

### selected

> `readonly` **selected**: `boolean`

Defined in: [architecture/shapes/composition.ts:47](https://github.com/zyizyiz/VueGraphX/blob/5bee1dec6ecd05ac28e6fb1cd1de054ab497d0f4/src/architecture/shapes/composition.ts#L47)

当前图形是否被选中。

***

### context

> `readonly` **context**: [`GraphShapeContext`](GraphShapeContext.md)

Defined in: [architecture/shapes/composition.ts:52](https://github.com/zyizyiz/VueGraphX/blob/5bee1dec6ecd05ac28e6fb1cd1de054ab497d0f4/src/architecture/shapes/composition.ts#L52)

当前图形关联的上下文对象。

***

### engine

> `readonly` **engine**: [`GraphXEngine`](../classes/GraphXEngine.md)

Defined in: [architecture/shapes/composition.ts:57](https://github.com/zyizyiz/VueGraphX/blob/5bee1dec6ecd05ac28e6fb1cd1de054ab497d0f4/src/architecture/shapes/composition.ts#L57)

当前图形所属的引擎实例。

***

### board

> `readonly` **board**: `any`

Defined in: [architecture/shapes/composition.ts:62](https://github.com/zyizyiz/VueGraphX/blob/5bee1dec6ecd05ac28e6fb1cd1de054ab497d0f4/src/architecture/shapes/composition.ts#L62)

当前底层画板对象。

## Methods

### getViewport()

> **getViewport**(): [`GraphViewport`](GraphViewport.md)

Defined in: [architecture/shapes/composition.ts:67](https://github.com/zyizyiz/VueGraphX/blob/5bee1dec6ecd05ac28e6fb1cd1de054ab497d0f4/src/architecture/shapes/composition.ts#L67)

返回当前画板视口尺寸。

#### Returns

[`GraphViewport`](GraphViewport.md)

***

### projectUserPoint()

> **projectUserPoint**(`point`): [`GraphScreenPoint`](GraphScreenPoint.md) \| `null`

Defined in: [architecture/shapes/composition.ts:72](https://github.com/zyizyiz/VueGraphX/blob/5bee1dec6ecd05ac28e6fb1cd1de054ab497d0f4/src/architecture/shapes/composition.ts#L72)

将二维用户坐标投影到屏幕坐标系。

#### Parameters

##### point

\[`number`, `number`\]

#### Returns

[`GraphScreenPoint`](GraphScreenPoint.md) \| `null`

***

### projectPoint3D()

> **projectPoint3D**(`point`): [`GraphScreenPoint`](GraphScreenPoint.md) \| `null`

Defined in: [architecture/shapes/composition.ts:77](https://github.com/zyizyiz/VueGraphX/blob/5bee1dec6ecd05ac28e6fb1cd1de054ab497d0f4/src/architecture/shapes/composition.ts#L77)

将三维点投影到屏幕坐标系。

#### Parameters

##### point

\[`number`, `number`, `number`\]

#### Returns

[`GraphScreenPoint`](GraphScreenPoint.md) \| `null`

***

### projectUserBounds()

> **projectUserBounds**(`points`): [`GraphScreenBounds`](GraphScreenBounds.md) \| `null`

Defined in: [architecture/shapes/composition.ts:82](https://github.com/zyizyiz/VueGraphX/blob/5bee1dec6ecd05ac28e6fb1cd1de054ab497d0f4/src/architecture/shapes/composition.ts#L82)

将二维点集投影为屏幕包围盒。

#### Parameters

##### points

\[`number`, `number`\][]

#### Returns

[`GraphScreenBounds`](GraphScreenBounds.md) \| `null`

***

### project3DBounds()

> **project3DBounds**(`points`): [`GraphScreenBounds`](GraphScreenBounds.md) \| `null`

Defined in: [architecture/shapes/composition.ts:87](https://github.com/zyizyiz/VueGraphX/blob/5bee1dec6ecd05ac28e6fb1cd1de054ab497d0f4/src/architecture/shapes/composition.ts#L87)

将三维点集投影为屏幕包围盒。

#### Parameters

##### points

\[`number`, `number`, `number`\][]

#### Returns

[`GraphScreenBounds`](GraphScreenBounds.md) \| `null`

***

### getBoundsAnchor()

> **getBoundsAnchor**(`bounds`, `anchor?`): [`GraphScreenPoint`](GraphScreenPoint.md)

Defined in: [architecture/shapes/composition.ts:92](https://github.com/zyizyiz/VueGraphX/blob/5bee1dec6ecd05ac28e6fb1cd1de054ab497d0f4/src/architecture/shapes/composition.ts#L92)

从包围盒中解析一个屏幕锚点。

#### Parameters

##### bounds

[`GraphScreenBounds`](GraphScreenBounds.md)

##### anchor?

[`GraphScreenAnchor`](../type-aliases/GraphScreenAnchor.md)

#### Returns

[`GraphScreenPoint`](GraphScreenPoint.md)

***

### createAnimationTrack()

> **createAnimationTrack**(`config`): [`GraphAnimationTrack`](GraphAnimationTrack.md)

Defined in: [architecture/shapes/composition.ts:95](https://github.com/zyizyiz/VueGraphX/blob/5bee1dec6ecd05ac28e6fb1cd1de054ab497d0f4/src/architecture/shapes/composition.ts#L95)

创建一条交由引擎统一调度的动画轨道。适合把图形几何变化和播放控制拆开，让外部 UI 通过能力接口驱动它。

#### Parameters

##### config

[`GraphAnimationTrackConfig`](GraphAnimationTrackConfig.md)

#### Returns

[`GraphAnimationTrack`](GraphAnimationTrack.md)

***

### getAnimationTrack()

> **getAnimationTrack**(`id`): [`GraphAnimationTrack`](GraphAnimationTrack.md) \| `null`

Defined in: [architecture/shapes/composition.ts:100](https://github.com/zyizyiz/VueGraphX/blob/5bee1dec6ecd05ac28e6fb1cd1de054ab497d0f4/src/architecture/shapes/composition.ts#L100)

根据 id 获取动画轨道。

#### Parameters

##### id

`string`

#### Returns

[`GraphAnimationTrack`](GraphAnimationTrack.md) \| `null`

***

### getAnimationTracks()

> **getAnimationTracks**(): [`GraphAnimationTrack`](GraphAnimationTrack.md)[]

Defined in: [architecture/shapes/composition.ts:105](https://github.com/zyizyiz/VueGraphX/blob/5bee1dec6ecd05ac28e6fb1cd1de054ab497d0f4/src/architecture/shapes/composition.ts#L105)

返回当前图形持有的全部动画轨道。

#### Returns

[`GraphAnimationTrack`](GraphAnimationTrack.md)[]

***

### removeAnimationTrack()

> **removeAnimationTrack**(`id`): `void`

Defined in: [architecture/shapes/composition.ts:110](https://github.com/zyizyiz/VueGraphX/blob/5bee1dec6ecd05ac28e6fb1cd1de054ab497d0f4/src/architecture/shapes/composition.ts#L110)

移除指定动画轨道。

#### Parameters

##### id

`string`

#### Returns

`void`

***

### hasPointAnnotations()

> **hasPointAnnotations**(): `boolean`

Defined in: [architecture/shapes/composition.ts:115](https://github.com/zyizyiz/VueGraphX/blob/5bee1dec6ecd05ac28e6fb1cd1de054ab497d0f4/src/architecture/shapes/composition.ts#L115)

判断当前图形是否已有点标注。

#### Returns

`boolean`

***

### togglePointAnnotations()

> **togglePointAnnotations**(`specs`, `options?`): `boolean`

Defined in: [architecture/shapes/composition.ts:118](https://github.com/zyizyiz/VueGraphX/blob/5bee1dec6ecd05ac28e6fb1cd1de054ab497d0f4/src/architecture/shapes/composition.ts#L118)

切换一组点标注的显示状态。返回 true 表示当前调用后处于显示态，false 表示当前调用后处于隐藏态。

#### Parameters

##### specs

[`GraphPointAnnotationSpec`](GraphPointAnnotationSpec.md)[]

##### options?

[`GraphPointAnnotationOptions`](GraphPointAnnotationOptions.md)

#### Returns

`boolean`

***

### clearPointAnnotations()

> **clearPointAnnotations**(): `void`

Defined in: [architecture/shapes/composition.ts:123](https://github.com/zyizyiz/VueGraphX/blob/5bee1dec6ecd05ac28e6fb1cd1de054ab497d0f4/src/architecture/shapes/composition.ts#L123)

清空当前图形上的全部点标注。

#### Returns

`void`

***

### clampScreenPoint()

> **clampScreenPoint**(`point`, `padding?`): [`GraphScreenPoint`](GraphScreenPoint.md)

Defined in: [architecture/shapes/composition.ts:128](https://github.com/zyizyiz/VueGraphX/blob/5bee1dec6ecd05ac28e6fb1cd1de054ab497d0f4/src/architecture/shapes/composition.ts#L128)

将屏幕点限制在视口边界内。

#### Parameters

##### point

[`GraphScreenPoint`](GraphScreenPoint.md)

##### padding?

[`GraphViewportPadding`](GraphViewportPadding.md)

#### Returns

[`GraphScreenPoint`](GraphScreenPoint.md)

***

### scheduleUiChange()

> **scheduleUiChange**(): `void`

Defined in: [architecture/shapes/composition.ts:133](https://github.com/zyizyiz/VueGraphX/blob/5bee1dec6ecd05ac28e6fb1cd1de054ab497d0f4/src/architecture/shapes/composition.ts#L133)

延迟通知外部 UI 更新，适合高频交互场景。

#### Returns

`void`

***

### setState()

> **setState**(`partialState`): `void`

Defined in: [architecture/shapes/composition.ts:138](https://github.com/zyizyiz/VueGraphX/blob/5bee1dec6ecd05ac28e6fb1cd1de054ab497d0f4/src/architecture/shapes/composition.ts#L138)

合并更新当前图形状态。

#### Parameters

##### partialState

`Partial`\<`StateType`\>

#### Returns

`void`

***

### notifyChange()

> **notifyChange**(): `void`

Defined in: [architecture/shapes/composition.ts:143](https://github.com/zyizyiz/VueGraphX/blob/5bee1dec6ecd05ac28e6fb1cd1de054ab497d0f4/src/architecture/shapes/composition.ts#L143)

立即通知外部能力/UI 状态刷新。

#### Returns

`void`

***

### trackObject()

> **trackObject**\<`T`\>(`objectRef`): `T`

Defined in: [architecture/shapes/composition.ts:148](https://github.com/zyizyiz/VueGraphX/blob/5bee1dec6ecd05ac28e6fb1cd1de054ab497d0f4/src/architecture/shapes/composition.ts#L148)

记录一个对象，便于实例销毁时自动清理。

#### Type Parameters

##### T

`T`

#### Parameters

##### objectRef

`T`

#### Returns

`T`

***

### bindDrag()

> **bindDrag**(`target`, `options?`): () => `void`

Defined in: [architecture/shapes/composition.ts:153](https://github.com/zyizyiz/VueGraphX/blob/5bee1dec6ecd05ac28e6fb1cd1de054ab497d0f4/src/architecture/shapes/composition.ts#L153)

为目标对象绑定拖拽逻辑，并返回解绑函数。

#### Parameters

##### target

`any`

##### options?

[`GraphShapeDragOptions`](GraphShapeDragOptions.md)

#### Returns

> (): `void`

##### Returns

`void`

***

### createGroup()

> **createGroup**(`groupInput`, `options?`): [`GraphShapeGroup`](GraphShapeGroup.md)

Defined in: [architecture/shapes/composition.ts:156](https://github.com/zyizyiz/VueGraphX/blob/5bee1dec6ecd05ac28e6fb1cd1de054ab497d0f4/src/architecture/shapes/composition.ts#L156)

从多个对象创建受管分组。受管分组会统一提供命中、拖拽、可见性和属性批量控制能力。

#### Parameters

##### groupInput

[`GraphShapeGroupInput`](../type-aliases/GraphShapeGroupInput.md)

##### options?

###### id?

`string`

###### createNativeGroup?

`boolean`

#### Returns

[`GraphShapeGroup`](GraphShapeGroup.md)

***

### removeGroup()

> **removeGroup**(`group`): `void`

Defined in: [architecture/shapes/composition.ts:161](https://github.com/zyizyiz/VueGraphX/blob/5bee1dec6ecd05ac28e6fb1cd1de054ab497d0f4/src/architecture/shapes/composition.ts#L161)

移除一个已创建的受管分组。

#### Parameters

##### group

[`GraphShapeGroup`](GraphShapeGroup.md)

#### Returns

`void`

***

### select()

> **select**(): `void`

Defined in: [architecture/shapes/composition.ts:166](https://github.com/zyizyiz/VueGraphX/blob/5bee1dec6ecd05ac28e6fb1cd1de054ab497d0f4/src/architecture/shapes/composition.ts#L166)

选中当前图形。

#### Returns

`void`

***

### deselect()

> **deselect**(): `void`

Defined in: [architecture/shapes/composition.ts:171](https://github.com/zyizyiz/VueGraphX/blob/5bee1dec6ecd05ac28e6fb1cd1de054ab497d0f4/src/architecture/shapes/composition.ts#L171)

取消选中当前图形。

#### Returns

`void`

***

### remove()

> **remove**(): `void`

Defined in: [architecture/shapes/composition.ts:176](https://github.com/zyizyiz/VueGraphX/blob/5bee1dec6ecd05ac28e6fb1cd1de054ab497d0f4/src/architecture/shapes/composition.ts#L176)

从引擎中移除当前图形。

#### Returns

`void`

***

### addShape()

> **addShape**(`instance`): `void`

Defined in: [architecture/shapes/composition.ts:181](https://github.com/zyizyiz/VueGraphX/blob/5bee1dec6ecd05ac28e6fb1cd1de054ab497d0f4/src/architecture/shapes/composition.ts#L181)

将子图形实例挂到当前引擎中。

#### Parameters

##### instance

[`GraphShapeInstance`](GraphShapeInstance.md)

#### Returns

`void`

***

### createShape()

> **createShape**\<`ChildState`\>(`composition`): [`GraphShapeInstance`](GraphShapeInstance.md)

Defined in: [architecture/shapes/composition.ts:184](https://github.com/zyizyiz/VueGraphX/blob/5bee1dec6ecd05ac28e6fb1cd1de054ab497d0f4/src/architecture/shapes/composition.ts#L184)

基于组合对象直接创建一个子图形实例。适合复杂图形内部继续拆出子图形，而不必重新走 registerShape 流程。

#### Type Parameters

##### ChildState

`ChildState`

#### Parameters

##### composition

[`GraphShapeComposition`](GraphShapeComposition.md)\<`ChildState`\>

#### Returns

[`GraphShapeInstance`](GraphShapeInstance.md)

***

### getUsrCoordFromEvent()

> **getUsrCoordFromEvent**(`event`): \[`number`, `number`\] \| `null`

Defined in: [architecture/shapes/composition.ts:189](https://github.com/zyizyiz/VueGraphX/blob/5bee1dec6ecd05ac28e6fb1cd1de054ab497d0f4/src/architecture/shapes/composition.ts#L189)

将事件转换为用户坐标。

#### Parameters

##### event

`any`

#### Returns

\[`number`, `number`\] \| `null`

***

### removeObjectSafe()

> **removeObjectSafe**(`objectRef`): `void`

Defined in: [architecture/shapes/composition.ts:194](https://github.com/zyizyiz/VueGraphX/blob/5bee1dec6ecd05ac28e6fb1cd1de054ab497d0f4/src/architecture/shapes/composition.ts#L194)

安全移除一个 JSXGraph 对象。

#### Parameters

##### objectRef

`any`

#### Returns

`void`

***

### uid()

> **uid**(`prefix?`): `string`

Defined in: [architecture/shapes/composition.ts:199](https://github.com/zyizyiz/VueGraphX/blob/5bee1dec6ecd05ac28e6fb1cd1de054ab497d0f4/src/architecture/shapes/composition.ts#L199)

生成带前缀的唯一 id。

#### Parameters

##### prefix?

`string`

#### Returns

`string`

***

### toScreenCoordinates()

> **toScreenCoordinates**(`x`, `y`): \{ `x`: `number`; `y`: `number`; \} \| `null`

Defined in: [architecture/shapes/composition.ts:204](https://github.com/zyizyiz/VueGraphX/blob/5bee1dec6ecd05ac28e6fb1cd1de054ab497d0f4/src/architecture/shapes/composition.ts#L204)

直接将屏幕坐标转换为简单对象形式。

#### Parameters

##### x

`number`

##### y

`number`

#### Returns

\{ `x`: `number`; `y`: `number`; \} \| `null`
