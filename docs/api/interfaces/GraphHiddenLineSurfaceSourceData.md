[**vuegraphx**](../README.md)

***

[vuegraphx](../README.md) / GraphHiddenLineSurfaceSourceData

# Interface: GraphHiddenLineSurfaceSourceData

Defined in: [rendering/hiddenLine/contracts.ts:100](https://github.com/zyizyiz/VueGraphX/blob/9f72605fb698dc53077546b3d3b04f80b67b45d6/src/rendering/hiddenLine/contracts.ts#L100)

## Properties

### kind

> **kind**: `"surface"`

Defined in: [rendering/hiddenLine/contracts.ts:101](https://github.com/zyizyiz/VueGraphX/blob/9f72605fb698dc53077546b3d3b04f80b67b45d6/src/rendering/hiddenLine/contracts.ts#L101)

***

### uRange

> **uRange**: \[`number`, `number`\]

Defined in: [rendering/hiddenLine/contracts.ts:102](https://github.com/zyizyiz/VueGraphX/blob/9f72605fb698dc53077546b3d3b04f80b67b45d6/src/rendering/hiddenLine/contracts.ts#L102)

***

### vRange

> **vRange**: \[`number`, `number`\]

Defined in: [rendering/hiddenLine/contracts.ts:103](https://github.com/zyizyiz/VueGraphX/blob/9f72605fb698dc53077546b3d3b04f80b67b45d6/src/rendering/hiddenLine/contracts.ts#L103)

***

### stepsU?

> `optional` **stepsU**: `number`

Defined in: [rendering/hiddenLine/contracts.ts:104](https://github.com/zyizyiz/VueGraphX/blob/9f72605fb698dc53077546b3d3b04f80b67b45d6/src/rendering/hiddenLine/contracts.ts#L104)

***

### stepsV?

> `optional` **stepsV**: `number`

Defined in: [rendering/hiddenLine/contracts.ts:105](https://github.com/zyizyiz/VueGraphX/blob/9f72605fb698dc53077546b3d3b04f80b67b45d6/src/rendering/hiddenLine/contracts.ts#L105)

***

### evaluate()

> **evaluate**: (`u`, `v`) => [`GraphHiddenLinePoint3D`](GraphHiddenLinePoint3D.md) \| `null`

Defined in: [rendering/hiddenLine/contracts.ts:106](https://github.com/zyizyiz/VueGraphX/blob/9f72605fb698dc53077546b3d3b04f80b67b45d6/src/rendering/hiddenLine/contracts.ts#L106)

#### Parameters

##### u

`number`

##### v

`number`

#### Returns

[`GraphHiddenLinePoint3D`](GraphHiddenLinePoint3D.md) \| `null`

***

### featureCurves?

> `optional` **featureCurves**: [`GraphHiddenLineSurfaceFeatureCurve`](GraphHiddenLineSurfaceFeatureCurve.md)[]

Defined in: [rendering/hiddenLine/contracts.ts:107](https://github.com/zyizyiz/VueGraphX/blob/9f72605fb698dc53077546b3d3b04f80b67b45d6/src/rendering/hiddenLine/contracts.ts#L107)
