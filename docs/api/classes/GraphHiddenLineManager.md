[**vuegraphx**](../README.md)

***

[vuegraphx](../README.md) / GraphHiddenLineManager

# Class: GraphHiddenLineManager

Defined in: [rendering/hiddenLine/manager.ts:242](https://github.com/zyizyiz/VueGraphX/blob/9f72605fb698dc53077546b3d3b04f80b67b45d6/src/rendering/hiddenLine/manager.ts#L242)

## Constructors

### Constructor

> **new GraphHiddenLineManager**(`boardMgr`, `options?`): `GraphHiddenLineManager`

Defined in: [rendering/hiddenLine/manager.ts:251](https://github.com/zyizyiz/VueGraphX/blob/9f72605fb698dc53077546b3d3b04f80b67b45d6/src/rendering/hiddenLine/manager.ts#L251)

#### Parameters

##### boardMgr

`Pick`\<[`BoardManager`](BoardManager.md), `"mode"`\> & `Partial`\<`Pick`\<[`BoardManager`](BoardManager.md), `"view3d"` \| `"board"`\>\>

##### options?

[`GraphHiddenLineOptions`](../interfaces/GraphHiddenLineOptions.md)

#### Returns

`GraphHiddenLineManager`

## Methods

### isEnabled()

> **isEnabled**(): `boolean`

Defined in: [rendering/hiddenLine/manager.ts:259](https://github.com/zyizyiz/VueGraphX/blob/9f72605fb698dc53077546b3d3b04f80b67b45d6/src/rendering/hiddenLine/manager.ts#L259)

#### Returns

`boolean`

***

### getOptions()

> **getOptions**(): [`GraphHiddenLineOptions`](../interfaces/GraphHiddenLineOptions.md)

Defined in: [rendering/hiddenLine/manager.ts:263](https://github.com/zyizyiz/VueGraphX/blob/9f72605fb698dc53077546b3d3b04f80b67b45d6/src/rendering/hiddenLine/manager.ts#L263)

#### Returns

[`GraphHiddenLineOptions`](../interfaces/GraphHiddenLineOptions.md)

***

### setOptions()

> **setOptions**(`options?`): `void`

Defined in: [rendering/hiddenLine/manager.ts:267](https://github.com/zyizyiz/VueGraphX/blob/9f72605fb698dc53077546b3d3b04f80b67b45d6/src/rendering/hiddenLine/manager.ts#L267)

#### Parameters

##### options?

[`GraphHiddenLineOptions`](../interfaces/GraphHiddenLineOptions.md)

#### Returns

`void`

***

### registerSource()

> **registerSource**(`ownerId`, `descriptor`): [`GraphHiddenLineSourceHandle`](../interfaces/GraphHiddenLineSourceHandle.md)

Defined in: [rendering/hiddenLine/manager.ts:272](https://github.com/zyizyiz/VueGraphX/blob/9f72605fb698dc53077546b3d3b04f80b67b45d6/src/rendering/hiddenLine/manager.ts#L272)

#### Parameters

##### ownerId

`string`

##### descriptor

[`GraphHiddenLineSourceDescriptor`](../interfaces/GraphHiddenLineSourceDescriptor.md)

#### Returns

[`GraphHiddenLineSourceHandle`](../interfaces/GraphHiddenLineSourceHandle.md)

***

### removeSource()

> **removeSource**(`sourceId`): `boolean`

Defined in: [rendering/hiddenLine/manager.ts:286](https://github.com/zyizyiz/VueGraphX/blob/9f72605fb698dc53077546b3d3b04f80b67b45d6/src/rendering/hiddenLine/manager.ts#L286)

#### Parameters

##### sourceId

`string`

#### Returns

`boolean`

***

### clearOwnerSources()

> **clearOwnerSources**(`ownerId`): `number`

Defined in: [rendering/hiddenLine/manager.ts:294](https://github.com/zyizyiz/VueGraphX/blob/9f72605fb698dc53077546b3d3b04f80b67b45d6/src/rendering/hiddenLine/manager.ts#L294)

#### Parameters

##### ownerId

`string`

#### Returns

`number`

***

### clearAllSources()

> **clearAllSources**(): `void`

Defined in: [rendering/hiddenLine/manager.ts:302](https://github.com/zyizyiz/VueGraphX/blob/9f72605fb698dc53077546b3d3b04f80b67b45d6/src/rendering/hiddenLine/manager.ts#L302)

#### Returns

`void`

***

### update()

> **update**(): [`GraphHiddenLineSceneSnapshot`](../interfaces/GraphHiddenLineSceneSnapshot.md)

Defined in: [rendering/hiddenLine/manager.ts:308](https://github.com/zyizyiz/VueGraphX/blob/9f72605fb698dc53077546b3d3b04f80b67b45d6/src/rendering/hiddenLine/manager.ts#L308)

#### Returns

[`GraphHiddenLineSceneSnapshot`](../interfaces/GraphHiddenLineSceneSnapshot.md)

***

### getSnapshot()

> **getSnapshot**(): [`GraphHiddenLineSceneSnapshot`](../interfaces/GraphHiddenLineSceneSnapshot.md)

Defined in: [rendering/hiddenLine/manager.ts:400](https://github.com/zyizyiz/VueGraphX/blob/9f72605fb698dc53077546b3d3b04f80b67b45d6/src/rendering/hiddenLine/manager.ts#L400)

#### Returns

[`GraphHiddenLineSceneSnapshot`](../interfaces/GraphHiddenLineSceneSnapshot.md)
