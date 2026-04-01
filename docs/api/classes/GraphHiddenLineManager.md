[**vuegraphx**](../README.md)

***

[vuegraphx](../README.md) / GraphHiddenLineManager

# Class: GraphHiddenLineManager

Defined in: [rendering/hiddenLine/manager.ts:153](https://github.com/zyizyiz/VueGraphX/blob/4b7129ef16e07c8334f02a2a510c37f3c77444ab/src/rendering/hiddenLine/manager.ts#L153)

## Constructors

### Constructor

> **new GraphHiddenLineManager**(`boardMgr`, `options?`): `GraphHiddenLineManager`

Defined in: [rendering/hiddenLine/manager.ts:160](https://github.com/zyizyiz/VueGraphX/blob/4b7129ef16e07c8334f02a2a510c37f3c77444ab/src/rendering/hiddenLine/manager.ts#L160)

#### Parameters

##### boardMgr

`GraphHiddenLineBoardManagerContext`

##### options?

[`GraphHiddenLineOptions`](../interfaces/GraphHiddenLineOptions.md)

#### Returns

`GraphHiddenLineManager`

## Methods

### isEnabled()

> **isEnabled**(): `boolean`

Defined in: [rendering/hiddenLine/manager.ts:165](https://github.com/zyizyiz/VueGraphX/blob/4b7129ef16e07c8334f02a2a510c37f3c77444ab/src/rendering/hiddenLine/manager.ts#L165)

#### Returns

`boolean`

***

### getOptions()

> **getOptions**(): [`GraphHiddenLineOptions`](../interfaces/GraphHiddenLineOptions.md)

Defined in: [rendering/hiddenLine/manager.ts:169](https://github.com/zyizyiz/VueGraphX/blob/4b7129ef16e07c8334f02a2a510c37f3c77444ab/src/rendering/hiddenLine/manager.ts#L169)

#### Returns

[`GraphHiddenLineOptions`](../interfaces/GraphHiddenLineOptions.md)

***

### setOptions()

> **setOptions**(`options?`): `void`

Defined in: [rendering/hiddenLine/manager.ts:173](https://github.com/zyizyiz/VueGraphX/blob/4b7129ef16e07c8334f02a2a510c37f3c77444ab/src/rendering/hiddenLine/manager.ts#L173)

#### Parameters

##### options?

[`GraphHiddenLineOptions`](../interfaces/GraphHiddenLineOptions.md)

#### Returns

`void`

***

### registerSource()

> **registerSource**(`ownerId`, `descriptor`): [`GraphHiddenLineSourceHandle`](../interfaces/GraphHiddenLineSourceHandle.md)

Defined in: [rendering/hiddenLine/manager.ts:178](https://github.com/zyizyiz/VueGraphX/blob/4b7129ef16e07c8334f02a2a510c37f3c77444ab/src/rendering/hiddenLine/manager.ts#L178)

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

Defined in: [rendering/hiddenLine/manager.ts:192](https://github.com/zyizyiz/VueGraphX/blob/4b7129ef16e07c8334f02a2a510c37f3c77444ab/src/rendering/hiddenLine/manager.ts#L192)

#### Parameters

##### sourceId

`string`

#### Returns

`boolean`

***

### clearOwnerSources()

> **clearOwnerSources**(`ownerId`): `number`

Defined in: [rendering/hiddenLine/manager.ts:200](https://github.com/zyizyiz/VueGraphX/blob/4b7129ef16e07c8334f02a2a510c37f3c77444ab/src/rendering/hiddenLine/manager.ts#L200)

#### Parameters

##### ownerId

`string`

#### Returns

`number`

***

### clearAllSources()

> **clearAllSources**(): `void`

Defined in: [rendering/hiddenLine/manager.ts:208](https://github.com/zyizyiz/VueGraphX/blob/4b7129ef16e07c8334f02a2a510c37f3c77444ab/src/rendering/hiddenLine/manager.ts#L208)

#### Returns

`void`

***

### update()

> **update**(): [`GraphHiddenLineSceneSnapshot`](../interfaces/GraphHiddenLineSceneSnapshot.md)

Defined in: [rendering/hiddenLine/manager.ts:214](https://github.com/zyizyiz/VueGraphX/blob/4b7129ef16e07c8334f02a2a510c37f3c77444ab/src/rendering/hiddenLine/manager.ts#L214)

#### Returns

[`GraphHiddenLineSceneSnapshot`](../interfaces/GraphHiddenLineSceneSnapshot.md)

***

### getSnapshot()

> **getSnapshot**(): [`GraphHiddenLineSceneSnapshot`](../interfaces/GraphHiddenLineSceneSnapshot.md)

Defined in: [rendering/hiddenLine/manager.ts:255](https://github.com/zyizyiz/VueGraphX/blob/4b7129ef16e07c8334f02a2a510c37f3c77444ab/src/rendering/hiddenLine/manager.ts#L255)

#### Returns

[`GraphHiddenLineSceneSnapshot`](../interfaces/GraphHiddenLineSceneSnapshot.md)
