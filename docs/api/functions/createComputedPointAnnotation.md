[**vuegraphx**](../README.md)

***

[vuegraphx](../README.md) / createComputedPointAnnotation

# Function: createComputedPointAnnotation()

> **createComputedPointAnnotation**(`key`, `resolve`, `options?`): [`GraphPointAnnotationSpec`](../interfaces/GraphPointAnnotationSpec.md)

Defined in: [architecture/shapes/composition.ts:621](https://github.com/zyizyiz/VueGraphX/blob/708b133750b40c4618f980ee3f1e94c99bc50898/src/architecture/shapes/composition.ts#L621)

基于延迟解析的点创建标注描述。

## Parameters

### key

`string`

### resolve

() => `any`

### options?

`Pick`\<[`GraphPointAnnotationSpec`](../interfaces/GraphPointAnnotationSpec.md), `"label"` \| `"attributes"`\>

## Returns

[`GraphPointAnnotationSpec`](../interfaces/GraphPointAnnotationSpec.md)
