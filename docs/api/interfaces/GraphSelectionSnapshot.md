[**vuegraphx**](../README.md)

***

[vuegraphx](../README.md) / GraphSelectionSnapshot

# Interface: GraphSelectionSnapshot

Defined in: [types/capabilities.ts:71](https://github.com/zyizyiz/VueGraphX/blob/9f72605fb698dc53077546b3d3b04f80b67b45d6/src/types/capabilities.ts#L71)

当前选中图形实体的快照。

## Properties

### entityType

> **entityType**: `string`

Defined in: [types/capabilities.ts:75](https://github.com/zyizyiz/VueGraphX/blob/9f72605fb698dc53077546b3d3b04f80b67b45d6/src/types/capabilities.ts#L75)

当前选中实体的类型。

***

### entityId

> **entityId**: `string`

Defined in: [types/capabilities.ts:80](https://github.com/zyizyiz/VueGraphX/blob/9f72605fb698dc53077546b3d3b04f80b67b45d6/src/types/capabilities.ts#L80)

当前选中实体的唯一 id。

***

### entity

> **entity**: `unknown`

Defined in: [types/capabilities.ts:85](https://github.com/zyizyiz/VueGraphX/blob/9f72605fb698dc53077546b3d3b04f80b67b45d6/src/types/capabilities.ts#L85)

由图形作者定义的实体数据。

***

### ui?

> `optional` **ui**: `Record`\<`string`, `unknown`\>

Defined in: [types/capabilities.ts:90](https://github.com/zyizyiz/VueGraphX/blob/9f72605fb698dc53077546b3d3b04f80b67b45d6/src/types/capabilities.ts#L90)

与当前选中项相关的 UI 摆放和展示信息。
