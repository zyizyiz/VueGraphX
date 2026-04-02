[**vuegraphx**](../README.md)

***

[vuegraphx](../README.md) / GraphHiddenLineSourceDescriptor

# Interface: GraphHiddenLineSourceDescriptor\<TData\>

Defined in: [rendering/hiddenLine/contracts.ts:118](https://github.com/zyizyiz/VueGraphX/blob/9f72605fb698dc53077546b3d3b04f80b67b45d6/src/rendering/hiddenLine/contracts.ts#L118)

## Type Parameters

### TData

`TData` *extends* [`GraphHiddenLineSourceData`](../type-aliases/GraphHiddenLineSourceData.md) = [`GraphHiddenLineSourceData`](../type-aliases/GraphHiddenLineSourceData.md)

## Properties

### id?

> `optional` **id**: `string`

Defined in: [rendering/hiddenLine/contracts.ts:119](https://github.com/zyizyiz/VueGraphX/blob/9f72605fb698dc53077546b3d3b04f80b67b45d6/src/rendering/hiddenLine/contracts.ts#L119)

***

### enabled?

> `optional` **enabled**: `boolean`

Defined in: [rendering/hiddenLine/contracts.ts:120](https://github.com/zyizyiz/VueGraphX/blob/9f72605fb698dc53077546b3d3b04f80b67b45d6/src/rendering/hiddenLine/contracts.ts#L120)

***

### debugLabel?

> `optional` **debugLabel**: `string`

Defined in: [rendering/hiddenLine/contracts.ts:121](https://github.com/zyizyiz/VueGraphX/blob/9f72605fb698dc53077546b3d3b04f80b67b45d6/src/rendering/hiddenLine/contracts.ts#L121)

***

### tags?

> `optional` **tags**: `string`[]

Defined in: [rendering/hiddenLine/contracts.ts:122](https://github.com/zyizyiz/VueGraphX/blob/9f72605fb698dc53077546b3d3b04f80b67b45d6/src/rendering/hiddenLine/contracts.ts#L122)

***

### role?

> `optional` **role**: [`GraphHiddenLineOcclusionRole`](../type-aliases/GraphHiddenLineOcclusionRole.md)

Defined in: [rendering/hiddenLine/contracts.ts:123](https://github.com/zyizyiz/VueGraphX/blob/9f72605fb698dc53077546b3d3b04f80b67b45d6/src/rendering/hiddenLine/contracts.ts#L123)

***

### style?

> `optional` **style**: [`GraphHiddenLineStyleSpec`](GraphHiddenLineStyleSpec.md)

Defined in: [rendering/hiddenLine/contracts.ts:124](https://github.com/zyizyiz/VueGraphX/blob/9f72605fb698dc53077546b3d3b04f80b67b45d6/src/rendering/hiddenLine/contracts.ts#L124)

***

### overlay?

> `optional` **overlay**: [`GraphHiddenLineOverlayBehavior`](GraphHiddenLineOverlayBehavior.md)

Defined in: [rendering/hiddenLine/contracts.ts:125](https://github.com/zyizyiz/VueGraphX/blob/9f72605fb698dc53077546b3d3b04f80b67b45d6/src/rendering/hiddenLine/contracts.ts#L125)

***

### nativeTargets?

> `optional` **nativeTargets**: `Record`\<`string`, [`GraphHiddenLineNativeTargetSpec`](GraphHiddenLineNativeTargetSpec.md) \| () => `SVGElement` \| `null`\>

Defined in: [rendering/hiddenLine/contracts.ts:126](https://github.com/zyizyiz/VueGraphX/blob/9f72605fb698dc53077546b3d3b04f80b67b45d6/src/rendering/hiddenLine/contracts.ts#L126)

***

### resolve()

> **resolve**: () => `TData` \| `null`

Defined in: [rendering/hiddenLine/contracts.ts:127](https://github.com/zyizyiz/VueGraphX/blob/9f72605fb698dc53077546b3d3b04f80b67b45d6/src/rendering/hiddenLine/contracts.ts#L127)

#### Returns

`TData` \| `null`
