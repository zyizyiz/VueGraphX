[**vuegraphx**](../README.md)

***

[vuegraphx](../README.md) / GraphAnimationTrack

# Interface: GraphAnimationTrack

Defined in: [architecture/shapes/contracts.ts:317](https://github.com/zyizyiz/VueGraphX/blob/9f72605fb698dc53077546b3d3b04f80b67b45d6/src/architecture/shapes/contracts.ts#L317)

面向图形作者暴露的公共动画轨道 API。

## Properties

### id

> `readonly` **id**: `string`

Defined in: [architecture/shapes/contracts.ts:321](https://github.com/zyizyiz/VueGraphX/blob/9f72605fb698dc53077546b3d3b04f80b67b45d6/src/architecture/shapes/contracts.ts#L321)

动画轨道唯一 id。

***

### label?

> `readonly` `optional` **label**: `string`

Defined in: [architecture/shapes/contracts.ts:326](https://github.com/zyizyiz/VueGraphX/blob/9f72605fb698dc53077546b3d3b04f80b67b45d6/src/architecture/shapes/contracts.ts#L326)

展示给用户的轨道名称。

***

### progress

> `readonly` **progress**: `number`

Defined in: [architecture/shapes/contracts.ts:331](https://github.com/zyizyiz/VueGraphX/blob/9f72605fb698dc53077546b3d3b04f80b67b45d6/src/architecture/shapes/contracts.ts#L331)

当前进度值。

***

### isAnimating

> `readonly` **isAnimating**: `boolean`

Defined in: [architecture/shapes/contracts.ts:336](https://github.com/zyizyiz/VueGraphX/blob/9f72605fb698dc53077546b3d3b04f80b67b45d6/src/architecture/shapes/contracts.ts#L336)

当前是否正在播放。

***

### isPaused

> `readonly` **isPaused**: `boolean`

Defined in: [architecture/shapes/contracts.ts:341](https://github.com/zyizyiz/VueGraphX/blob/9f72605fb698dc53077546b3d3b04f80b67b45d6/src/architecture/shapes/contracts.ts#L341)

当前是否处于暂停状态。

***

### loop

> `readonly` **loop**: `boolean`

Defined in: [architecture/shapes/contracts.ts:346](https://github.com/zyizyiz/VueGraphX/blob/9f72605fb698dc53077546b3d3b04f80b67b45d6/src/architecture/shapes/contracts.ts#L346)

是否循环播放。

***

### yoyo

> `readonly` **yoyo**: `boolean`

Defined in: [architecture/shapes/contracts.ts:351](https://github.com/zyizyiz/VueGraphX/blob/9f72605fb698dc53077546b3d3b04f80b67b45d6/src/architecture/shapes/contracts.ts#L351)

是否启用往返播放。

***

### min

> `readonly` **min**: `number`

Defined in: [architecture/shapes/contracts.ts:356](https://github.com/zyizyiz/VueGraphX/blob/9f72605fb698dc53077546b3d3b04f80b67b45d6/src/architecture/shapes/contracts.ts#L356)

最小进度值。

***

### max

> `readonly` **max**: `number`

Defined in: [architecture/shapes/contracts.ts:361](https://github.com/zyizyiz/VueGraphX/blob/9f72605fb698dc53077546b3d3b04f80b67b45d6/src/architecture/shapes/contracts.ts#L361)

最大进度值。

***

### step

> `readonly` **step**: `number`

Defined in: [architecture/shapes/contracts.ts:366](https://github.com/zyizyiz/VueGraphX/blob/9f72605fb698dc53077546b3d3b04f80b67b45d6/src/architecture/shapes/contracts.ts#L366)

推荐的进度步长。

***

### duration

> `readonly` **duration**: `number`

Defined in: [architecture/shapes/contracts.ts:371](https://github.com/zyizyiz/VueGraphX/blob/9f72605fb698dc53077546b3d3b04f80b67b45d6/src/architecture/shapes/contracts.ts#L371)

默认播放时长，单位毫秒。

## Methods

### playTo()

> **playTo**(`target`, `options?`): `void`

Defined in: [architecture/shapes/contracts.ts:376](https://github.com/zyizyiz/VueGraphX/blob/9f72605fb698dc53077546b3d3b04f80b67b45d6/src/architecture/shapes/contracts.ts#L376)

播放到目标进度值。

#### Parameters

##### target

`number`

##### options?

[`GraphAnimationPlaybackOptions`](GraphAnimationPlaybackOptions.md)

#### Returns

`void`

***

### playForward()

> **playForward**(`options?`): `void`

Defined in: [architecture/shapes/contracts.ts:381](https://github.com/zyizyiz/VueGraphX/blob/9f72605fb698dc53077546b3d3b04f80b67b45d6/src/architecture/shapes/contracts.ts#L381)

向最大值方向播放。

#### Parameters

##### options?

[`GraphAnimationPlaybackOptions`](GraphAnimationPlaybackOptions.md)

#### Returns

`void`

***

### playBackward()

> **playBackward**(`options?`): `void`

Defined in: [architecture/shapes/contracts.ts:386](https://github.com/zyizyiz/VueGraphX/blob/9f72605fb698dc53077546b3d3b04f80b67b45d6/src/architecture/shapes/contracts.ts#L386)

向最小值方向播放。

#### Parameters

##### options?

[`GraphAnimationPlaybackOptions`](GraphAnimationPlaybackOptions.md)

#### Returns

`void`

***

### pause()

> **pause**(): `void`

Defined in: [architecture/shapes/contracts.ts:391](https://github.com/zyizyiz/VueGraphX/blob/9f72605fb698dc53077546b3d3b04f80b67b45d6/src/architecture/shapes/contracts.ts#L391)

暂停当前播放。

#### Returns

`void`

***

### resume()

> **resume**(): `void`

Defined in: [architecture/shapes/contracts.ts:396](https://github.com/zyizyiz/VueGraphX/blob/9f72605fb698dc53077546b3d3b04f80b67b45d6/src/architecture/shapes/contracts.ts#L396)

恢复已暂停的播放。

#### Returns

`void`

***

### stop()

> **stop**(): `void`

Defined in: [architecture/shapes/contracts.ts:401](https://github.com/zyizyiz/VueGraphX/blob/9f72605fb698dc53077546b3d3b04f80b67b45d6/src/architecture/shapes/contracts.ts#L401)

终止当前播放并停留在当前进度。

#### Returns

`void`

***

### setLoop()

> **setLoop**(`enabled`): `void`

Defined in: [architecture/shapes/contracts.ts:406](https://github.com/zyizyiz/VueGraphX/blob/9f72605fb698dc53077546b3d3b04f80b67b45d6/src/architecture/shapes/contracts.ts#L406)

显式设置循环开关。

#### Parameters

##### enabled

`boolean`

#### Returns

`void`

***

### toggleLoop()

> **toggleLoop**(): `void`

Defined in: [architecture/shapes/contracts.ts:411](https://github.com/zyizyiz/VueGraphX/blob/9f72605fb698dc53077546b3d3b04f80b67b45d6/src/architecture/shapes/contracts.ts#L411)

切换循环开关。

#### Returns

`void`

***

### setYoyo()

> **setYoyo**(`enabled`): `void`

Defined in: [architecture/shapes/contracts.ts:416](https://github.com/zyizyiz/VueGraphX/blob/9f72605fb698dc53077546b3d3b04f80b67b45d6/src/architecture/shapes/contracts.ts#L416)

显式设置往返播放开关。

#### Parameters

##### enabled

`boolean`

#### Returns

`void`

***

### toggleYoyo()

> **toggleYoyo**(): `void`

Defined in: [architecture/shapes/contracts.ts:421](https://github.com/zyizyiz/VueGraphX/blob/9f72605fb698dc53077546b3d3b04f80b67b45d6/src/architecture/shapes/contracts.ts#L421)

切换往返播放开关。

#### Returns

`void`

***

### setProgress()

> **setProgress**(`value`): `void`

Defined in: [architecture/shapes/contracts.ts:426](https://github.com/zyizyiz/VueGraphX/blob/9f72605fb698dc53077546b3d3b04f80b67b45d6/src/architecture/shapes/contracts.ts#L426)

直接设置当前进度值。

#### Parameters

##### value

`number`

#### Returns

`void`
