[**vuegraphx**](../README.md)

***

[vuegraphx](../README.md) / GraphPointAnnotationSpec

# Interface: GraphPointAnnotationSpec

Defined in: [architecture/shapes/contracts.ts:254](https://github.com/zyizyiz/VueGraphX/blob/708b133750b40c4618f980ee3f1e94c99bc50898/src/architecture/shapes/contracts.ts#L254)

由图形运行时管理的点标注声明式描述。

## Properties

### key

> **key**: `string`

Defined in: [architecture/shapes/contracts.ts:258](https://github.com/zyizyiz/VueGraphX/blob/708b133750b40c4618f980ee3f1e94c99bc50898/src/architecture/shapes/contracts.ts#L258)

标注的稳定 key，用于复用与切换。

***

### label?

> `optional` **label**: `string`

Defined in: [architecture/shapes/contracts.ts:263](https://github.com/zyizyiz/VueGraphX/blob/708b133750b40c4618f980ee3f1e94c99bc50898/src/architecture/shapes/contracts.ts#L263)

显示给用户的标注文本；未提供时可由运行时自动生成。

***

### source

> **source**: [`GraphPointAnnotationSource`](../type-aliases/GraphPointAnnotationSource.md)

Defined in: [architecture/shapes/contracts.ts:268](https://github.com/zyizyiz/VueGraphX/blob/708b133750b40c4618f980ee3f1e94c99bc50898/src/architecture/shapes/contracts.ts#L268)

标注点的来源描述。

***

### attributes?

> `optional` **attributes**: `Record`\<`string`, `unknown`\>

Defined in: [architecture/shapes/contracts.ts:273](https://github.com/zyizyiz/VueGraphX/blob/708b133750b40c4618f980ee3f1e94c99bc50898/src/architecture/shapes/contracts.ts#L273)

当前标注自身的 JSXGraph 属性。
