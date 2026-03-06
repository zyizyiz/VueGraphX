[**vuegraphx**](../README.md)

***

[vuegraphx](../README.md) / GraphShapeContext

# Interface: GraphShapeContext

Defined in: [architecture/shapes/contracts.ts:643](https://github.com/zyizyiz/VueGraphX/blob/708b133750b40c4618f980ee3f1e94c99bc50898/src/architecture/shapes/contracts.ts#L643)

创建图形实例时传给图形定义的上下文对象。

## Properties

### engine

> **engine**: [`GraphXEngine`](../classes/GraphXEngine.md)

Defined in: [architecture/shapes/contracts.ts:647](https://github.com/zyizyiz/VueGraphX/blob/708b133750b40c4618f980ee3f1e94c99bc50898/src/architecture/shapes/contracts.ts#L647)

当前图形所属的引擎实例。

***

### board

> **board**: `any`

Defined in: [architecture/shapes/contracts.ts:652](https://github.com/zyizyiz/VueGraphX/blob/708b133750b40c4618f980ee3f1e94c99bc50898/src/architecture/shapes/contracts.ts#L652)

当前使用的底层画板对象。

## Methods

### selectShape()

> **selectShape**(`shapeId`): `void`

Defined in: [architecture/shapes/contracts.ts:657](https://github.com/zyizyiz/VueGraphX/blob/708b133750b40c4618f980ee3f1e94c99bc50898/src/architecture/shapes/contracts.ts#L657)

切换当前选中图形。

#### Parameters

##### shapeId

`string` | `null`

#### Returns

`void`

***

### isShapeSelected()

> **isShapeSelected**(`shapeId`): `boolean`

Defined in: [architecture/shapes/contracts.ts:662](https://github.com/zyizyiz/VueGraphX/blob/708b133750b40c4618f980ee3f1e94c99bc50898/src/architecture/shapes/contracts.ts#L662)

判断某个图形当前是否处于选中态。

#### Parameters

##### shapeId

`string`

#### Returns

`boolean`

***

### addShape()

> **addShape**(`instance`): `void`

Defined in: [architecture/shapes/contracts.ts:667](https://github.com/zyizyiz/VueGraphX/blob/708b133750b40c4618f980ee3f1e94c99bc50898/src/architecture/shapes/contracts.ts#L667)

将新的图形实例加入当前引擎。

#### Parameters

##### instance

[`GraphShapeInstance`](GraphShapeInstance.md)

#### Returns

`void`

***

### removeShape()

> **removeShape**(`shapeId`): `void`

Defined in: [architecture/shapes/contracts.ts:672](https://github.com/zyizyiz/VueGraphX/blob/708b133750b40c4618f980ee3f1e94c99bc50898/src/architecture/shapes/contracts.ts#L672)

从当前引擎中移除某个图形实例。

#### Parameters

##### shapeId

`string`

#### Returns

`void`

***

### notifyChange()

> **notifyChange**(): `void`

Defined in: [architecture/shapes/contracts.ts:677](https://github.com/zyizyiz/VueGraphX/blob/708b133750b40c4618f980ee3f1e94c99bc50898/src/architecture/shapes/contracts.ts#L677)

通知外部 UI 重新计算能力状态。

#### Returns

`void`

***

### generateId()

> **generateId**(`prefix`): `string`

Defined in: [architecture/shapes/contracts.ts:682](https://github.com/zyizyiz/VueGraphX/blob/708b133750b40c4618f980ee3f1e94c99bc50898/src/architecture/shapes/contracts.ts#L682)

生成一个带前缀的唯一 id。

#### Parameters

##### prefix

`string`

#### Returns

`string`

***

### getUsrCoordFromEvent()

> **getUsrCoordFromEvent**(`event`): \[`number`, `number`\] \| `null`

Defined in: [architecture/shapes/contracts.ts:687](https://github.com/zyizyiz/VueGraphX/blob/708b133750b40c4618f980ee3f1e94c99bc50898/src/architecture/shapes/contracts.ts#L687)

将原生事件转换为用户坐标。

#### Parameters

##### event

`any`

#### Returns

\[`number`, `number`\] \| `null`

***

### getViewport()

> **getViewport**(): [`GraphViewport`](GraphViewport.md)

Defined in: [architecture/shapes/contracts.ts:692](https://github.com/zyizyiz/VueGraphX/blob/708b133750b40c4618f980ee3f1e94c99bc50898/src/architecture/shapes/contracts.ts#L692)

返回当前视口尺寸。

#### Returns

[`GraphViewport`](GraphViewport.md)

***

### projectUserPoint()

> **projectUserPoint**(`point`): [`GraphScreenPoint`](GraphScreenPoint.md) \| `null`

Defined in: [architecture/shapes/contracts.ts:697](https://github.com/zyizyiz/VueGraphX/blob/708b133750b40c4618f980ee3f1e94c99bc50898/src/architecture/shapes/contracts.ts#L697)

将二维用户坐标点投影为屏幕点。

#### Parameters

##### point

\[`number`, `number`\]

#### Returns

[`GraphScreenPoint`](GraphScreenPoint.md) \| `null`

***

### projectPoint3D()

> **projectPoint3D**(`point`): [`GraphScreenPoint`](GraphScreenPoint.md) \| `null`

Defined in: [architecture/shapes/contracts.ts:702](https://github.com/zyizyiz/VueGraphX/blob/708b133750b40c4618f980ee3f1e94c99bc50898/src/architecture/shapes/contracts.ts#L702)

将三维点投影为屏幕点。

#### Parameters

##### point

\[`number`, `number`, `number`\]

#### Returns

[`GraphScreenPoint`](GraphScreenPoint.md) \| `null`

***

### projectUserBounds()

> **projectUserBounds**(`points`): [`GraphScreenBounds`](GraphScreenBounds.md) \| `null`

Defined in: [architecture/shapes/contracts.ts:707](https://github.com/zyizyiz/VueGraphX/blob/708b133750b40c4618f980ee3f1e94c99bc50898/src/architecture/shapes/contracts.ts#L707)

将二维点集投影为屏幕包围盒。

#### Parameters

##### points

\[`number`, `number`\][]

#### Returns

[`GraphScreenBounds`](GraphScreenBounds.md) \| `null`

***

### project3DBounds()

> **project3DBounds**(`points`): [`GraphScreenBounds`](GraphScreenBounds.md) \| `null`

Defined in: [architecture/shapes/contracts.ts:712](https://github.com/zyizyiz/VueGraphX/blob/708b133750b40c4618f980ee3f1e94c99bc50898/src/architecture/shapes/contracts.ts#L712)

将三维点集投影为屏幕包围盒。

#### Parameters

##### points

\[`number`, `number`, `number`\][]

#### Returns

[`GraphScreenBounds`](GraphScreenBounds.md) \| `null`

***

### getBoundsAnchor()

> **getBoundsAnchor**(`bounds`, `anchor?`): [`GraphScreenPoint`](GraphScreenPoint.md)

Defined in: [architecture/shapes/contracts.ts:717](https://github.com/zyizyiz/VueGraphX/blob/708b133750b40c4618f980ee3f1e94c99bc50898/src/architecture/shapes/contracts.ts#L717)

从屏幕包围盒中解析锚点坐标。

#### Parameters

##### bounds

[`GraphScreenBounds`](GraphScreenBounds.md)

##### anchor?

[`GraphScreenAnchor`](../type-aliases/GraphScreenAnchor.md)

#### Returns

[`GraphScreenPoint`](GraphScreenPoint.md)

***

### clampScreenPoint()

> **clampScreenPoint**(`point`, `padding?`): [`GraphScreenPoint`](GraphScreenPoint.md)

Defined in: [architecture/shapes/contracts.ts:722](https://github.com/zyizyiz/VueGraphX/blob/708b133750b40c4618f980ee3f1e94c99bc50898/src/architecture/shapes/contracts.ts#L722)

将屏幕点限制在视口边界之内。

#### Parameters

##### point

[`GraphScreenPoint`](GraphScreenPoint.md)

##### padding?

[`GraphViewportPadding`](GraphViewportPadding.md)

#### Returns

[`GraphScreenPoint`](GraphScreenPoint.md)
