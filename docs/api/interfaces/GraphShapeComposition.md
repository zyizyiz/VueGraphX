[**vuegraphx**](../README.md)

***

[vuegraphx](../README.md) / GraphShapeComposition

# Interface: GraphShapeComposition\<StateType\>

Defined in: [architecture/shapes/composition.ts:210](https://github.com/zyizyiz/VueGraphX/blob/708b133750b40c4618f980ee3f1e94c99bc50898/src/architecture/shapes/composition.ts#L210)

用于实现单个图形实例的运行时组合对象。

## Type Parameters

### StateType

`StateType`

## Properties

### id?

> `optional` **id**: `string`

Defined in: [architecture/shapes/composition.ts:214](https://github.com/zyizyiz/VueGraphX/blob/708b133750b40c4618f980ee3f1e94c99bc50898/src/architecture/shapes/composition.ts#L214)

可选的固定实例 id；未提供时由运行时自动生成。

***

### entityType

> **entityType**: `string`

Defined in: [architecture/shapes/composition.ts:219](https://github.com/zyizyiz/VueGraphX/blob/708b133750b40c4618f980ee3f1e94c99bc50898/src/architecture/shapes/composition.ts#L219)

当前组合实例的实体类型。

***

### initialState

> **initialState**: `StateType`

Defined in: [architecture/shapes/composition.ts:224](https://github.com/zyizyiz/VueGraphX/blob/708b133750b40c4618f980ee3f1e94c99bc50898/src/architecture/shapes/composition.ts#L224)

图形实例初始化时使用的状态。

## Methods

### setup()?

> `optional` **setup**(`api`): `void`

Defined in: [architecture/shapes/composition.ts:227](https://github.com/zyizyiz/VueGraphX/blob/708b133750b40c4618f980ee3f1e94c99bc50898/src/architecture/shapes/composition.ts#L227)

初始化钩子，适合创建对象和绑定事件，通常也是创建 animation track、group 和 annotation spec 的位置。

#### Parameters

##### api

[`GraphShapeApi`](GraphShapeApi.md)\<`StateType`\>

#### Returns

`void`

***

### getCapabilityTarget()

> **getCapabilityTarget**(`api`): [`ShapeCapabilityTarget`](ShapeCapabilityTarget.md) \| `null`

Defined in: [architecture/shapes/composition.ts:230](https://github.com/zyizyiz/VueGraphX/blob/708b133750b40c4618f980ee3f1e94c99bc50898/src/architecture/shapes/composition.ts#L230)

返回当前实例对外暴露的能力目标。未选中或当前没有需要暴露的能力时可以返回 null。

#### Parameters

##### api

[`GraphShapeApi`](GraphShapeApi.md)\<`StateType`\>

#### Returns

[`ShapeCapabilityTarget`](ShapeCapabilityTarget.md) \| `null`

***

### onSelectionChange()?

> `optional` **onSelectionChange**(`api`, `selected`): `void`

Defined in: [architecture/shapes/composition.ts:233](https://github.com/zyizyiz/VueGraphX/blob/708b133750b40c4618f980ee3f1e94c99bc50898/src/architecture/shapes/composition.ts#L233)

选中状态变化钩子，适合在这里切换高亮、辅助点或悬浮 UI。

#### Parameters

##### api

[`GraphShapeApi`](GraphShapeApi.md)\<`StateType`\>

##### selected

`boolean`

#### Returns

`void`

***

### onBoardDown()?

> `optional` **onBoardDown**(`api`, `event`, `isClickingObject`): `void`

Defined in: [architecture/shapes/composition.ts:238](https://github.com/zyizyiz/VueGraphX/blob/708b133750b40c4618f980ee3f1e94c99bc50898/src/architecture/shapes/composition.ts#L238)

画板按下事件钩子。

#### Parameters

##### api

[`GraphShapeApi`](GraphShapeApi.md)\<`StateType`\>

##### event

`any`

##### isClickingObject

`boolean`

#### Returns

`void`

***

### onBoardUp()?

> `optional` **onBoardUp**(`api`, `event`, `isClickingObject`): `void`

Defined in: [architecture/shapes/composition.ts:243](https://github.com/zyizyiz/VueGraphX/blob/708b133750b40c4618f980ee3f1e94c99bc50898/src/architecture/shapes/composition.ts#L243)

画板抬起事件钩子。

#### Parameters

##### api

[`GraphShapeApi`](GraphShapeApi.md)\<`StateType`\>

##### event

`any`

##### isClickingObject

`boolean`

#### Returns

`void`

***

### onBoardUpdate()?

> `optional` **onBoardUpdate**(`api`): `void`

Defined in: [architecture/shapes/composition.ts:248](https://github.com/zyizyiz/VueGraphX/blob/708b133750b40c4618f980ee3f1e94c99bc50898/src/architecture/shapes/composition.ts#L248)

画板更新事件钩子。

#### Parameters

##### api

[`GraphShapeApi`](GraphShapeApi.md)\<`StateType`\>

#### Returns

`void`

***

### onDestroy()?

> `optional` **onDestroy**(`api`): `void`

Defined in: [architecture/shapes/composition.ts:253](https://github.com/zyizyiz/VueGraphX/blob/708b133750b40c4618f980ee3f1e94c99bc50898/src/architecture/shapes/composition.ts#L253)

销毁前钩子，适合释放组合自身资源。

#### Parameters

##### api

[`GraphShapeApi`](GraphShapeApi.md)\<`StateType`\>

#### Returns

`void`
