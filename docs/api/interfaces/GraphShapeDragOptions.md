[**vuegraphx**](../README.md)

***

[vuegraphx](../README.md) / GraphShapeDragOptions

# Interface: GraphShapeDragOptions

Defined in: [architecture/shapes/contracts.ts:91](https://github.com/zyizyiz/VueGraphX/blob/4b7129ef16e07c8334f02a2a510c37f3c77444ab/src/architecture/shapes/contracts.ts#L91)

单个 JSXGraph 对象的拖拽钩子配置。

## Properties

### selectOnStart?

> `optional` **selectOnStart**: `boolean`

Defined in: [architecture/shapes/contracts.ts:95](https://github.com/zyizyiz/VueGraphX/blob/4b7129ef16e07c8334f02a2a510c37f3c77444ab/src/architecture/shapes/contracts.ts#L95)

是否在拖拽开始时自动选中当前图形。

***

### onStart()?

> `optional` **onStart**: (...`args`) => `void`

Defined in: [architecture/shapes/contracts.ts:100](https://github.com/zyizyiz/VueGraphX/blob/4b7129ef16e07c8334f02a2a510c37f3c77444ab/src/architecture/shapes/contracts.ts#L100)

拖拽开始回调。

#### Parameters

##### args

...`any`[]

#### Returns

`void`

***

### onMove()?

> `optional` **onMove**: (...`args`) => `void`

Defined in: [architecture/shapes/contracts.ts:105](https://github.com/zyizyiz/VueGraphX/blob/4b7129ef16e07c8334f02a2a510c37f3c77444ab/src/architecture/shapes/contracts.ts#L105)

拖拽移动回调。

#### Parameters

##### args

...`any`[]

#### Returns

`void`

***

### onEnd()?

> `optional` **onEnd**: (...`args`) => `void`

Defined in: [architecture/shapes/contracts.ts:110](https://github.com/zyizyiz/VueGraphX/blob/4b7129ef16e07c8334f02a2a510c37f3c77444ab/src/architecture/shapes/contracts.ts#L110)

拖拽结束回调。

#### Parameters

##### args

...`any`[]

#### Returns

`void`
