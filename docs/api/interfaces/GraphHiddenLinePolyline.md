[**vuegraphx**](../README.md)

***

[vuegraphx](../README.md) / GraphHiddenLinePolyline

# Interface: GraphHiddenLinePolyline

Defined in: [rendering/hiddenLine/contracts.ts:14](https://github.com/zyizyiz/VueGraphX/blob/9f72605fb698dc53077546b3d3b04f80b67b45d6/src/rendering/hiddenLine/contracts.ts#L14)

## Properties

### id?

> `optional` **id**: `string`

Defined in: [rendering/hiddenLine/contracts.ts:15](https://github.com/zyizyiz/VueGraphX/blob/9f72605fb698dc53077546b3d3b04f80b67b45d6/src/rendering/hiddenLine/contracts.ts#L15)

***

### points

> **points**: [`GraphHiddenLinePoint3D`](GraphHiddenLinePoint3D.md)[]

Defined in: [rendering/hiddenLine/contracts.ts:16](https://github.com/zyizyiz/VueGraphX/blob/9f72605fb698dc53077546b3d3b04f80b67b45d6/src/rendering/hiddenLine/contracts.ts#L16)

***

### closed?

> `optional` **closed**: `boolean`

Defined in: [rendering/hiddenLine/contracts.ts:17](https://github.com/zyizyiz/VueGraphX/blob/9f72605fb698dc53077546b3d3b04f80b67b45d6/src/rendering/hiddenLine/contracts.ts#L17)

***

### ignoreOwnerOcclusion?

> `optional` **ignoreOwnerOcclusion**: `boolean`

Defined in: [rendering/hiddenLine/contracts.ts:18](https://github.com/zyizyiz/VueGraphX/blob/9f72605fb698dc53077546b3d3b04f80b67b45d6/src/rendering/hiddenLine/contracts.ts#L18)

***

### sampleVisibility()?

> `optional` **sampleVisibility**: (`point`) => [`GraphHiddenLineBaseVisibility`](../type-aliases/GraphHiddenLineBaseVisibility.md) \| `null` \| `undefined`

Defined in: [rendering/hiddenLine/contracts.ts:19](https://github.com/zyizyiz/VueGraphX/blob/9f72605fb698dc53077546b3d3b04f80b67b45d6/src/rendering/hiddenLine/contracts.ts#L19)

#### Parameters

##### point

[`GraphHiddenLinePoint3D`](GraphHiddenLinePoint3D.md)

#### Returns

[`GraphHiddenLineBaseVisibility`](../type-aliases/GraphHiddenLineBaseVisibility.md) \| `null` \| `undefined`
