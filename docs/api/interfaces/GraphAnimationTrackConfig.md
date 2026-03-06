[**vuegraphx**](../README.md)

***

[vuegraphx](../README.md) / GraphAnimationTrackConfig

# Interface: GraphAnimationTrackConfig

Defined in: [architecture/shapes/contracts.ts:414](https://github.com/zyizyiz/VueGraphX/blob/708b133750b40c4618f980ee3f1e94c99bc50898/src/architecture/shapes/contracts.ts#L414)

创建动画轨道时使用的静态配置。

## Properties

### id

> **id**: `string`

Defined in: [architecture/shapes/contracts.ts:418](https://github.com/zyizyiz/VueGraphX/blob/708b133750b40c4618f980ee3f1e94c99bc50898/src/architecture/shapes/contracts.ts#L418)

动画轨道唯一 id。

***

### label?

> `optional` **label**: `string`

Defined in: [architecture/shapes/contracts.ts:423](https://github.com/zyizyiz/VueGraphX/blob/708b133750b40c4618f980ee3f1e94c99bc50898/src/architecture/shapes/contracts.ts#L423)

轨道名称。

***

### initialProgress?

> `optional` **initialProgress**: `number`

Defined in: [architecture/shapes/contracts.ts:428](https://github.com/zyizyiz/VueGraphX/blob/708b133750b40c4618f980ee3f1e94c99bc50898/src/architecture/shapes/contracts.ts#L428)

初始进度值。

***

### min?

> `optional` **min**: `number`

Defined in: [architecture/shapes/contracts.ts:433](https://github.com/zyizyiz/VueGraphX/blob/708b133750b40c4618f980ee3f1e94c99bc50898/src/architecture/shapes/contracts.ts#L433)

最小进度值。

***

### max?

> `optional` **max**: `number`

Defined in: [architecture/shapes/contracts.ts:438](https://github.com/zyizyiz/VueGraphX/blob/708b133750b40c4618f980ee3f1e94c99bc50898/src/architecture/shapes/contracts.ts#L438)

最大进度值。

***

### step?

> `optional` **step**: `number`

Defined in: [architecture/shapes/contracts.ts:443](https://github.com/zyizyiz/VueGraphX/blob/708b133750b40c4618f980ee3f1e94c99bc50898/src/architecture/shapes/contracts.ts#L443)

推荐步长。

***

### duration?

> `optional` **duration**: `number`

Defined in: [architecture/shapes/contracts.ts:448](https://github.com/zyizyiz/VueGraphX/blob/708b133750b40c4618f980ee3f1e94c99bc50898/src/architecture/shapes/contracts.ts#L448)

默认播放时长，单位毫秒。

***

### loop?

> `optional` **loop**: `boolean`

Defined in: [architecture/shapes/contracts.ts:453](https://github.com/zyizyiz/VueGraphX/blob/708b133750b40c4618f980ee3f1e94c99bc50898/src/architecture/shapes/contracts.ts#L453)

是否默认开启循环。

***

### yoyo?

> `optional` **yoyo**: `boolean`

Defined in: [architecture/shapes/contracts.ts:458](https://github.com/zyizyiz/VueGraphX/blob/708b133750b40c4618f980ee3f1e94c99bc50898/src/architecture/shapes/contracts.ts#L458)

是否默认开启往返播放。

***

### easing?

> `optional` **easing**: [`GraphAnimationEasing`](../type-aliases/GraphAnimationEasing.md)

Defined in: [architecture/shapes/contracts.ts:463](https://github.com/zyizyiz/VueGraphX/blob/708b133750b40c4618f980ee3f1e94c99bc50898/src/architecture/shapes/contracts.ts#L463)

默认缓动函数。

***

### onProgress()?

> `optional` **onProgress**: (`value`, `track`) => `void`

Defined in: [architecture/shapes/contracts.ts:468](https://github.com/zyizyiz/VueGraphX/blob/708b133750b40c4618f980ee3f1e94c99bc50898/src/architecture/shapes/contracts.ts#L468)

每次进度变化时触发的回调。

#### Parameters

##### value

`number`

##### track

[`GraphAnimationTrack`](GraphAnimationTrack.md)

#### Returns

`void`
