[**vuegraphx**](../README.md)

***

[vuegraphx](../README.md) / GraphHiddenLineRegistry

# Class: GraphHiddenLineRegistry

Defined in: [rendering/hiddenLine/registry.ts:7](https://github.com/zyizyiz/VueGraphX/blob/9f72605fb698dc53077546b3d3b04f80b67b45d6/src/rendering/hiddenLine/registry.ts#L7)

## Constructors

### Constructor

> **new GraphHiddenLineRegistry**(): `GraphHiddenLineRegistry`

#### Returns

`GraphHiddenLineRegistry`

## Methods

### register()

> **register**\<`TData`\>(`ownerId`, `descriptor`): [`GraphHiddenLineSourceRecord`](../interfaces/GraphHiddenLineSourceRecord.md)\<`TData`\>

Defined in: [rendering/hiddenLine/registry.ts:13](https://github.com/zyizyiz/VueGraphX/blob/9f72605fb698dc53077546b3d3b04f80b67b45d6/src/rendering/hiddenLine/registry.ts#L13)

#### Type Parameters

##### TData

`TData` *extends* [`GraphHiddenLineSourceData`](../type-aliases/GraphHiddenLineSourceData.md)

#### Parameters

##### ownerId

`string`

##### descriptor

[`GraphHiddenLineSourceDescriptor`](../interfaces/GraphHiddenLineSourceDescriptor.md)\<`TData`\>

#### Returns

[`GraphHiddenLineSourceRecord`](../interfaces/GraphHiddenLineSourceRecord.md)\<`TData`\>

***

### get()

> **get**(`sourceId`): [`GraphHiddenLineSourceRecord`](../interfaces/GraphHiddenLineSourceRecord.md)\<[`GraphHiddenLineSourceData`](../type-aliases/GraphHiddenLineSourceData.md)\> \| `null`

Defined in: [rendering/hiddenLine/registry.ts:44](https://github.com/zyizyiz/VueGraphX/blob/9f72605fb698dc53077546b3d3b04f80b67b45d6/src/rendering/hiddenLine/registry.ts#L44)

#### Parameters

##### sourceId

`string`

#### Returns

[`GraphHiddenLineSourceRecord`](../interfaces/GraphHiddenLineSourceRecord.md)\<[`GraphHiddenLineSourceData`](../type-aliases/GraphHiddenLineSourceData.md)\> \| `null`

***

### list()

> **list**(): [`GraphHiddenLineSourceRecord`](../interfaces/GraphHiddenLineSourceRecord.md)\<[`GraphHiddenLineSourceData`](../type-aliases/GraphHiddenLineSourceData.md)\>[]

Defined in: [rendering/hiddenLine/registry.ts:48](https://github.com/zyizyiz/VueGraphX/blob/9f72605fb698dc53077546b3d3b04f80b67b45d6/src/rendering/hiddenLine/registry.ts#L48)

#### Returns

[`GraphHiddenLineSourceRecord`](../interfaces/GraphHiddenLineSourceRecord.md)\<[`GraphHiddenLineSourceData`](../type-aliases/GraphHiddenLineSourceData.md)\>[]

***

### remove()

> **remove**(`sourceId`): `boolean`

Defined in: [rendering/hiddenLine/registry.ts:52](https://github.com/zyizyiz/VueGraphX/blob/9f72605fb698dc53077546b3d3b04f80b67b45d6/src/rendering/hiddenLine/registry.ts#L52)

#### Parameters

##### sourceId

`string`

#### Returns

`boolean`

***

### clearOwner()

> **clearOwner**(`ownerId`): `string`[]

Defined in: [rendering/hiddenLine/registry.ts:67](https://github.com/zyizyiz/VueGraphX/blob/9f72605fb698dc53077546b3d3b04f80b67b45d6/src/rendering/hiddenLine/registry.ts#L67)

#### Parameters

##### ownerId

`string`

#### Returns

`string`[]

***

### clear()

> **clear**(): `void`

Defined in: [rendering/hiddenLine/registry.ts:80](https://github.com/zyizyiz/VueGraphX/blob/9f72605fb698dc53077546b3d3b04f80b67b45d6/src/rendering/hiddenLine/registry.ts#L80)

#### Returns

`void`

***

### size()

> **size**(): `number`

Defined in: [rendering/hiddenLine/registry.ts:85](https://github.com/zyizyiz/VueGraphX/blob/9f72605fb698dc53077546b3d3b04f80b67b45d6/src/rendering/hiddenLine/registry.ts#L85)

#### Returns

`number`

***

### ownerCount()

> **ownerCount**(): `number`

Defined in: [rendering/hiddenLine/registry.ts:89](https://github.com/zyizyiz/VueGraphX/blob/9f72605fb698dc53077546b3d3b04f80b67b45d6/src/rendering/hiddenLine/registry.ts#L89)

#### Returns

`number`
