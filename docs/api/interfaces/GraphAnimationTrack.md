[**vuegraphx**](../README.md)

***

[vuegraphx](../README.md) / GraphAnimationTrack

# Interface: GraphAnimationTrack

Defined in: [architecture/shapes/contracts.ts:299](https://github.com/zyizyiz/VueGraphX/blob/708b133750b40c4618f980ee3f1e94c99bc50898/src/architecture/shapes/contracts.ts#L299)

面向图形作者暴露的公共动画轨道 API。

## Properties

### id

> `readonly` **id**: `string`

Defined in: [architecture/shapes/contracts.ts:303](https://github.com/zyizyiz/VueGraphX/blob/708b133750b40c4618f980ee3f1e94c99bc50898/src/architecture/shapes/contracts.ts#L303)

动画轨道唯一 id。

***

### label?

> `readonly` `optional` **label**: `string`

Defined in: [architecture/shapes/contracts.ts:308](https://github.com/zyizyiz/VueGraphX/blob/708b133750b40c4618f980ee3f1e94c99bc50898/src/architecture/shapes/contracts.ts#L308)

展示给用户的轨道名称。

***

### progress

> `readonly` **progress**: `number`

Defined in: [architecture/shapes/contracts.ts:313](https://github.com/zyizyiz/VueGraphX/blob/708b133750b40c4618f980ee3f1e94c99bc50898/src/architecture/shapes/contracts.ts#L313)

当前进度值。

***

### isAnimating

> `readonly` **isAnimating**: `boolean`

Defined in: [architecture/shapes/contracts.ts:318](https://github.com/zyizyiz/VueGraphX/blob/708b133750b40c4618f980ee3f1e94c99bc50898/src/architecture/shapes/contracts.ts#L318)

当前是否正在播放。

***

### isPaused

> `readonly` **isPaused**: `boolean`

Defined in: [architecture/shapes/contracts.ts:323](https://github.com/zyizyiz/VueGraphX/blob/708b133750b40c4618f980ee3f1e94c99bc50898/src/architecture/shapes/contracts.ts#L323)

当前是否处于暂停状态。

***

### loop

> `readonly` **loop**: `boolean`

Defined in: [architecture/shapes/contracts.ts:328](https://github.com/zyizyiz/VueGraphX/blob/708b133750b40c4618f980ee3f1e94c99bc50898/src/architecture/shapes/contracts.ts#L328)

是否循环播放。

***

### yoyo

> `readonly` **yoyo**: `boolean`

Defined in: [architecture/shapes/contracts.ts:333](https://github.com/zyizyiz/VueGraphX/blob/708b133750b40c4618f980ee3f1e94c99bc50898/src/architecture/shapes/contracts.ts#L333)

是否启用往返播放。

***

### min

> `readonly` **min**: `number`

Defined in: [architecture/shapes/contracts.ts:338](https://github.com/zyizyiz/VueGraphX/blob/708b133750b40c4618f980ee3f1e94c99bc50898/src/architecture/shapes/contracts.ts#L338)

最小进度值。

***

### max

> `readonly` **max**: `number`

Defined in: [architecture/shapes/contracts.ts:343](https://github.com/zyizyiz/VueGraphX/blob/708b133750b40c4618f980ee3f1e94c99bc50898/src/architecture/shapes/contracts.ts#L343)

最大进度值。

***

### step

> `readonly` **step**: `number`

Defined in: [architecture/shapes/contracts.ts:348](https://github.com/zyizyiz/VueGraphX/blob/708b133750b40c4618f980ee3f1e94c99bc50898/src/architecture/shapes/contracts.ts#L348)

推荐的进度步长。

***

### duration

> `readonly` **duration**: `number`

Defined in: [architecture/shapes/contracts.ts:353](https://github.com/zyizyiz/VueGraphX/blob/708b133750b40c4618f980ee3f1e94c99bc50898/src/architecture/shapes/contracts.ts#L353)

默认播放时长，单位毫秒。

## Methods

### playTo()

> **playTo**(`target`, `options?`): `void`

Defined in: [architecture/shapes/contracts.ts:358](https://github.com/zyizyiz/VueGraphX/blob/708b133750b40c4618f980ee3f1e94c99bc50898/src/architecture/shapes/contracts.ts#L358)

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

Defined in: [architecture/shapes/contracts.ts:363](https://github.com/zyizyiz/VueGraphX/blob/708b133750b40c4618f980ee3f1e94c99bc50898/src/architecture/shapes/contracts.ts#L363)

向最大值方向播放。

#### Parameters

##### options?

[`GraphAnimationPlaybackOptions`](GraphAnimationPlaybackOptions.md)

#### Returns

`void`

***

### playBackward()

> **playBackward**(`options?`): `void`

Defined in: [architecture/shapes/contracts.ts:368](https://github.com/zyizyiz/VueGraphX/blob/708b133750b40c4618f980ee3f1e94c99bc50898/src/architecture/shapes/contracts.ts#L368)

向最小值方向播放。

#### Parameters

##### options?

[`GraphAnimationPlaybackOptions`](GraphAnimationPlaybackOptions.md)

#### Returns

`void`

***

### pause()

> **pause**(): `void`

Defined in: [architecture/shapes/contracts.ts:373](https://github.com/zyizyiz/VueGraphX/blob/708b133750b40c4618f980ee3f1e94c99bc50898/src/architecture/shapes/contracts.ts#L373)

暂停当前播放。

#### Returns

`void`

***

### resume()

> **resume**(): `void`

Defined in: [architecture/shapes/contracts.ts:378](https://github.com/zyizyiz/VueGraphX/blob/708b133750b40c4618f980ee3f1e94c99bc50898/src/architecture/shapes/contracts.ts#L378)

恢复已暂停的播放。

#### Returns

`void`

***

### stop()

> **stop**(): `void`

Defined in: [architecture/shapes/contracts.ts:383](https://github.com/zyizyiz/VueGraphX/blob/708b133750b40c4618f980ee3f1e94c99bc50898/src/architecture/shapes/contracts.ts#L383)

终止当前播放并停留在当前进度。

#### Returns

`void`

***

### setLoop()

> **setLoop**(`enabled`): `void`

Defined in: [architecture/shapes/contracts.ts:388](https://github.com/zyizyiz/VueGraphX/blob/708b133750b40c4618f980ee3f1e94c99bc50898/src/architecture/shapes/contracts.ts#L388)

显式设置循环开关。

#### Parameters

##### enabled

`boolean`

#### Returns

`void`

***

### toggleLoop()

> **toggleLoop**(): `void`

Defined in: [architecture/shapes/contracts.ts:393](https://github.com/zyizyiz/VueGraphX/blob/708b133750b40c4618f980ee3f1e94c99bc50898/src/architecture/shapes/contracts.ts#L393)

切换循环开关。

#### Returns

`void`

***

### setYoyo()

> **setYoyo**(`enabled`): `void`

Defined in: [architecture/shapes/contracts.ts:398](https://github.com/zyizyiz/VueGraphX/blob/708b133750b40c4618f980ee3f1e94c99bc50898/src/architecture/shapes/contracts.ts#L398)

显式设置往返播放开关。

#### Parameters

##### enabled

`boolean`

#### Returns

`void`

***

### toggleYoyo()

> **toggleYoyo**(): `void`

Defined in: [architecture/shapes/contracts.ts:403](https://github.com/zyizyiz/VueGraphX/blob/708b133750b40c4618f980ee3f1e94c99bc50898/src/architecture/shapes/contracts.ts#L403)

切换往返播放开关。

#### Returns

`void`

***

### setProgress()

> **setProgress**(`value`): `void`

Defined in: [architecture/shapes/contracts.ts:408](https://github.com/zyizyiz/VueGraphX/blob/708b133750b40c4618f980ee3f1e94c99bc50898/src/architecture/shapes/contracts.ts#L408)

直接设置当前进度值。

#### Parameters

##### value

`number`

#### Returns

`void`
