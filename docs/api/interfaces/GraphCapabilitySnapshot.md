[**vuegraphx**](../README.md)

***

[vuegraphx](../README.md) / GraphCapabilitySnapshot

# Interface: GraphCapabilitySnapshot

Defined in: [types/capabilities.ts:96](https://github.com/zyizyiz/VueGraphX/blob/5bee1dec6ecd05ac28e6fb1cd1de054ab497d0f4/src/types/capabilities.ts#L96)

引擎当前对外暴露的能力状态快照。

## Properties

### selection

> **selection**: [`GraphSelectionSnapshot`](GraphSelectionSnapshot.md) \| `null`

Defined in: [types/capabilities.ts:100](https://github.com/zyizyiz/VueGraphX/blob/5bee1dec6ecd05ac28e6fb1cd1de054ab497d0f4/src/types/capabilities.ts#L100)

当前选中项；没有选中图形时为 null。

***

### capabilities

> **capabilities**: [`GraphCapabilityDescriptor`](GraphCapabilityDescriptor.md)[]

Defined in: [types/capabilities.ts:105](https://github.com/zyizyiz/VueGraphX/blob/5bee1dec6ecd05ac28e6fb1cd1de054ab497d0f4/src/types/capabilities.ts#L105)

当前选中项可用的全部能力描述。
