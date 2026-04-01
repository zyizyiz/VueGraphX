[**vuegraphx**](../README.md)

***

[vuegraphx](../README.md) / GraphHiddenLineCurveSourceData

# Interface: GraphHiddenLineCurveSourceData

Defined in: [rendering/hiddenLine/contracts.ts:77](https://github.com/zyizyiz/VueGraphX/blob/4b7129ef16e07c8334f02a2a510c37f3c77444ab/src/rendering/hiddenLine/contracts.ts#L77)

## Properties

### kind

> **kind**: `"curve"`

Defined in: [rendering/hiddenLine/contracts.ts:78](https://github.com/zyizyiz/VueGraphX/blob/4b7129ef16e07c8334f02a2a510c37f3c77444ab/src/rendering/hiddenLine/contracts.ts#L78)

***

### range

> **range**: \[`number`, `number`\]

Defined in: [rendering/hiddenLine/contracts.ts:79](https://github.com/zyizyiz/VueGraphX/blob/4b7129ef16e07c8334f02a2a510c37f3c77444ab/src/rendering/hiddenLine/contracts.ts#L79)

***

### steps?

> `optional` **steps**: `number`

Defined in: [rendering/hiddenLine/contracts.ts:80](https://github.com/zyizyiz/VueGraphX/blob/4b7129ef16e07c8334f02a2a510c37f3c77444ab/src/rendering/hiddenLine/contracts.ts#L80)

***

### closed?

> `optional` **closed**: `boolean`

Defined in: [rendering/hiddenLine/contracts.ts:81](https://github.com/zyizyiz/VueGraphX/blob/4b7129ef16e07c8334f02a2a510c37f3c77444ab/src/rendering/hiddenLine/contracts.ts#L81)

***

### ignoreOwnerOcclusion?

> `optional` **ignoreOwnerOcclusion**: `boolean`

Defined in: [rendering/hiddenLine/contracts.ts:82](https://github.com/zyizyiz/VueGraphX/blob/4b7129ef16e07c8334f02a2a510c37f3c77444ab/src/rendering/hiddenLine/contracts.ts#L82)

***

### sampleVisibility()?

> `optional` **sampleVisibility**: (`point`) => [`GraphHiddenLineBaseVisibility`](../type-aliases/GraphHiddenLineBaseVisibility.md) \| `null` \| `undefined`

Defined in: [rendering/hiddenLine/contracts.ts:83](https://github.com/zyizyiz/VueGraphX/blob/4b7129ef16e07c8334f02a2a510c37f3c77444ab/src/rendering/hiddenLine/contracts.ts#L83)

#### Parameters

##### point

[`GraphHiddenLinePoint3D`](GraphHiddenLinePoint3D.md)

#### Returns

[`GraphHiddenLineBaseVisibility`](../type-aliases/GraphHiddenLineBaseVisibility.md) \| `null` \| `undefined`

***

### evaluate()

> **evaluate**: (`t`) => [`GraphHiddenLinePoint3D`](GraphHiddenLinePoint3D.md) \| `null`

Defined in: [rendering/hiddenLine/contracts.ts:84](https://github.com/zyizyiz/VueGraphX/blob/4b7129ef16e07c8334f02a2a510c37f3c77444ab/src/rendering/hiddenLine/contracts.ts#L84)

#### Parameters

##### t

`number`

#### Returns

[`GraphHiddenLinePoint3D`](GraphHiddenLinePoint3D.md) \| `null`
