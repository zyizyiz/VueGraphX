[**vuegraphx**](../README.md)

***

[vuegraphx](../README.md) / GraphCapabilityDescriptor

# Interface: GraphCapabilityDescriptor

Defined in: [types/capabilities.ts:21](https://github.com/zyizyiz/VueGraphX/blob/9f72605fb698dc53077546b3d3b04f80b67b45d6/src/types/capabilities.ts#L21)

可被外部 UI 直接渲染的能力描述对象。

## Properties

### id

> **id**: `string`

Defined in: [types/capabilities.ts:25](https://github.com/zyizyiz/VueGraphX/blob/9f72605fb698dc53077546b3d3b04f80b67b45d6/src/types/capabilities.ts#L25)

能力唯一标识，通常也是 executeCapability 的入参。

***

### feature

> **feature**: `string`

Defined in: [types/capabilities.ts:30](https://github.com/zyizyiz/VueGraphX/blob/9f72605fb698dc53077546b3d3b04f80b67b45d6/src/types/capabilities.ts#L30)

能力语义分类，例如 resize、style、animation。

***

### label

> **label**: `string`

Defined in: [types/capabilities.ts:35](https://github.com/zyizyiz/VueGraphX/blob/9f72605fb698dc53077546b3d3b04f80b67b45d6/src/types/capabilities.ts#L35)

建议直接展示给用户的标题。

***

### entityType

> **entityType**: `string`

Defined in: [types/capabilities.ts:40](https://github.com/zyizyiz/VueGraphX/blob/9f72605fb698dc53077546b3d3b04f80b67b45d6/src/types/capabilities.ts#L40)

当前能力所属的图形实体类型。

***

### kind

> **kind**: [`GraphCapabilityKind`](../type-aliases/GraphCapabilityKind.md)

Defined in: [types/capabilities.ts:45](https://github.com/zyizyiz/VueGraphX/blob/9f72605fb698dc53077546b3d3b04f80b67b45d6/src/types/capabilities.ts#L45)

建议使用何种 UI 控件承载该能力。

***

### group

> **group**: [`GraphCapabilityGroup`](../type-aliases/GraphCapabilityGroup.md)

Defined in: [types/capabilities.ts:50](https://github.com/zyizyiz/VueGraphX/blob/9f72605fb698dc53077546b3d3b04f80b67b45d6/src/types/capabilities.ts#L50)

建议在 UI 中归属的分组。

***

### active?

> `optional` **active**: `boolean`

Defined in: [types/capabilities.ts:55](https://github.com/zyizyiz/VueGraphX/blob/9f72605fb698dc53077546b3d3b04f80b67b45d6/src/types/capabilities.ts#L55)

当前能力是否处于激活状态。

***

### enabled?

> `optional` **enabled**: `boolean`

Defined in: [types/capabilities.ts:60](https://github.com/zyizyiz/VueGraphX/blob/9f72605fb698dc53077546b3d3b04f80b67b45d6/src/types/capabilities.ts#L60)

当前能力是否允许执行。

***

### meta?

> `optional` **meta**: `Record`\<`string`, `unknown`\>

Defined in: [types/capabilities.ts:65](https://github.com/zyizyiz/VueGraphX/blob/9f72605fb698dc53077546b3d3b04f80b67b45d6/src/types/capabilities.ts#L65)

附加运行时参数，供业务侧 UI 自定义解释。
