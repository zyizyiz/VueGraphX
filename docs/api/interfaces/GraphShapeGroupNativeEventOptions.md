[**vuegraphx**](../README.md)

***

[vuegraphx](../README.md) / GraphShapeGroupNativeEventOptions

# Interface: GraphShapeGroupNativeEventOptions

Defined in: [architecture/shapes/contracts.ts:566](https://github.com/zyizyiz/VueGraphX/blob/4b7129ef16e07c8334f02a2a510c37f3c77444ab/src/architecture/shapes/contracts.ts#L566)

分组级原生 DOM 事件绑定配置。

## Properties

### keys?

> `optional` **keys**: `string` \| `string`[]

Defined in: [architecture/shapes/contracts.ts:570](https://github.com/zyizyiz/VueGraphX/blob/4b7129ef16e07c8334f02a2a510c37f3c77444ab/src/architecture/shapes/contracts.ts#L570)

仅针对指定 key 的成员绑定原生事件。

***

### preventDefault?

> `optional` **preventDefault**: `boolean`

Defined in: [architecture/shapes/contracts.ts:575](https://github.com/zyizyiz/VueGraphX/blob/4b7129ef16e07c8334f02a2a510c37f3c77444ab/src/architecture/shapes/contracts.ts#L575)

绑定后是否自动调用 preventDefault。

***

### stopPropagation?

> `optional` **stopPropagation**: `boolean`

Defined in: [architecture/shapes/contracts.ts:580](https://github.com/zyizyiz/VueGraphX/blob/4b7129ef16e07c8334f02a2a510c37f3c77444ab/src/architecture/shapes/contracts.ts#L580)

绑定后是否自动调用 stopPropagation。

***

### passive?

> `optional` **passive**: `boolean`

Defined in: [architecture/shapes/contracts.ts:585](https://github.com/zyizyiz/VueGraphX/blob/4b7129ef16e07c8334f02a2a510c37f3c77444ab/src/architecture/shapes/contracts.ts#L585)

原生 addEventListener 的 passive 选项。

***

### capture?

> `optional` **capture**: `boolean`

Defined in: [architecture/shapes/contracts.ts:590](https://github.com/zyizyiz/VueGraphX/blob/4b7129ef16e07c8334f02a2a510c37f3c77444ab/src/architecture/shapes/contracts.ts#L590)

原生 addEventListener 的 capture 选项。

***

### once?

> `optional` **once**: `boolean`

Defined in: [architecture/shapes/contracts.ts:595](https://github.com/zyizyiz/VueGraphX/blob/4b7129ef16e07c8334f02a2a510c37f3c77444ab/src/architecture/shapes/contracts.ts#L595)

原生 addEventListener 的 once 选项。
