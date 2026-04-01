[**vuegraphx**](../README.md)

***

[vuegraphx](../README.md) / ColorStyleCapabilityContract

# Interface: ColorStyleCapabilityContract

Defined in: [architecture/capabilities/contracts.ts:94](https://github.com/zyizyiz/VueGraphX/blob/4b7129ef16e07c8334f02a2a510c37f3c77444ab/src/architecture/capabilities/contracts.ts#L94)

面向单个描边或填充颜色入口的能力契约。

## Properties

### active

> **active**: `boolean`

Defined in: [architecture/capabilities/contracts.ts:98](https://github.com/zyizyiz/VueGraphX/blob/4b7129ef16e07c8334f02a2a510c37f3c77444ab/src/architecture/capabilities/contracts.ts#L98)

当前颜色选择能力是否处于激活态。

***

### selectedColor

> **selectedColor**: `string`

Defined in: [architecture/capabilities/contracts.ts:103](https://github.com/zyizyiz/VueGraphX/blob/4b7129ef16e07c8334f02a2a510c37f3c77444ab/src/architecture/capabilities/contracts.ts#L103)

当前选中的颜色。

***

### activate()

> **activate**: () => `void`

Defined in: [architecture/capabilities/contracts.ts:108](https://github.com/zyizyiz/VueGraphX/blob/4b7129ef16e07c8334f02a2a510c37f3c77444ab/src/architecture/capabilities/contracts.ts#L108)

激活颜色选择流程。

#### Returns

`void`

***

### applyColor()

> **applyColor**: (`color`) => `void`

Defined in: [architecture/capabilities/contracts.ts:113](https://github.com/zyizyiz/VueGraphX/blob/4b7129ef16e07c8334f02a2a510c37f3c77444ab/src/architecture/capabilities/contracts.ts#L113)

应用新的颜色值。

#### Parameters

##### color

`string`

#### Returns

`void`
