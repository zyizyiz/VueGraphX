[**vuegraphx**](../README.md)

***

[vuegraphx](../README.md) / ShapeCapabilityTarget

# Interface: ShapeCapabilityTarget

Defined in: [architecture/capabilities/contracts.ts:274](https://github.com/zyizyiz/VueGraphX/blob/5bee1dec6ecd05ac28e6fb1cd1de054ab497d0f4/src/architecture/capabilities/contracts.ts#L274)

选中图形实例返回的标准化能力表面。

## Properties

### entityType

> **entityType**: `string`

Defined in: [architecture/capabilities/contracts.ts:278](https://github.com/zyizyiz/VueGraphX/blob/5bee1dec6ecd05ac28e6fb1cd1de054ab497d0f4/src/architecture/capabilities/contracts.ts#L278)

实体类型。

***

### entityId

> **entityId**: `string`

Defined in: [architecture/capabilities/contracts.ts:283](https://github.com/zyizyiz/VueGraphX/blob/5bee1dec6ecd05ac28e6fb1cd1de054ab497d0f4/src/architecture/capabilities/contracts.ts#L283)

实体唯一 id。

***

### entity

> **entity**: `unknown`

Defined in: [architecture/capabilities/contracts.ts:288](https://github.com/zyizyiz/VueGraphX/blob/5bee1dec6ecd05ac28e6fb1cd1de054ab497d0f4/src/architecture/capabilities/contracts.ts#L288)

图形作者提供的实体数据。

***

### ui?

> `optional` **ui**: `Record`\<`string`, `unknown`\>

Defined in: [architecture/capabilities/contracts.ts:293](https://github.com/zyizyiz/VueGraphX/blob/5bee1dec6ecd05ac28e6fb1cd1de054ab497d0f4/src/architecture/capabilities/contracts.ts#L293)

与外部 UI 摆放、样式或展示有关的附加信息。

***

### inspect?

> `optional` **inspect**: [`InspectCapabilityContract`](InspectCapabilityContract.md)

Defined in: [architecture/capabilities/contracts.ts:298](https://github.com/zyizyiz/VueGraphX/blob/5bee1dec6ecd05ac28e6fb1cd1de054ab497d0f4/src/architecture/capabilities/contracts.ts#L298)

检查能力。

***

### resize?

> `optional` **resize**: [`ResizeCapabilityContract`](ResizeCapabilityContract.md)

Defined in: [architecture/capabilities/contracts.ts:303](https://github.com/zyizyiz/VueGraphX/blob/5bee1dec6ecd05ac28e6fb1cd1de054ab497d0f4/src/architecture/capabilities/contracts.ts#L303)

resize 或数值编辑能力。

***

### auxiliaryLine?

> `optional` **auxiliaryLine**: [`ToggleCapabilityContract`](ToggleCapabilityContract.md)

Defined in: [architecture/capabilities/contracts.ts:308](https://github.com/zyizyiz/VueGraphX/blob/5bee1dec6ecd05ac28e6fb1cd1de054ab497d0f4/src/architecture/capabilities/contracts.ts#L308)

辅助线开关能力。

***

### projection?

> `optional` **projection**: [`ToggleCapabilityContract`](ToggleCapabilityContract.md)

Defined in: [architecture/capabilities/contracts.ts:313](https://github.com/zyizyiz/VueGraphX/blob/5bee1dec6ecd05ac28e6fb1cd1de054ab497d0f4/src/architecture/capabilities/contracts.ts#L313)

投影开关能力。

***

### annotation?

> `optional` **annotation**: [`ToggleCapabilityContract`](ToggleCapabilityContract.md)

Defined in: [architecture/capabilities/contracts.ts:318](https://github.com/zyizyiz/VueGraphX/blob/5bee1dec6ecd05ac28e6fb1cd1de054ab497d0f4/src/architecture/capabilities/contracts.ts#L318)

标注开关能力。

***

### split?

> `optional` **split**: [`SplitCapabilityContract`](SplitCapabilityContract.md)

Defined in: [architecture/capabilities/contracts.ts:323](https://github.com/zyizyiz/VueGraphX/blob/5bee1dec6ecd05ac28e6fb1cd1de054ab497d0f4/src/architecture/capabilities/contracts.ts#L323)

拆分能力。

***

### stylePanel?

> `optional` **stylePanel**: [`StylePanelCapabilityContract`](StylePanelCapabilityContract.md)

Defined in: [architecture/capabilities/contracts.ts:328](https://github.com/zyizyiz/VueGraphX/blob/5bee1dec6ecd05ac28e6fb1cd1de054ab497d0f4/src/architecture/capabilities/contracts.ts#L328)

样式面板入口能力。

***

### strokeStyle?

> `optional` **strokeStyle**: [`ColorStyleCapabilityContract`](ColorStyleCapabilityContract.md)

Defined in: [architecture/capabilities/contracts.ts:333](https://github.com/zyizyiz/VueGraphX/blob/5bee1dec6ecd05ac28e6fb1cd1de054ab497d0f4/src/architecture/capabilities/contracts.ts#L333)

描边颜色能力。

***

### fillStyle?

> `optional` **fillStyle**: [`ColorStyleCapabilityContract`](ColorStyleCapabilityContract.md)

Defined in: [architecture/capabilities/contracts.ts:338](https://github.com/zyizyiz/VueGraphX/blob/5bee1dec6ecd05ac28e6fb1cd1de054ab497d0f4/src/architecture/capabilities/contracts.ts#L338)

填充颜色能力。

***

### animation?

> `optional` **animation**: [`AnimationCapabilityContract`](AnimationCapabilityContract.md)

Defined in: [architecture/capabilities/contracts.ts:343](https://github.com/zyizyiz/VueGraphX/blob/5bee1dec6ecd05ac28e6fb1cd1de054ab497d0f4/src/architecture/capabilities/contracts.ts#L343)

向后兼容的单轨动画能力别名。

***

### animations?

> `optional` **animations**: [`AnimationCollectionCapabilityContract`](AnimationCollectionCapabilityContract.md)

Defined in: [architecture/capabilities/contracts.ts:348](https://github.com/zyizyiz/VueGraphX/blob/5bee1dec6ecd05ac28e6fb1cd1de054ab497d0f4/src/architecture/capabilities/contracts.ts#L348)

多轨动画能力集合。

***

### remove()?

> `optional` **remove**: () => `void`

Defined in: [architecture/capabilities/contracts.ts:353](https://github.com/zyizyiz/VueGraphX/blob/5bee1dec6ecd05ac28e6fb1cd1de054ab497d0f4/src/architecture/capabilities/contracts.ts#L353)

删除当前实体的入口。

#### Returns

`void`
