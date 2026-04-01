[**vuegraphx**](../README.md)

***

[vuegraphx](../README.md) / GraphHiddenLineSurfaceFeatureCurve

# Interface: GraphHiddenLineSurfaceFeatureCurve

Defined in: [rendering/hiddenLine/contracts.ts:87](https://github.com/zyizyiz/VueGraphX/blob/4b7129ef16e07c8334f02a2a510c37f3c77444ab/src/rendering/hiddenLine/contracts.ts#L87)

## Properties

### id?

> `optional` **id**: `string`

Defined in: [rendering/hiddenLine/contracts.ts:88](https://github.com/zyizyiz/VueGraphX/blob/4b7129ef16e07c8334f02a2a510c37f3c77444ab/src/rendering/hiddenLine/contracts.ts#L88)

***

### range

> **range**: \[`number`, `number`\]

Defined in: [rendering/hiddenLine/contracts.ts:89](https://github.com/zyizyiz/VueGraphX/blob/4b7129ef16e07c8334f02a2a510c37f3c77444ab/src/rendering/hiddenLine/contracts.ts#L89)

***

### steps?

> `optional` **steps**: `number`

Defined in: [rendering/hiddenLine/contracts.ts:90](https://github.com/zyizyiz/VueGraphX/blob/4b7129ef16e07c8334f02a2a510c37f3c77444ab/src/rendering/hiddenLine/contracts.ts#L90)

***

### closed?

> `optional` **closed**: `boolean`

Defined in: [rendering/hiddenLine/contracts.ts:91](https://github.com/zyizyiz/VueGraphX/blob/4b7129ef16e07c8334f02a2a510c37f3c77444ab/src/rendering/hiddenLine/contracts.ts#L91)

***

### ignoreOwnerOcclusion?

> `optional` **ignoreOwnerOcclusion**: `boolean`

Defined in: [rendering/hiddenLine/contracts.ts:92](https://github.com/zyizyiz/VueGraphX/blob/4b7129ef16e07c8334f02a2a510c37f3c77444ab/src/rendering/hiddenLine/contracts.ts#L92)

***

### sampleVisibility()?

> `optional` **sampleVisibility**: (`point`) => [`GraphHiddenLineBaseVisibility`](../type-aliases/GraphHiddenLineBaseVisibility.md) \| `null` \| `undefined`

Defined in: [rendering/hiddenLine/contracts.ts:93](https://github.com/zyizyiz/VueGraphX/blob/4b7129ef16e07c8334f02a2a510c37f3c77444ab/src/rendering/hiddenLine/contracts.ts#L93)

#### Parameters

##### point

[`GraphHiddenLinePoint3D`](GraphHiddenLinePoint3D.md)

#### Returns

[`GraphHiddenLineBaseVisibility`](../type-aliases/GraphHiddenLineBaseVisibility.md) \| `null` \| `undefined`

***

### evaluate()

> **evaluate**: (`t`) => [`GraphHiddenLinePoint3D`](GraphHiddenLinePoint3D.md) \| `null`

Defined in: [rendering/hiddenLine/contracts.ts:94](https://github.com/zyizyiz/VueGraphX/blob/4b7129ef16e07c8334f02a2a510c37f3c77444ab/src/rendering/hiddenLine/contracts.ts#L94)

#### Parameters

##### t

`number`

#### Returns

[`GraphHiddenLinePoint3D`](GraphHiddenLinePoint3D.md) \| `null`
