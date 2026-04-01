[**vuegraphx**](../README.md)

***

[vuegraphx](../README.md) / GraphShapeInstance

# Interface: GraphShapeInstance

Defined in: [architecture/shapes/contracts.ts:9](https://github.com/zyizyiz/VueGraphX/blob/9f72605fb698dc53077546b3d3b04f80b67b45d6/src/architecture/shapes/contracts.ts#L9)

由图形定义创建出的运行时实例。

## Properties

### id

> **id**: `string`

Defined in: [architecture/shapes/contracts.ts:13](https://github.com/zyizyiz/VueGraphX/blob/9f72605fb698dc53077546b3d3b04f80b67b45d6/src/architecture/shapes/contracts.ts#L13)

图形实例唯一 id。

***

### entityType

> **entityType**: `string`

Defined in: [architecture/shapes/contracts.ts:18](https://github.com/zyizyiz/VueGraphX/blob/9f72605fb698dc53077546b3d3b04f80b67b45d6/src/architecture/shapes/contracts.ts#L18)

图形实例所属的实体类型。

## Methods

### setSelected()

> **setSelected**(`selected`): `void`

Defined in: [architecture/shapes/contracts.ts:23](https://github.com/zyizyiz/VueGraphX/blob/9f72605fb698dc53077546b3d3b04f80b67b45d6/src/architecture/shapes/contracts.ts#L23)

通知实例切换选中状态。

#### Parameters

##### selected

`boolean`

#### Returns

`void`

***

### onBoardDown()?

> `optional` **onBoardDown**(`e`, `isClickingObject`): `void`

Defined in: [architecture/shapes/contracts.ts:28](https://github.com/zyizyiz/VueGraphX/blob/9f72605fb698dc53077546b3d3b04f80b67b45d6/src/architecture/shapes/contracts.ts#L28)

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

Defined in: [architecture/shapes/contracts.ts:33](https://github.com/zyizyiz/VueGraphX/blob/9f72605fb698dc53077546b3d3b04f80b67b45d6/src/architecture/shapes/contracts.ts#L33)

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

Defined in: [architecture/shapes/contracts.ts:38](https://github.com/zyizyiz/VueGraphX/blob/9f72605fb698dc53077546b3d3b04f80b67b45d6/src/architecture/shapes/contracts.ts#L38)

画板更新事件钩子。

#### Returns

`void`

***

### getCapabilityTarget()

> **getCapabilityTarget**(): [`ShapeCapabilityTarget`](ShapeCapabilityTarget.md) \| `null`

Defined in: [architecture/shapes/contracts.ts:43](https://github.com/zyizyiz/VueGraphX/blob/9f72605fb698dc53077546b3d3b04f80b67b45d6/src/architecture/shapes/contracts.ts#L43)

返回当前实例对外暴露的能力目标；若未选中或无能力可返回 null。

#### Returns

[`ShapeCapabilityTarget`](ShapeCapabilityTarget.md) \| `null`

***

### getScenePayload()?

> `optional` **getScenePayload**(): `unknown`

Defined in: [architecture/shapes/contracts.ts:49](https://github.com/zyizyiz/VueGraphX/blob/9f72605fb698dc53077546b3d3b04f80b67b45d6/src/architecture/shapes/contracts.ts#L49)

返回当前图形实例参与 scene document 导出的内容负载。
未实现时表示当前实例不提供导出负载。

#### Returns

`unknown`

***

### destroy()

> **destroy**(): `void`

Defined in: [architecture/shapes/contracts.ts:54](https://github.com/zyizyiz/VueGraphX/blob/9f72605fb698dc53077546b3d3b04f80b67b45d6/src/architecture/shapes/contracts.ts#L54)

销毁实例及其持有的 JSXGraph 资源。

#### Returns

`void`
