[**vuegraphx**](../README.md)

***

[vuegraphx](../README.md) / GraphHiddenLineSurfaceSourceData

# Interface: GraphHiddenLineSurfaceSourceData

Defined in: [rendering/hiddenLine/contracts.ts:97](https://github.com/zyizyiz/VueGraphX/blob/4b7129ef16e07c8334f02a2a510c37f3c77444ab/src/rendering/hiddenLine/contracts.ts#L97)

## Properties

### kind

> **kind**: `"surface"`

Defined in: [rendering/hiddenLine/contracts.ts:98](https://github.com/zyizyiz/VueGraphX/blob/4b7129ef16e07c8334f02a2a510c37f3c77444ab/src/rendering/hiddenLine/contracts.ts#L98)

***

### uRange

> **uRange**: \[`number`, `number`\]

Defined in: [rendering/hiddenLine/contracts.ts:99](https://github.com/zyizyiz/VueGraphX/blob/4b7129ef16e07c8334f02a2a510c37f3c77444ab/src/rendering/hiddenLine/contracts.ts#L99)

***

### vRange

> **vRange**: \[`number`, `number`\]

Defined in: [rendering/hiddenLine/contracts.ts:100](https://github.com/zyizyiz/VueGraphX/blob/4b7129ef16e07c8334f02a2a510c37f3c77444ab/src/rendering/hiddenLine/contracts.ts#L100)

***

### stepsU?

> `optional` **stepsU**: `number`

Defined in: [rendering/hiddenLine/contracts.ts:101](https://github.com/zyizyiz/VueGraphX/blob/4b7129ef16e07c8334f02a2a510c37f3c77444ab/src/rendering/hiddenLine/contracts.ts#L101)

***

### stepsV?

> `optional` **stepsV**: `number`

Defined in: [rendering/hiddenLine/contracts.ts:102](https://github.com/zyizyiz/VueGraphX/blob/4b7129ef16e07c8334f02a2a510c37f3c77444ab/src/rendering/hiddenLine/contracts.ts#L102)

***

### evaluate()

> **evaluate**: (`u`, `v`) => [`GraphHiddenLinePoint3D`](GraphHiddenLinePoint3D.md) \| `null`

Defined in: [rendering/hiddenLine/contracts.ts:103](https://github.com/zyizyiz/VueGraphX/blob/4b7129ef16e07c8334f02a2a510c37f3c77444ab/src/rendering/hiddenLine/contracts.ts#L103)

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

Defined in: [rendering/hiddenLine/contracts.ts:104](https://github.com/zyizyiz/VueGraphX/blob/4b7129ef16e07c8334f02a2a510c37f3c77444ab/src/rendering/hiddenLine/contracts.ts#L104)
