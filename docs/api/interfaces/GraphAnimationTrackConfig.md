[**vuegraphx**](../README.md)

***

[vuegraphx](../README.md) / GraphAnimationTrackConfig

# Interface: GraphAnimationTrackConfig

Defined in: [architecture/shapes/contracts.ts:432](https://github.com/zyizyiz/VueGraphX/blob/4b7129ef16e07c8334f02a2a510c37f3c77444ab/src/architecture/shapes/contracts.ts#L432)

创建动画轨道时使用的静态配置。

## Properties

### id

> **id**: `string`

Defined in: [architecture/shapes/contracts.ts:436](https://github.com/zyizyiz/VueGraphX/blob/4b7129ef16e07c8334f02a2a510c37f3c77444ab/src/architecture/shapes/contracts.ts#L436)

动画轨道唯一 id。

***

### label?

> `optional` **label**: `string`

Defined in: [architecture/shapes/contracts.ts:441](https://github.com/zyizyiz/VueGraphX/blob/4b7129ef16e07c8334f02a2a510c37f3c77444ab/src/architecture/shapes/contracts.ts#L441)

轨道名称。

***

### initialProgress?

> `optional` **initialProgress**: `number`

Defined in: [architecture/shapes/contracts.ts:446](https://github.com/zyizyiz/VueGraphX/blob/4b7129ef16e07c8334f02a2a510c37f3c77444ab/src/architecture/shapes/contracts.ts#L446)

初始进度值。

***

### min?

> `optional` **min**: `number`

Defined in: [architecture/shapes/contracts.ts:451](https://github.com/zyizyiz/VueGraphX/blob/4b7129ef16e07c8334f02a2a510c37f3c77444ab/src/architecture/shapes/contracts.ts#L451)

最小进度值。

***

### max?

> `optional` **max**: `number`

Defined in: [architecture/shapes/contracts.ts:456](https://github.com/zyizyiz/VueGraphX/blob/4b7129ef16e07c8334f02a2a510c37f3c77444ab/src/architecture/shapes/contracts.ts#L456)

最大进度值。

***

### step?

> `optional` **step**: `number`

Defined in: [architecture/shapes/contracts.ts:461](https://github.com/zyizyiz/VueGraphX/blob/4b7129ef16e07c8334f02a2a510c37f3c77444ab/src/architecture/shapes/contracts.ts#L461)

推荐步长。

***

### duration?

> `optional` **duration**: `number`

Defined in: [architecture/shapes/contracts.ts:466](https://github.com/zyizyiz/VueGraphX/blob/4b7129ef16e07c8334f02a2a510c37f3c77444ab/src/architecture/shapes/contracts.ts#L466)

默认播放时长，单位毫秒。

***

### loop?

> `optional` **loop**: `boolean`

Defined in: [architecture/shapes/contracts.ts:471](https://github.com/zyizyiz/VueGraphX/blob/4b7129ef16e07c8334f02a2a510c37f3c77444ab/src/architecture/shapes/contracts.ts#L471)

是否默认开启循环。

***

### yoyo?

> `optional` **yoyo**: `boolean`

Defined in: [architecture/shapes/contracts.ts:476](https://github.com/zyizyiz/VueGraphX/blob/4b7129ef16e07c8334f02a2a510c37f3c77444ab/src/architecture/shapes/contracts.ts#L476)

是否默认开启往返播放。

***

### easing?

> `optional` **easing**: [`GraphAnimationEasing`](../type-aliases/GraphAnimationEasing.md)

Defined in: [architecture/shapes/contracts.ts:481](https://github.com/zyizyiz/VueGraphX/blob/4b7129ef16e07c8334f02a2a510c37f3c77444ab/src/architecture/shapes/contracts.ts#L481)

默认缓动函数。

***

### onProgress()?

> `optional` **onProgress**: (`value`, `track`) => `void`

Defined in: [architecture/shapes/contracts.ts:486](https://github.com/zyizyiz/VueGraphX/blob/4b7129ef16e07c8334f02a2a510c37f3c77444ab/src/architecture/shapes/contracts.ts#L486)

每次进度变化时触发的回调。

#### Parameters

##### value

`number`

##### track

[`GraphAnimationTrack`](GraphAnimationTrack.md)

#### Returns

`void`
