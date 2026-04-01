[**vuegraphx**](../README.md)

***

[vuegraphx](../README.md) / GraphPointAnnotationSpec

# Interface: GraphPointAnnotationSpec

Defined in: [architecture/shapes/contracts.ts:272](https://github.com/zyizyiz/VueGraphX/blob/9f72605fb698dc53077546b3d3b04f80b67b45d6/src/architecture/shapes/contracts.ts#L272)

由图形运行时管理的点标注声明式描述。

## Properties

### key

> **key**: `string`

Defined in: [architecture/shapes/contracts.ts:276](https://github.com/zyizyiz/VueGraphX/blob/9f72605fb698dc53077546b3d3b04f80b67b45d6/src/architecture/shapes/contracts.ts#L276)

标注的稳定 key，用于复用与切换。

***

### label?

> `optional` **label**: `string`

Defined in: [architecture/shapes/contracts.ts:281](https://github.com/zyizyiz/VueGraphX/blob/9f72605fb698dc53077546b3d3b04f80b67b45d6/src/architecture/shapes/contracts.ts#L281)

显示给用户的标注文本；未提供时可由运行时自动生成。

***

### source

> **source**: [`GraphPointAnnotationSource`](../type-aliases/GraphPointAnnotationSource.md)

Defined in: [architecture/shapes/contracts.ts:286](https://github.com/zyizyiz/VueGraphX/blob/9f72605fb698dc53077546b3d3b04f80b67b45d6/src/architecture/shapes/contracts.ts#L286)

标注点的来源描述。

***

### attributes?

> `optional` **attributes**: `Record`\<`string`, `unknown`\>

Defined in: [architecture/shapes/contracts.ts:291](https://github.com/zyizyiz/VueGraphX/blob/9f72605fb698dc53077546b3d3b04f80b67b45d6/src/architecture/shapes/contracts.ts#L291)

当前标注自身的 JSXGraph 属性。
