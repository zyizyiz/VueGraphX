[**vuegraphx**](../README.md)

***

[vuegraphx](../README.md) / GraphShapeContext

# Interface: GraphShapeContext

Defined in: [architecture/shapes/contracts.ts:693](https://github.com/zyizyiz/VueGraphX/blob/5bee1dec6ecd05ac28e6fb1cd1de054ab497d0f4/src/architecture/shapes/contracts.ts#L693)

创建图形实例时传给图形定义的上下文对象。

## Properties

### engine

> **engine**: [`GraphXEngine`](../classes/GraphXEngine.md)

Defined in: [architecture/shapes/contracts.ts:697](https://github.com/zyizyiz/VueGraphX/blob/5bee1dec6ecd05ac28e6fb1cd1de054ab497d0f4/src/architecture/shapes/contracts.ts#L697)

当前图形所属的引擎实例。

***

### board

> **board**: `any`

Defined in: [architecture/shapes/contracts.ts:702](https://github.com/zyizyiz/VueGraphX/blob/5bee1dec6ecd05ac28e6fb1cd1de054ab497d0f4/src/architecture/shapes/contracts.ts#L702)

当前使用的底层画板对象。

## Methods

### selectShape()

> **selectShape**(`shapeId`): `void`

Defined in: [architecture/shapes/contracts.ts:707](https://github.com/zyizyiz/VueGraphX/blob/5bee1dec6ecd05ac28e6fb1cd1de054ab497d0f4/src/architecture/shapes/contracts.ts#L707)

切换当前选中图形。

#### Parameters

##### shapeId

`string` | `null`

#### Returns

`void`

***

### isShapeSelected()

> **isShapeSelected**(`shapeId`): `boolean`

Defined in: [architecture/shapes/contracts.ts:712](https://github.com/zyizyiz/VueGraphX/blob/5bee1dec6ecd05ac28e6fb1cd1de054ab497d0f4/src/architecture/shapes/contracts.ts#L712)

判断某个图形当前是否处于选中态。

#### Parameters

##### shapeId

`string`

#### Returns

`boolean`

***

### addShape()

> **addShape**(`instance`): `void`

Defined in: [architecture/shapes/contracts.ts:717](https://github.com/zyizyiz/VueGraphX/blob/5bee1dec6ecd05ac28e6fb1cd1de054ab497d0f4/src/architecture/shapes/contracts.ts#L717)

将新的图形实例加入当前引擎。

#### Parameters

##### instance

[`GraphShapeInstance`](GraphShapeInstance.md)

#### Returns

`void`

***

### removeShape()

> **removeShape**(`shapeId`): `void`

Defined in: [architecture/shapes/contracts.ts:722](https://github.com/zyizyiz/VueGraphX/blob/5bee1dec6ecd05ac28e6fb1cd1de054ab497d0f4/src/architecture/shapes/contracts.ts#L722)

从当前引擎中移除某个图形实例。

#### Parameters

##### shapeId

`string`

#### Returns

`void`

***

### notifyChange()

> **notifyChange**(): `void`

Defined in: [architecture/shapes/contracts.ts:727](https://github.com/zyizyiz/VueGraphX/blob/5bee1dec6ecd05ac28e6fb1cd1de054ab497d0f4/src/architecture/shapes/contracts.ts#L727)

通知外部 UI 重新计算能力状态。

#### Returns

`void`

***

### generateId()

> **generateId**(`prefix`): `string`

Defined in: [architecture/shapes/contracts.ts:732](https://github.com/zyizyiz/VueGraphX/blob/5bee1dec6ecd05ac28e6fb1cd1de054ab497d0f4/src/architecture/shapes/contracts.ts#L732)

生成一个带前缀的唯一 id。

#### Parameters

##### prefix

`string`

#### Returns

`string`

***

### getUsrCoordFromEvent()

> **getUsrCoordFromEvent**(`event`): \[`number`, `number`\] \| `null`

Defined in: [architecture/shapes/contracts.ts:737](https://github.com/zyizyiz/VueGraphX/blob/5bee1dec6ecd05ac28e6fb1cd1de054ab497d0f4/src/architecture/shapes/contracts.ts#L737)

将原生事件转换为用户坐标。

#### Parameters

##### event

`any`

#### Returns

\[`number`, `number`\] \| `null`

***

### getViewport()

> **getViewport**(): [`GraphViewport`](GraphViewport.md)

Defined in: [architecture/shapes/contracts.ts:742](https://github.com/zyizyiz/VueGraphX/blob/5bee1dec6ecd05ac28e6fb1cd1de054ab497d0f4/src/architecture/shapes/contracts.ts#L742)

返回当前视口尺寸。

#### Returns

[`GraphViewport`](GraphViewport.md)

***

### projectUserPoint()

> **projectUserPoint**(`point`): [`GraphScreenPoint`](GraphScreenPoint.md) \| `null`

Defined in: [architecture/shapes/contracts.ts:747](https://github.com/zyizyiz/VueGraphX/blob/5bee1dec6ecd05ac28e6fb1cd1de054ab497d0f4/src/architecture/shapes/contracts.ts#L747)

将二维用户坐标点投影为屏幕点。

#### Parameters

##### point

\[`number`, `number`\]

#### Returns

[`GraphScreenPoint`](GraphScreenPoint.md) \| `null`

***

### projectPoint3D()

> **projectPoint3D**(`point`): [`GraphScreenPoint`](GraphScreenPoint.md) \| `null`

Defined in: [architecture/shapes/contracts.ts:752](https://github.com/zyizyiz/VueGraphX/blob/5bee1dec6ecd05ac28e6fb1cd1de054ab497d0f4/src/architecture/shapes/contracts.ts#L752)

将三维点投影为屏幕点。

#### Parameters

##### point

\[`number`, `number`, `number`\]

#### Returns

[`GraphScreenPoint`](GraphScreenPoint.md) \| `null`

***

### projectUserBounds()

> **projectUserBounds**(`points`): [`GraphScreenBounds`](GraphScreenBounds.md) \| `null`

Defined in: [architecture/shapes/contracts.ts:757](https://github.com/zyizyiz/VueGraphX/blob/5bee1dec6ecd05ac28e6fb1cd1de054ab497d0f4/src/architecture/shapes/contracts.ts#L757)

将二维点集投影为屏幕包围盒。

#### Parameters

##### points

\[`number`, `number`\][]

#### Returns

[`GraphScreenBounds`](GraphScreenBounds.md) \| `null`

***

### project3DBounds()

> **project3DBounds**(`points`): [`GraphScreenBounds`](GraphScreenBounds.md) \| `null`

Defined in: [architecture/shapes/contracts.ts:762](https://github.com/zyizyiz/VueGraphX/blob/5bee1dec6ecd05ac28e6fb1cd1de054ab497d0f4/src/architecture/shapes/contracts.ts#L762)

将三维点集投影为屏幕包围盒。

#### Parameters

##### points

\[`number`, `number`, `number`\][]

#### Returns

[`GraphScreenBounds`](GraphScreenBounds.md) \| `null`

***

### getBoundsAnchor()

> **getBoundsAnchor**(`bounds`, `anchor?`): [`GraphScreenPoint`](GraphScreenPoint.md)

Defined in: [architecture/shapes/contracts.ts:767](https://github.com/zyizyiz/VueGraphX/blob/5bee1dec6ecd05ac28e6fb1cd1de054ab497d0f4/src/architecture/shapes/contracts.ts#L767)

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

Defined in: [architecture/shapes/contracts.ts:772](https://github.com/zyizyiz/VueGraphX/blob/5bee1dec6ecd05ac28e6fb1cd1de054ab497d0f4/src/architecture/shapes/contracts.ts#L772)

将屏幕点限制在视口边界之内。

#### Parameters

##### point

[`GraphScreenPoint`](GraphScreenPoint.md)

##### padding?

[`GraphViewportPadding`](GraphViewportPadding.md)

#### Returns

[`GraphScreenPoint`](GraphScreenPoint.md)
