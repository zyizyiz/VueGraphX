[**vuegraphx**](../README.md)

***

[vuegraphx](../README.md) / GraphShapeGroupHitOptions

# Interface: GraphShapeGroupHitOptions

Defined in: [architecture/shapes/contracts.ts:546](https://github.com/zyizyiz/VueGraphX/blob/4b7129ef16e07c8334f02a2a510c37f3c77444ab/src/architecture/shapes/contracts.ts#L546)

分组级命中事件辅助方法的配置。

## Properties

### keys?

> `optional` **keys**: `string` \| `string`[]

Defined in: [architecture/shapes/contracts.ts:550](https://github.com/zyizyiz/VueGraphX/blob/4b7129ef16e07c8334f02a2a510c37f3c77444ab/src/architecture/shapes/contracts.ts#L550)

限制命中检测只针对指定 key 的成员。

***

### eventName?

> `optional` **eventName**: `string`

Defined in: [architecture/shapes/contracts.ts:555](https://github.com/zyizyiz/VueGraphX/blob/4b7129ef16e07c8334f02a2a510c37f3c77444ab/src/architecture/shapes/contracts.ts#L555)

自定义监听的事件名；未传时通常使用默认命中事件。

***

### filter()?

> `optional` **filter**: (`member`, ...`args`) => `boolean`

Defined in: [architecture/shapes/contracts.ts:560](https://github.com/zyizyiz/VueGraphX/blob/4b7129ef16e07c8334f02a2a510c37f3c77444ab/src/architecture/shapes/contracts.ts#L560)

运行时过滤某个成员是否应响应命中逻辑。

#### Parameters

##### member

[`GraphShapeGroupMember`](GraphShapeGroupMember.md)

##### args

...`any`[]

#### Returns

`boolean`
