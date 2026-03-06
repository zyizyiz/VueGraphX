[**vuegraphx**](../README.md)

***

[vuegraphx](../README.md) / ResizeCapabilityContract

# Interface: ResizeCapabilityContract

Defined in: [architecture/capabilities/contracts.ts:19](https://github.com/zyizyiz/VueGraphX/blob/708b133750b40c4618f980ee3f1e94c99bc50898/src/architecture/capabilities/contracts.ts#L19)

暴露数值型缩放或尺寸控制的能力契约。

## Properties

### active

> **active**: `boolean`

Defined in: [architecture/capabilities/contracts.ts:23](https://github.com/zyizyiz/VueGraphX/blob/708b133750b40c4618f980ee3f1e94c99bc50898/src/architecture/capabilities/contracts.ts#L23)

当前 resize 面板或交互是否处于激活态。

***

### value

> **value**: `number`

Defined in: [architecture/capabilities/contracts.ts:28](https://github.com/zyizyiz/VueGraphX/blob/708b133750b40c4618f980ee3f1e94c99bc50898/src/architecture/capabilities/contracts.ts#L28)

当前尺寸或缩放值。

***

### min?

> `optional` **min**: `number`

Defined in: [architecture/capabilities/contracts.ts:33](https://github.com/zyizyiz/VueGraphX/blob/708b133750b40c4618f980ee3f1e94c99bc50898/src/architecture/capabilities/contracts.ts#L33)

允许的最小值。

***

### max?

> `optional` **max**: `number`

Defined in: [architecture/capabilities/contracts.ts:38](https://github.com/zyizyiz/VueGraphX/blob/708b133750b40c4618f980ee3f1e94c99bc50898/src/architecture/capabilities/contracts.ts#L38)

允许的最大值。

***

### step?

> `optional` **step**: `number`

Defined in: [architecture/capabilities/contracts.ts:43](https://github.com/zyizyiz/VueGraphX/blob/708b133750b40c4618f980ee3f1e94c99bc50898/src/architecture/capabilities/contracts.ts#L43)

建议 UI 使用的调节步长。

***

### toggle()

> **toggle**: () => `void`

Defined in: [architecture/capabilities/contracts.ts:48](https://github.com/zyizyiz/VueGraphX/blob/708b133750b40c4618f980ee3f1e94c99bc50898/src/architecture/capabilities/contracts.ts#L48)

切换 resize 交互开关。

#### Returns

`void`

***

### setValue()

> **setValue**: (`value`) => `void`

Defined in: [architecture/capabilities/contracts.ts:53](https://github.com/zyizyiz/VueGraphX/blob/708b133750b40c4618f980ee3f1e94c99bc50898/src/architecture/capabilities/contracts.ts#L53)

显式设置数值。

#### Parameters

##### value

`number`

#### Returns

`void`
