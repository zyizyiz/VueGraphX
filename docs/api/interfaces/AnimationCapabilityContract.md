[**vuegraphx**](../README.md)

***

[vuegraphx](../README.md) / AnimationCapabilityContract

# Interface: AnimationCapabilityContract

Defined in: [architecture/capabilities/contracts.ts:154](https://github.com/zyizyiz/VueGraphX/blob/9f72605fb698dc53077546b3d3b04f80b67b45d6/src/architecture/capabilities/contracts.ts#L154)

单条动画轨道在运行时暴露的能力契约。

## Properties

### id

> **id**: `string`

Defined in: [architecture/capabilities/contracts.ts:158](https://github.com/zyizyiz/VueGraphX/blob/9f72605fb698dc53077546b3d3b04f80b67b45d6/src/architecture/capabilities/contracts.ts#L158)

动画轨道 id。

***

### label?

> `optional` **label**: `string`

Defined in: [architecture/capabilities/contracts.ts:163](https://github.com/zyizyiz/VueGraphX/blob/9f72605fb698dc53077546b3d3b04f80b67b45d6/src/architecture/capabilities/contracts.ts#L163)

轨道显示名称。

***

### isAnimating

> **isAnimating**: `boolean`

Defined in: [architecture/capabilities/contracts.ts:168](https://github.com/zyizyiz/VueGraphX/blob/9f72605fb698dc53077546b3d3b04f80b67b45d6/src/architecture/capabilities/contracts.ts#L168)

当前是否正在播放。

***

### isPaused

> **isPaused**: `boolean`

Defined in: [architecture/capabilities/contracts.ts:173](https://github.com/zyizyiz/VueGraphX/blob/9f72605fb698dc53077546b3d3b04f80b67b45d6/src/architecture/capabilities/contracts.ts#L173)

当前是否已暂停。

***

### loop

> **loop**: `boolean`

Defined in: [architecture/capabilities/contracts.ts:178](https://github.com/zyizyiz/VueGraphX/blob/9f72605fb698dc53077546b3d3b04f80b67b45d6/src/architecture/capabilities/contracts.ts#L178)

是否开启循环播放。

***

### yoyo

> **yoyo**: `boolean`

Defined in: [architecture/capabilities/contracts.ts:183](https://github.com/zyizyiz/VueGraphX/blob/9f72605fb698dc53077546b3d3b04f80b67b45d6/src/architecture/capabilities/contracts.ts#L183)

是否开启往返播放。

***

### progress

> **progress**: `number`

Defined in: [architecture/capabilities/contracts.ts:188](https://github.com/zyizyiz/VueGraphX/blob/9f72605fb698dc53077546b3d3b04f80b67b45d6/src/architecture/capabilities/contracts.ts#L188)

当前播放进度。

***

### min?

> `optional` **min**: `number`

Defined in: [architecture/capabilities/contracts.ts:193](https://github.com/zyizyiz/VueGraphX/blob/9f72605fb698dc53077546b3d3b04f80b67b45d6/src/architecture/capabilities/contracts.ts#L193)

允许的最小进度值。

***

### max?

> `optional` **max**: `number`

Defined in: [architecture/capabilities/contracts.ts:198](https://github.com/zyizyiz/VueGraphX/blob/9f72605fb698dc53077546b3d3b04f80b67b45d6/src/architecture/capabilities/contracts.ts#L198)

允许的最大进度值。

***

### step?

> `optional` **step**: `number`

Defined in: [architecture/capabilities/contracts.ts:203](https://github.com/zyizyiz/VueGraphX/blob/9f72605fb698dc53077546b3d3b04f80b67b45d6/src/architecture/capabilities/contracts.ts#L203)

建议 UI 使用的步长。

***

### playForward()

> **playForward**: () => `void`

Defined in: [architecture/capabilities/contracts.ts:208](https://github.com/zyizyiz/VueGraphX/blob/9f72605fb698dc53077546b3d3b04f80b67b45d6/src/architecture/capabilities/contracts.ts#L208)

向最大值方向播放。

#### Returns

`void`

***

### playBackward()

> **playBackward**: () => `void`

Defined in: [architecture/capabilities/contracts.ts:213](https://github.com/zyizyiz/VueGraphX/blob/9f72605fb698dc53077546b3d3b04f80b67b45d6/src/architecture/capabilities/contracts.ts#L213)

向最小值方向播放。

#### Returns

`void`

***

### pause()

> **pause**: () => `void`

Defined in: [architecture/capabilities/contracts.ts:218](https://github.com/zyizyiz/VueGraphX/blob/9f72605fb698dc53077546b3d3b04f80b67b45d6/src/architecture/capabilities/contracts.ts#L218)

暂停当前播放。

#### Returns

`void`

***

### resume()

> **resume**: () => `void`

Defined in: [architecture/capabilities/contracts.ts:223](https://github.com/zyizyiz/VueGraphX/blob/9f72605fb698dc53077546b3d3b04f80b67b45d6/src/architecture/capabilities/contracts.ts#L223)

恢复暂停中的播放。

#### Returns

`void`

***

### stop()

> **stop**: () => `void`

Defined in: [architecture/capabilities/contracts.ts:228](https://github.com/zyizyiz/VueGraphX/blob/9f72605fb698dc53077546b3d3b04f80b67b45d6/src/architecture/capabilities/contracts.ts#L228)

停止播放并停留在当前进度。

#### Returns

`void`

***

### setLoop()

> **setLoop**: (`enabled`) => `void`

Defined in: [architecture/capabilities/contracts.ts:233](https://github.com/zyizyiz/VueGraphX/blob/9f72605fb698dc53077546b3d3b04f80b67b45d6/src/architecture/capabilities/contracts.ts#L233)

显式设置循环开关。

#### Parameters

##### enabled

`boolean`

#### Returns

`void`

***

### toggleLoop()

> **toggleLoop**: () => `void`

Defined in: [architecture/capabilities/contracts.ts:238](https://github.com/zyizyiz/VueGraphX/blob/9f72605fb698dc53077546b3d3b04f80b67b45d6/src/architecture/capabilities/contracts.ts#L238)

切换循环开关。

#### Returns

`void`

***

### setYoyo()

> **setYoyo**: (`enabled`) => `void`

Defined in: [architecture/capabilities/contracts.ts:243](https://github.com/zyizyiz/VueGraphX/blob/9f72605fb698dc53077546b3d3b04f80b67b45d6/src/architecture/capabilities/contracts.ts#L243)

显式设置往返播放开关。

#### Parameters

##### enabled

`boolean`

#### Returns

`void`

***

### toggleYoyo()

> **toggleYoyo**: () => `void`

Defined in: [architecture/capabilities/contracts.ts:248](https://github.com/zyizyiz/VueGraphX/blob/9f72605fb698dc53077546b3d3b04f80b67b45d6/src/architecture/capabilities/contracts.ts#L248)

切换往返播放开关。

#### Returns

`void`

***

### setProgress()

> **setProgress**: (`value`) => `void`

Defined in: [architecture/capabilities/contracts.ts:253](https://github.com/zyizyiz/VueGraphX/blob/9f72605fb698dc53077546b3d3b04f80b67b45d6/src/architecture/capabilities/contracts.ts#L253)

直接跳转到指定进度。

#### Parameters

##### value

`number`

#### Returns

`void`
