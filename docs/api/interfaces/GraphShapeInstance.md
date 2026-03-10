[**vuegraphx**](../README.md)

***

[vuegraphx](../README.md) / GraphShapeInstance

# Interface: GraphShapeInstance

Defined in: [architecture/shapes/contracts.ts:8](https://github.com/zyizyiz/VueGraphX/blob/5bee1dec6ecd05ac28e6fb1cd1de054ab497d0f4/src/architecture/shapes/contracts.ts#L8)

由图形定义创建出的运行时实例。

## Properties

### id

> **id**: `string`

Defined in: [architecture/shapes/contracts.ts:12](https://github.com/zyizyiz/VueGraphX/blob/5bee1dec6ecd05ac28e6fb1cd1de054ab497d0f4/src/architecture/shapes/contracts.ts#L12)

图形实例唯一 id。

***

### entityType

> **entityType**: `string`

Defined in: [architecture/shapes/contracts.ts:17](https://github.com/zyizyiz/VueGraphX/blob/5bee1dec6ecd05ac28e6fb1cd1de054ab497d0f4/src/architecture/shapes/contracts.ts#L17)

图形实例所属的实体类型。

## Methods

### setSelected()

> **setSelected**(`selected`): `void`

Defined in: [architecture/shapes/contracts.ts:22](https://github.com/zyizyiz/VueGraphX/blob/5bee1dec6ecd05ac28e6fb1cd1de054ab497d0f4/src/architecture/shapes/contracts.ts#L22)

通知实例切换选中状态。

#### Parameters

##### selected

`boolean`

#### Returns

`void`

***

### onBoardDown()?

> `optional` **onBoardDown**(`e`, `isClickingObject`): `void`

Defined in: [architecture/shapes/contracts.ts:27](https://github.com/zyizyiz/VueGraphX/blob/5bee1dec6ecd05ac28e6fb1cd1de054ab497d0f4/src/architecture/shapes/contracts.ts#L27)

画板按下事件钩子。

#### Parameters

##### e

`any`

##### isClickingObject

`boolean`

#### Returns

`void`

***

### onBoardUp()?

> `optional` **onBoardUp**(`e`, `isClickingObject`): `void`

Defined in: [architecture/shapes/contracts.ts:32](https://github.com/zyizyiz/VueGraphX/blob/5bee1dec6ecd05ac28e6fb1cd1de054ab497d0f4/src/architecture/shapes/contracts.ts#L32)

画板抬起事件钩子。

#### Parameters

##### e

`any`

##### isClickingObject

`boolean`

#### Returns

`void`

***

### onBoardUpdate()?

> `optional` **onBoardUpdate**(): `void`

Defined in: [architecture/shapes/contracts.ts:37](https://github.com/zyizyiz/VueGraphX/blob/5bee1dec6ecd05ac28e6fb1cd1de054ab497d0f4/src/architecture/shapes/contracts.ts#L37)

画板更新事件钩子。

#### Returns

`void`

***

### getCapabilityTarget()

> **getCapabilityTarget**(): [`ShapeCapabilityTarget`](ShapeCapabilityTarget.md) \| `null`

Defined in: [architecture/shapes/contracts.ts:42](https://github.com/zyizyiz/VueGraphX/blob/5bee1dec6ecd05ac28e6fb1cd1de054ab497d0f4/src/architecture/shapes/contracts.ts#L42)

返回当前实例对外暴露的能力目标；若未选中或无能力可返回 null。

#### Returns

[`ShapeCapabilityTarget`](ShapeCapabilityTarget.md) \| `null`

***

### destroy()

> **destroy**(): `void`

Defined in: [architecture/shapes/contracts.ts:47](https://github.com/zyizyiz/VueGraphX/blob/5bee1dec6ecd05ac28e6fb1cd1de054ab497d0f4/src/architecture/shapes/contracts.ts#L47)

销毁实例及其持有的 JSXGraph 资源。

#### Returns

`void`
