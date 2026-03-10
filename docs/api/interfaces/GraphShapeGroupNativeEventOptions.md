[**vuegraphx**](../README.md)

***

[vuegraphx](../README.md) / GraphShapeGroupNativeEventOptions

# Interface: GraphShapeGroupNativeEventOptions

Defined in: [architecture/shapes/contracts.ts:548](https://github.com/zyizyiz/VueGraphX/blob/5bee1dec6ecd05ac28e6fb1cd1de054ab497d0f4/src/architecture/shapes/contracts.ts#L548)

分组级原生 DOM 事件绑定配置。

## Properties

### keys?

> `optional` **keys**: `string` \| `string`[]

Defined in: [architecture/shapes/contracts.ts:552](https://github.com/zyizyiz/VueGraphX/blob/5bee1dec6ecd05ac28e6fb1cd1de054ab497d0f4/src/architecture/shapes/contracts.ts#L552)

仅针对指定 key 的成员绑定原生事件。

***

### preventDefault?

> `optional` **preventDefault**: `boolean`

Defined in: [architecture/shapes/contracts.ts:557](https://github.com/zyizyiz/VueGraphX/blob/5bee1dec6ecd05ac28e6fb1cd1de054ab497d0f4/src/architecture/shapes/contracts.ts#L557)

绑定后是否自动调用 preventDefault。

***

### stopPropagation?

> `optional` **stopPropagation**: `boolean`

Defined in: [architecture/shapes/contracts.ts:562](https://github.com/zyizyiz/VueGraphX/blob/5bee1dec6ecd05ac28e6fb1cd1de054ab497d0f4/src/architecture/shapes/contracts.ts#L562)

绑定后是否自动调用 stopPropagation。

***

### passive?

> `optional` **passive**: `boolean`

Defined in: [architecture/shapes/contracts.ts:567](https://github.com/zyizyiz/VueGraphX/blob/5bee1dec6ecd05ac28e6fb1cd1de054ab497d0f4/src/architecture/shapes/contracts.ts#L567)

原生 addEventListener 的 passive 选项。

***

### capture?

> `optional` **capture**: `boolean`

Defined in: [architecture/shapes/contracts.ts:572](https://github.com/zyizyiz/VueGraphX/blob/5bee1dec6ecd05ac28e6fb1cd1de054ab497d0f4/src/architecture/shapes/contracts.ts#L572)

原生 addEventListener 的 capture 选项。

***

### once?

> `optional` **once**: `boolean`

Defined in: [architecture/shapes/contracts.ts:577](https://github.com/zyizyiz/VueGraphX/blob/5bee1dec6ecd05ac28e6fb1cd1de054ab497d0f4/src/architecture/shapes/contracts.ts#L577)

原生 addEventListener 的 once 选项。
