[**vuegraphx**](../README.md)

***

[vuegraphx](../README.md) / GraphShapeGroupHitOptions

# Interface: GraphShapeGroupHitOptions

Defined in: [architecture/shapes/contracts.ts:528](https://github.com/zyizyiz/VueGraphX/blob/5bee1dec6ecd05ac28e6fb1cd1de054ab497d0f4/src/architecture/shapes/contracts.ts#L528)

分组级命中事件辅助方法的配置。

## Properties

### keys?

> `optional` **keys**: `string` \| `string`[]

Defined in: [architecture/shapes/contracts.ts:532](https://github.com/zyizyiz/VueGraphX/blob/5bee1dec6ecd05ac28e6fb1cd1de054ab497d0f4/src/architecture/shapes/contracts.ts#L532)

限制命中检测只针对指定 key 的成员。

***

### eventName?

> `optional` **eventName**: `string`

Defined in: [architecture/shapes/contracts.ts:537](https://github.com/zyizyiz/VueGraphX/blob/5bee1dec6ecd05ac28e6fb1cd1de054ab497d0f4/src/architecture/shapes/contracts.ts#L537)

自定义监听的事件名；未传时通常使用默认命中事件。

***

### filter()?

> `optional` **filter**: (`member`, ...`args`) => `boolean`

Defined in: [architecture/shapes/contracts.ts:542](https://github.com/zyizyiz/VueGraphX/blob/5bee1dec6ecd05ac28e6fb1cd1de054ab497d0f4/src/architecture/shapes/contracts.ts#L542)

运行时过滤某个成员是否应响应命中逻辑。

#### Parameters

##### member

[`GraphShapeGroupMember`](GraphShapeGroupMember.md)

##### args

...`any`[]

#### Returns

`boolean`
