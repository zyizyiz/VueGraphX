[**vuegraphx**](../README.md)

***

[vuegraphx](../README.md) / SplitCapabilityContract

# Interface: SplitCapabilityContract

Defined in: [architecture/capabilities/contracts.ts:119](https://github.com/zyizyiz/VueGraphX/blob/9f72605fb698dc53077546b3d3b04f80b67b45d6/src/architecture/capabilities/contracts.ts#L119)

两阶段拆分流程的能力契约。

## Properties

### active

> **active**: `boolean`

Defined in: [architecture/capabilities/contracts.ts:123](https://github.com/zyizyiz/VueGraphX/blob/9f72605fb698dc53077546b3d3b04f80b67b45d6/src/architecture/capabilities/contracts.ts#L123)

当前拆分流程是否已进入编辑态。

***

### hasDraft

> **hasDraft**: `boolean`

Defined in: [architecture/capabilities/contracts.ts:128](https://github.com/zyizyiz/VueGraphX/blob/9f72605fb698dc53077546b3d3b04f80b67b45d6/src/architecture/capabilities/contracts.ts#L128)

当前是否已存在待确认的草稿结果。

***

### canConfirm

> **canConfirm**: `boolean`

Defined in: [architecture/capabilities/contracts.ts:133](https://github.com/zyizyiz/VueGraphX/blob/9f72605fb698dc53077546b3d3b04f80b67b45d6/src/architecture/capabilities/contracts.ts#L133)

当前草稿是否满足确认条件。

***

### toggle()

> **toggle**: () => `void`

Defined in: [architecture/capabilities/contracts.ts:138](https://github.com/zyizyiz/VueGraphX/blob/9f72605fb698dc53077546b3d3b04f80b67b45d6/src/architecture/capabilities/contracts.ts#L138)

切换拆分流程开关。

#### Returns

`void`

***

### cancel()

> **cancel**: () => `void`

Defined in: [architecture/capabilities/contracts.ts:143](https://github.com/zyizyiz/VueGraphX/blob/9f72605fb698dc53077546b3d3b04f80b67b45d6/src/architecture/capabilities/contracts.ts#L143)

取消当前拆分流程或草稿。

#### Returns

`void`

***

### confirm()

> **confirm**: () => `void`

Defined in: [architecture/capabilities/contracts.ts:148](https://github.com/zyizyiz/VueGraphX/blob/9f72605fb698dc53077546b3d3b04f80b67b45d6/src/architecture/capabilities/contracts.ts#L148)

确认当前拆分草稿。

#### Returns

`void`
