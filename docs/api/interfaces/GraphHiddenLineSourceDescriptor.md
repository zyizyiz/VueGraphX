[**vuegraphx**](../README.md)

***

[vuegraphx](../README.md) / GraphHiddenLineSourceDescriptor

# Interface: GraphHiddenLineSourceDescriptor\<TData\>

Defined in: [rendering/hiddenLine/contracts.ts:115](https://github.com/zyizyiz/VueGraphX/blob/4b7129ef16e07c8334f02a2a510c37f3c77444ab/src/rendering/hiddenLine/contracts.ts#L115)

## Type Parameters

### TData

`TData` *extends* [`GraphHiddenLineSourceData`](../type-aliases/GraphHiddenLineSourceData.md) = [`GraphHiddenLineSourceData`](../type-aliases/GraphHiddenLineSourceData.md)

## Properties

### id?

> `optional` **id**: `string`

Defined in: [rendering/hiddenLine/contracts.ts:116](https://github.com/zyizyiz/VueGraphX/blob/4b7129ef16e07c8334f02a2a510c37f3c77444ab/src/rendering/hiddenLine/contracts.ts#L116)

***

### enabled?

> `optional` **enabled**: `boolean`

Defined in: [rendering/hiddenLine/contracts.ts:117](https://github.com/zyizyiz/VueGraphX/blob/4b7129ef16e07c8334f02a2a510c37f3c77444ab/src/rendering/hiddenLine/contracts.ts#L117)

***

### debugLabel?

> `optional` **debugLabel**: `string`

Defined in: [rendering/hiddenLine/contracts.ts:118](https://github.com/zyizyiz/VueGraphX/blob/4b7129ef16e07c8334f02a2a510c37f3c77444ab/src/rendering/hiddenLine/contracts.ts#L118)

***

### tags?

> `optional` **tags**: `string`[]

Defined in: [rendering/hiddenLine/contracts.ts:119](https://github.com/zyizyiz/VueGraphX/blob/4b7129ef16e07c8334f02a2a510c37f3c77444ab/src/rendering/hiddenLine/contracts.ts#L119)

***

### role?

> `optional` **role**: [`GraphHiddenLineOcclusionRole`](../type-aliases/GraphHiddenLineOcclusionRole.md)

Defined in: [rendering/hiddenLine/contracts.ts:120](https://github.com/zyizyiz/VueGraphX/blob/4b7129ef16e07c8334f02a2a510c37f3c77444ab/src/rendering/hiddenLine/contracts.ts#L120)

***

### style?

> `optional` **style**: [`GraphHiddenLineStyleSpec`](GraphHiddenLineStyleSpec.md)

Defined in: [rendering/hiddenLine/contracts.ts:121](https://github.com/zyizyiz/VueGraphX/blob/4b7129ef16e07c8334f02a2a510c37f3c77444ab/src/rendering/hiddenLine/contracts.ts#L121)

***

### overlay?

> `optional` **overlay**: [`GraphHiddenLineOverlayBehavior`](GraphHiddenLineOverlayBehavior.md)

Defined in: [rendering/hiddenLine/contracts.ts:122](https://github.com/zyizyiz/VueGraphX/blob/4b7129ef16e07c8334f02a2a510c37f3c77444ab/src/rendering/hiddenLine/contracts.ts#L122)

***

### nativeTargets?

> `optional` **nativeTargets**: `Record`\<`string`, [`GraphHiddenLineNativeTargetSpec`](GraphHiddenLineNativeTargetSpec.md) \| () => `SVGElement` \| `null`\>

Defined in: [rendering/hiddenLine/contracts.ts:123](https://github.com/zyizyiz/VueGraphX/blob/4b7129ef16e07c8334f02a2a510c37f3c77444ab/src/rendering/hiddenLine/contracts.ts#L123)

***

### resolve()

> **resolve**: () => `TData` \| `null`

Defined in: [rendering/hiddenLine/contracts.ts:124](https://github.com/zyizyiz/VueGraphX/blob/4b7129ef16e07c8334f02a2a510c37f3c77444ab/src/rendering/hiddenLine/contracts.ts#L124)

#### Returns

`TData` \| `null`
