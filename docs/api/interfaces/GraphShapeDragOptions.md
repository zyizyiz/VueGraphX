[**vuegraphx**](../README.md)

***

[vuegraphx](../README.md) / GraphShapeDragOptions

# Interface: GraphShapeDragOptions

Defined in: [architecture/shapes/contracts.ts:73](https://github.com/zyizyiz/VueGraphX/blob/708b133750b40c4618f980ee3f1e94c99bc50898/src/architecture/shapes/contracts.ts#L73)

单个 JSXGraph 对象的拖拽钩子配置。

## Properties

### selectOnStart?

> `optional` **selectOnStart**: `boolean`

Defined in: [architecture/shapes/contracts.ts:77](https://github.com/zyizyiz/VueGraphX/blob/708b133750b40c4618f980ee3f1e94c99bc50898/src/architecture/shapes/contracts.ts#L77)

是否在拖拽开始时自动选中当前图形。

***

### onStart()?

> `optional` **onStart**: (...`args`) => `void`

Defined in: [architecture/shapes/contracts.ts:82](https://github.com/zyizyiz/VueGraphX/blob/708b133750b40c4618f980ee3f1e94c99bc50898/src/architecture/shapes/contracts.ts#L82)

拖拽开始回调。

#### Parameters

##### args

...`any`[]

#### Returns

`void`

***

### onMove()?

> `optional` **onMove**: (...`args`) => `void`

Defined in: [architecture/shapes/contracts.ts:87](https://github.com/zyizyiz/VueGraphX/blob/708b133750b40c4618f980ee3f1e94c99bc50898/src/architecture/shapes/contracts.ts#L87)

拖拽移动回调。

#### Parameters

##### args

...`any`[]

#### Returns

`void`

***

### onEnd()?

> `optional` **onEnd**: (...`args`) => `void`

Defined in: [architecture/shapes/contracts.ts:92](https://github.com/zyizyiz/VueGraphX/blob/708b133750b40c4618f980ee3f1e94c99bc50898/src/architecture/shapes/contracts.ts#L92)

拖拽结束回调。

#### Parameters

##### args

...`any`[]

#### Returns

`void`
