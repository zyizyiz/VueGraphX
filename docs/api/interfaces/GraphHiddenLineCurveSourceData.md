[**vuegraphx**](../README.md)

***

[vuegraphx](../README.md) / GraphHiddenLineCurveSourceData

# Interface: GraphHiddenLineCurveSourceData

Defined in: [rendering/hiddenLine/contracts.ts:80](https://github.com/zyizyiz/VueGraphX/blob/9f72605fb698dc53077546b3d3b04f80b67b45d6/src/rendering/hiddenLine/contracts.ts#L80)

## Properties

### kind

> **kind**: `"curve"`

Defined in: [rendering/hiddenLine/contracts.ts:81](https://github.com/zyizyiz/VueGraphX/blob/9f72605fb698dc53077546b3d3b04f80b67b45d6/src/rendering/hiddenLine/contracts.ts#L81)

***

### range

> **range**: \[`number`, `number`\]

Defined in: [rendering/hiddenLine/contracts.ts:82](https://github.com/zyizyiz/VueGraphX/blob/9f72605fb698dc53077546b3d3b04f80b67b45d6/src/rendering/hiddenLine/contracts.ts#L82)

***

### steps?

> `optional` **steps**: `number`

Defined in: [rendering/hiddenLine/contracts.ts:83](https://github.com/zyizyiz/VueGraphX/blob/9f72605fb698dc53077546b3d3b04f80b67b45d6/src/rendering/hiddenLine/contracts.ts#L83)

***

### closed?

> `optional` **closed**: `boolean`

Defined in: [rendering/hiddenLine/contracts.ts:84](https://github.com/zyizyiz/VueGraphX/blob/9f72605fb698dc53077546b3d3b04f80b67b45d6/src/rendering/hiddenLine/contracts.ts#L84)

***

### ignoreOwnerOcclusion?

> `optional` **ignoreOwnerOcclusion**: `boolean`

Defined in: [rendering/hiddenLine/contracts.ts:85](https://github.com/zyizyiz/VueGraphX/blob/9f72605fb698dc53077546b3d3b04f80b67b45d6/src/rendering/hiddenLine/contracts.ts#L85)

***

### sampleVisibility()?

> `optional` **sampleVisibility**: (`point`) => [`GraphHiddenLineBaseVisibility`](../type-aliases/GraphHiddenLineBaseVisibility.md) \| `null` \| `undefined`

Defined in: [rendering/hiddenLine/contracts.ts:86](https://github.com/zyizyiz/VueGraphX/blob/9f72605fb698dc53077546b3d3b04f80b67b45d6/src/rendering/hiddenLine/contracts.ts#L86)

#### Parameters

##### point

[`GraphHiddenLinePoint3D`](GraphHiddenLinePoint3D.md)

#### Returns

[`GraphHiddenLineBaseVisibility`](../type-aliases/GraphHiddenLineBaseVisibility.md) \| `null` \| `undefined`

***

### evaluate()

> **evaluate**: (`t`) => [`GraphHiddenLinePoint3D`](GraphHiddenLinePoint3D.md) \| `null`

Defined in: [rendering/hiddenLine/contracts.ts:87](https://github.com/zyizyiz/VueGraphX/blob/9f72605fb698dc53077546b3d3b04f80b67b45d6/src/rendering/hiddenLine/contracts.ts#L87)

#### Parameters

##### t

`number`

#### Returns

[`GraphHiddenLinePoint3D`](GraphHiddenLinePoint3D.md) \| `null`
