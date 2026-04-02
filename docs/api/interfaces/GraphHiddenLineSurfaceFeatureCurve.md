[**vuegraphx**](../README.md)

***

[vuegraphx](../README.md) / GraphHiddenLineSurfaceFeatureCurve

# Interface: GraphHiddenLineSurfaceFeatureCurve

Defined in: [rendering/hiddenLine/contracts.ts:90](https://github.com/zyizyiz/VueGraphX/blob/9f72605fb698dc53077546b3d3b04f80b67b45d6/src/rendering/hiddenLine/contracts.ts#L90)

## Properties

### id?

> `optional` **id**: `string`

Defined in: [rendering/hiddenLine/contracts.ts:91](https://github.com/zyizyiz/VueGraphX/blob/9f72605fb698dc53077546b3d3b04f80b67b45d6/src/rendering/hiddenLine/contracts.ts#L91)

***

### range

> **range**: \[`number`, `number`\]

Defined in: [rendering/hiddenLine/contracts.ts:92](https://github.com/zyizyiz/VueGraphX/blob/9f72605fb698dc53077546b3d3b04f80b67b45d6/src/rendering/hiddenLine/contracts.ts#L92)

***

### steps?

> `optional` **steps**: `number`

Defined in: [rendering/hiddenLine/contracts.ts:93](https://github.com/zyizyiz/VueGraphX/blob/9f72605fb698dc53077546b3d3b04f80b67b45d6/src/rendering/hiddenLine/contracts.ts#L93)

***

### closed?

> `optional` **closed**: `boolean`

Defined in: [rendering/hiddenLine/contracts.ts:94](https://github.com/zyizyiz/VueGraphX/blob/9f72605fb698dc53077546b3d3b04f80b67b45d6/src/rendering/hiddenLine/contracts.ts#L94)

***

### ignoreOwnerOcclusion?

> `optional` **ignoreOwnerOcclusion**: `boolean`

Defined in: [rendering/hiddenLine/contracts.ts:95](https://github.com/zyizyiz/VueGraphX/blob/9f72605fb698dc53077546b3d3b04f80b67b45d6/src/rendering/hiddenLine/contracts.ts#L95)

***

### sampleVisibility()?

> `optional` **sampleVisibility**: (`point`) => [`GraphHiddenLineBaseVisibility`](../type-aliases/GraphHiddenLineBaseVisibility.md) \| `null` \| `undefined`

Defined in: [rendering/hiddenLine/contracts.ts:96](https://github.com/zyizyiz/VueGraphX/blob/9f72605fb698dc53077546b3d3b04f80b67b45d6/src/rendering/hiddenLine/contracts.ts#L96)

#### Parameters

##### point

[`GraphHiddenLinePoint3D`](GraphHiddenLinePoint3D.md)

#### Returns

[`GraphHiddenLineBaseVisibility`](../type-aliases/GraphHiddenLineBaseVisibility.md) \| `null` \| `undefined`

***

### evaluate()

> **evaluate**: (`t`) => [`GraphHiddenLinePoint3D`](GraphHiddenLinePoint3D.md) \| `null`

Defined in: [rendering/hiddenLine/contracts.ts:97](https://github.com/zyizyiz/VueGraphX/blob/9f72605fb698dc53077546b3d3b04f80b67b45d6/src/rendering/hiddenLine/contracts.ts#L97)

#### Parameters

##### t

`number`

#### Returns

[`GraphHiddenLinePoint3D`](GraphHiddenLinePoint3D.md) \| `null`
